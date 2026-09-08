"""
Forensic Splicing and Edge-Discontinuity Detection Module.

Analyzes gradient magnitudes and perimeter boundary transitions to detect
spliced photo overlays, inserted digital blocks, and seam inconsistencies.
"""

from typing import Any, Dict, List
import cv2
import numpy as np


def detect_splicing(
    image: np.ndarray,
    min_area: int = 1200,
    gradient_threshold: int = 80,
) -> Dict[str, Any]:
    """
    Detect spliced patches and unnatural boundary seams on a document.

    Forensic Methodology:
    - Digital insertions (such as pasted portrait photos or overwritten panels)
      create high-gradient unnatural straight-line seams at their bounding boundaries.
    - Uses Sobel edge gradient magnitude analysis across horizontal and vertical directions.
    - Evaluates geometric rectangularity and edge strength along candidate perimeters.
    - Filters out natural outer document borders and nested internal features.

    Returns:
        {
            "is_tampered": bool,
            "tampering_score": float (0.0 to 1.0),
            "confidence": float,
            "regions": list of bounding box dicts,
            "details": dict
        }
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    height, width = gray.shape

    if height < 30 or width < 30:
        return {
            "is_tampered": False,
            "tampering_score": 0.0,
            "confidence": 90.0,
            "regions": [],
            "details": {"reason": "Image too small for splicing analysis"},
        }

    # Sobel gradient magnitude calculation
    sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    grad_mag = np.sqrt(sobelx**2 + sobely**2)
    grad_norm = np.uint8(np.clip(grad_mag, 0, 255))

    # Threshold sharp gradient boundaries
    _, thresh = cv2.threshold(grad_norm, gradient_threshold, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(thresh, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

    candidates: List[Dict[str, Any]] = []

    for cnt in contours:
        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.02 * peri, True)
        bx, by, bw, bh = cv2.boundingRect(approx)
        area = cv2.contourArea(approx)

        # Ignore tiny artifacts
        if area < min_area:
            continue

        # Ignore outer document boundary
        if bw > 0.82 * width and bh > 0.82 * height:
            continue

        # Check rectangularity and aspect ratio
        extent = float(area) / (bw * bh) if bw * bh > 0 else 0
        aspect_ratio = float(bw) / bh if bh > 0 else 0

        # Spliced patches / portraits are typically rectangular (extent > 0.65)
        # with reasonable aspect ratio (0.3 to 3.0)
        if extent > 0.65 and 0.3 <= aspect_ratio <= 3.0:
            # Measure gradient variance along perimeter
            perimeter_mask = np.zeros((height, width), dtype=np.uint8)
            cv2.drawContours(perimeter_mask, [cnt], -1, 255, 3)
            mask_pts = np.count_nonzero(perimeter_mask)
            mean_edge_strength = (
                float(np.mean(grad_norm[perimeter_mask > 0])) if mask_pts > 0 else 0.0
            )

            if mean_edge_strength > 60.0:
                candidates.append({
                    "x": int(bx),
                    "y": int(by),
                    "width": int(bw),
                    "height": int(bh),
                    "label": "Spliced Overlay / Seam Anomaly",
                    "severity": "high" if area > 4000 else "medium",
                    "edge_strength": round(mean_edge_strength, 2),
                    "area": int(area),
                })

    # Filter nested candidate boxes: if box A contains box B, retain the outer bounding seam A
    filtered_regions: List[Dict[str, Any]] = []
    # Sort candidates descending by area
    sorted_candidates = sorted(candidates, key=lambda c: c["area"], reverse=True)

    for cand in sorted_candidates:
        # Check if already covered or identical
        is_nested = False
        for kept in filtered_regions:
            # Check if cand is inside kept
            if (
                cand["x"] >= kept["x"] - 5
                and cand["y"] >= kept["y"] - 5
                and (cand["x"] + cand["width"]) <= (kept["x"] + kept["width"] + 5)
                and (cand["y"] + cand["height"]) <= (kept["y"] + kept["height"] + 5)
            ):
                is_nested = True
                break

        if not is_nested:
            filtered_regions.append(cand)

    region_count = len(filtered_regions)
    score = min(region_count * 0.45, 1.0)
    is_tampered = region_count > 0

    if is_tampered:
        confidence = min(78.0 + (region_count * 8.0), 96.0)
    else:
        confidence = 92.0

    return {
        "is_tampered": is_tampered,
        "tampering_score": round(float(score), 4),
        "confidence": round(float(confidence), 2),
        "regions": filtered_regions,
        "details": {
            "spliced_candidates_found": region_count,
        },
    }
