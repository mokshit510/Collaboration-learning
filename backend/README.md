# PRAMAAN Backend: Fake Identity & Document Screening System

> **Smart India Hackathon 2026** — Problem Statement **SIH26188**  
> **Organization**: Ministry of Home Affairs / Sashastra Seema Bal (SSB), Police II Division  
> **Theme**: Blockchain & Cybersecurity  

---

## Architecture Overview

PRAMAAN Backend is a resilient, enterprise-grade Node.js/Express service built in modern JavaScript (ES Modules). It connects to **Supabase** (PostgreSQL, Supabase Auth, and Private Storage) and Python AI forensic microservices (OCR, Tampering, Facial Verification).

```
React Frontend (PRAMAAN)
       │
       │ REST API (Bearer JWT)
       ▼
Node.js + Express Backend (:5000)
       ├── Helmet, CORS, Rate Limiting, Centralized Error Handling
       ├── SHA-256 Document Integrity Hashing
       ├── Blockchain-style Hash-Chained Audit Logs
       │
       ├── Supabase Service Layer
       │     ├── PostgreSQL (9 Normalized Tables + RLS Policies)
       │     ├── Supabase Auth (RBAC: investigator / authority / admin)
       │     └── Supabase Storage (Private 'documents' bucket)
       │
       └── AI Microservice Adapters (MOCK / REAL Toggle)
             ├── OCR Extraction Service
             ├── Tampering & Splicing Analysis Service
             ├── Biometric Face Verification Service
             └── Risk Assessment Engine
```

---

## Directory Structure

```
backend/
├── database/
│   └── schema.sql              # Supabase PostgreSQL schema with RLS & private bucket
├── src/
│   ├── config/
│   │   ├── env.js              # Validated environment configuration
│   │   └── supabase.js         # Supabase client instantiation & health probes
│   ├── controllers/
│   │   ├── authController.js   # Login, logout, profile controller
│   │   └── documentController.js # Document upload and retrieval controller
│   ├── middleware/
│   │   ├── authMiddleware.js   # JWT verification & RBAC enforcement
│   │   ├── errorMiddleware.js  # 404 & centralized error interceptors
│   │   ├── rateLimitMiddleware.js # Standard & strict rate limiters
│   │   └── uploadMiddleware.js # Multer in-memory validation & size limits
│   ├── routes/
│   │   ├── authRoutes.js       # /api/auth routes
│   │   ├── documentRoutes.js   # /api/documents routes
│   │   └── healthRoutes.js     # /api/health probe route
│   ├── services/
│   │   ├── authService.js      # Supabase Auth + offline mock authentication
│   │   └── documentService.js  # Storage upload, SHA-256 hashing & metadata
│   ├── utils/
│   │   ├── hash.js             # SHA-256 and chained audit log hash generator
│   │   └── response.js         # Standardized JSON response envelope
│   ├── app.js                  # Express app configuration & middleware pipeline
│   └── server.js               # Server entrypoint with graceful shutdown
├── tests/
│   ├── health.test.js          # Health route and crypto unit tests
│   └── integration.test.js     # End-to-end auth, upload, and retrieval test suite
├── .env                        # Local development variables
├── .env.example                # Configuration template
├── package.json
└── README.md
```

---

## Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Description | Default / Example |
|---|---|---|
| `PORT` | Backend listening port | `5000` |
| `NODE_ENV` | Application environment | `development` |
| `FRONTEND_URL` | Allowed CORS origin for React UI | `http://localhost:5173` |
| `SUPABASE_URL` | Hosted Supabase project URL | `https://your-project.supabase.co` |
| `SUPABASE_ANON_KEY` | Public Anon Key for user operations | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Private Service Role Key (NEVER expose to frontend) | `eyJhbGciOi...` |
| `AI_SERVICE_URL` | Python / FastAPI AI endpoint | `http://localhost:8000` |
| `AI_MODE` | AI execution mode (`mock` or `real`) | `mock` |
| `RATE_LIMIT_WINDOW_MS` | Rate limiting window in ms | `900000` (15 mins) |
| `RATE_LIMIT_MAX` | Max requests per window per IP | `100` |
| `UPLOAD_MAX_SIZE_MB` | Maximum document upload file size | `10` |

---

## Supabase Database Setup

1. Open your **Supabase Dashboard** -> **SQL Editor**.
2. Run the SQL statements inside `database/schema.sql`.
3. This creates:
   - `profiles`
   - `documents`
   - `verification_sessions`
   - `document_extractions`
   - `validation_results`
   - `tampering_results`
   - `face_results`
   - `risk_assessments`
   - `audit_logs` (with tamper-evident SHA-256 hash chaining)
   - Row-Level Security (RLS) policies
   - Private Supabase Storage bucket `documents`

---

## Running Locally

```bash
# Install dependencies
npm install

# Run automated tests
npm test

# Start in development mode with auto-reload
npm run dev

# Start in production mode
npm start
```

---

## API Endpoints Reference

### System & Health
- `GET /api/health` — Service uptime, memory, Supabase connection status, and AI engine mode.

### Authentication (`/api/auth`)
- `POST /api/auth/login` — Sign in with email and password. Returns JWT access token and user role.
- `POST /api/auth/logout` — Sign out active session. Requires Bearer token.
- `GET /api/auth/me` — Retrieve current authenticated user profile. Requires Bearer token.

### Documents (`/api/documents`)
- `POST /api/documents/upload` — Multipart form upload (`document` file field, `documentType` body param). Computes SHA-256 hash and uploads to private storage. Requires Bearer token.
- `GET /api/documents` — List uploaded documents. Investigators see own; authorities see all. Requires Bearer token.
- `GET /api/documents/:id` — Retrieve specific document details and file hash. Requires Bearer token.

---

## Security Best Practices
1. **Never Expose Service Role Key**: `SUPABASE_SERVICE_ROLE_KEY` is only used inside the backend; never exposed to the frontend.
2. **Cryptographic File Hashes**: Every document upload is hashed using SHA-256 before storage to prevent tampering.
3. **Private Buckets**: Supabase Storage bucket `documents` is strictly private and accessed via authenticated signed policies.
4. **Defense in Depth**: Helmet headers, strict CORS, express-rate-limit, and payload size restrictions (10MB).
