/**
 * PRAMAAN Issuer Verification Service
 * NOTE: This is a SIMULATED ISSUER & SYNTHETIC REFERENCE VERIFICATION service.
 * Disclaimer: Demo issuer data — not a live government database.
 * Supports querying the Supabase Synthetic Reference Database via Node API.
 */

import apiClient from './apiClient';
import type {
  DocumentData,
  IssuerResult,
  IssuerItem,
  SyntheticReferenceResult,
} from '../types';

export interface IssuerServiceAdapter {
  verify(
    doc: DocumentData,
    options?: { forceExpired?: boolean; forceNotFound?: boolean }
  ): Promise<IssuerResult>;
}

/**
 * Simulated Adapter for demo scenarios when running in standalone mock mode
 */
export class SimulatedIssuerAdapter implements IssuerServiceAdapter {
  public async verify(
    doc: DocumentData,
    options: { forceExpired?: boolean; forceNotFound?: boolean } = {}
  ): Promise<IssuerResult> {
    const isSimulated = true;
    const disclaimer =
      'SIMULATED ISSUER VERIFICATION: Demo issuer data — not a live government database.';
    const timestamp = new Date().toISOString();

    if (options.forceNotFound) {
      return {
        isSimulated,
        disclaimer,
        documentFound: false,
        registryStatus: 'NOT_FOUND',
        issuerMatch: false,
        issuingAuthority: 'Regional Passport Office (Simulated)',
        digitalSignatureValid: false,
        blacklistStatus: 'CLEAN',
        identityMatch: false,
        timestamp,
        source: 'Simulated Central Identity Registry (Demo Testbed)',
        referenceComparison: {
          found: false,
          status: 'NOT_FOUND',
          source: 'Supabase Synthetic Reference Database (Simulated)',
          simulated: true,
          documentNumber: doc.documentNumber || 'UNKNOWN',
          matchedFields: [],
          mismatchedFields: [],
          message: 'Document number not found in reference database.',
        },
      };
    }

    if (options.forceExpired) {
      return {
        isSimulated,
        disclaimer,
        documentFound: true,
        registryStatus: 'EXPIRED',
        issuerMatch: true,
        issuingAuthority:
          'Ministry of External Affairs / Consular Registry (Simulated)',
        digitalSignatureValid: false,
        blacklistStatus: 'CLEAN',
        identityMatch: true,
        timestamp,
        source: 'Simulated Consular Database (Demo Testbed)',
        referenceComparison: {
          found: true,
          status: 'EXPIRED',
          source: 'Supabase Synthetic Reference Database (Simulated)',
          simulated: true,
          documentNumber: doc.documentNumber || 'T3456789',
          matchedFields: ['Passport Number', 'Full Name', 'Nationality'],
          mismatchedFields: [],
          message: 'Reference record status is EXPIRED.',
        },
      };
    }

    return {
      isSimulated,
      disclaimer,
      documentFound: true,
      registryStatus: 'ACTIVE',
      issuerMatch: true,
      issuingAuthority:
        doc.type === 'passport'
          ? 'Regional Passport Office, Delhi (Simulated)'
          : doc.type === 'visa'
          ? 'Consular Section, Embassy of India (Simulated)'
          : 'Directorate General of Shipping (Simulated)',
      digitalSignatureValid: true,
      blacklistStatus: 'CLEAN',
      identityMatch: true,
      timestamp,
      source: 'National Document Registry Simulator (v2026.4)',
      referenceComparison: {
        found: true,
        status: 'VERIFIED',
        source: 'Supabase Synthetic Reference Database (Simulated)',
        simulated: true,
        documentNumber: doc.documentNumber || 'T2345678',
        matchedFields: [
          'Passport Number',
          'Full Name',
          'Nationality',
          'Date of Birth',
          'Gender',
          'Expiry Date',
        ],
        mismatchedFields: [],
        message: 'All fields verified against synthetic reference database.',
      },
    };
  }
}

/**
 * Supabase Reference Adapter for real verification pipeline via Node backend
 */
export class SupabaseReferenceIssuerAdapter implements IssuerServiceAdapter {
  public async verify(
    doc: DocumentData,
    options: { forceExpired?: boolean; forceNotFound?: boolean } = {}
  ): Promise<IssuerResult> {
    const isSimulated = true;
    const disclaimer =
      'SIMULATED ISSUER VERIFICATION: Demo issuer data — not a live government database.';
    const timestamp = new Date().toISOString();

    if (options.forceNotFound) {
      return {
        isSimulated,
        disclaimer,
        documentFound: false,
        registryStatus: 'NOT_FOUND',
        issuerMatch: false,
        issuingAuthority: 'Regional Passport Office (Simulated)',
        digitalSignatureValid: false,
        blacklistStatus: 'CLEAN',
        identityMatch: false,
        timestamp,
        source: 'Supabase Synthetic Reference Database',
        referenceComparison: {
          found: false,
          status: 'NOT_FOUND',
          source: 'SUPABASE_REFERENCE_DATABASE',
          simulated: true,
          documentNumber: doc.documentNumber || 'UNKNOWN',
          matchedFields: [],
          mismatchedFields: [],
          message: 'Document number not found in reference database.',
        },
      };
    }

    if (options.forceExpired) {
      return {
        isSimulated,
        disclaimer,
        documentFound: true,
        registryStatus: 'EXPIRED',
        issuerMatch: true,
        issuingAuthority: 'Ministry of External Affairs (Simulated)',
        digitalSignatureValid: false,
        blacklistStatus: 'CLEAN',
        identityMatch: true,
        timestamp,
        source: 'Supabase Synthetic Reference Database',
        referenceComparison: {
          found: true,
          status: 'EXPIRED',
          source: 'SUPABASE_REFERENCE_DATABASE',
          simulated: true,
          documentNumber: doc.documentNumber || 'UNKNOWN',
          matchedFields: ['Passport Number', 'Full Name'],
          mismatchedFields: [],
          message: 'Reference record status is EXPIRED.',
        },
      };
    }

    try {
      console.log(
        '[ISSUER] Querying Supabase synthetic reference database via Node API for doc:',
        doc.documentNumber
      );

      const refResult: SyntheticReferenceResult = await apiClient.compareReference({
        document: {
          documentNumber: doc.documentNumber,
          holderName: doc.holderName,
          surname: doc.surname,
          givenNames: doc.givenName,
          givenName: doc.givenName,
          nationality: doc.nationality,
          dob: doc.dob,
          gender: doc.gender,
          expiryDate: doc.expiryDate,
          placeOfBirth: doc.placeOfBirth,
          countryCode: doc.countryCode,
          type: doc.type,
        },
      });

      console.log('[ISSUER] Supabase reference comparison response:', refResult);

      const isFound = refResult.found;
      const refStatus = refResult.status;
      const isBlacklisted = refStatus === 'BLACKLISTED';
      const isExpired = refStatus === 'EXPIRED';
      const isMismatch = refStatus === 'MISMATCH';
      const isVerified = refStatus === 'VERIFIED';
      const isSuspicious = refStatus === 'SUSPICIOUS';

      let registryStatus: IssuerResult['registryStatus'] = 'ACTIVE';
      if (!isFound) {
        registryStatus = 'NOT_FOUND';
      } else if (isExpired) {
        registryStatus = 'EXPIRED';
      } else if (isBlacklisted) {
        registryStatus = 'BLACKLISTED';
      } else if (isSuspicious) {
        registryStatus = 'SUSPICIOUS';
      } else if (isMismatch) {
        registryStatus = 'MISMATCH';
      } else if (isVerified) {
        registryStatus = 'VERIFIED';
      }

      return {
        isSimulated,
        disclaimer,
        documentFound: isFound,
        registryStatus,
        issuerMatch: isVerified || (isFound && !isMismatch),
        issuingAuthority:
          doc.type === 'passport'
            ? 'Regional Passport Office (Simulated)'
            : 'Consular Section, Embassy of India (Simulated)',
        digitalSignatureValid: isVerified,
        blacklistStatus: isBlacklisted ? 'FLAGGED' : 'CLEAN',
        identityMatch: isVerified,
        timestamp,
        source: 'Supabase Synthetic Reference Database',
        referenceComparison: refResult,
      };
    } catch (err: any) {
      console.warn(
        '[ISSUER] Supabase reference API call error, surfacing clean status:',
        err.message
      );
      return {
        isSimulated,
        disclaimer,
        documentFound: false,
        registryStatus: 'NOT_FOUND',
        issuerMatch: false,
        issuingAuthority: 'Regional Passport Office (Simulated)',
        digitalSignatureValid: false,
        blacklistStatus: 'CLEAN',
        identityMatch: false,
        timestamp,
        source: 'Supabase Synthetic Reference Database',
        referenceComparison: {
          found: false,
          status: 'NOT_FOUND',
          source: 'SUPABASE_REFERENCE_DATABASE',
          simulated: true,
          documentNumber: doc.documentNumber || 'UNKNOWN',
          matchedFields: [],
          mismatchedFields: [],
          message: err.message || 'Reference database query failed',
        },
      };
    }
  }
}

export class IssuerService {
  private static simulatedAdapter: IssuerServiceAdapter =
    new SimulatedIssuerAdapter();
  private static supabaseAdapter: IssuerServiceAdapter =
    new SupabaseReferenceIssuerAdapter();

  /**
   * Main verification entry point.
   * If in API mode or user-uploaded document, routes to Node -> Supabase.
   * If in mock mode demo scenario, routes to simulated adapter.
   */
  public static async verifyDocument(
    doc: DocumentData,
    options?: { forceExpired?: boolean; forceNotFound?: boolean }
  ): Promise<IssuerResult> {
    if (doc.isUserUploaded || apiClient.getMode() === 'API') {
      return this.supabaseAdapter.verify(doc, options);
    }
    return this.simulatedAdapter.verify(doc, options);
  }

  /**
   * Helper to format IssuerResult for UI cards with detailed reference signals
   */
  public static toLegacyIssuerItems(res: IssuerResult): IssuerItem[] {
    const ref = res.referenceComparison;

    if (ref) {
      const isVerified = ref.status === 'VERIFIED';
      const isMismatch = ref.status === 'MISMATCH';
      const isExpired = ref.status === 'EXPIRED';
      const isBlacklisted = ref.status === 'BLACKLISTED';
      const isSuspicious = ref.status === 'SUSPICIOUS';
      const isNotFound = ref.status === 'NOT_FOUND' || !ref.found;

      return [
        {
          id: 'db_lookup',
          label: 'Passport No. in Database',
          status: isVerified
            ? 'VERIFIED'
            : isNotFound
            ? 'NOT FOUND'
            : ref.status,
          valid: !isNotFound && !isBlacklisted,
          detail: isNotFound
            ? 'Document number not indexed in synthetic reference database'
            : `Record matched in ${ref.source || 'Supabase Synthetic Reference Database'}`,
          severity: isVerified ? 'PASS' : isNotFound ? 'FAIL' : 'WARNING',
        },
        {
          id: 'status',
          label: 'Status',
          status: ref.status,
          valid: isVerified,
          detail: isVerified
            ? 'Official state: ACTIVE (All fields verified)'
            : isExpired
            ? 'Credential marked EXPIRED in reference database'
            : isBlacklisted
            ? 'Active revocation notice / blacklisted credential'
            : isSuspicious
            ? 'Flagged as SUSPICIOUS in reference database'
            : isMismatch
            ? 'Reference record exists but extracted fields mismatch'
            : 'Unregistered credential',
          severity: isVerified
            ? 'PASS'
            : isSuspicious
            ? 'WARNING'
            : 'FAIL',
        },
        {
          id: 'blacklist',
          label: 'Blacklist Check',
          status: isBlacklisted ? 'FLAGGED' : 'Not Flagged',
          valid: !isBlacklisted,
          detail: isBlacklisted
            ? 'Credential indexed on synthetic lookout list'
            : 'Clean record in reference database',
          severity: isBlacklisted ? 'FAIL' : 'PASS',
        },
        {
          id: 'issuer_match',
          label: 'Issuer Match',
          status: isMismatch
            ? 'MISMATCH'
            : isVerified
            ? 'Authenticated'
            : isNotFound
            ? 'Unverified'
            : ref.status,
          valid: isVerified,
          detail:
            ref.mismatchedFields && ref.mismatchedFields.length > 0
              ? `Mismatched: ${ref.mismatchedFields
                  .map((m) => `${m.label || m.field} (ref: ${m.referenceValue})`)
                  .join(', ')}`
              : `${res.issuingAuthority} verified against reference profile`,
          severity: isVerified ? 'PASS' : isMismatch ? 'FAIL' : 'WARNING',
        },
      ];
    }

    // Default legacy mapping when referenceComparison is not present
    return [
      {
        id: 'db_lookup',
        label: 'Registry Database Match',
        status: res.documentFound ? 'Found' : 'Not Found',
        valid: res.documentFound,
        detail: res.documentFound
          ? `Record indexed in ${res.source}`
          : 'No corresponding record found in registry',
        severity: res.documentFound ? 'PASS' : 'FAIL',
      },
      {
        id: 'status',
        label: 'Document Lifecycle Status',
        status: res.registryStatus,
        valid: res.registryStatus === 'ACTIVE' || res.registryStatus === 'VERIFIED',
        detail: `Official state: ${res.registryStatus}`,
        severity:
          res.registryStatus === 'ACTIVE' || res.registryStatus === 'VERIFIED'
            ? 'PASS'
            : 'FAIL',
      },
      {
        id: 'blacklist',
        label: 'Blacklist / Revocation Check',
        status: res.blacklistStatus === 'CLEAN' ? 'Not Flagged' : 'FLAGGED',
        valid: res.blacklistStatus === 'CLEAN',
        detail:
          res.blacklistStatus === 'CLEAN'
            ? 'Clean simulated record'
            : 'Active alert notice against credential',
        severity: res.blacklistStatus === 'CLEAN' ? 'PASS' : 'FAIL',
      },
      {
        id: 'issuer_match',
        label: 'Issuing Authority Verification',
        status: res.issuerMatch ? 'Authenticated' : 'Unmatched',
        valid: res.issuerMatch,
        detail: `${res.issuingAuthority} digital certificate verified`,
        severity: res.issuerMatch ? 'PASS' : 'WARNING',
      },
    ];
  }
}

export default IssuerService;
