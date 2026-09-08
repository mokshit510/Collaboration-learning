"""
Forensic Copy-Move Forgery Detection Module.

Identifies duplicate/cloned regions within a document using ORB keypoint
feature extraction, Lowe ratio matching, spatial distance thresholding,
and displacement vector coherence clustering.
"""

from typing import Any, Dict, List, Tuple
import cv2
import numpy as np


def detect_copy_move(
    image: np.ndarray,
    min_cluster_size: int = 6,
    displacement_bin_size: int = 25,
) -> Dict[str, Any]:
    """
    Detect copy-move forgery within a single document image.

    Forensic Methodology:
    1. Feature Extraction: Extracts ORB keypoints and descriptors.
    2. Self-Matching: Matches descriptors against the image itself using k-NN (k=3).
       - k=0 is the keypoint matching itself (distance 0).
       - k=1 is the closest distinct candidate feature.
       - k=2 is the second-closest candidate (used for Lowe's ratio test).
    3. Duplicate Filtering: Enforces `queryIdx < trainIdx` to eliminate duplicate
       symmetric pairs and self-matches.
    4. Lowe's Ratio Test: `m.distance < 0.75 * n.distance` to ensure distinctiveness.
    5. Spatial Distance: Filters out keypoints closer than 40px to prevent false positives
       from localized dense patterns.
    6. Shift-Vector (Displacement) Coherence: Cloned patches exhibit coherent translation
       vectors (dx, dy). Filters out random character repetitions (like '0' or ':')
       and retains true cloned blocks.
    7. Spatial Clustering: Generates bounding boxes for source and destination cloned areas.

    Returns:
        {
            "matches": int,
            "suspicious_matches": int,
            "score": float (0.0 to 1.0),
            "is_tampered": bool,
            "confidence": float (0.0 to 100.0),
            "regions": list of bounding box dicts,
            "match_details": list of matched point pairs,
            "details": dict
        }
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    height, width = gray.shape

    # ORB feature detector
    orb = cv2.ORB_create(nfeatures=2500)
    keypoints, descriptors = orb.detectAndCompute(gray, None)

    # Insufficient features to conduct forensic analysis
    if descriptors is None or len(keypoints) < 10:
        return {
            "matches": 0,
            "suspicious_matches": 0,
            "score": 0.0,
            "is_tampered": False,
            "confidence": 95.0,
            "regions": [],
            "match_details": [],
            "details": {"reason": "Insufficient keypoints for copy-move analysis"},
        }

    # Match descriptors against themselves
    matcher = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=False)
    knn_matches = matcher.knnMatch(descriptors, descriptors, k=3)

    raw_suspicious: List[Dict[str, Any]] = []
    vector_bins: Dict[Tuple[int, int], List[Dict[str, Any]]] = {}

    for pair in knn_matches:
        if len(pair) < 3:
            continue

        m = pair[1]  # Closest candidate (pair[0] is self-match)
        n = pair[2]  # Second closest candidate

        # Ignore self-matches and duplicate symmetric pairs
        if m.queryIdx >= m.trainIdx:
            continue

        # Lowe's ratio test
        if m.distance >= 0.75 * n.distance:
            continue

        # Feature distance threshold
        if m.distance > 65.0:
            continue

        p1 = np.array(keypoints[m.queryIdx].pt)
        p2 = np.array(keypoints[m.trainIdx].pt)
        spatial_dist = float(np.linalg.norm(p1 - p2))

        # Ignore keypoints within immediate local neighborhood
        if spatial_dist < 40.0:
            continue

        # Bin by quantized displacement vector
        dx = int(round((p2[0] - p1[0]) / displacement_bin_size) * displacement_bin_size)
        dy = int(round((p2[1] - p1[1]) / displacement_bin_size) * displacement_bin_size)
        vec_key = (dx, dy)

        match_info = {
            "point1": (round(float(p1[0]), 1), round(float(p1[1]), 1)),
            "point2": (round(float(p2[0]), 1), round(float(p2[1]), 1)),
            "feature_distance": round(float(m.distance), 2),
            "spatial_distance": round(spatial_dist, 2),
            "vector": vec_key,
        }
        raw_suspicious.append(match_info)

        if vec_key not in vector_bins:
            vector_bins[vec_key] = []
        vector_bins[vec_key].append(match_info)

    # Coherent displacement clustering
    coherent_matches: List[Dict[str, Any]] = []
    suspicious_regions: List[Dict[str, Any]] = []

    for vec, matches_in_bin in vector_bins.items():
        if len(matches_in_bin) >= min_cluster_size:
            coherent_matches.extend(matches_in_bin)

            pts1 = [m["point1"] for m in matches_in_bin]
            pts2 = [m["point2"] for m in matches_in_bin]

            for pts, label in [(pts1, "Source Cloned Area"), (pts2, "Target Cloned Area")]:
                arr = np.array(pts)
                min_x = max(0, int(np.min(arr[:, 0])) - 15)
                min_y = max(0, int(np.min(arr[:, 1])) - 15)
                max_x = min(width, int(np.max(arr[:, 0])) + 15)
                max_y = min(height, int(np.max(arr[:, 1])) + 15)

                region = {
                    "x": min_x,
                    "y": min_y,
                    "width": max_x - min_x,
                    "height": max_y - min_y,
                    "label": label,
                    "severity": "high" if len(matches_in_bin) >= 15 else "medium",
                    "matches": len(matches_in_bin),
                }

                # Avoid duplicate regions
                if not any(
                    abs(r["x"] - region["x"]) < 10 and abs(r["y"] - region["y"]) < 10
                    for r in suspicious_regions
                ):
                    suspicious_regions.append(region)

    suspicious_count = len(coherent_matches)

    # Fallback heuristic if matches are dispersed across slight angle variations
    if suspicious_count == 0 and len(raw_suspicious) >= 30:
        suspicious_count = min(len(raw_suspicious) // 2, 20)

    # Normalized score between 0.0 and 1.0
    score = min(suspicious_count / 15.0, 1.0)
    is_tampered = suspicious_count >= min_cluster_size

    # Confidence calculation
    if is_tampered:
        confidence = min(75.0 + (suspicious_count * 1.5), 98.0)
    else:
        confidence = 92.0

    return {
        "matches": len(knn_matches),
        "suspicious_matches": suspicious_count,
        "score": round(float(score), 4),
        "is_tampered": is_tampered,
        "confidence": round(float(confidence), 2),
        "regions": suspicious_regions if suspicious_regions else (raw_suspicious[:20]),
        "match_details": coherent_matches[:50],
        "details": {
            "coherent_vector_clusters": len([v for v, m in vector_bins.items() if len(m) >= min_cluster_size]),
            "total_raw_pairs": len(raw_suspicious),
        },
    }
