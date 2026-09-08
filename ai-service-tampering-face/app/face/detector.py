import os
from typing import Any, Dict, List, Optional, Tuple
import cv2
import numpy as np


def _get_cascade_classifier() -> Optional[cv2.CascadeClassifier]:
    """
    Load the OpenCV Haar frontal face cascade classifier.
    Falls back to alt2 cascade if default cascade is unavailable.
    """
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
        # Rotated 90 CW: (orig_h - 1 - oy, ox) -> reverse: ox = ry, oy = orig_h - (rx + rw)
        return {"x": int(ry), "y": int(orig_h - (rx + rw)), "width": int(rh), "height": int(rw)}
    elif angle == 180:
        # Rotated 180: reverse: ox = orig_w - (rx + rw), oy = orig_h - (ry + rh)
        return {"x": int(orig_w - (rx + rw)), "y": int(orig_h - (ry + rh)), "width": int(rw), "height": int(rh)}
    elif angle == 270:
        # Rotated 270 CW (90 CCW): reverse: ox = orig_w - (ry + rh), oy = rx
        return {"x": int(orig_w - (ry + rh)), "y": int(rx), "width": int(rh), "height": int(rw)}
    return bbox


def _detect_faces_single_orientation(
    gray: np.ndarray,
    min_dim: int,
    min_size_ratio: float,
    classifier: cv2.CascadeClassifier,
) -> List[Tuple[int, int, int, int]]:
    """Execute primary and fallback Haar cascade multi-scale detection on a single orientation."""
    min_face_size = int(min_dim * min_size_ratio)

    faces = classifier.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(max(24, min_face_size), max(24, min_face_size)),
        flags=cv2.CASCADE_SCALE_IMAGE,
    )

    if len(faces) == 0:
        faces = classifier.detectMultiScale(
            gray,
            scaleFactor=1.05,
            minNeighbors=3,
            minSize=(28, 28),
            flags=cv2.CASCADE_SCALE_IMAGE,
        )

    return [tuple(f) for f in faces]


def detect_faces(
    image: np.ndarray,
    min_size_ratio: float = 0.08,
    enable_rotation: bool = True,
) -> Dict[str, Any]:
    """
    Detect human faces in an image with automatic 4-way rotation search.

    Forensic & Auto-Orientation Features:
    - Analyzes orientation 0° (upright) first with zero performance overhead.
    - If no face is detected at 0° and enable_rotation=True, tests 90° CW, 180° (upside down),
      and 270° CW (90° CCW).
    - Returns both the bounding box mapped to original document space and the upright bounding box.
    - Reports the detected orientation angle (0, 90, 180, 270).

    Args:
        image: OpenCV image array (np.ndarray, BGR or Grayscale).
        min_size_ratio: Minimum face size relative to the smaller image dimension.
        enable_rotation: If True, tests 90, 180, and 270 degrees if 0 degrees fails.

    Returns:
        Dict containing:
            detected (bool): True if at least one face found.
            face_count (int): Number of detected face regions.
            bbox (dict | None): Primary face bounding box in original image space.
            upright_bbox (dict | None): Primary face bounding box in upright rotated space.
            orientation (int): Detected rotation angle (0, 90, 180, 270).
            all_faces (list[dict]): All detected face bounding boxes.
            warning (str | None): Advisory warning if multiple faces or rotation applied.
    """
    if image is None or not isinstance(image, np.ndarray) or image.size == 0:
        return {
            "detected": False,
            "face_count": 0,
            "bbox": None,
            "upright_bbox": None,
            "orientation": 0,
            "all_faces": [],
            "warning": "Invalid or empty image provided",
        }

    orig_h, orig_w = image.shape[:2]

    # Convert to grayscale for Haar cascade
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image.copy()

    classifier = _get_cascade_classifier()
    if classifier is None:
        return {
            "detected": False,
            "face_count": 0,
            "bbox": None,
            "upright_bbox": None,
            "orientation": 0,
            "all_faces": [],
            "warning": "Haar cascade classifier could not be loaded",
        }

    # 1. First pass at 0 degrees (upright)
    faces = _detect_faces_single_orientation(
        gray=gray,
        min_dim=min(orig_h, orig_w),
        min_size_ratio=min_size_ratio,
        classifier=classifier,
    )
    detected_angle = 0

    # 2. Multi-orientation search (90, 180, 270) if not found at 0
    if len(faces) == 0 and enable_rotation:
        candidate_angles = [
            (90, cv2.ROTATE_90_CLOCKWISE),
            (180, cv2.ROTATE_180),
            (270, cv2.ROTATE_90_COUNTERCLOCKWISE),
        ]
        for angle, rot_code in candidate_angles:
            rot_gray = cv2.rotate(gray, rot_code)
            rot_h, rot_w = rot_gray.shape[:2]
            rot_faces = _detect_faces_single_orientation(
                gray=rot_gray,
                min_dim=min(rot_h, rot_w),
                min_size_ratio=min_size_ratio,
                classifier=classifier,
            )
            if len(rot_faces) > 0:
                faces = rot_faces
                detected_angle = angle
                break

    face_count = len(faces)
    if face_count == 0:
        return {
            "detected": False,
            "face_count": 0,
            "bbox": None,
            "upright_bbox": None,
            "orientation": 0,
            "all_faces": [],
            "warning": "No face detected on document",
        }

    # Largest face by area in upright/scanned coordinate system
    largest_face = max(faces, key=lambda rect: rect[2] * rect[3])
    upright_bbox = {
        "x": int(largest_face[0]),
        "y": int(largest_face[1]),
        "width": int(largest_face[2]),
        "height": int(largest_face[3]),
    }

    # Map bounding box back to original coordinates if image was rotated
    if detected_angle != 0:
        original_bbox = rotate_bbox_back(upright_bbox, orig_h, orig_w, detected_angle)
        all_faces_list = [
            rotate_bbox_back(
                {"x": int(f[0]), "y": int(f[1]), "width": int(f[2]), "height": int(f[3])},
                orig_h,
                orig_w,
                detected_angle,
            )
            for f in faces
        ]
    else:
        original_bbox = upright_bbox
        all_faces_list = [
            {"x": int(f[0]), "y": int(f[1]), "width": int(f[2]), "height": int(f[3])}
            for f in faces
        ]

    warnings = []
    if face_count > 1:
        warnings.append(f"Multiple faces detected ({face_count}); selected the most prominent portrait.")
    if detected_angle != 0:
        warnings.append(f"Document auto-oriented by {detected_angle}° for portrait detection.")

    return {
        "detected": True,
        "face_count": face_count,
        "bbox": original_bbox,
        "upright_bbox": upright_bbox,
        "orientation": detected_angle,
        "all_faces": all_faces_list,
        "warning": "; ".join(warnings) if warnings else None,
    }
