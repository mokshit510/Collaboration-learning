# PRAMAAN AI Service (Tampering & Biometric Face Verification)

High-performance document tampering detection (ELA, Copy-Move, Splicing) and biometric face verification engine built with FastAPI and DeepFace (FaceNet512).

---

## System Requirements

- **Python Version**: Python **3.10 to 3.12** *(Python 3.13 is not supported yet by TensorFlow)*
- **OS**: Windows, macOS, or Linux

---

## Installation & Setup

### 1. Create a Virtual Environment

**Windows (PowerShell):**
```powershell
cd ai-service-tampering-face
python -m venv venv
.\venv\Scripts\Activate.ps1
```

**Linux / macOS:**
```bash
cd ai-service-tampering-face
python3 -m venv venv
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

> **Note for Headless Linux / Docker**: If running in a container without display/X11 libraries, ensure `libgl1` and `libglib2.0-0` are installed, or install `opencv-python-headless`.

---

## Running the Service

Start the development server with auto-reload:

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

- **Interactive API Docs (Swagger UI)**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Health Check**: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

---

## Running Tests

Run the full automated test suite:

```bash
pytest
```
*(All test paths and module resolutions are automatically handled via `pytest.ini`).*

---

## Key Endpoints

- `POST /analyze`: Unified all-in-one verification pipeline (Document Tampering Analysis + Face Extraction + Live Selfie Verification + Explainable Risk Scoring).
- `POST /tampering/analyze`: Dedicated document tampering forensics (ELA, Copy-Move, Splicing).
- `POST /face/verify`: Dedicated biometric 1-to-1 face verification (FaceNet512).
- `GET /health`: Healthcheck probe.
