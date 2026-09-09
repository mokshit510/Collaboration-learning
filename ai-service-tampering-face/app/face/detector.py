import os
from typing import Any, Dict, List, Optional, Tuple
import cv2
import numpy as np


def _find_yunet_model() -> Optional[str]:
    """Locate the bundled or cached YuNet ONNX face detection model."""
    # 1. Check local models directory inside app/face/models/
    local_path = os.path.join(os.path.dirname(__file__), "models", "face_detection_yunet_2023mar.onnx")
    if os.path.exists(local_path) and os.path.getsize(local_path) > 10000:
        return local_path

    # 2. Check DeepFace cache in user home directory
    cache_path = os.path.expanduser("~/.deepface/weights/face_detection_yunet_2023mar.onnx")
    if os.path.exists(cache_path) and os.path.getsize(cache_path) > 10000:
        return cache_path

    return None


def _get_cascade_classifier() -> Optional[cv2.CascadeClassifier]:
    """Fallback OpenCV Haar frontal face cascade classifier."""
    cascade_path = os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml")
    if os.path.exists(cascade_path):
        classifier = cv2.CascadeClassifier(cascade_path)
        if not classifier.empty():
            return classifier

    alt_path = os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_alt2.xml")
    if os.path.exists(alt_path):
        classifier = cv2.CascadeClassifier(alt_path)
        if not classifier.empty():
            return classifier

    return None


def rotate_image(img: np.ndarray, angle: int) -> np.ndarray:
    """Rotate image by 90, 180, or 270 degrees clockwise."""
    if angle == 90:
        return cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE)
    elif angle == 180:
        return cv2.rotate(img, cv2.ROTATE_180)
    elif angle == 270:
        return cv2.rotate(img, cv2.ROTATE_90_COUNTERCLOCKWISE)
    return img


def rotate_bbox_back(
    bbox: Dict[str, int],
    orig_h: int,
    orig_w: int,
    angle: int,
) -> Dict[str, int]:
    """
    Transform bounding box coordinates detected on a rotated image back to original image space.
    """
    rx, ry = bbox["x"], bbox["y"]
    rw, rh = bbox["width"], bbox["height"]

    if angle == 90:
        return {"x": int(ry), "y": int(orig_h - (rx + rw)), "width": int(rh), "height": int(rw)}
    elif angle == 180:
        return {"x": int(orig_w - (rx + rw)), "y": int(orig_h - (ry + rh)), "width": int(rw), "height": int(rh)}
    elif angle == 270:
        return {"x": int(orig_w - (ry + rh)), "y": int(rx), "width": int(rh), "height": int(rw)}
    return bbox


def _detect_faces_yunet(
    image: np.ndarray,
    model_path: str,
    score_threshold: float = 0.55,
) -> List[Dict[str, Any]]:
    """
    Execute high-speed, high-accuracy neural face detection with YuNet.
    Extracts bounding boxes, confidence, and 5-point facial landmarks.
    """
    h, w = image.shape[:2]
    if len(image.shape) == 2:
        bgr = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
    elif image.shape[2] == 4:
        bgr = cv2.cvtColor(image, cv2.COLOR_BGRA2BGR)
    else:
        bgr = image

    try:
        detector = cv2.FaceDetectorYN.create(
            model=model_path,
            config="",
            input_size=(w, h),
            score_threshold=score_threshold,
            nms_threshold=0.3,
            top_k=5000,
        )
        _, raw_faces = detector.detect(bgr)
    except Exception:
        return []

    if raw_faces is None or len(raw_faces) == 0:
        return []

    faces = []
    for f in raw_faces:
        x, y, fw, fh = int(f[0]), int(f[1]), int(f[2]), int(f[3])
        conf = float(f[14])
        rx, ry = float(f[4]), float(f[5])  # Right eye landmark
        lx, ly = float(f[6]), float(f[7])  # Left eye landmark

        dx = abs(lx - rx)
        dy = abs(ly - ry)
        eye_tilt = dy / (dx + 1e-4)
        is_upright = eye_tilt < 0.40

        # Saturation check: real photo portrait has rich skin/clothing color,
        # while ghost images / watermarks / text are monochromatic or pale blue
        sat_score = 0.0
        try:
            cx1 = max(0, x + int(fw * 0.2))
            cy1 = max(0, y + int(fh * 0.2))
            cx2 = min(w, x + int(fw * 0.8))
            cy2 = min(h, y + int(fh * 0.8))
            if cx2 > cx1 and cy2 > cy1:
                patch = bgr[cy1:cy2, cx1:cx2]
                hsv = cv2.cvtColor(patch, cv2.COLOR_BGR2HSV)
                sat_score = float(np.mean(hsv[:, :, 1]))
        except Exception:
            pass

        # Position heuristic: on standard ICAO ID documents (passports, national IDs),
        # the primary photo is in the left 55% of the card
        pos_weight = 1.2 if (x + fw / 2) < (w * 0.55) else 0.85

        # Combined ranking score to prioritize the primary photo over ghost watermarks
        primary_score = (
            conf
            * np.sqrt(max(1, fw * fh))
            * (1.5 if is_upright else 0.5)
            * pos_weight
            * (1.0 + min(sat_score, 100.0) / 100.0)
        )

        faces.append({
            "bbox": {"x": max(0, x), "y": max(0, y), "width": fw, "height": fh},
            "confidence": conf,
            "is_upright": is_upright,
            "eye_tilt": eye_tilt,
            "primary_score": primary_score,
            "area": fw * fh,
        })

    # Sort descending so the primary portrait is index 0
    faces.sort(key=lambda item: item["primary_score"], reverse=True)
    return faces


def _detect_faces_haar(
    gray: np.ndarray,
    min_dim: int,
    min_size_ratio: float,
    classifier: cv2.CascadeClassifier,
) -> List[Dict[str, Any]]:
    """Haar cascade detection used strictly as a secondary fallback."""
    min_face_size = int(min_dim * min_size_ratio)
    # Require at least 5 neighbors to prevent false positives on printed document text
    faces = classifier.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(max(35, min_face_size), max(35, min_face_size)),
        flags=cv2.CASCADE_SCALE_IMAGE,
    )

    results = []
    for f in faces:
        x, y, w, h = int(f[0]), int(f[1]), int(f[2]), int(f[3])
        results.append({
            "bbox": {"x": x, "y": y, "width": w, "height": h},
            "confidence": 0.70,
            "is_upright": True,
            "eye_tilt": 0.0,
            "primary_score": float(w * h),
            "area": w * h,
        })
    results.sort(key=lambda item: item["area"], reverse=True)
    return results


def detect_faces(
    image: np.ndarray,
    min_size_ratio: float = 0.08,
    enable_rotation: bool = True,
) -> Dict[str, Any]:
    """
    Detect human faces in an image with automatic 4-way orientation search
    using deep YuNet neural detection with Haar cascade fallback.

    Forensic & Auto-Orientation Features:
    - Automatically rights sideways (90°/270°) or upside-down (180°) document captures.
    - Uses 5-point facial landmarks to verify horizontal eye alignment.
    - Rejects false positives on text, signatures, and guilloche security patterns.
    - When multiple faces are present (e.g. Indian passport with primary photo + ghost watermark),
      accurately identifies and ranks the primary color portrait over the security watermark.
    - Returns bounding boxes in both original and upright coordinate spaces.

    Args:
        image: OpenCV image array (np.ndarray, BGR or Grayscale).
        min_size_ratio: Minimum face size relative to the smaller image dimension.
        enable_rotation: If True, evaluates orthogonal rotations to right sideways uploads.

    Returns:
        Dict containing:
            detected (bool): True if at least one face found.
            face_count (int): Number of detected face regions.
            bbox (dict | None): Primary face bounding box in original image space.
            upright_bbox (dict | None): Primary face bounding box in upright rotated space.
            orientation (int): Detected rotation angle (0, 90, 180, 270).
            confidence (float | None): Detection confidence score of primary face.
            all_faces (list[dict]): All detected face bounding boxes in original space.
            warning (str | None): Advisory warning if multiple faces or rotation applied.
    """
    if image is None or not isinstance(image, np.ndarray) or image.size == 0:
        return {
            "detected": False,
            "face_count": 0,
            "bbox": None,
            "upright_bbox": None,
            "orientation": 0,
            "confidence": None,
            "all_faces": [],
            "warning": "Invalid or empty image provided",
        }

    orig_h, orig_w = image.shape[:2]
    yunet_model_path = _find_yunet_model()
    haar_classifier = _get_cascade_classifier() if not yunet_model_path else None

    # Determine candidate angles to search
    candidate_angles = [0]
    if enable_rotation:
        candidate_angles = [0, 90, 180, 270]

    # Evaluate orientations
    angle_results: Dict[int, List[Dict[str, Any]]] = {}

    for angle in candidate_angles:
        rot_img = rotate_image(image, angle)
        if yunet_model_path:
            detected = _detect_faces_yunet(rot_img, yunet_model_path, score_threshold=0.55)
            # If nothing found at 0.55, try 0.45 for low-light/faint documents
            if not detected:
                detected = _detect_faces_yunet(rot_img, yunet_model_path, score_threshold=0.45)
        elif haar_classifier:
            gray = cv2.cvtColor(rot_img, cv2.COLOR_BGR2GRAY) if len(rot_img.shape) == 3 else rot_img
            detected = _detect_faces_haar(gray, min(rot_img.shape[:2]), min_size_ratio, haar_classifier)
        else:
            detected = []

        if detected:
            angle_results[angle] = detected

        # Early exit optimization: if angle 0 (unrotated) already found a high-confidence,
        # upright face with level eyes, there is no need to test 90/180/270
        if angle == 0 and detected:
            top_face = detected[0]
            if top_face["confidence"] >= 0.88 and top_face.get("is_upright", False):
                break

    if not angle_results:
        return {
            "detected": False,
            "face_count": 0,
            "bbox": None,
            "upright_bbox": None,
            "orientation": 0,
            "confidence": None,
            "all_faces": [],
            "warning": "No face detected on document",
        }

    # Select the best orientation
    def _orientation_score(item: Tuple[int, List[Dict[str, Any]]]) -> float:
        angle, faces = item
        if not faces:
            return -1.0
        best = faces[0]
        conf = best["confidence"]
        is_up = 1.0 if best.get("is_upright", True) else 0.2
        # Prioritize high confidence + upright eye level
        return conf * is_up * (1.05 if angle == 0 else 1.0)

    best_angle, best_faces = max(angle_results.items(), key=_orientation_score)

    primary_face = best_faces[0]
    upright_bbox = primary_face["bbox"]
    face_count = len(best_faces)

    # Transform bounding boxes back to original coordinate system
    if best_angle != 0:
        orig_bbox = rotate_bbox_back(upright_bbox, orig_h, orig_w, best_angle)
        all_faces_list = [
            rotate_bbox_back(f["bbox"], orig_h, orig_w, best_angle)
            for f in best_faces
        ]
    else:
        orig_bbox = upright_bbox
        all_faces_list = [f["bbox"] for f in best_faces]

    warnings = []
    if face_count > 1:
        warnings.append(f"Multiple faces detected ({face_count}); selected the most prominent portrait.")
    if best_angle != 0:
        warnings.append(f"Document auto-oriented by {best_angle}° for portrait detection.")

    return {
        "detected": True,
        "face_count": face_count,
        "bbox": orig_bbox,
        "upright_bbox": upright_bbox,
        "orientation": best_angle,
        "confidence": round(primary_face["confidence"], 4),
        "all_faces": all_faces_list,
        "warning": "; ".join(warnings) if warnings else None,
    }
