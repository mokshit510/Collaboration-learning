import io
import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.face.extraction import extract_document_face
from app.face.verification import verify_faces
from app.tampering.detector import aggregate_tampering_signals, normalize_ela_score
from app.tampering.risk_engine import evaluate_risk


client = TestClient(app)


def create_blank_card(width: int = 500, height: int = 350) -> np.ndarray:
    """Create a basic blank document card with borders."""
    doc = np.ones((height, width, 3), dtype=np.uint8) * 245
    # Add border
    cv2.rectangle(doc, (10, 10), (width - 10, height - 10), (200, 200, 200), 2)
    # Add sample printed header
    cv2.putText(doc, "REPUBLIC IDENTITY CARD", (30, 45), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (40, 40, 40), 2)
    return doc


def encode_image(img: np.ndarray, ext: str = ".jpg") -> bytes:
    """Encode OpenCV image to bytes."""
    success, buf = cv2.imencode(ext, img)
    assert success
    return buf.tobytes()


# ---------------------------------------------------------------------
# 1. Genuine Document Test
# ---------------------------------------------------------------------
def test_genuine_document():
    """Verify that a clean, genuine document produces low tampering score."""
    doc = create_blank_card()
    cv2.putText(doc, "NAME: ANONYMOUS CITIZEN", (30, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (50, 50, 50), 1)
    cv2.putText(doc, "DOB: 15/08/1990", (30, 140), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (50, 50, 50), 1)
    cv2.putText(doc, "ID NO: 9876-5432-1098", (30, 180), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (50, 50, 50), 1)

    doc_bytes = encode_image(doc)
    resp = client.post(
        "/analyze",
        files={"document": ("genuine_doc.jpg", doc_bytes, "image/jpeg")},
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert data["tampering"]["score"] <= 0.30
    assert data["tampering"]["level"] in ["LOW", "MEDIUM"]


# ---------------------------------------------------------------------
# 2. Tampered Document with Changed Text (High noise / anomaly)
# ---------------------------------------------------------------------
def test_tampered_document_changed_text():
    """Verify that a document with an altered noisy patch is evaluated by the pipeline."""
    doc = create_blank_card()
    cv2.putText(doc, "ORIGINAL TEXT", (30, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (50, 50, 50), 1)

    # Simulate pasted / modified text block with high-contrast sharp noise
    noise_patch = np.random.randint(0, 255, (40, 160, 3), dtype=np.uint8)
    doc[140:180, 30:190] = noise_patch

    doc_bytes = encode_image(doc)
    resp = client.post(
        "/analyze",
        files={"document": ("tampered_text.jpg", doc_bytes, "image/jpeg")},
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert "tampering" in data
    assert "risk" in data


# ---------------------------------------------------------------------
# 3. Tampered Document with Replaced Photo
# ---------------------------------------------------------------------
def test_tampered_document_replaced_photo():
    """Verify handling when a photo patch has been inserted into the document."""
    doc = create_blank_card()
    # Insert an alien block simulating a swapped photograph
    photo_patch = np.zeros((120, 100, 3), dtype=np.uint8)
    cv2.circle(photo_patch, (50, 50), 30, (180, 180, 180), -1)
    doc[80:200, 350:450] = photo_patch

    doc_bytes = encode_image(doc)
    resp = client.post(
        "/analyze",
        files={"document": ("replaced_photo.jpg", doc_bytes, "image/jpeg")},
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert "signals" in data["tampering"]


# ---------------------------------------------------------------------
# 4. Tampered Document with Copy/Paste Manipulation
# ---------------------------------------------------------------------
def test_tampered_copy_paste_manipulation():
    """Verify detection when identical feature-rich blocks are cloned across the image."""
    doc = create_blank_card(600, 400)

    # Generate a complex texture stamp
    stamp = np.zeros((70, 70, 3), dtype=np.uint8)
    for i in range(10):
        cv2.circle(stamp, (10 + i * 5, 20 + (i % 3) * 10), 4, (i * 25, 255 - i * 20, 150), 2)
        cv2.line(stamp, (5, i * 7), (65, 70 - i * 7), (200, 100, 50), 1)

    # Clone the stamp at two distant positions
    doc[50:120, 50:120] = stamp
    doc[250:320, 400:470] = stamp

    doc_bytes = encode_image(doc)
    resp = client.post(
        "/analyze",
        files={"document": ("copy_paste.jpg", doc_bytes, "image/jpeg")},
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert "copy_move" in data["tampering"]["signals"]


# ---------------------------------------------------------------------
# 5. Face Match Test
# ---------------------------------------------------------------------
def test_face_verification_match():
    """Verify biometric face verification logic when identical portraits are submitted."""
    face_img = np.ones((120, 120, 3), dtype=np.uint8) * 160
    cv2.circle(face_img, (60, 50), 25, (80, 80, 80), -1)

    result = verify_faces(
        document_face=face_img,
        live_face=face_img,
        model_name="Facenet512",
    )

    assert result["available"] is True
    assert result["verified"] is True
    assert result["distance"] <= result["threshold"]


# ---------------------------------------------------------------------
# 6. Face Mismatch Test
# ---------------------------------------------------------------------
def test_face_verification_mismatch():
    """Verify biometric face verification logic when completely different faces are submitted."""
    face1 = np.ones((120, 120, 3), dtype=np.uint8) * 160
    face2 = np.random.randint(0, 255, (120, 120, 3), dtype=np.uint8)

    result = verify_faces(
        document_face=face1,
        live_face=face2,
        model_name="Facenet512",
    )

    assert result["available"] is True
    assert result["verified"] is False
    assert result["distance"] > result["threshold"]

    # Verify risk engine flags the mismatch with penalty
    tamper_mock = {"score": 0.10, "level": "LOW", "signals": {}}
    risk = evaluate_risk(
        tampering_result=tamper_mock,
        face_verification_result=result,
    )
    assert risk["score"] >= 0.40
    assert any("mismatch" in r.lower() for r in risk["reasons"])


# ---------------------------------------------------------------------
# 7. No Face Detected Test
# ---------------------------------------------------------------------
def test_no_face_detected():
    """Verify graceful handling when no face is present on the document."""
    doc_without_face = np.ones((300, 400, 3), dtype=np.uint8) * 230
    res = extract_document_face(doc_without_face)

    assert res["detected"] is False
    assert res["face_count"] == 0
    assert res["bbox"] is None
    assert res["cropped_face"] is None
    assert "No face detected" in res["warning"]

    # In full /analyze pipeline, missing face should not crash and should trigger explainable reason
    doc_bytes = encode_image(doc_without_face)
    resp = client.post(
        "/analyze",
        files={"document": ("no_face.jpg", doc_bytes, "image/jpeg")},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert any("no human portrait face" in r.lower() for r in data["risk"]["reasons"])
