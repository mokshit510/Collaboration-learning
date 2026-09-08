from fastapi import FastAPI, UploadFile, File, HTTPException
import os
import uuid

from ocr_engine import extract_text
from field_parser import parse_fields, parse_mrz
from validator import validate_fields, validate_mrz_checksums


app = FastAPI(
    title="PRAMAAN OCR Service",
    version="2.0.0"
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
            detail="Only JPG, JPEG, PNG or WEBP images up to 2 MB are allowed."
        )

    # UploadFile.filename is typed str | None; guard before calling splitext.
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file has no filename"
        )

    contents = await file.read()
    if len(contents) > 2 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, JPEG, PNG or WEBP images up to 2 MB are allowed."
        )

    extension = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{extension}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    try:
        # Stage A.1 — region-based OCR pipeline
        result = extract_text(filepath)

        # Parse VIZ fields from the visual inspection zone text
        fields = parse_fields(result)

        # Parse MRZ from the decoded MRZ lines
        mrz_parsed = parse_mrz(result)

        # Validate VIZ fields
        validation = validate_fields(fields)

        # Validate MRZ check digits
        mrz_validation = validate_mrz_checksums(mrz_parsed)

        # Stage A.1 — attach validation status to fields
        val_status_map = {v["field"]: v["status"] for v in validation}
        for f in fields:
            if "status" not in f and f["label"] in val_status_map:
                f["status"] = val_status_map[f["label"]]

        return {
            "success": True,
            "filename": file.filename,
            # `text` keeps the same key as before for backward compatibility
            "text": result["viz_text"],
            "fields": fields,
            "validation": validation,
            # New in Stage A.1 — populated MRZ data
            "mrz": mrz_parsed,
            "mrzValidation": mrz_validation,
            # VIZ metadata extensions (Section 13)
            "vizDetected": len(fields) > 0,
            "vizFields": fields,
            "vizWarnings": result.get("warnings", []),
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

    finally:
        if os.path.exists(filepath):
            os.remove(filepath)