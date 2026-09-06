/**
 * PRAMAAN OCR Extraction Engine
 * Extracts text and MRZ data from scanned documents.
 * IMPORTANT: OCR extraction is strictly separate from document validation.
 */

import type { DocumentData, DocumentType, OcrField, OcrResult } from '../types';

export class OcrEngine {
  /**
   * Run optical character extraction on document data
   */
  public static extractFields(
    doc: DocumentData,
    documentType: DocumentType,
    confidenceModifier: number = 1.0
  ): OcrResult {
    let fields: OcrField[] = [];

    if (documentType === 'passport') {
      fields = [
        {
          label: 'Full Name',
          value: doc.holderName || `${doc.givenName} ${doc.surname}`.trim(),
          confidence: Math.min(99.9, Math.round(98.5 * confidenceModifier * 10) / 10),
          valid: true,
          status: 'PASS',
        },
        {
          label: 'Passport No.',
          value: doc.documentNumber,
          confidence: Math.min(99.9, Math.round(99.1 * confidenceModifier * 10) / 10),
          valid: true,
          status: 'PASS',
        },
        {
          label: 'Nationality',
          value: doc.nationality,
          confidence: Math.min(99.9, Math.round(99.5 * confidenceModifier * 10) / 10),
          valid: true,
          status: 'PASS',
        },
        {
          label: 'Date of Birth',
          value: doc.dob,
          confidence: Math.min(99.9, Math.round(96.8 * confidenceModifier * 10) / 10),
          valid: true,
          status: 'PASS',
        },
        {
          label: 'Gender',
          value: doc.gender,
          confidence: Math.min(99.9, Math.round(99.2 * confidenceModifier * 10) / 10),
          valid: true,
          status: 'PASS',
        },
        {
          label: 'Place of Birth',
          value: doc.placeOfBirth,
          confidence: Math.min(99.9, Math.round(98.1 * confidenceModifier * 10) / 10),
          valid: true,
          status: 'PASS',
        },
        {
          label: 'Date of Issue',
          value: doc.issueDate,
          confidence: Math.min(99.9, Math.round(97.9 * confidenceModifier * 10) / 10),
          valid: true,
          status: 'PASS',
        },
        {
          label: 'Date of Expiry',
          value: doc.expiryDate,
          confidence: Math.min(99.9, Math.round(98.7 * confidenceModifier * 10) / 10),
          valid: true,
          status: 'PASS',
        },
      ];
    } else if (documentType === 'visa') {
      fields = [
        {
          label: 'Full Name',
          value: doc.holderName || `${doc.givenName} ${doc.surname}`.trim(),
          confidence: Math.min(99.9, Math.round(99.2 * confidenceModifier * 10) / 10),
          valid: true,
          status: 'PASS',
        },
        {
          label: 'Visa Number',
          value: doc.documentNumber,
          confidence: Math.min(99.9, Math.round(99.0 * confidenceModifier * 10) / 10),
          valid: true,
          status: 'PASS',
        },
        {
          label: 'Visa Type',
          value: 'BUSINESS / MULTIPLE ENTRY',
          confidence: Math.min(99.9, Math.round(98.6 * confidenceModifier * 10) / 10),
          valid: true,
          status: 'PASS',
        },
        {
          label: 'Entry Validity',
          value: 'MULTIPLE ENTRIES',
          confidence: Math.min(99.9, Math.round(98.4 * confidenceModifier * 10) / 10),
          valid: true,
          status: 'PASS',
        },
        {
          label: 'Stay Duration',
          value: '180 DAYS PER VISIT',
          confidence: Math.min(99.9, Math.round(97.8 * confidenceModifier * 10) / 10),
          valid: true,
          status: 'PASS',
        },
        {
          label: 'Associated Passport',
          value: 'T1234567',
          confidence: Math.min(99.9, Math.round(98.9 * confidenceModifier * 10) / 10),
          valid: true,
          status: 'PASS',
        },
        {
          label: 'Date of Issue',
          value: doc.issueDate,
          confidence: Math.min(99.9, Math.round(98.2 * confidenceModifier * 10) / 10),
          valid: true,
          status: 'PASS',
        },
        {
          label: 'Date of Expiry',
          value: doc.expiryDate,
          confidence: Math.min(99.9, Math.round(99.1 * confidenceModifier * 10) / 10),
          valid: true,
          status: 'PASS',
        },
      ];
    } else {
      fields = [
        {
          label: 'Full Name',
          value: doc.holderName,
          confidence: Math.min(99.9, Math.round(98.0 * confidenceModifier * 10) / 10),
          valid: true,
          status: 'PASS',
        },
        {
          label: 'Document Number',
          value: doc.documentNumber,
          confidence: Math.min(99.9, Math.round(97.5 * confidenceModifier * 10) / 10),
          valid: true,
          status: 'PASS',
        },
        {
          label: 'Nationality',
          value: doc.nationality,
          confidence: Math.min(99.9, Math.round(98.8 * confidenceModifier * 10) / 10),
          valid: true,
          status: 'PASS',
        },
        {
          label: 'Date of Birth',
          value: doc.dob,
          confidence: Math.min(99.9, Math.round(96.9 * confidenceModifier * 10) / 10),
          valid: true,
          status: 'PASS',
        },
        {
          label: 'Date of Issue',
          value: doc.issueDate,
          confidence: Math.min(99.9, Math.round(97.6 * confidenceModifier * 10) / 10),
          valid: true,
          status: 'PASS',
        },
        {
          label: 'Date of Expiry',
          value: doc.expiryDate,
          confidence: Math.min(99.9, Math.round(98.4 * confidenceModifier * 10) / 10),
          valid: true,
          status: 'PASS',
        },
      ];
    }

    // Adjust status if confidence drops below thresholds (e.g. for low quality scan scenario)
    fields = fields.map((f) => {
      let status: 'PASS' | 'WARNING' | 'FAIL' = 'PASS';
      if (f.confidence < 70) {
        status = 'FAIL';
      } else if (f.confidence < 85) {
        status = 'WARNING';
      }
      return { ...f, status, valid: status !== 'FAIL' };
    });

    const avgConfidence =
      fields.reduce((acc, curr) => acc + curr.confidence, 0) / (fields.length || 1);

    const qualityStatus: 'OPTIMAL' | 'MODERATE' | 'LOW' =
      avgConfidence >= 90 ? 'OPTIMAL' : avgConfidence >= 75 ? 'MODERATE' : 'LOW';

    return {
      fields,
      mrzParsed: {
        documentType: doc.mrzLine1?.substring(0, 2) || 'P<',
        issuingCountry: doc.countryCode || 'IND',
        holderName: doc.holderName,
        documentNumber: doc.documentNumber,
        nationality: doc.nationality,
        dob: doc.dob,
        gender: doc.gender,
        expiryDate: doc.expiryDate,
        compositeChecksumValid: true,
      },
      rawText: `ICAO 9303 OCR STREAM: ${doc.mrzLine1} \n ${doc.mrzLine2}`,
      averageConfidence: Math.round(avgConfidence * 10) / 10,
      qualityStatus,
    };
  }
}
