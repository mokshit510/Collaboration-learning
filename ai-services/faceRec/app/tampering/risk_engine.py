from typing import Any, Dict, List, Optional


# =====================================================================
# Configurable Risk Thresholds & Weights (Easily tuned in one place)
# =====================================================================
RISK_THRESHOLD_HIGH = 0.60
RISK_THRESHOLD_MEDIUM = 0.30

WEIGHT_IMAGE_TAMPERING = 0.50
WEIGHT_IDENTITY_VERIFICATION = 0.50

# Identity specific risk penalties
PENALTY_FACE_MISMATCH = 0.85
PENALTY_NO_DOCUMENT_FACE = 0.35
PENALTY_MULTIPLE_DOCUMENT_FACES = 0.15


def evaluate_risk(
    tampering_result: Dict[str, Any],
    face_extraction_result: Optional[Dict[str, Any]] = None,
    face_verification_result: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Transparent, explainable risk assessment engine for PRAMAAN.

    Combines:
    1. Image tampering evidence (ELA + Copy-Move pixel anomalies).
    2. Identity verification evidence (Face biometric matching + Portrait detection).

    Architecture & Forensic Principle:
    - Face mismatch is identity verification evidence.
    - ELA/Copy-Move are image pixel tampering evidence.
    - A face mismatch increases overall document risk without erroneously classifying
      the image bytes themselves as cloned or recompressed.

    Returns:
        {
            "score": float (0.0 to 1.0),
            "level": "LOW" | "MEDIUM" | "HIGH",
            "reasons": list of human-readable explanation strings
        }
    """
    reasons: List[str] = []
    tamper_score = float(tampering_result.get("score", 0.0))
    signals = tampering_result.get("signals", {})

    # -------------------------------------------------------------
    # 1. Image Tampering Reasons
    # -------------------------------------------------------------
    ela_sig = signals.get("ela") if isinstance(signals, dict) else None
    if ela_sig and float(ela_sig.get("score", 0.0)) >= 0.35:
        reasons.append(
            f"Error-Level Analysis shows elevated compression anomalies (ratio: {ela_sig.get('suspicious_ratio', 0):.4f})"
        )

    cm_sig = signals.get("copy_move") if isinstance(signals, dict) else None
    if cm_sig and int(cm_sig.get("suspicious_matches", 0)) >= 5:
        reasons.append(
            f"Copy-Move detection flagged {cm_sig.get('suspicious_matches')} potential cloned/duplicated feature clusters"
        )

    # -------------------------------------------------------------
    # 2. Identity Verification & Face Analysis
    # -------------------------------------------------------------
    identity_risk = 0.0

    if face_extraction_result:
        face_count = face_extraction_result.get("face_count", 0)
        if face_count == 0:
            identity_risk = max(identity_risk, PENALTY_NO_DOCUMENT_FACE)
            reasons.append("No human portrait face was detected on the document")
        elif face_count > 1:
            identity_risk = max(identity_risk, PENALTY_MULTIPLE_DOCUMENT_FACES)
            reasons.append(f"Multiple ({face_count}) faces detected on document; expected single cardholder portrait")

    if face_verification_result and face_verification_result.get("available"):
        verified = face_verification_result.get("verified")
        distance = face_verification_result.get("distance")
        threshold = face_verification_result.get("threshold")

        if verified is False:
            identity_risk = max(identity_risk, PENALTY_FACE_MISMATCH)
            reasons.append(
                f"Biometric mismatch: live selfie does not match document portrait (distance: {distance}, threshold: {threshold})"
            )
        elif verified is True:
            # Clean match lowers identity risk
            identity_risk = 0.0

    # -------------------------------------------------------------
    # 3. Transparent Weighted Risk Aggregation
    # -------------------------------------------------------------
    # If face verification wasn't performed, base risk purely on tampering + document face presence
    if face_verification_result and face_verification_result.get("available"):
        overall_score = (WEIGHT_IMAGE_TAMPERING * tamper_score) + (
            WEIGHT_IDENTITY_VERIFICATION * identity_risk
        )
    else:
        overall_score = max(tamper_score, identity_risk)

    overall_score = round(max(0.0, min(1.0, overall_score)), 2)

    # -------------------------------------------------------------
    # 4. Categorical Level Classification
    # -------------------------------------------------------------
    if overall_score >= RISK_THRESHOLD_HIGH:
        level = "HIGH"
    elif overall_score >= RISK_THRESHOLD_MEDIUM:
        level = "MEDIUM"
    else:
        level = "LOW"

    if not reasons:
        reasons.append("All forensic and biometric checks within normal baseline parameters")

    return {
        "score": overall_score,
        "level": level,
        "reasons": reasons,
    }
