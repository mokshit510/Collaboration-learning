/**
 * PRAMAAN Secure NFC Document Credential — Demonstration Module
 * (NFC-Based Prototype Credential Verification)
 *
 * NOTE: A generic NFC tag is NOT an official ePassport ICAO 9303 chip.
 * This module demonstrates an offline cryptographic credential verification paradigm
 * where printed visual data is cross-checked against cryptographically signed NFC chip data.
 *
 * Architecture:
 *   NFCService
 *        ↓
 *   Mock NFC Adapter (Prototype demo)
 *        ↓
 *   Future Real NFC / WebNFC / Hardware Reader Integration
 */

import type { DocumentData, NfcResult, NfcCredentialPayload } from '../types';

export interface NfcAdapter {
  readAndVerify(
    doc: DocumentData,
    options?: { forceMismatch?: boolean; forceUnreadable?: boolean }
  ): Promise<NfcResult>;
}

export class MockNfcAdapter implements NfcAdapter {
  public async readAndVerify(
    doc: DocumentData,
    options: { forceMismatch?: boolean; forceUnreadable?: boolean } = {}
  ): Promise<NfcResult> {
    const isPrototype = true;
    const moduleName = 'NFC-Based Prototype Credential Verification';
    const disclaimer =
      'DEMO / PROTOTYPE MODULE: Demonstrates secure NFC cross-verification. Generic NFC tag is not an official ePassport ICAO 9303 chip.';

    if (options.forceUnreadable) {
      return {
        moduleName,
        isPrototype,
        disclaimer,
        readStatus: 'UNREADABLE',
        crossVerification: {
          documentIdMatch: false,
          nameMatch: false,
          dobMatch: false,
          nationalityMatch: false,
          expiryMatch: false,
        },
        integrityVerified: false,
        status: 'WARNING',
        explanation: 'NFC chip could not be coupled or RF antenna signal disrupted. Manual physical inspection advised.',
      };
    }

    // Standard simulated NFC payload matching document
    // If forceMismatch is enabled (e.g. Tampered scenario where printed DOB was forged):
    const nfcDob = options.forceMismatch ? '14/02/1998' : doc.dob; // Tampered document altered printed DOB to 1999
    const nfcName = doc.holderName;
    const nfcDocId = doc.documentNumber;

    const payload: NfcCredentialPayload = {
      documentId: nfcDocId,
      name: nfcName,
      dob: nfcDob,
      nationality: doc.nationality || 'IND',
      expiry: doc.expiryDate,
      issuerId: 'IN-GOV-AUTH-091',
      version: 'NFC-CRED-2.1',
      timestamp: '2026-09-01T08:00:00Z',
      integrityHash: 'sha256:4d8a67ef8b9012a9bc763189d201cba643890f91a92e4071190bcda6129841b5',
    };

    const documentIdMatch = doc.documentNumber.trim().toUpperCase() === payload.documentId.trim().toUpperCase();
    const nameMatch = doc.holderName.trim().toUpperCase().includes(payload.name.trim().toUpperCase());
    const dobMatch = doc.dob.trim() === payload.dob.trim();
    const nationalityMatch = doc.nationality.trim().toUpperCase() === payload.nationality.trim().toUpperCase();
    const expiryMatch = doc.expiryDate.trim() === payload.expiry.trim();

    const allMatched = documentIdMatch && nameMatch && dobMatch && nationalityMatch && expiryMatch;

    if (!dobMatch || !allMatched) {
      return {
        moduleName,
        isPrototype,
        disclaimer,
        readStatus: 'MISMATCH',
        nfcPayload: payload,
        crossVerification: {
          documentIdMatch,
          nameMatch,
          dobMatch,
          nationalityMatch,
          expiryMatch,
        },
        integrityVerified: true, // Chip's signature itself is authentic, but printed document has been tampered!
        status: 'WARNING',
        explanation: `NFC CROSS-VERIFICATION MISMATCH: Printed Visual Zone DOB (${doc.dob}) does not match digitally signed NFC chip DOB (${payload.dob}). High probability of physical document date alteration.`,
      };
    }

    return {
      moduleName,
      isPrototype,
      disclaimer,
      readStatus: 'SUCCESS',
      nfcPayload: payload,
      crossVerification: {
        documentIdMatch: true,
        nameMatch: true,
        dobMatch: true,
        nationalityMatch: true,
        expiryMatch: true,
      },
      integrityVerified: true,
      status: 'PASS',
      explanation: 'Secure NFC Credential successfully verified. Cryptographic hash matches offline public trust anchor; 100% correlation with printed document fields.',
    };
  }
}

export class NfcService {
  private static adapter: NfcAdapter = new MockNfcAdapter();

  public static setAdapter(adapter: NfcAdapter) {
    this.adapter = adapter;
  }

  public static async verifyCredential(
    doc: DocumentData,
    options?: { forceMismatch?: boolean; forceUnreadable?: boolean }
  ): Promise<NfcResult> {
    return this.adapter.readAndVerify(doc, options);
  }
}
