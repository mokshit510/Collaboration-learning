-- ==============================================================================
-- PRAMAAN: Stage B Synthetic Reference & Issuer Verification Schema
-- Problem Statement: SIH26188
-- Ministry of Home Affairs / Sashastra Seema Bal (SSB), Police II Division
-- Database: PostgreSQL / Supabase
-- ==============================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. REFERENCE DOCUMENTS TABLE (Synthetic Reference Database)
-- NOTE: Contains ONLY synthetic demo data for screening simulation.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.reference_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_number TEXT UNIQUE NOT NULL,
    document_type TEXT NOT NULL DEFAULT 'passport',
    country_code TEXT DEFAULT 'IND',
    surname TEXT,
    given_names TEXT,
    full_name TEXT,
    nationality TEXT DEFAULT 'INDIAN',
    dob DATE,
    gender TEXT,
    place_of_birth TEXT,
    issue_date DATE,
    expiry_date DATE,
    status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'EXPIRED', 'BLACKLISTED', 'SUSPICIOUS')),
    scenario TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ref_doc_number ON public.reference_documents(document_number);
CREATE INDEX IF NOT EXISTS idx_ref_status ON public.reference_documents(status);
CREATE INDEX IF NOT EXISTS idx_ref_scenario ON public.reference_documents(scenario);

-- ==============================================================================
-- 2. VERIFICATION RECORDS TABLE
-- Stores audit results of synthetic reference comparisons without images.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.verification_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_number TEXT NOT NULL,
    verification_status TEXT NOT NULL,
    matched_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    mismatched_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    reference_document_id UUID REFERENCES public.reference_documents(id) ON DELETE SET NULL,
    source TEXT NOT NULL DEFAULT 'SUPABASE_REFERENCE_DATABASE',
    simulated BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verif_records_doc_num ON public.verification_records(document_number);
CREATE INDEX IF NOT EXISTS idx_verif_records_status ON public.verification_records(verification_status);
CREATE INDEX IF NOT EXISTS idx_verif_records_created ON public.verification_records(created_at DESC);

-- ==============================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- Frontend does not access reference_documents directly with secret key.
-- Node/Express backend interacts through privileged server-side access.
-- ==============================================================================
ALTER TABLE public.reference_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_records ENABLE ROW LEVEL SECURITY;

-- Allow service_role full control
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_reference_documents') THEN
        CREATE POLICY service_role_all_reference_documents ON public.reference_documents
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_verification_records') THEN
        CREATE POLICY service_role_all_verification_records ON public.verification_records
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_read_reference_documents') THEN
        CREATE POLICY authenticated_read_reference_documents ON public.reference_documents
            FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_insert_verification_records') THEN
        CREATE POLICY authenticated_insert_verification_records ON public.verification_records
            FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_read_verification_records') THEN
        CREATE POLICY authenticated_read_verification_records ON public.verification_records
            FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

-- ==============================================================================
-- 4. SEED DATA: 5 SYNTHETIC DEMO SCENARIOS
-- NOTE: All data is completely synthetic demo data.
-- ==============================================================================
INSERT INTO public.reference_documents (
    document_number,
    document_type,
    country_code,
    surname,
    given_names,
    full_name,
    nationality,
    dob,
    gender,
    place_of_birth,
    issue_date,
    expiry_date,
    status,
    scenario
) VALUES
-- SCENARIO 1: VALID (matches test fixture PRIYA PATIL, T2345678)
(
    'T2345678',
    'passport',
    'IND',
    'PATIL',
    'PRIYA',
    'PRIYA PATIL',
    'INDIAN',
    '2000-03-22',
    'F',
    'MUMBAI',
    '2020-03-10',
    '2030-03-09',
    'ACTIVE',
    'VALID'
),
-- SCENARIO 2: MISMATCH (matches T4567890 but surname/full_name intentionally differ)
(
    'T4567890',
    'passport',
    'IND',
    'SINGH',
    'AMAN',
    'AMAN SINGH',
    'INDIAN',
    '1997-08-08',
    'M',
    'JAIPUR',
    '2019-05-18',
    '2029-05-17',
    'ACTIVE',
    'MISMATCH'
),
-- SCENARIO 3: EXPIRED (matches T3456789 with past expiry date 2020-06-11)
(
    'T3456789',
    'passport',
    'IND',
    'MEHTA',
    'ARJUN',
    'ARJUN MEHTA',
    'INDIAN',
    '1998-07-10',
    'M',
    'DELHI',
    '2015-06-12',
    '2020-06-11',
    'EXPIRED',
    'EXPIRED'
),
-- SCENARIO 4: BLACKLISTED (synthetic artificial test document)
(
    'TESTBLK001',
    'passport',
    'IND',
    'OBEROI',
    'VIKRAM',
    'VIKRAM OBEROI',
    'INDIAN',
    '1988-11-14',
    'M',
    'KOLKATA',
    '2018-04-10',
    '2028-04-09',
    'BLACKLISTED',
    'BLACKLISTED'
),
-- SCENARIO 5: SUSPICIOUS (synthetic artificial test document)
(
    'TESTSUS001',
    'passport',
    'IND',
    'KHANNA',
    'RAJESH',
    'RAJESH KHANNA',
    'INDIAN',
    '1991-05-20',
    'M',
    'AMRITSAR',
    '2019-09-15',
    '2029-09-14',
    'SUSPICIOUS',
    'SUSPICIOUS'
),
-- Additional test image fixture: RAHUL SHARMA (T1234587)
(
    'T1234587',
    'passport',
    'IND',
    'SHARMA',
    'RAHUL',
    'RAHUL SHARMA',
    'INDIAN',
    '2005-01-15',
    'M',
    'PUNE',
    '2025-01-15',
    '2035-01-14',
    'ACTIVE',
    'VALID'
),
-- Additional test image fixture: NEHA SINGH (T5678901)
(
    'T5678901',
    'passport',
    'IND',
    'SINGH',
    'NEHA',
    'NEHA SINGH',
    'INDIAN',
    '2001-11-03',
    'F',
    'BANGALORE',
    '2022-09-20',
    '2032-09-19',
    'ACTIVE',
    'VALID'
)
ON CONFLICT (document_number) DO UPDATE SET
    document_type = EXCLUDED.document_type,
    country_code = EXCLUDED.country_code,
    surname = EXCLUDED.surname,
    given_names = EXCLUDED.given_names,
    full_name = EXCLUDED.full_name,
    nationality = EXCLUDED.nationality,
    dob = EXCLUDED.dob,
    gender = EXCLUDED.gender,
    place_of_birth = EXCLUDED.place_of_birth,
    issue_date = EXCLUDED.issue_date,
    expiry_date = EXCLUDED.expiry_date,
    status = EXCLUDED.status,
    scenario = EXCLUDED.scenario,
    updated_at = NOW();
