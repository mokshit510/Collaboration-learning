import { getSupabaseClient } from '../lib/supabaseClient.js';

/**
 * PRAMAAN Stage B Reference Verification Service
 * Compares OCR-derived DocumentData against the Supabase Synthetic Reference Database.
 * NOTE: Operates on synthetic demo records only. Not a live government database.
 */

const MONTH_MAP = {
  JAN: '01',
  FEB: '02',
  MAR: '03',
  APR: '04',
  MAY: '05',
  JUN: '06',
  JUL: '07',
  AUG: '08',
  SEP: '09',
  OCT: '10',
  NOV: '11',
  DEC: '12',
};

/**
 * Normalize dates from various formats (e.g. "22 MAR 2000" or "2000-03-22") to standard "YYYY-MM-DD"
 */
function normalizeDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const trimmed = dateStr.trim().toUpperCase();

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // DD MMM YYYY (e.g. "22 MAR 2000" or "08 AUG 1997")
  const ddMmmYyyy = trimmed.match(/^(\d{1,2})\s+([A-Z]{3})\s+(\d{4})$/);
  if (ddMmmYyyy) {
    const day = ddMmmYyyy[1].padStart(2, '0');
    const month = MONTH_MAP[ddMmmYyyy[2]] || '01';
    const year = ddMmmYyyy[3];
    return `${year}-${month}-${day}`;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const slashMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slashMatch) {
    return `${slashMatch[3]}-${slashMatch[2].padStart(2, '0')}-${slashMatch[1].padStart(2, '0')}`;
  }

  return trimmed;
}

/**
 * Clean and normalize text strings for comparison
 */
function normalizeText(val) {
  if (!val || typeof val !== 'string') return '';
  return val.trim().toUpperCase().replace(/\s+/g, ' ');
}

/**
 * Normalize gender tokens ('M', 'MALE' -> 'M'; 'F', 'FEMALE' -> 'F')
 */
function normalizeGender(val) {
  const norm = normalizeText(val);
  if (norm === 'M' || norm === 'MALE') return 'M';
  if (norm === 'F' || norm === 'FEMALE') return 'F';
  return norm;
}

/**
 * Normalize country / nationality ('IND', 'INDIAN' -> 'IND')
 */
function normalizeNationality(val) {
  const norm = normalizeText(val);
  if (norm === 'IND' || norm === 'INDIAN') return 'IND';
  return norm;
}

export class ReferenceVerificationService {
  /**
   * Compare OCR-derived DocumentData with synthetic reference record in Supabase.
   * @param {Object} documentData - OCR-derived fields
   * @returns {Promise<Object>} structured comparison result
   */
  static async compareWithReferenceDatabase(documentData = {}) {
    console.log('[REFERENCE] Starting synthetic reference comparison...');

    const rawDocNum =
      documentData.documentNumber ||
      documentData.passportNumber ||
      documentData.docNumber;

    if (!rawDocNum || typeof rawDocNum !== 'string' || !rawDocNum.trim()) {
      throw new Error('Document number is required for reference database verification.');
    }

    const normalizedDocNum = normalizeText(rawDocNum).replace(/[^A-Z0-9]/g, '');

    let supabase;
    try {
      supabase = getSupabaseClient();
    } catch (err) {
      console.error('[REFERENCE] Supabase client initialization error:', err.message);
      throw new Error('Synthetic Reference Database service is currently unavailable.');
    }

    console.log(`[REFERENCE] Querying Supabase for document_number: ${normalizedDocNum}`);

    let referenceRecord = null;
    try {
      const { data, error } = await supabase
        .from('reference_documents')
        .select('*')
        .eq('document_number', normalizedDocNum)
        .maybeSingle();

      if (error) {
        console.error('[REFERENCE] Database query error:', error.message);
        throw new Error(`Database query failed: ${error.message}`);
      }

      referenceRecord = data;
    } catch (err) {
      console.error('[REFERENCE] Supabase query failure:', err.message);
      throw err;
    }

    // If no matching reference record found
    if (!referenceRecord) {
      console.log(`[REFERENCE] Document not found in reference database: ${normalizedDocNum}`);

      const notFoundResult = {
        found: false,
        status: 'NOT_FOUND',
        source: 'SUPABASE_REFERENCE_DATABASE',
        simulated: true,
        documentNumber: normalizedDocNum,
        matchedFields: [],
        mismatchedFields: [],
        referenceRecord: null,
        message: `Document ${normalizedDocNum} is not indexed in the synthetic reference database.`,
        timestamp: new Date().toISOString(),
      };

      // Best-effort audit log into verification_records
      await this.persistVerificationRecord(notFoundResult, null);
      return notFoundResult;
    }

    console.log(`[REFERENCE] Document found. Reference status: ${referenceRecord.status}, Scenario: ${referenceRecord.scenario}`);

    // Perform field-level comparison
    const matchedFields = [];
    const mismatchedFields = [];

    // 1. Document Number
    if (normalizedDocNum === normalizeText(referenceRecord.document_number)) {
      matchedFields.push('Passport Number');
    } else {
      mismatchedFields.push({
        field: 'passportNumber',
        label: 'Passport Number',
        extractedValue: rawDocNum,
        referenceValue: referenceRecord.document_number,
      });
    }

    // 2. Full Name
    const extractedFullName = normalizeText(
      documentData.holderName ||
      documentData.fullName ||
      `${documentData.givenNames || documentData.givenName || ''} ${documentData.surname || ''}`
    );
    const refFullName = normalizeText(referenceRecord.full_name);

    if (extractedFullName && refFullName && extractedFullName === refFullName) {
      matchedFields.push('Full Name');
    } else if (refFullName) {
      mismatchedFields.push({
        field: 'fullName',
        label: 'Full Name',
        extractedValue: documentData.holderName || documentData.fullName || 'Not provided',
        referenceValue: referenceRecord.full_name,
      });
    }

    // 3. Surname
    if (documentData.surname && referenceRecord.surname) {
      if (normalizeText(documentData.surname) === normalizeText(referenceRecord.surname)) {
        matchedFields.push('Surname');
      } else {
        mismatchedFields.push({
          field: 'surname',
          label: 'Surname',
          extractedValue: documentData.surname,
          referenceValue: referenceRecord.surname,
        });
      }
    }

    // 4. Given Names
    const extractedGiven = documentData.givenNames || documentData.givenName;
    if (extractedGiven && referenceRecord.given_names) {
      if (normalizeText(extractedGiven) === normalizeText(referenceRecord.given_names)) {
        matchedFields.push('Given Names');
      } else {
        mismatchedFields.push({
          field: 'givenNames',
          label: 'Given Names',
          extractedValue: extractedGiven,
          referenceValue: referenceRecord.given_names,
        });
      }
    }

    // 5. Nationality
    if (documentData.nationality && referenceRecord.nationality) {
      if (normalizeNationality(documentData.nationality) === normalizeNationality(referenceRecord.nationality)) {
        matchedFields.push('Nationality');
      } else {
        mismatchedFields.push({
          field: 'nationality',
          label: 'Nationality',
          extractedValue: documentData.nationality,
          referenceValue: referenceRecord.nationality,
        });
      }
    }

    // 6. Date of Birth
    const normExtractedDob = normalizeDate(documentData.dob || documentData.dateOfBirth);
    const normRefDob = normalizeDate(referenceRecord.dob);
    if (normExtractedDob && normRefDob) {
      if (normExtractedDob === normRefDob) {
        matchedFields.push('Date of Birth');
      } else {
        mismatchedFields.push({
          field: 'dob',
          label: 'Date of Birth',
          extractedValue: documentData.dob || documentData.dateOfBirth,
          referenceValue: referenceRecord.dob,
        });
      }
    }

    // 7. Gender
    if (documentData.gender && referenceRecord.gender) {
      if (normalizeGender(documentData.gender) === normalizeGender(referenceRecord.gender)) {
        matchedFields.push('Gender');
      } else {
        mismatchedFields.push({
          field: 'gender',
          label: 'Gender',
          extractedValue: documentData.gender,
          referenceValue: referenceRecord.gender,
        });
      }
    }

    // 8. Expiry Date
    const normExtractedExpiry = normalizeDate(documentData.expiryDate || documentData.dateOfExpiry);
    const normRefExpiry = normalizeDate(referenceRecord.expiry_date);
    if (normExtractedExpiry && normRefExpiry) {
      if (normExtractedExpiry === normRefExpiry) {
        matchedFields.push('Expiry Date');
      } else {
        mismatchedFields.push({
          field: 'expiryDate',
          label: 'Expiry Date',
          extractedValue: documentData.expiryDate || documentData.dateOfExpiry,
          referenceValue: referenceRecord.expiry_date,
        });
      }
    }

    // 9. Place of Birth (optional check)
    if (documentData.placeOfBirth && referenceRecord.place_of_birth) {
      if (normalizeText(documentData.placeOfBirth) === normalizeText(referenceRecord.place_of_birth)) {
        matchedFields.push('Place of Birth');
      } else {
        mismatchedFields.push({
          field: 'placeOfBirth',
          label: 'Place of Birth',
          extractedValue: documentData.placeOfBirth,
          referenceValue: referenceRecord.place_of_birth,
        });
      }
    }

    // Determine Status Logic:
    // ACTIVE + all important fields match -> VERIFIED
    // ACTIVE + one or more important fields mismatch -> MISMATCH
    // EXPIRED -> EXPIRED
    // BLACKLISTED -> BLACKLISTED
    // SUSPICIOUS -> SUSPICIOUS
    let verificationStatus = 'VERIFIED';
    const dbStatus = referenceRecord.status.toUpperCase();

    if (dbStatus === 'BLACKLISTED') {
      verificationStatus = 'BLACKLISTED';
    } else if (dbStatus === 'SUSPICIOUS') {
      verificationStatus = 'SUSPICIOUS';
    } else if (dbStatus === 'EXPIRED') {
      verificationStatus = 'EXPIRED';
    } else if (mismatchedFields.length > 0) {
      verificationStatus = 'MISMATCH';
    } else {
      verificationStatus = 'VERIFIED';
    }

    console.log(`[REFERENCE] Verification status calculated: ${verificationStatus} (matched: ${matchedFields.length}, mismatched: ${mismatchedFields.length})`);

    const result = {
      found: true,
      status: verificationStatus,
      source: 'SUPABASE_REFERENCE_DATABASE',
      simulated: true,
      documentNumber: normalizedDocNum,
      matchedFields,
      mismatchedFields,
      referenceRecord: {
        id: referenceRecord.id,
        documentNumber: referenceRecord.document_number,
        documentType: referenceRecord.document_type,
        countryCode: referenceRecord.country_code,
        fullName: referenceRecord.full_name,
        surname: referenceRecord.surname,
        givenNames: referenceRecord.given_names,
        nationality: referenceRecord.nationality,
        dob: referenceRecord.dob,
        gender: referenceRecord.gender,
        placeOfBirth: referenceRecord.place_of_birth,
        issueDate: referenceRecord.issue_date,
        expiryDate: referenceRecord.expiry_date,
        status: referenceRecord.status,
        scenario: referenceRecord.scenario,
      },
      timestamp: new Date().toISOString(),
    };

    // Save record to verification_records
    await this.persistVerificationRecord(result, referenceRecord.id);

    return result;
  }

  /**
   * Insert comparison result into verification_records table
   */
  static async persistVerificationRecord(result, referenceDocumentId) {
    try {
      const supabase = getSupabaseClient();
      const payload = {
        document_number: result.documentNumber || 'UNKNOWN',
        verification_status: result.status,
        matched_fields: result.matchedFields || [],
        mismatched_fields: result.mismatchedFields || [],
        reference_document_id: referenceDocumentId || null,
        source: result.source || 'SUPABASE_REFERENCE_DATABASE',
        simulated: true,
      };

      const { error } = await supabase.from('verification_records').insert([payload]);
      if (error) {
        console.warn('[REFERENCE] Failed to persist verification record (non-blocking):', error.message);
      } else {
        console.log('[REFERENCE] Record persisted successfully to verification_records table.');
      }
    } catch (err) {
      console.warn('[REFERENCE] Exception during record persistence (non-blocking):', err.message);
    }
  }
}

export default ReferenceVerificationService;
