/**
 * PRAMAAN Issuer Verification Service
 * NOTE: This is a SIMULATED ISSUER VERIFICATION service.
 * Disclaimer: Demo issuer data — not a live government database.
 * Architecture is designed as a pluggable adapter that can be replaced with an
 * authorized government/consular API without modifying any frontend UI components.
 */

import type { DocumentData, IssuerResult, IssuerItem } from '../types';

export interface IssuerServiceAdapter {
  verify(doc: DocumentData, options?: { forceExpired?: boolean; forceNotFound?: boolean }): Promise<IssuerResult>;
}

export class SimulatedIssuerAdapter implements IssuerServiceAdapter {
  public async verify(
    doc: DocumentData,
    options: { forceExpired?: boolean; forceNotFound?: boolean } = {}
  ): Promise<IssuerResult> {
    const isSimulated = true;
    const disclaimer = 'SIMULATED ISSUER VERIFICATION: Demo issuer data — not a live government database.';
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
      };
    }

    if (options.forceExpired) {
      return {
        isSimulated,
        disclaimer,
        documentFound: true,
        registryStatus: 'EXPIRED',
        issuerMatch: true,
        issuingAuthority: 'Ministry of External Affairs / Consular Registry (Simulated)',
        digitalSignatureValid: false,
        blacklistStatus: 'CLEAN',
        identityMatch: true,
        timestamp,
        source: 'Simulated Consular Database (Demo Testbed)',
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
    };
  }
}

export class IssuerService {
  private static adapter: IssuerServiceAdapter = new SimulatedIssuerAdapter();

  /**
   * Pluggable setter to switch from simulation to an Authorized Issuer API in the future
   */
  public static setAdapter(newAdapter: IssuerServiceAdapter) {
    this.adapter = newAdapter;
  }

  public static async verifyDocument(
    doc: DocumentData,
    options?: { forceExpired?: boolean; forceNotFound?: boolean }
  ): Promise<IssuerResult> {
    return this.adapter.verify(doc, options);
  }

  /**
   * Helper to format IssuerResult for legacy UI cards
   */
  public static toLegacyIssuerItems(res: IssuerResult): IssuerItem[] {
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
        valid: res.registryStatus === 'ACTIVE',
        detail: `Official state: ${res.registryStatus}`,
        severity: res.registryStatus === 'ACTIVE' ? 'PASS' : 'FAIL',
      },
      {
        id: 'blacklist',
        label: 'Blacklist / Revocation Check',
        status: res.blacklistStatus === 'CLEAN' ? 'Not Flagged' : 'FLAGGED',
        valid: res.blacklistStatus === 'CLEAN',
        detail: res.blacklistStatus === 'CLEAN' ? 'Clean simulated record' : 'Active alert notice against credential',
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
