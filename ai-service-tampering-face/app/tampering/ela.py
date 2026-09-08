"""
Error Level Analysis (ELA) Forensic Module.

Recompresses the document image at a known JPEG quality level and compares
pixel-level differences to highlight inconsistent compression artifacts,
indicating spliced text, inserted digital overlays, or altered fields.
"""

from typing import Any, Dict, List, Tuple
import io
import cv2
import numpy as np
from PIL import Image


def calculate_ela(image: np.ndarray, quality: int = 90) -> Tuple[np.ndarray, float, int]:
    """
    Perform Error Level Analysis (ELA).

    Recompresses the image as JPEG at the specified quality and computes
    the absolute difference matrix between the original and recompressed version.

    Returns:
        ela_map: 2D uint8 grayscale difference map
        mean_error: average pixel difference
        max_error: maximum observed difference across all channels
    """
    # OpenCV BGR -> RGB for PIL JPEG encoding
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    original = Image.fromarray(rgb)

    # Recompress image in-memory as JPEG
    buffer = io.BytesIO()
    original.save(buffer, format="JPEG", quality=quality)
    buffer.seek(0)
    recompressed = Image.open(buffer).convert("RGB")

    # Convert to NumPy arrays for difference calculation
    original_array = np.asarray(original, dtype=np.int16)
    recompressed_array = np.asarray(recompressed, dtype=np.int16)

    # Absolute difference per channel, taking maximum across RGB
    difference = np.abs(original_array - recompressed_array)
    ela_map = np.max(difference, axis=2).astype(np.uint8)

    mean_error = float(np.mean(ela_map))
    max_error = int(np.max(ela_map))

    return ela_map, mean_error, max_error


def create_ela_visualization(ela_map: np.ndarray) -> np.ndarray:
    """
    Create a high-contrast false-color ELA heatmap for forensic inspection.

    Uses percentile clipping so minor uniform noise does not distort
    the dynamic range.
    """
    low = float(np.percentile(ela_map, 50))
    high = float(np.percentile(ela_map, 99))

    if high <= low:
        high = low + 1.0

    clipped = np.clip(ela_map, low, high)
    normalized = ((clipped - low) / (high - low) * 255.0).astype(np.uint8)

    heatmap = cv2.applyColorMap(normalized, cv2.COLORMAP_JET)
    return heatmap


def detect_ela_regions(
    ela_map: np.ndarray,
    min_area: int = 150,
) -> Dict[str, Any]:
    """
    Detect localized regions with statistically elevated reconstruction error.

    Forensic Methodology:
    - On a genuine document, JPEG compression error is relatively uniform across
      the document surface (low standard deviation, modest peak difference).
    - Tampered or spliced regions (e.g. altered dates, modified numbers, inserted logos)
      diverge significantly from the document's baseline error distribution.
    - Uses adaptive statistical thresholding: `max(14.0, mean + 2.5 * std)`.
    - Applies morphological closing to cluster adjacent high-error pixels into
      continuous suspicious zones.
    - Employs contour analysis to extract bounding boxes for suspicious regions.

    Returns:
        Dict containing threshold, suspicious_ratio, suspicious_regions, and verdict metrics.
    """
    total_pixels = ela_map.size
    if total_pixels == 0:
        return {
            "threshold": 0.0,
            "suspicious_pixels": 0,
            "total_pixels": 0,
            "suspicious_ratio": 0.0,
            "mask": np.zeros((0, 0), dtype=np.uint8),
            "is_tampered": False,
            "tampering_score": 0.0,
            "confidence": 90.0,
            "regions": [],
        }

    mean_diff = float(np.mean(ela_map))
    std_diff = float(np.std(ela_map))
    max_diff = int(np.max(ela_map))

    # Adaptive outlier threshold based on baseline distribution
    # A minimum threshold of 14.0 prevents uniform subtle JPEG noise from being flagged
    effective_threshold = float(max(14.0, mean_diff + 2.5 * std_diff))

    # Pixel-level outlier mask
    raw_mask = (ela_map >= effective_threshold).astype(np.uint8) * 255
    suspicious_pixels = int(np.count_nonzero(raw_mask))
    suspicious_ratio = float(suspicious_pixels / total_pixels)

    # Morphological closing to connect nearby error clusters
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
    closed_mask = cv2.morphologyEx(raw_mask, cv2.MORPH_CLOSE, kernel)

    # Find external contours of suspicious clusters
    contours, _ = cv2.findContours(closed_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    suspicious_regions: List[Dict[str, Any]] = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area >= min_area:
            x, y, w, h = cv2.boundingRect(cnt)
            suspicious_regions.append({
                "x": int(x),
                "y": int(y),
                "width": int(w),
                "height": int(h),
                "label": "ELA Compression Discontinuity",
                "severity": "high" if area > 600 else "medium",
                "area": int(area),
            })

    # Normalized tampering score (0.0 to 1.0)
    # Ratio of 0.02 (2% of document surface in anomalous error) represents strong tampering
    ratio_score = min(suspicious_ratio / 0.02, 1.0)
    region_bonus = min(len(suspicious_regions) * 0.25, 0.5)
    score = round(min(ratio_score * 0.8 + region_bonus, 1.0), 4)

    is_tampered = (suspicious_ratio >= 0.005 and len(suspicious_regions) > 0) or (len(suspicious_regions) >= 2)

    if is_tampered:
        confidence = min(70.0 + (suspicious_ratio * 1000.0) + (len(suspicious_regions) * 5.0), 96.0)
    else:
        confidence = 94.0

    return {
        "threshold": round(effective_threshold, 4),
        "suspicious_pixels": suspicious_pixels,
        "total_pixels": total_pixels,
        "suspicious_ratio": round(suspicious_ratio, 6),
        "mask": raw_mask,
        "is_tampered": is_tampered,
        "tampering_score": score,
        "confidence": round(float(confidence), 2),
        "regions": suspicious_regions,
    }