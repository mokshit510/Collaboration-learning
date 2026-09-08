"""
Document Tampering Detection Facade and Forensic Evidence Aggregator.

Unifies Error Level Analysis (ELA), Copy-Move feature matching, and Splicing /
Edge-gradient seam analysis into a calibrated, explainable evidence package.
"""

from typing import Any, Dict, List, Optional
import cv2
import numpy as np

from app.tampering.ela import calculate_ela, detect_ela_regions
from app.tampering.copy_move import detect_copy_move
from app.tampering.splicing import detect_splicing


def clamp(value: float, minimum: float = 0.0, maximum: float = 1.0) -> float:
    """Clamp a floating point number to a given [minimum, maximum] range."""
    return max(minimum, min(maximum, value))


def normalize_ela_score(
    mean_error: float,
    max_error: float,
    suspicious_ratio: float,
) -> float:
    """
    Normalize Error Level Analysis metrics into a bounded 0.0 - 1.0 evidence score.

    Forensic considerations:
    - ELA measures JPEG recompression error variations.
    - A genuine document will usually exhibit a low mean error (~0.1-2.5) and low suspicious_ratio (<0.005).
    - Tampered or spliced regions (resaved at different quality) exhibit localized high-frequency bursts.
    """
    if max_error <= 2 or suspicious_ratio <= 0.0001:
        return 0.0

    ratio_factor = clamp(suspicious_ratio / 0.02, 0.0, 1.0)
    error_factor = clamp((mean_error - 1.0) / 6.0, 0.0, 1.0)
    max_factor = clamp((max_error - 20) / 100.0, 0.0, 1.0)

    raw_score = (0.55 * ratio_factor) + (0.30 * error_factor) + (0.15 * max_factor)
    return round(clamp(raw_score, 0.0, 1.0), 4)


def get_verdict(score_100: float) -> str:
    """Convert 0-100 score to standardized PRAMAAN verdict string."""
    if score_100 < 30.0:
        return "NO_TAMPERING_DETECTED"
    if score_100 < 60.0:
        return "LOW_TAMPERING_SUSPICION"
    return "EVIDENT_TAMPERING"


def calculate_confidence(score_100: float, signal_count: int) -> float:
    """Estimate confidence from signal count and agreement."""
    if signal_count == 0:
        return 92.0
    agreement_bonus = min(signal_count * 4.0, 12.0)
    if score_100 >= 60.0:
        confidence = 78.0 + agreement_bonus
    elif score_100 >= 30.0:
        confidence = 65.0 + agreement_bonus
    else:
        confidence = 90.0 + (agreement_bonus / 2.0)
    return round(min(confidence, 98.0), 2)


def build_finding(
    indicator_id: str,
    title: str,
    severity: str,
    confidence: float,
    location: str,
    description: str,
    reason_code: str,
) -> Dict[str, Any]:
    """Construct a standardized TamperingIndicator conforming to frontend contract."""
    if confidence >= 80.0:
        confidence_label = "High confidence"
    elif confidence >= 60.0:
        confidence_label = "Medium confidence"
    else:
        confidence_label = "Low confidence"

    return {
        "id": indicator_id,
        "title": title,
        "severity": severity,
        "confidence": round(float(confidence), 2),
        "confidenceLabel": confidence_label,
        "location": location,
        "description": description,
        "reasonCode": reason_code,
    }


def calculate_tampering_score(
    ela_score: float,
    copy_move_score: float,
    edge_score: float = 0.0,
) -> float:
    """
    Weighted combination of individual forensic evidence scores into 0-100 scale.
    Preserved for backward compatibility.
    """
    ela = clamp(ela_score)
    cm = clamp(copy_move_score)
    edge = clamp(edge_score)

    combined = (ela * 0.40) + (cm * 0.40) + (edge * 0.20)
    return round(combined * 100.0, 2)


def merge_suspicious_regions(regions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Deduplicate overlapping or proximate bounding boxes across forensic detectors."""
    merged: List[Dict[str, Any]] = []
    for reg in regions:
        rx = reg.get("x", 0)
        ry = reg.get("y", 0)
        rw = reg.get("width", 0)
        rh = reg.get("height", 0)

        is_duplicate = False
        for m in merged:
            mx = m.get("x", 0)
            my = m.get("y", 0)
            mw = m.get("width", 0)
            mh = m.get("height", 0)

            if abs(rx - mx) < 20 and abs(ry - my) < 20 and abs(rw - mw) < 30 and abs(rh - mh) < 30:
                is_duplicate = True
                break

        if not is_duplicate:
            merged.append(reg)
    return merged


def aggregate_tampering_signals(
    ela_dict: Optional[Dict[str, Any]],
    copy_move_dict: Optional[Dict[str, Any]],
    splicing_dict: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Aggregate individual forensic signals (ELA + Copy-Move + Splicing) into unified evidence.

    Maintains 100% backward compatibility with existing tests and API contracts while
    exposing rich indicators, bounding boxes, and forensic indicators.
    """
    indicators: List[Dict[str, Any]] = []
    all_regions: List[Dict[str, Any]] = []
    reason_codes: List[str] = []

    # 1. ELA Signal processing
    if ela_dict is not None:
        mean_err = float(ela_dict.get("mean_error", 0.0))
        max_err = int(ela_dict.get("max_error", 0))
        susp_ratio = float(ela_dict.get("suspicious_ratio", 0.0))
        ela_regions = ela_dict.get("regions", [])

        # Prefer precomputed tampering_score if available from detect_ela_regions
        if "tampering_score" in ela_dict:
            ela_score = float(ela_dict["tampering_score"])
        else:
            ela_score = normalize_ela_score(mean_err, max_err, susp_ratio)

        ela_signal = {
            "score": ela_score,
            "mean_error": round(mean_err, 2),
            "max_error": max_err,
            "suspicious_ratio": round(susp_ratio, 6),
            "regions": ela_regions,
        }

        if ela_score >= 0.35 or len(ela_regions) > 0:
            finding = build_finding(
                indicator_id="compression_artifact",
                title="Inconsistent Compression Discontinuity",
                severity="high" if ela_score >= 0.60 else "medium",
                confidence=float(ela_dict.get("confidence", 88.0)),
                location="Document Surface / Payload Overlays",
                description=(
                    f"Error Level Analysis flagged compression anomaly "
                    f"(ratio: {susp_ratio:.4f}, regions: {len(ela_regions)})."
                ),
                reason_code="ERROR_LEVEL_ANOMALY",
            )
            indicators.append(finding)
            reason_codes.append("ERROR_LEVEL_ANOMALY")
            all_regions.extend(ela_regions)
    else:
        ela_score = 0.0
        ela_signal = None

    # 2. Copy-Move Signal processing
    if copy_move_dict is not None:
        cm_score = clamp(float(copy_move_dict.get("score", 0.0)), 0.0, 1.0)
        susp_matches = int(copy_move_dict.get("suspicious_matches", 0))
        cm_regions = copy_move_dict.get("regions", [])

        cm_signal = {
            "score": round(cm_score, 4),
            "suspicious_matches": susp_matches,
            "regions": cm_regions,
        }

        if cm_score >= 0.30 or susp_matches >= 6:
            finding = build_finding(
                indicator_id="copy_paste_clone",
                title="Duplicate / Cloned Elements Detected",
                severity="high" if cm_score >= 0.60 else "medium",
                confidence=float(copy_move_dict.get("confidence", 92.0)),
                location="Document Payload / Repeated Features",
                description=(
                    f"Copy-Move analysis identified {susp_matches} coherent keypoint matches "
                    f"sharing translation displacement vectors."
                ),
                reason_code="COPY_MOVE_FORGERY",
            )
            indicators.append(finding)
            reason_codes.append("COPY_MOVE_FORGERY")
            # Only add bounding box regions (not raw point pairs)
            bbox_regions = [r for r in cm_regions if isinstance(r, dict) and "width" in r]
            all_regions.extend(bbox_regions)
    else:
        cm_score = 0.0
        cm_signal = None

    # 3. Splicing / Edge Seam Signal processing
    if splicing_dict is not None:
        sp_score = clamp(float(splicing_dict.get("tampering_score", 0.0)), 0.0, 1.0)
        sp_regions = splicing_dict.get("regions", [])

        splicing_signal = {
            "score": round(sp_score, 4),
            "regions": sp_regions,
        }

        if sp_score >= 0.40 or len(sp_regions) > 0:
            finding = build_finding(
                indicator_id="photo_tamper",
                title="Possible Photo Replacement / Seam Splice",
                severity="high" if sp_score >= 0.60 else "medium",
                confidence=float(splicing_dict.get("confidence", 85.0)),
                location="Visual Inspection Zone / Overlay Boundary",
                description=(
                    f"Edge-gradient analysis detected {len(sp_regions)} sharp perimeter seam(s) "
                    f"characteristic of a pasted photo or overlay."
                ),
                reason_code="PHOTO_SPLICING_ANOMALY",
            )
            indicators.append(finding)
            reason_codes.append("PHOTO_SPLICING_ANOMALY")
            all_regions.extend(sp_regions)
    else:
        sp_score = 0.0
        splicing_signal = None

    # Weighted signal combination
    active_signals = [s for s in [ela_signal, cm_signal, splicing_signal] if s is not None]
    signal_count = len(active_signals)

    raw_weighted = (0.35 * ela_score) + (0.45 * cm_score) + (0.20 * sp_score)
    max_individual = max(ela_score, cm_score, sp_score)

    # If any single detector has high confidence detection, boost overall score
    combined_score = max(raw_weighted, max_individual * 0.85)
    combined_score = round(clamp(combined_score, 0.0, 1.0), 4)

    score_100 = round(combined_score * 100.0, 1)

    # Determine tampering level
    if combined_score >= 0.60:
        level = "HIGH"
    elif combined_score >= 0.30:
        level = "MEDIUM"
    else:
        level = "LOW"

    verdict = get_verdict(score_100)
    is_tampered = bool(combined_score >= 0.30 or len(indicators) > 0)
    confidence = calculate_confidence(score_100, len(indicators))

    if not is_tampered and not reason_codes:
        reason_codes = ["CLEAN_SURFACE_GRID", "COHERENT_COMPRESSION", "NO_CLONED_REGIONS"]

    merged_regions = merge_suspicious_regions(all_regions)

    return {
        "score": combined_score,
        "tamperingScore": score_100,
        "tampering_score": score_100,
        "level": level,
        "verdict": verdict,
        "is_tampered": is_tampered,
        "confidence": confidence,
        "indicators": indicators,
        "suspicious_regions": merged_regions,
        "suspiciousRegions": merged_regions,
        "reasonCodes": reason_codes,
        "signals": {
            "ela": ela_signal,
            "copy_move": cm_signal,
            "splicing": splicing_signal,
        },
    }


def detect_tampering(image: np.ndarray) -> Dict[str, Any]:
    """
    Master unified tampering detection facade.

    Executes:
    1. Error Level Analysis (recompression inconsistencies).
    2. Copy-Move Forgery Detection (cloned regions & keypoint clusters).
    3. Splicing / Edge Seam Analysis (sharp perimeter gradient anomalies).

    Returns:
        Structured result matching frontend and API specifications.
    """
    # 1. Error Level Analysis
    try:
        ela_map, mean_err, max_err = calculate_ela(image)
        ela_res = detect_ela_regions(ela_map)
        ela_dict = {
            "mean_error": mean_err,
            "max_error": max_err,
            "suspicious_ratio": ela_res["suspicious_ratio"],
            "threshold": ela_res["threshold"],
            "tampering_score": ela_res["tampering_score"],
            "confidence": ela_res["confidence"],
            "regions": ela_res["regions"],
        }
    except Exception:
        ela_dict = None

    # 2. Copy-Move Detection
    try:
        cm_dict = detect_copy_move(image)
    except Exception:
        cm_dict = None

    # 3. Splicing Detection
    try:
        sp_dict = detect_splicing(image)
    except Exception:
        sp_dict = None

    return aggregate_tampering_signals(
        ela_dict=ela_dict,
        copy_move_dict=cm_dict,
        splicing_dict=sp_dict,
    )