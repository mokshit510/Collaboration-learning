from typing import Any, Dict, Optional
import cv2
import numpy as np


def crop_face(
    image: np.ndarray,
    bbox: Optional[Dict[str, int]] = None,
    padding_ratio: float = 0.12,
    min_dimension: int = 40,
) -> Dict[str, Any]:
    """
    Crop face portrait from image using bounding box coordinates with padding.

    Forensic & Geometric Rules:
    - Adds proportional margin (padding) around the face so chin, hairline, and ears
      required for deep neural embedding networks (FaceNet512) are not clipped.
    - Strictly clamps coordinates to image boundaries to prevent indexing distortion.
    - Operates purely in-memory on NumPy arrays (no temporary files written to disk).
    - Checks face resolution and sharpness to flag low-quality portraits.

    Args:
        image: Original OpenCV image array (np.ndarray).
        bbox: Dictionary with keys "x", "y", "width", "height".
        padding_ratio: Fraction of width/height added on each side (default 0.12).
        min_dimension: Minimum acceptable pixel width or height.

    Returns:
        Dict containing:
            cropped_face (np.ndarray | None): Cropped BGR face image.
            crop_coords (dict | None): Final slice coordinates {x1, y1, x2, y2}.
            dimensions (dict | None): Dimensions {width, height} of cropped face.
            quality_ok (bool): True if resolution and quality meet baseline standards.
            warning (str | None): Advisory warning if low quality or clamped boundaries.
    """
    if image is None or not isinstance(image, np.ndarray) or image.size == 0:
        return {
            "cropped_face": None,
            "crop_coords": None,
            "dimensions": None,
            "quality_ok": False,
            "warning": "Invalid or empty source image provided",
        }

    if bbox is None:
        return {
            "cropped_face": None,
            "crop_coords": None,
            "dimensions": None,
            "quality_ok": False,
            "warning": "No bounding box supplied for extraction",
        }

    img_h, img_w = image.shape[:2]

    fx = int(bbox.get("x", 0))
    fy = int(bbox.get("y", 0))
    fw = int(bbox.get("width", 0))
    fh = int(bbox.get("height", 0))

    if fw <= 0 or fh <= 0:
        return {
            "cropped_face": None,
            "crop_coords": None,
            "dimensions": None,
            "quality_ok": False,
            "warning": f"Invalid bounding box dimensions: width={fw}, height={fh}",
        }

    # Proportional padding around detected facial boundary
    pad_x = int(fw * padding_ratio)
    pad_y = int(fh * padding_ratio)

    # Clamp coordinates to valid image bounds
    x1 = max(0, fx - pad_x)
    y1 = max(0, fy - pad_y)
    x2 = min(img_w, fx + fw + pad_x)
    y2 = min(img_h, fy + fh + pad_y)

    cropped = image[y1:y2, x1:x2].copy()
    crop_h, crop_w = cropped.shape[:2]

    if crop_h == 0 or crop_w == 0:
        return {
            "cropped_face": None,
            "crop_coords": None,
            "dimensions": None,
            "quality_ok": False,
            "warning": "Extracted region has zero area",
        }

    # Quality assessments
    warnings = []
    quality_ok = True

    if crop_w < min_dimension or crop_h < min_dimension:
        quality_ok = False
        warnings.append(
            f"Extracted face resolution ({crop_w}x{crop_h}) is below recommended threshold ({min_dimension}px)"
        )

    # Sharpness / Blur check via Laplacian variance
    try:
        gray_crop = cv2.cvtColor(cropped, cv2.COLOR_BGR2GRAY) if len(cropped.shape) == 3 else cropped
        laplacian_var = float(cv2.Laplacian(gray_crop, cv2.CV_64F).var())
        if laplacian_var < 25.0:
            warnings.append(f"Face image may be blurry (sharpness metric: {laplacian_var:.1f})")
    except Exception:
        pass

    return {
        "cropped_face": cropped,
        "crop_coords": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
        "dimensions": {"width": crop_w, "height": crop_h},
        "quality_ok": quality_ok,
        "warning": "; ".join(warnings) if warnings else None,
    }
