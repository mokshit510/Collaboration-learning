"""
PRAMAAN Unified AI Services Layer
Runs all AI components (OCR, Forensic Tampering, Biometric Face Verification)
on a single unified FastAPI service on port 8000.
"""

import sys
import os
import importlib.util
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure UTF-8 output on Windows
os.environ.setdefault("PYTHONUTF8", "1")
os.environ.setdefault("TF_ENABLE_ONEDNN_OPTS", "0")

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
OCR_DIR = os.path.join(CURRENT_DIR, "ocr")
FACE_DIR = os.path.join(CURRENT_DIR, "faceRec")

# 1. Load faceRec app (app.main)
if FACE_DIR not in sys.path:
    sys.path.insert(0, FACE_DIR)

from app.main import app as face_app

# 2. Load ocr app using module spec to avoid 'app' package collision
if OCR_DIR not in sys.path:
    sys.path.insert(0, OCR_DIR)

ocr_spec = importlib.util.spec_from_file_location("ocr_service_app", os.path.join(OCR_DIR, "app.py"))
if not ocr_spec or not ocr_spec.loader:
    raise ImportError("Unable to load OCR service app spec")
ocr_module = importlib.util.module_from_spec(ocr_spec)
sys.modules["ocr_service_app"] = ocr_module
ocr_spec.loader.exec_module(ocr_module)
ocr_app = ocr_module.app

# 3. Create Unified FastAPI application
app = FastAPI(
    title="PRAMAAN Unified AI Services",
    description="Unified API hosting OCR Extraction, Document Tampering Analysis & Biometric Face Verification",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "service": "PRAMAAN Unified AI Services",
        "version": "2.0.0",
        "status": "online",
        "endpoints": [
            "/health",
            "/ocr",
            "/tampering/analyze",
            "/face/verify",
            "/analyze",
        ]
    }

@app.get("/health")
def unified_health():
    return {
        "status": "ok",
        "service": "pramaan-ai-unified",
        "version": "2.0.0",
        "modules": {
            "ocr": "healthy",
            "tampering": "healthy",
            "face": "healthy",
        }
    }

# 4. Mount / Include routes from face_app and ocr_app
EXCLUDED_PATHS = {"/", "/health", "/openapi.json", "/docs", "/docs/oauth2-redirect", "/redoc"}

for route in face_app.routes:
    if hasattr(route, "path") and route.path not in EXCLUDED_PATHS:
        app.routes.append(route)

for route in ocr_app.routes:
    if hasattr(route, "path") and route.path not in EXCLUDED_PATHS:
        app.routes.append(route)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
