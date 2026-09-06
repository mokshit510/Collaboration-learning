-- ==============================================================================
-- PRAMAAN: AI-Based Fake Identity & Document Screening System
-- SIH 2026 Problem Statement: SIH26188
-- Sashastra Seema Bal (SSB), Police II Division / Ministry of Home Affairs
-- Database Schema: PostgreSQL / Supabase
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. PROFILES TABLE (Linked with Supabase Auth users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    badge_number TEXT UNIQUE,
    checkpoint TEXT NOT NULL DEFAULT 'Border Checkpoint — SSB Counter 1',
    role TEXT NOT NULL CHECK (role IN ('investigator', 'authority', 'admin')) DEFAULT 'investigator',
    phone TEXT,
    avatar_url TEXT,
    status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'suspended')) DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for profile queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_checkpoint ON public.profiles(checkpoint);

-- ==============================================================================
-- 2. DOCUMENTS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_hash TEXT NOT NULL, -- SHA-256 integrity hash
    document_type TEXT NOT NULL CHECK (document_type IN ('passport', 'visa', 'other')) DEFAULT 'passport',
    status TEXT NOT NULL CHECK (status IN ('uploaded', 'processing', 'processed', 'error', 'flagged')) DEFAULT 'uploaded',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_file_hash ON public.documents(file_hash);
CREATE INDEX IF NOT EXISTS idx_documents_doc_type ON public.documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);

-- ==============================================================================
-- 3. VERIFICATION SESSIONS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.verification_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_status TEXT NOT NULL CHECK (session_status IN ('pending', 'in_progress', 'completed', 'failed')) DEFAULT 'pending',
    current_step TEXT NOT NULL DEFAULT 'upload',
    investigation_status TEXT NOT NULL CHECK (investigation_status IN ('unflagged', 'flagged', 'saved')) DEFAULT 'unflagged',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_doc_id ON public.verification_sessions(document_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.verification_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.verification_sessions(session_status);

-- ==============================================================================
-- 4. DOCUMENT EXTRACTIONS TABLE (OCR / MRZ)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.document_extractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.verification_sessions(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    holder_name TEXT,
    document_number TEXT,
    nationality TEXT,
    dob TEXT,
    gender TEXT,
    place_of_birth TEXT,
    issue_date TEXT,
    expiry_date TEXT,
    country_code TEXT,
    mrz_line1 TEXT,
    mrz_line2 TEXT,
    ocr_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    confidence_avg NUMERIC(5, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_extractions_session ON public.document_extractions(session_id);
CREATE INDEX IF NOT EXISTS idx_extractions_doc_num ON public.document_extractions(document_number);

-- ==============================================================================
-- 5. VALIDATION RESULTS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.validation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.verification_sessions(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    validation_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    issuer_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_valid BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_validation_session ON public.validation_results(session_id);

-- ==============================================================================
-- 6. TAMPERING RESULTS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.tampering_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.verification_sessions(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    suspicious_elements JSONB NOT NULL DEFAULT '[]'::jsonb,
    tampering_score NUMERIC(5, 2) DEFAULT 0.00,
    is_tampered BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tampering_session ON public.tampering_results(session_id);

-- ==============================================================================
-- 7. FACE RESULTS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.face_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.verification_sessions(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    face_match_score NUMERIC(5, 2) DEFAULT 0.00,
    face_match_status TEXT NOT NULL DEFAULT 'Faces match',
    selfie_storage_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_face_session ON public.face_results(session_id);

-- ==============================================================================
-- 8. RISK ASSESSMENTS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.risk_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.verification_sessions(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    risk_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    risk_level TEXT NOT NULL CHECK (risk_level IN ('LOW RISK', 'MEDIUM RISK', 'HIGH RISK')) DEFAULT 'LOW RISK',
    risk_description TEXT,
    risk_contributors JSONB NOT NULL DEFAULT '[]'::jsonb,
    ai_summary TEXT,
    recommendation TEXT,
    processing_time_seconds NUMERIC(5, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_session ON public.risk_assessments(session_id);
CREATE INDEX IF NOT EXISTS idx_risk_level ON public.risk_assessments(risk_level);

-- ==============================================================================
-- 9. AUDIT LOGS TABLE (Tamper-Evident SHA-256 Hash Chaining)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    session_id UUID REFERENCES public.verification_sessions(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    action TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    previous_hash TEXT NOT NULL,
    current_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_event ON public.audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_user ON public.audit_logs(user_id);

-- ==============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tampering_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT LANGUAGE sql STABLE AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Profiles: Users can view own profile; authority/admin can view all
CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.current_user_role() IN ('authority', 'admin'));

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Documents: Investigators view own documents; Authorities view all
CREATE POLICY "Investigators view own documents"
    ON public.documents FOR SELECT
    USING (auth.uid() = user_id OR public.current_user_role() IN ('authority', 'admin'));

CREATE POLICY "Investigators insert own documents"
    ON public.documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Investigators update own documents"
    ON public.documents FOR UPDATE
    USING (auth.uid() = user_id OR public.current_user_role() IN ('authority', 'admin'));

-- Verification Sessions
CREATE POLICY "View verification sessions"
    ON public.verification_sessions FOR SELECT
    USING (auth.uid() = user_id OR public.current_user_role() IN ('authority', 'admin'));

CREATE POLICY "Insert verification sessions"
    ON public.verification_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Update verification sessions"
    ON public.verification_sessions FOR UPDATE
    USING (auth.uid() = user_id OR public.current_user_role() IN ('authority', 'admin'));

-- Sub-results (read permitted to session owner or authority)
CREATE POLICY "Extractions view policy"
    ON public.document_extractions FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.verification_sessions s WHERE s.id = session_id AND (s.user_id = auth.uid() OR public.current_user_role() IN ('authority', 'admin'))));

CREATE POLICY "Validation view policy"
    ON public.validation_results FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.verification_sessions s WHERE s.id = session_id AND (s.user_id = auth.uid() OR public.current_user_role() IN ('authority', 'admin'))));

CREATE POLICY "Tampering view policy"
    ON public.tampering_results FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.verification_sessions s WHERE s.id = session_id AND (s.user_id = auth.uid() OR public.current_user_role() IN ('authority', 'admin'))));

CREATE POLICY "Face view policy"
    ON public.face_results FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.verification_sessions s WHERE s.id = session_id AND (s.user_id = auth.uid() OR public.current_user_role() IN ('authority', 'admin'))));

CREATE POLICY "Risk view policy"
    ON public.risk_assessments FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.verification_sessions s WHERE s.id = session_id AND (s.user_id = auth.uid() OR public.current_user_role() IN ('authority', 'admin'))));

-- Audit Logs: Read-only for authority/admin; immutable (no updates or deletes allowed)
CREATE POLICY "Authority and Admin can view audit logs"
    ON public.audit_logs FOR SELECT
    USING (public.current_user_role() IN ('authority', 'admin'));

CREATE POLICY "System can insert audit logs"
    ON public.audit_logs FOR INSERT
    WITH CHECK (true);

-- Revoke update and delete on audit logs to guarantee immutability
REVOKE UPDATE, DELETE ON public.audit_logs FROM authenticated, anon, public;

-- ==============================================================================
-- 11. SUPABASE STORAGE BUCKET: documents
-- ==============================================================================
-- Create the private 'documents' bucket for document images and live face captures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documents',
    'documents',
    false, -- Private bucket
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- Storage Access Policies:
CREATE POLICY "Authenticated users can upload documents"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read own uploaded files or authority"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'documents' AND (
        auth.uid()::text = (storage.foldername(name))[1] 
        OR public.current_user_role() IN ('authority', 'admin')
    ));
