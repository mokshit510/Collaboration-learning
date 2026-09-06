/**
 * PRAMAAN Verification Records Repository
 * Manages persisted verification audit records in local storage.
 * Masking PII (document numbers masked e.g. T123****) for security compliance.
 */

import type { VerificationRecord, VerificationResult } from '../types';

const STORAGE_KEY = 'pramaan_verification_records_v1';

// Seed demo records for immediate inspection in Past Records
const SEED_RECORDS: VerificationRecord[] = [
  {
    verificationId: 'PRM-2026-0841',
    timestamp: '2026-09-06T14:22:15Z',
    documentType: 'passport',
    maskedDocumentNumber: 'T123****',
    holderName: 'RAHUL SHARMA',
    riskScore: 78,
    riskLevel: 'HIGH',
    status: 'FLAGGED',
    investigator: 'Inspector A. Verma (SSB-41)',
    location: 'SSB Checkpoint A-14 (Indo-Nepal Border)',
    keyFindings: [
      'Photo border splicing anomaly detected (92% conf)',
      'NFC DOB mismatch (Printed 1999 vs Chip 1998)',
      'Guilloche pattern phase variance in lower band',
    ],
    evidenceSummary: 'Altered printed DOB and photo replacement detected on valid passport blank.',
    scenarioId: 'tampered',
  },
  {
    verificationId: 'PRM-2026-0839',
    timestamp: '2026-09-06T11:45:02Z',
    documentType: 'visa',
    maskedDocumentNumber: 'V984****',
    holderName: 'PRIYA PATEL',
    riskScore: 12,
    riskLevel: 'LOW',
    status: 'CLEARED',
    investigator: 'Officer R. Mehta',
    location: 'Delhi IGI Airport Terminal 3',
    keyFindings: ['All security seals authentic', 'Simulated consular database confirmed'],
    evidenceSummary: 'Consular visa fully authenticated against baseline reference.',
    scenarioId: 'genuine',
  },
  {
    verificationId: 'PRM-2026-0832',
    timestamp: '2026-09-05T19:10:44Z',
    documentType: 'passport',
    maskedDocumentNumber: 'P492****',
    holderName: 'ANAND KUMAR',
    riskScore: 68,
    riskLevel: 'HIGH',
    status: 'FLAGGED',
    investigator: 'Inspector S. Rao',
    location: 'Raxaul Land Customs Station',
    keyFindings: ['Document expired on 01/01/2026', 'Temporal consistency rule failed'],
    evidenceSummary: 'Expired passport presented for cross-border transit.',
    scenarioId: 'expired',
  },
  {
    verificationId: 'PRM-2026-0827',
    timestamp: '2026-09-05T16:30:19Z',
    documentType: 'passport',
    maskedDocumentNumber: 'W999****',
    holderName: 'VIKRAM MALHOTRA',
    riskScore: 92,
    riskLevel: 'HIGH',
    status: 'FLAGGED',
    investigator: 'Inspector A. Verma',
    location: 'SSB Checkpoint A-14',
    keyFindings: ['Active Lookout Circular (LOC) match', 'Financial crimes alert'],
    evidenceSummary: 'Subject flagged under immigration lookout circular.',
    scenarioId: 'watchlist',
  },
  {
    verificationId: 'PRM-2026-0820',
    timestamp: '2026-09-05T12:15:00Z',
    documentType: 'other',
    maskedDocumentNumber: 'CDC-****',
    holderName: 'RAHUL SHARMA',
    riskScore: 24,
    riskLevel: 'LOW',
    status: 'SAVED',
    investigator: 'Port Officer K. Iyer',
    location: 'Mumbai Port Trust Checkpost',
    keyFindings: ['Seafarer discharge book verified', 'DG Shipping lookup active'],
    evidenceSummary: 'Maritime credential verified.',
    scenarioId: 'genuine',
  },
];

export class RecordsStorage {
  private static records: VerificationRecord[] = [];

  private static init() {
    if (this.records.length > 0) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.records = JSON.parse(stored);
      } else {
        this.records = [...SEED_RECORDS];
        this.save();
      }
    } catch {
      this.records = [...SEED_RECORDS];
    }
  }

  private static save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.records));
    } catch {
      // Ignore quota errors in private browsing
    }
  }

  public static maskDocumentNumber(docNum: string): string {
    if (!docNum || docNum.length <= 4) return '****';
    const prefix = docNum.substring(0, 4);
    return `${prefix}${'*'.repeat(Math.max(4, docNum.length - 4))}`;
  }

  public static getRecords(): VerificationRecord[] {
    this.init();
    return [...this.records];
  }

  public static saveRecord(
    result: VerificationResult,
    investigator: string = 'Inspector (SSB Checkpoint A)',
    location: string = 'SSB Checkpoint A-14',
    actionStatus: 'SAVED' | 'FLAGGED' | 'CLEARED' = 'SAVED'
  ): VerificationRecord {
    this.init();

    const record: VerificationRecord = {
      verificationId: result.verificationId,
      timestamp: result.timestamp,
      documentType: result.documentType,
      maskedDocumentNumber: this.maskDocumentNumber(result.document.documentNumber),
      holderName: result.document.holderName,
      riskScore: result.risk.score,
      riskLevel: result.risk.level,
      status: actionStatus,
      investigator,
      location,
      keyFindings:
        result.tampering.indicators.map((i) => i.title).slice(0, 3).length > 0
          ? result.tampering.indicators.map((i) => i.title).slice(0, 3)
          : result.recommendations,
      evidenceSummary: result.risk.explanation,
    };

    // Prepend to top of list
    this.records = [record, ...this.records.filter((r) => r.verificationId !== record.verificationId)];
    this.save();
    return record;
  }

  public static updateStatus(verificationId: string, status: 'SAVED' | 'FLAGGED' | 'CLEARED') {
    this.init();
    this.records = this.records.map((r) =>
      r.verificationId === verificationId ? { ...r, status } : r
    );
    this.save();
  }
}
