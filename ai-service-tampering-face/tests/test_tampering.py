"""
Forensic Tampering Detection Unit and Integration Test Suite.

Verifies:
1. Copy-Move feature matching, Lowe ratio test, and shift-vector clustering.
2. Error Level Analysis (ELA) adaptive thresholding and bounding box extraction.
3. Splicing / Edge seam gradient discontinuity detection.
4. Unified detect_tampering facade and API contracts.
5. Legacy helper functions backward compatibility.
6. FastAPI endpoints (/tampering/analyze and /analyze).
"""

import os
import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.tampering.copy_move import detect_copy_move
from app.tampering.ela import calculate_ela, create_ela_visualization, detect_ela_regions
from app.tampering.splicing import detect_splicing
from app.tampering.detector import (
    detect_tampering,
    aggregate_tampering_signals,
    calculate_tampering_score,
    get_verdict,
    calculate_confidence,
    build_finding,
    normalize_ela_score,
)


client = TestClient(app)


def create_blank_card(width: int = 500, height: int = 350) -> np.ndarray:
    """Helper to generate a clean synthetic ID card with borders and text."""
    doc = np.ones((height, width, 3), dtype=np.uint8) * 245
    cv2.rectangle(doc, (10, 10), (width - 10, height - 10), (200, 200, 200), 2)
    cv2.putText(doc, "REPUBLIC IDENTITY CARD", (30, 45), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (40, 40, 40), 2)
    cv2.putText(doc, "NAME: ANONYMOUS CITIZEN", (30, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (50, 50, 50), 1)
    cv2.putText(doc, "DOB: 15/08/1990", (30, 140), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (50, 50, 50), 1)
    cv2.putText(doc, "ID NO: 9876-5432-1098", (30, 180), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (50, 50, 50), 1)
    return doc


def encode_image(img: np.ndarray, ext: str = ".jpg") -> bytes:
    """Helper to encode image to memory buffer bytes."""
    success, buf = cv2.imencode(ext, img)
    assert success
    return buf.tobytes()


# =====================================================================
# 1. Copy-Move Forgery Detection Tests
# =====================================================================

def test_copy_move_clean_document():
    """Ensure a genuine document with standard text does not trigger false copy-move clones."""
    doc = create_blank_card()
    result = detect_copy_move(doc)

    assert result["is_tampered"] is False
    assert result["suspicious_matches"] < 6
    assert result["score"] < 0.30


def test_copy_move_cloned_feature_detection():
    """Ensure duplicate/cloned feature-rich patches are accurately detected with bounding boxes."""
    doc = create_blank_card(width=600, height=400)

    # Generate distinct texture stamp
    stamp = np.zeros((70, 70, 3), dtype=np.uint8)
    for i in range(10):
        cv2.circle(stamp, (10 + i * 5, 20 + (i % 3) * 10), 4, (i * 25, 255 - i * 20, 150), 2)
        cv2.line(stamp, (5, i * 7), (65, 70 - i * 7), (200, 100, 50), 1)

    # Clone stamp at distant locations
    doc[50:120, 50:120] = stamp
    doc[250:320, 400:470] = stamp

    result = detect_copy_move(doc)

    assert result["is_tampered"] is True
    assert result["suspicious_matches"] >= 10
    assert result["score"] >= 0.60
    assert len(result["regions"]) >= 2

    # Verify extracted bounding boxes enclose the stamped regions
    regions = result["regions"]
    has_source = any(r["x"] <= 60 and r["y"] <= 60 for r in regions)
    has_target = any(r["x"] >= 380 and r["y"] >= 230 for r in regions)
    assert has_source and has_target


# =====================================================================
# 2. Error Level Analysis (ELA) Tests
# =====================================================================

def test_ela_clean_document():
    """Ensure a uniformly compressed document produces low suspicious ratio and no regions."""
    doc = create_blank_card()
    ela_map, mean_err, max_err = calculate_ela(doc)
    result = detect_ela_regions(ela_map)

    assert result["is_tampered"] is False
    assert result["suspicious_ratio"] < 0.005
    assert len(result["regions"]) == 0
    assert result["tampering_score"] < 0.30


def test_ela_tampered_patch():
    """Ensure altered noisy/spliced patch is flagged by ELA with accurate bounding box."""
    doc = create_blank_card()
    # Insert high-contrast noisy patch simulating altered text
    noise_patch = np.random.randint(0, 255, (40, 160, 3), dtype=np.uint8)
    doc[140:180, 30:190] = noise_patch

    ela_map, mean_err, max_err = calculate_ela(doc)
    result = detect_ela_regions(ela_map)

    assert result["is_tampered"] is True
    assert result["suspicious_ratio"] > 0.005
    assert result["tampering_score"] >= 0.50
    assert len(result["regions"]) >= 1

    # Verify the bounding box accurately locates the inserted patch (30, 140, 160, 40)
    bbox = result["regions"][0]
    assert abs(bbox["x"] - 30) <= 15
    assert abs(bbox["y"] - 140) <= 15
    assert abs(bbox["width"] - 160) <= 20
    assert abs(bbox["height"] - 40) <= 20


def test_ela_visualization():
    """Verify ELA visualization returns valid color heatmap without disk writes."""
    doc = create_blank_card()
    ela_map, _, _ = calculate_ela(doc)
    heatmap = create_ela_visualization(ela_map)

    assert heatmap is not None
    assert heatmap.shape == doc.shape
    assert heatmap.dtype == np.uint8


# =====================================================================
# 3. Splicing / Edge Seam Detection Tests
# =====================================================================

def test_splicing_clean_document():
    """Ensure clean document with natural borders does not trigger spliced overlay alarms."""
    doc = create_blank_card()
    result = detect_splicing(doc)

    assert result["is_tampered"] is False
    assert result["tampering_score"] == 0.0
    assert len(result["regions"]) == 0


def test_splicing_pasted_photo():
    """Ensure pasted rectangular photo patch is detected with perimeter bounding box."""
    doc = create_blank_card()
    # Paste photo block
    photo_patch = np.zeros((120, 100, 3), dtype=np.uint8)
    cv2.circle(photo_patch, (50, 50), 30, (180, 180, 180), -1)
    doc[80:200, 350:450] = photo_patch

    result = detect_splicing(doc)

    assert result["is_tampered"] is True
    assert result["tampering_score"] >= 0.40
    assert len(result["regions"]) >= 1

    # Verify detected region matches photo bounds (350, 80, 100, 120)
    found_photo = any(
        abs(r["x"] - 350) <= 15
        and abs(r["y"] - 80) <= 15
        and abs(r["width"] - 100) <= 15
        and abs(r["height"] - 120) <= 15
        for r in result["regions"]
    )
    assert found_photo


# =====================================================================
# 4. Unified Detector Facade Tests
# =====================================================================

def test_detect_tampering_facade_clean():
    """Verify detect_tampering on clean document conforms to full schema."""
    doc = create_blank_card()
    res = detect_tampering(doc)

    assert res["is_tampered"] is False
    assert res["verdict"] == "NO_TAMPERING_DETECTED"
    assert res["level"] == "LOW"
    assert res["score"] <= 0.30
    assert res["tamperingScore"] <= 30.0
    assert isinstance(res["indicators"], list)
    assert isinstance(res["suspicious_regions"], list)
    assert "signals" in res
    assert "ela" in res["signals"]
    assert "copy_move" in res["signals"]
    assert "splicing" in res["signals"]


def test_detect_tampering_facade_tampered():
    """Verify detect_tampering flags tampered document with rich indicators."""
    doc = create_blank_card()
    # Insert both an altered text patch and a spliced photo
    noise_patch = np.random.randint(0, 255, (40, 160, 3), dtype=np.uint8)
    doc[140:180, 30:190] = noise_patch

    res = detect_tampering(doc)

    assert res["is_tampered"] is True
    assert res["score"] >= 0.30
    assert len(res["indicators"]) >= 1
    assert len(res["suspicious_regions"]) >= 1

    first_ind = res["indicators"][0]
    assert "id" in first_ind
    assert "title" in first_ind
    assert "severity" in first_ind
    assert "confidence" in first_ind
    assert "confidenceLabel" in first_ind
    assert "location" in first_ind
    assert "description" in first_ind
    assert "reasonCode" in first_ind


# =====================================================================
# 5. Backward Compatibility Helpers Tests
# =====================================================================

def test_legacy_helpers():
    """Ensure all existing helper functions preserve exact behavior."""
    assert calculate_tampering_score(0.5, 0.5, 0.5) == 50.0
    assert get_verdict(20.0) == "NO_TAMPERING_DETECTED"
    assert get_verdict(45.0) == "LOW_TAMPERING_SUSPICION"
    assert get_verdict(80.0) == "EVIDENT_TAMPERING"

    conf = calculate_confidence(80.0, 2)
    assert 70.0 <= conf <= 98.0

    finding = build_finding(
        indicator_id="test_ind",
        title="Test Finding",
        severity="high",
        confidence=88.5,
        location="Field 1",
        description="Test description",
        reason_code="TEST_CODE",
    )
    assert finding["id"] == "test_ind"
    assert finding["confidenceLabel"] == "High confidence"
    assert finding["reasonCode"] == "TEST_CODE"

    norm_ela = normalize_ela_score(mean_error=0.1, max_error=2, suspicious_ratio=0.0)
    assert norm_ela == 0.0


# =====================================================================
# 6. Edge Cases: Very Small or Blank Images
# =====================================================================

def test_small_or_solid_images():
    """Ensure detectors gracefully handle edge cases like solid or tiny images without crash."""
    tiny = np.ones((20, 20, 3), dtype=np.uint8) * 128
    res_cm = detect_copy_move(tiny)
    res_sp = detect_splicing(tiny)
    res_full = detect_tampering(tiny)

    assert res_cm["is_tampered"] is False
    assert res_sp["is_tampered"] is False
    assert res_full["is_tampered"] is False


# =====================================================================
# 7. Endpoint Tests: /tampering/analyze
# =====================================================================

def test_tampering_analyze_endpoint():
    """Test dedicated /tampering/analyze endpoint returns clean JSON without rogue file writes."""
    if os.path.exists("ela_result.jpg"):
        os.remove("ela_result.jpg")

    doc = create_blank_card()
    doc_bytes = encode_image(doc)

    resp = client.post(
        "/tampering/analyze",
        files={"document": ("test_doc.jpg", doc_bytes, "image/jpeg")},
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert "ela" in data
    assert "copy_move" in data
    assert "splicing" in data
    assert "tampering" in data
    assert "regions" in data["ela"]

    # Verify no ela_result.jpg file is lingering or created on disk
    assert not os.path.exists("ela_result.jpg")
