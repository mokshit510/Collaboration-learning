/**
 * PRAMAAN Watchlist Screening Service
 *
 * Screen document identifiers and biographical identities against security watchlists.
 *
 * NOTE: For prototype/demonstration purposes, local simulated mock data is used.
 * Does NOT claim live INTERPOL or live national law enforcement database access.
 */

import type { WatchlistResult } from '../types';

export class WatchlistService {
  /**
   * Screen document against simulated watchlists
   */
  public static async screen(
    documentNumber: string,
    holderName: string,
    options: { forceMatch?: boolean } = {}
  ): Promise<WatchlistResult> {
    const isSimulated = true;
    const screeningSource = 'Simulated National & Border Lookout System (SL-BMS Testbed)';

    // Simulated watchlist known hits (for demo purposes)
    const WATCHLIST_DATABASE = [
      {
        docNumber: 'W9999999',
        name: 'VIKRAM MALHOTRA',
        reason: 'Immigration Lookout Circular (LOC) — Active Financial Fraud Investigation',
        severity: 'CRITICAL' as const,
        actionRequired: 'Detain and notify Special Branch immediately.',
      },
      {
        docNumber: 'T9876543',
        name: 'DEV RAJ',
        reason: 'Lost or Stolen Travel Document (SLTD Alert)',
        severity: 'HIGH' as const,
        actionRequired: 'Impound credential for secondary consular review.',
      },
    ];

    const cleanDocNum = documentNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const cleanName = holderName.trim().toUpperCase();

    const matchedItem = options.forceMatch
      ? {
          docNumber: documentNumber,
          name: holderName,
          reason: 'Active Lookout Circular (LOC): Subject of high-priority immigration alert.',
          severity: 'CRITICAL' as const,
          actionRequired: 'Hold subject for secondary screening by Senior Checkpoint Officer.',
        }
      : WATCHLIST_DATABASE.find(
          (w) =>
            w.docNumber === cleanDocNum ||
            (w.name === cleanName && cleanName.length > 4)
        );

    if (matchedItem) {
      return {
        isSimulated,
        screeningSource,
        documentNumberChecked: documentNumber,
        identityChecked: holderName,
        status: 'MATCH_FOUND',
        matchCount: 1,
        hits: [
          {
            listName: 'Simulated National Lookout Circular (LOC)',
            referenceId: `LOC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
            reason: matchedItem.reason,
            severity: matchedItem.severity,
            actionRequired: matchedItem.actionRequired,
          },
        ],
        explanation: `CRITICAL ALERT: Document ${documentNumber} matched in simulated lookout database. Action: ${matchedItem.actionRequired}`,
      };
    }

    return {
      isSimulated,
      screeningSource,
      documentNumberChecked: documentNumber,
      identityChecked: holderName,
      status: 'NO_MATCH',
      matchCount: 0,
      explanation: 'No adverse lookout records or active alerts matched against document number or holder identity.',
    };
  }
}
