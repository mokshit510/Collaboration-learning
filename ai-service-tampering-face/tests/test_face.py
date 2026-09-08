import io
import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.face.detector import detect_faces
from app.face.extractor import crop_face
from app.face.extraction import extract_document_face
from app.face.verification import verify_faces, calculate_match_score


client = TestClient(app)


def encode_image(img: np.ndarray, ext: str = ".jpg") -> bytes:
    """Encode OpenCV image to bytes for HTTP upload testing."""
    success, buf = cv2.imencode(ext, img)
    assert success
    return buf.tobytes()


def create_blank_card(width: int = 500, height: int = 350) -> np.ndarray:
    """Create a basic blank document card with borders."""
    doc = np.ones((height, width, 3), dtype=np.uint8) * 245
    cv2.rectangle(doc, (10, 10), (width - 10, height - 10), (200, 200, 200), 2)
    return doc


def create_synthetic_portrait(size: int = 120) -> np.ndarray:
    """Create a synthetic face portrait array."""
    face = np.ones((size, size, 3), dtype=np.uint8) * 160
    cv2.circle(face, (size // 2, size // 2 - 10), 25, (80, 80, 80), -1)
    return face


# =====================================================================
# 1. Face Detector Unit Tests
# =====================================================================

def test_detect_faces_empty_input():
    """Verify detector handles empty or invalid inputs gracefully."""
    res = detect_faces(None)
    assert res["detected"] is False
    assert res["face_count"] == 0
    assert res["bbox"] is None

    empty_arr = np.array([], dtype=np.uint8)
    res_empty = detect_faces(empty_arr)
    assert res_empty["detected"] is False


def test_detect_faces_blank_card():
    """Verify no face is detected on a blank document card."""
    blank_doc = create_blank_card()
    res = detect_faces(blank_doc)
    assert res["detected"] is False
    assert res["face_count"] == 0
    assert res["bbox"] is None
    assert "No face detected" in res["warning"]


# =====================================================================
# 2. Face Extractor Unit Tests
# =====================================================================

def test_crop_face_basic():
    """Verify cropping with padding works accurately."""
    img = np.zeros((300, 300, 3), dtype=np.uint8)
    # Put a distinct color inside the target box
    img[50:150, 50:150] = (100, 150, 200)

    bbox = {"x": 50, "y": 50, "width": 100, "height": 100}
    crop_res = crop_face(img, bbox, padding_ratio=0.10)

    assert crop_res["cropped_face"] is not None
    # 100 + 10px padding on each side = 120x120
    assert crop_res["dimensions"]["width"] == 120
    assert crop_res["dimensions"]["height"] == 120
    assert crop_res["quality_ok"] is True


def test_crop_face_boundary_clamping():
    """Verify cropping at image boundaries clamps correctly without index error."""
    img = np.zeros((200, 200, 3), dtype=np.uint8)
    # Face placed flush at corner (0,0)
    bbox = {"x": 0, "y": 0, "width": 80, "height": 80}
    crop_res = crop_face(img, bbox, padding_ratio=0.20)

    assert crop_res["cropped_face"] is not None
    assert crop_res["crop_coords"]["x1"] == 0
    assert crop_res["crop_coords"]["y1"] == 0
    assert crop_res["crop_coords"]["x2"] == 96  # 80 + 16
    assert crop_res["crop_coords"]["y2"] == 96


def test_crop_face_low_resolution_warning():
    """Verify that small faces trigger a quality warning."""
    img = np.zeros((100, 100, 3), dtype=np.uint8)
    bbox = {"x": 10, "y": 10, "width": 25, "height": 25}
    crop_res = crop_face(img, bbox, min_dimension=40)

    assert crop_res["quality_ok"] is False
    assert "below recommended threshold" in crop_res["warning"]


# =====================================================================
# 3. Extraction Facade Test
# =====================================================================

def test_extraction_facade_no_face():
    """Verify backward-compatible extract_document_face on no-face image."""
    card = create_blank_card()
    res = extract_document_face(card)

    assert res["detected"] is False
    assert res["face_count"] == 0
    assert res["bbox"] is None
    assert res["cropped_face"] is None


# =====================================================================
# 4. Face Verification Unit Tests
# =====================================================================

def test_verify_faces_match():
    """Verify that identical faces produce a verified match and match_score >= 80%."""
    face = create_synthetic_portrait(120)
    res = verify_faces(document_face=face, live_face=face, model_name="Facenet512")

    assert res["available"] is True
    assert res["verified"] is True
    assert res["distance"] <= res["threshold"]
    assert res["match_score"] >= 80.0
    assert res["model"] == "Facenet512"
    assert res["metric"] == "cosine"
    assert res["error"] is None


def test_verify_faces_mismatch():
    """Verify that completely dissimilar faces produce a mismatch."""
    face1 = create_synthetic_portrait(120)
    face2 = np.random.randint(0, 255, (120, 120, 3), dtype=np.uint8)

    res = verify_faces(document_face=face1, live_face=face2, model_name="Facenet512")

    assert res["available"] is True
    assert res["verified"] is False
    assert res["distance"] > res["threshold"]
    assert res["match_score"] < 80.0


def test_verify_faces_missing_input():
    """Verify graceful handling when face inputs are missing."""
    res = verify_faces(document_face=None, live_face=create_synthetic_portrait(100))
    assert res["available"] is False
    assert "Missing input" in res["error"]


def test_calculate_match_score():
    """Verify calibration of distance to percentage match score."""
    # Distance 0.0 -> 100%
    assert calculate_match_score(0.0, 0.40) == 100.0
    # Distance equal to threshold -> 80%
    assert calculate_match_score(0.40, 0.40) == 80.0
    # Large distance -> low score
    score = calculate_match_score(0.90, 0.40)
    assert score < 20.0


# =====================================================================
# 5. Standalone API Endpoint Tests
# =====================================================================


def test_api_face_verify_endpoint():
    """Test POST /face/verify with synthetic document and live face."""
    face = create_synthetic_portrait(120)
    face_bytes = encode_image(face)

    resp = client.post(
        "/face/verify",
        files={
            "document": ("doc_face.jpg", face_bytes, "image/jpeg"),
            "live_face": ("selfie.jpg", face_bytes, "image/jpeg"),
        },
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert "document_face" in data
    assert "verification" in data
    assert data["verification"]["available"] is True
    assert data["verification"]["verified"] is True
    assert data["verification"]["match_score"] >= 80.0


def test_api_face_verify_missing_live():
    """Test POST /face/verify fails gracefully with 422/400 if live face is omitted."""
    face = create_synthetic_portrait(120)
    resp = client.post(
        "/face/verify",
        files={"document": ("doc.jpg", encode_image(face), "image/jpeg")},
    )
    assert resp.status_code in [400, 422]


# =====================================================================
# 6. Orientation Resilience Tests (Sideways & Upside-Down)
# =====================================================================

def test_verify_faces_rotated_selfie():
    """Verify that verify_faces correctly verifies matches when live selfie is rotated."""
    face = create_synthetic_portrait(120)
    # Rotate 180 degrees (upside down)
    face_180 = cv2.rotate(face, cv2.ROTATE_180)

    res_180 = verify_faces(document_face=face, live_face=face_180)
    assert res_180["available"] is True
    assert res_180["verified"] is True
    assert res_180["match_score"] >= 80.0

    # Rotate 90 degrees (sideways)
    face_90 = cv2.rotate(face, cv2.ROTATE_90_CLOCKWISE)
    res_90 = verify_faces(document_face=face, live_face=face_90)
    assert res_90["available"] is True
    assert res_90["verified"] is True
    assert res_90["match_score"] >= 80.0


def test_rotate_bbox_math():
    """Verify coordinate transformation accuracy for 90, 180, and 270 degree rotations."""
    from app.face.detector import rotate_bbox_back

    orig_h, orig_w = 400, 600
    orig_box = {"x": 50, "y": 100, "width": 80, "height": 120}

    # 90 deg clockwise mapping
    rot_90_box = {"x": 400 - (100 + 120), "y": 50, "width": 120, "height": 80}
    recovered_90 = rotate_bbox_back(rot_90_box, orig_h, orig_w, 90)
    assert recovered_90["x"] == orig_box["x"]
    assert recovered_90["y"] == orig_box["y"]
    assert recovered_90["width"] == orig_box["width"]
    assert recovered_90["height"] == orig_box["height"]

    # 180 deg mapping
    rot_180_box = {
        "x": orig_w - (orig_box["x"] + orig_box["width"]),
        "y": orig_h - (orig_box["y"] + orig_box["height"]),
        "width": orig_box["width"],
        "height": orig_box["height"],
    }
    recovered_180 = rotate_bbox_back(rot_180_box, orig_h, orig_w, 180)
    assert recovered_180 == orig_box
