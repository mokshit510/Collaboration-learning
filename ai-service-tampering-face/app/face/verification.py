import os
from typing import Any, Dict, Optional
import cv2
import numpy as np

# Ensure UTF-8 output encoding for DeepFace logging on Windows
os.environ.setdefault("PYTHONUTF8", "1")
os.environ.setdefault("TF_ENABLE_ONEDNN_OPTS", "0")


def _rotate_rgb(img: np.ndarray, angle: int) -> np.ndarray:
    """Rotate image by 90, 180, or 270 degrees clockwise."""
    if angle == 90:
        return cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE)
    elif angle == 180:
        return cv2.rotate(img, cv2.ROTATE_180)
    elif angle == 270:
        return cv2.rotate(img, cv2.ROTATE_90_COUNTERCLOCKWISE)
    return img


def calculate_match_score(distance: float, threshold: float) -> float:
    """
    Convert raw biometric vector distance into an intuitive 0-100 percentage match score.

    Calibrated to the UI thresholds:
    - Distance 0.0 (identical vectors) maps to 100.0%
    - Distance equal to threshold (e.g., 0.40) maps to 80.0% (PASS boundary)
    - Distance exceeding threshold scales down towards 0.0%
    """
    if threshold <= 0:
        threshold = 0.40

    if distance <= threshold:
        score = 80.0 + (1.0 - (distance / threshold)) * 20.0
    else:
        penalty_scale = max(0.01, 1.0 - threshold)
        score = 80.0 - ((distance - threshold) / penalty_scale) * 80.0

    return round(max(0.0, min(100.0, score)), 1)


def verify_faces(
    document_face: Optional[np.ndarray] = None,
    live_face: Optional[np.ndarray] = None,
    source_face: Optional[np.ndarray] = None,
    target_face: Optional[np.ndarray] = None,
    model_name: str = "Facenet512",
    detector_backend: str = "yunet",
    threshold: Optional[float] = None,
    check_rotations: bool = True,
) -> Dict[str, Any]:
    """
    Biometric face verification comparing document/reference portrait against a live selfie,
    with automatic orientation adjustment for sideways or upside-down captures.

    Forensic & Architectural Principles:
    - Supports both document-to-live matching and database-reference-to-live matching.
    - Evaluates identity evidence, NOT image pixel manipulation.
    - Operates entirely on in-memory NumPy arrays.
    - Uses pretrained DeepFace FaceNet512 embeddings with Cosine metric.
    - Gracefully handles sideways (90°/270°) or upside-down (180°) selfie orientations.
    - Gracefully isolates errors with `available=False` rather than crashing callers.

    Args:
        document_face: Cropped BGR numpy array of document portrait.
        live_face: BGR numpy array of live captured selfie.
        source_face: Alias for document_face / reference image (e.g. database portrait).
        target_face: Alias for live_face.
        model_name: DeepFace model name (default "Facenet512").
        detector_backend: Detection backend used for face alignment.
        check_rotations: If True, tests orthogonal rotations if initial orientation fails.

    Returns:
        Dictionary containing:
            available (bool): True if verification was successfully executed.
            verified (bool | None): True if distance <= threshold.
            distance (float | None): Cosine distance between 512-d embeddings.
            threshold (float | None): Verified decision threshold.
            match_score (float | None): Calibrated 0-100% similarity score for frontend.
            orientation_adjusted (int): 0 if verified upright, or 90/180/270 if rotation corrected.
            model (str): Model name used ("Facenet512").
            metric (str): Distance metric used ("cosine").
            error (str | None): Description of failure if available=False.
    """
    # Resolve aliases (allows calling with document_face or source_face / live_face or target_face)
    doc_img = document_face if document_face is not None else source_face
    live_img = live_face if live_face is not None else target_face

    if doc_img is None or live_img is None:
        missing = []
        if doc_img is None:
            missing.append("document/reference face")
        if live_img is None:
            missing.append("live face")
        return {
            "available": False,
            "verified": None,
            "distance": None,
            "threshold": None,
            "match_score": None,
            "orientation_adjusted": 0,
            "model": model_name,
            "metric": "cosine",
            "error": f"Missing input for comparison: {', '.join(missing)}",
        }

    if not isinstance(doc_img, np.ndarray) or not isinstance(live_img, np.ndarray):
        return {
            "available": False,
            "verified": None,
            "distance": None,
            "threshold": None,
            "match_score": None,
            "orientation_adjusted": 0,
            "model": model_name,
            "metric": "cosine",
            "error": "Invalid image format provided (expected NumPy ndarray)",
        }

    if doc_img.size == 0 or live_img.size == 0:
        return {
            "available": False,
            "verified": None,
            "distance": None,
            "threshold": None,
            "match_score": None,
            "orientation_adjusted": 0,
            "model": model_name,
            "metric": "cosine",
            "error": "One or both face images are empty (0 pixels)",
        }

    try:
        from deepface import DeepFace

        # DeepFace expects RGB color format
        doc_rgb = cv2.cvtColor(doc_img, cv2.COLOR_BGR2RGB)
        live_rgb = cv2.cvtColor(live_img, cv2.COLOR_BGR2RGB)

        # Primary verification pass at current orientation with backend fallback
        try:
            result = DeepFace.verify(
                img1_path=doc_rgb,
                img2_path=live_rgb,
                model_name=model_name,
                detector_backend=detector_backend,
                distance_metric="cosine",
                enforce_detection=False,
                align=True,
            )
            used_backend = detector_backend
        except Exception:
            used_backend = "opencv"
            result = DeepFace.verify(
                img1_path=doc_rgb,
                img2_path=live_rgb,
                model_name=model_name,
                detector_backend=used_backend,
                distance_metric="cosine",
                enforce_detection=False,
                align=True,
            )

        distance = float(result.get("distance", 1.0))
        model_threshold = float(result.get("threshold", 0.40))
        effective_threshold = float(threshold) if threshold is not None else model_threshold
        verified = distance <= effective_threshold
        best_angle = 0

        # If not verified on initial orientation, check if live face was captured sideways or upside down
        if not verified and check_rotations:
            best_distance = distance
            for angle in [90, 180, 270]:
                rot_live = _rotate_rgb(live_rgb, angle)
                try:
                    rot_res = DeepFace.verify(
                        img1_path=doc_rgb,
                        img2_path=rot_live,
                        model_name=model_name,
                        detector_backend=used_backend,
                        distance_metric="cosine",
                        enforce_detection=False,
                        align=True,
                    )
                    rot_dist = float(rot_res.get("distance", 1.0))
                    rot_thresh = float(threshold) if threshold is not None else float(rot_res.get("threshold", effective_threshold))

                    if rot_dist <= rot_thresh:
                        verified = True
                        distance = rot_dist
                        effective_threshold = rot_thresh
                        best_angle = angle
                        break
                    elif rot_dist < best_distance:
                        best_distance = rot_dist
                except Exception:
                    pass

        match_score = calculate_match_score(distance, effective_threshold)

        return {
            "available": True,
            "verified": verified,
            "distance": round(distance, 4),
            "threshold": round(effective_threshold, 4),
            "match_score": match_score,
            "orientation_adjusted": best_angle,
            "model": model_name,
            "metric": "cosine",
            "error": None,
        }

    except Exception as exc:
        return {
            "available": False,
            "verified": None,
            "distance": None,
            "threshold": None,
            "match_score": None,
            "orientation_adjusted": 0,
            "model": model_name,
            "metric": "cosine",
            "error": f"Face verification error: {str(exc)}",
        }
