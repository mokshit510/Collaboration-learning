from typing import Any, Dict
import numpy as np

from app.face.detector import detect_faces, rotate_image
from app.face.extractor import crop_face


def extract_document_face(
    image: np.ndarray,
    padding_ratio: float = 0.12,
    enable_rotation: bool = True,
) -> Dict[str, Any]:
    """
    Detect and extract the primary ID portrait face from a document image,
    automatically righting sideways (90°/270°) or upside-down (180°) uploads.

    Coordinates:
    1. app.face.detector.detect_faces (OpenCV multi-scale 4-way auto-orient detection)
    2. app.face.extractor.crop_face (safe padding and boundary clamping on upright image)

    Returns:
        Dictionary containing:
            detected (bool): True if at least one face found.
            face_count (int): Number of detected face regions.
            bbox (dict | None): Bounding box in original document coordinate space.
            cropped_face (np.ndarray | None): BGR cropped face image, oriented upright.
            orientation (int): Detected rotation angle (0, 90, 180, 270).
            warning (str | None): Warning if multiple faces, zero faces, or auto-rotated.
    """
    detection = detect_faces(image, enable_rotation=enable_rotation)

    if not detection["detected"] or detection["bbox"] is None:
        return {
            "detected": False,
            "face_count": 0,
            "bbox": None,
            "cropped_face": None,
            "orientation": 0,
            "warning": detection.get("warning") or "No face detected on document",
        }

    detected_angle = detection.get("orientation", 0)

    # If the document was detected at a non-zero rotation, crop from the upright image
    # so that FaceNet / verification models receive a right-side up portrait
    if detected_angle != 0:
        upright_image = rotate_image(image, detected_angle)
        target_bbox = detection.get("upright_bbox") or detection["bbox"]
        crop_result = crop_face(
            image=upright_image,
            bbox=target_bbox,
            padding_ratio=padding_ratio,
        )
    else:
        crop_result = crop_face(
            image=image,
            bbox=detection["bbox"],
            padding_ratio=padding_ratio,
        )

    # Combine warnings from detection and extraction if present
    warnings = []
    if detection.get("warning"):
        warnings.append(detection["warning"])
    if crop_result.get("warning"):
        warnings.append(crop_result["warning"])

    combined_warning = "; ".join(warnings) if warnings else None

    return {
        "detected": True,
        "face_count": detection["face_count"],
        "bbox": detection["bbox"],
        "cropped_face": crop_result["cropped_face"],
        "orientation": detected_angle,
        "warning": combined_warning,
    }
