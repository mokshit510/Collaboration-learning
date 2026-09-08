import os
from typing import Optional
from fastapi import FastAPI, UploadFile, File, HTTPException
import cv2

# Application modules
from app.tampering.preprocessing import preprocess_document
from app.tampering.ela import (
    calculate_ela,
    create_ela_visualization,
    detect_ela_regions,
)
from app.tampering.copy_move import detect_copy_move
from app.tampering.splicing import detect_splicing
from app.tampering.detector import aggregate_tampering_signals, detect_tampering
from app.tampering.risk_engine import evaluate_risk
from app.face.extraction import extract_document_face
from app.face.verification import verify_faces

# Ensure UTF-8 output on Windows
os.environ.setdefault("PYTHONUTF8", "1")
os.environ.setdefault("TF_ENABLE_ONEDNN_OPTS", "0")

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="PRAMAAN AI Service",
    description="Document Tampering Analysis & Biometric Face Verification Intelligence Layer",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.get("/health")
def health():
    """Healthcheck endpoint for orchestrator and container probes."""
    return {
        "status": "ok",
        "service": "pramaan-ai",
        "version": "0.2.0",
    }


# =====================================================================
# Existing Endpoint Preserved (Backwards Compatibility)
# =====================================================================
@app.post("/tampering/analyze")
async def analyze_tampering(
    document: UploadFile = File(...),
):
    """Legacy/isolated tampering analysis endpoint returning raw ELA & Copy-move signals."""
    if not document.filename:
        raise HTTPException(
            status_code=400,
            detail="No document provided",
        )

    contents = await document.read()

    try:
        # Preprocessing
        result = preprocess_document(contents)
        image = result["image"]

        # ELA
        ela_map, mean_error, max_error = calculate_ela(image)
        ela_regions = detect_ela_regions(ela_map)

        # Copy-Move
        copy_move = detect_copy_move(image)

        # Splicing / Edge Seam Detection
        splicing = detect_splicing(image)

        # Aggregated Tampering Evidence
        tampering = aggregate_tampering_signals(
            ela_dict={
                "mean_error": mean_error,
                "max_error": max_error,
                "suspicious_ratio": ela_regions["suspicious_ratio"],
                "threshold": ela_regions["threshold"],
                "tampering_score": ela_regions.get("tampering_score", 0.0),
                "confidence": ela_regions.get("confidence", 90.0),
                "regions": ela_regions.get("regions", []),
            },
            copy_move_dict=copy_move,
            splicing_dict=splicing,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Tampering analysis failed: {str(error)}",
        )

    return {
        "status": "success",
        "filename": document.filename,
        "image": {
            "original": result["original_size"],
            "processed": result["processed_size"],
        },
        "ela": {
            "mean_error": round(mean_error, 4),
            "max_error": max_error,
            "threshold": round(ela_regions["threshold"], 4),
            "suspicious_ratio": round(ela_regions["suspicious_ratio"], 6),
            "regions": ela_regions.get("regions", []),
        },
        "copy_move": copy_move,
        "splicing": splicing,
        "tampering": tampering,
        "message": "ELA, copy-move, and splicing analysis completed",
    }



# =====================================================================
# Dedicated Face Verification Endpoint (Zero Tampering Overhead)
# =====================================================================

@app.post("/face/verify")
async def verify_face_endpoint(
    document: UploadFile = File(..., description="Document image containing portrait or reference portrait"),
    live_face: UploadFile = File(..., description="Live captured selfie image file"),
):
    """
    Standalone Biometric Face Verification Endpoint.

    Performs 1-to-1 biometric matching between document portrait (or database reference photo)
    and live captured selfie using DeepFace + FaceNet512.
    Executes with ZERO tampering overhead.
    """
    if not document or not document.filename:
        raise HTTPException(status_code=400, detail="No document image provided")
    if not live_face or not live_face.filename:
        raise HTTPException(status_code=400, detail="No live face image provided")

    # 1. Ingest document / reference photo
    try:
        doc_bytes = await document.read()
        if not doc_bytes or len(doc_bytes) == 0:
            raise HTTPException(status_code=400, detail="Document file is empty (0 bytes)")
        doc_prep = preprocess_document(doc_bytes)
        doc_image = doc_prep["image"]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid document image: {str(exc)}")

    # 2. Ingest live selfie
    try:
        live_bytes = await live_face.read()
        if not live_bytes or len(live_bytes) == 0:
            raise HTTPException(status_code=400, detail="Live face file is empty (0 bytes)")
        live_prep = preprocess_document(live_bytes)
        live_image = live_prep["image"]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid live face image: {str(exc)}")

    # 3. Detect and crop portrait from document
    extraction = extract_document_face(doc_image)
    doc_crop = extraction.get("cropped_face")

    # Fallback to full doc_image if it was already a tight reference portrait crop
    face_for_comparison = doc_crop if doc_crop is not None else doc_image

    # 4. Biometric FaceNet512 verification
    verification = verify_faces(
        document_face=face_for_comparison,
        live_face=live_image,
        model_name="Facenet512",
    )

    return {
        "status": "success",
        "document_face": {
            "detected": extraction.get("detected", False),
            "face_count": extraction.get("face_count", 0),
            "bbox": extraction.get("bbox"),
            "warning": extraction.get("warning"),
        },
        "verification": verification,
    }


# =====================================================================
# Main Unified Analysis Endpoint (MVP Contract)
# =====================================================================
@app.post("/analyze")
async def analyze(
    document: UploadFile = File(..., description="Document image file (JPEG/PNG)"),
    live_face: Optional[UploadFile] = File(None, description="Optional live selfie for face matching"),
):
    """
    Main PRAMAAN AI pipeline endpoint.

    Executes:
    1. Preprocessing (validation, aspect-ratio safe resizing).
    2. Forensic ELA recompression analysis.
    3. Forensic Copy-Move feature matching.
    4. Document face portrait extraction.
    5. Face verification (if live_face submitted).
    6. Transparent explainable risk aggregation.

    Guarantees:
    - Never crashes if individual forensic or face signals fail.
    - Strict JSON response contract matching frontend requirements.
    """
    if not document or not document.filename:
        raise HTTPException(
            status_code=400,
            detail="No document image provided",
        )

    # 1. Document Preprocessing
    try:
        doc_bytes = await document.read()
        if not doc_bytes or len(doc_bytes) == 0:
            raise HTTPException(status_code=400, detail="Uploaded document file is empty (0 bytes)")

        doc_prep = preprocess_document(doc_bytes)
        doc_image = doc_prep["image"]
        doc_width = doc_prep["original_size"]["width"]
        doc_height = doc_prep["original_size"]["height"]
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid document image: {str(error)}",
        )
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Preprocessing failed: {str(error)}",
        )

    # 2. ELA Analysis (Error-isolated)
    ela_dict = None
    try:
        ela_map, mean_err, max_err = calculate_ela(doc_image)
        ela_regions = detect_ela_regions(ela_map)
        ela_dict = {
            "mean_error": mean_err,
            "max_error": max_err,
            "suspicious_ratio": ela_regions["suspicious_ratio"],
            "threshold": ela_regions["threshold"],
            "tampering_score": ela_regions.get("tampering_score", 0.0),
            "confidence": ela_regions.get("confidence", 90.0),
            "regions": ela_regions.get("regions", []),
        }
    except Exception:
        # Graceful degradation: individual failure does not crash API
        pass

    # 3. Copy-Move Analysis (Error-isolated)
    cm_dict = None
    try:
        cm_dict = detect_copy_move(doc_image)
    except Exception:
        pass

    # 4. Splicing / Edge Seam Analysis (Error-isolated)
    sp_dict = None
    try:
        sp_dict = detect_splicing(doc_image)
    except Exception:
        pass

    # 5. Tampering Evidence Fusion
    tampering = aggregate_tampering_signals(ela_dict, cm_dict, sp_dict)

    # 5. Document Face Extraction
    face_extraction = {
        "detected": False,
        "face_count": 0,
        "bbox": None,
        "warning": None,
    }
    doc_face_crop = None
    try:
        face_ext_result = extract_document_face(doc_image)
        face_extraction = {
            "detected": face_ext_result.get("detected", False),
            "face_count": face_ext_result.get("face_count", 0),
            "bbox": face_ext_result.get("bbox"),
            "warning": face_ext_result.get("warning"),
        }
        if face_ext_result.get("detected"):
            doc_face_crop = face_ext_result.get("cropped_face")
    except Exception as exc:
        face_extraction["warning"] = f"Face extraction error: {str(exc)}"

    # 6. Face Verification (If live face supplied)
    face_verification = {
        "available": False,
        "verified": None,
        "distance": None,
        "threshold": None,
        "model": "Facenet512",
        "error": None,
    }

    if live_face is not None and live_face.filename:
        try:
            live_bytes = await live_face.read()
            if not live_bytes or len(live_bytes) == 0:
                face_verification["error"] = "Uploaded live face file is empty (0 bytes)"
            else:
                live_prep = preprocess_document(live_bytes)
                live_image = live_prep["image"]

                if doc_face_crop is not None:
                    face_verification = verify_faces(
                        document_face=doc_face_crop,
                        live_face=live_image,
                        model_name="Facenet512",
                    )
                else:
                    face_verification["error"] = "Cannot verify face: No portrait face was detected on document"

        except Exception as exc:
            face_verification["error"] = f"Failed to process live face: {str(exc)}"
    else:
        face_verification["error"] = "No live face image submitted"

    # 7. Explainable Risk Engine
    risk = evaluate_risk(
        tampering_result=tampering,
        face_extraction_result=face_extraction,
        face_verification_result=face_verification if (live_face and live_face.filename) else None,
    )

    # 8. Return Stable JSON Schema
    return {
        "status": "success",
        "document": {
            "filename": document.filename,
            "width": doc_width,
            "height": doc_height,
        },
        "tampering": tampering,
        "document_face": face_extraction,
        "face_verification": face_verification,
        "risk": risk,
    }