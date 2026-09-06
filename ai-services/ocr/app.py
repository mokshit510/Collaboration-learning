from fastapi import FastAPI, UploadFile, File, HTTPException
import os
import uuid

from ocr_engine import extract_text
from field_parser import parse_fields
from validator import validate_fields


app = FastAPI(
    title="PRAMAAN OCR Service",
    version="1.0.0"
)

UPLOAD_DIR = "uploads"

os.makedirs(UPLOAD_DIR, exist_ok=True)


@app.get("/health")
def health():
    return {
        "success": True,
        "service": "ocr",
        "status": "healthy"
    }


@app.post("/ocr")
async def run_ocr(file: UploadFile = File(...)):

    allowed_types = {
        "image/jpeg",
        "image/png",
        "image/webp"
    }

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Only JPEG, PNG and WEBP images are supported"
        )

    extension = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{extension}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    contents = await file.read()

    with open(filepath, "wb") as f:
        f.write(contents)

    try:
        text = extract_text(filepath)
        fields = parse_fields(text)
        validation = validate_fields(fields)

        return {
            "success": True,
            "filename": file.filename,
            "text": text,
            "fields": fields,
            "validation": validation
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:
        if os.path.exists(filepath):
            os.remove(filepath)