import type { DocumentData, DocumentType } from '../types';
import { mockPassportData, mockVisaData, mockOtherDocData } from '../data/mockVerificationData';
import apiClient from './apiClient';

// Simulated delay helper
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class VerificationService {
  /**
   * Fetch current document data based on type
   */
  static getDocumentData(type: DocumentType): DocumentData {
    switch (type) {
      case 'passport':
        return mockPassportData;
      case 'visa':
        return mockVisaData;
      case 'other':
        return mockOtherDocData;
      default:
        return mockPassportData;
    }
  }

  /**
   * Document upload endpoint with backend REST API sync
   */
  static async uploadDocument(
    file: File,
    type: DocumentType = 'passport'
  ): Promise<{ url: string; filename: string; documentId?: string }> {
    const objectUrl = URL.createObjectURL(file);
    let documentId: string | undefined;

    try {
      // Sync document with backend REST API
      const apiRes = await apiClient.uploadDocument(file, type);
      if (apiRes.success && apiRes.data?.id) {
        documentId = apiRes.data.id;
      }
    } catch (err) {
      console.info('[VerificationService] Backend offline or fallback mode:', err);
    }

    return {
      url: objectUrl,
      filename: file.name,
      documentId,
    };
  }

  /**
   * Simulated OCR Extraction endpoint
   */
  static async runOCR(type: DocumentType) {
    await delay(700);
    const doc = this.getDocumentData(type);
    return doc.ocrFields;
  }

  /**
   * Simulated Document Validation endpoint
   */
  static async validateDocument(type: DocumentType) {
    await delay(600);
    const doc = this.getDocumentData(type);
    return doc.validationItems;
  }

  /**
   * Simulated Issuer Verification endpoint
   */
  static async verifyIssuer(type: DocumentType) {
    await delay(800);
    const doc = this.getDocumentData(type);
    return doc.issuerItems;
  }

  /**
   * Simulated Tampering Analysis endpoint
   */
  static async analyzeTampering(type: DocumentType) {
    await delay(900);
    const doc = this.getDocumentData(type);
    return doc.suspiciousElements;
  }

  /**
   * Simulated Face Verification endpoint
   */
  static async verifyFace(type: DocumentType) {
    await delay(700);
    const doc = this.getDocumentData(type);
    return {
      score: doc.faceMatchScore,
      status: doc.faceMatchStatus,
    };
  }

  /**
   * Simulated Risk Engine calculation endpoint
   */
  static async calculateRisk(type: DocumentType) {
    await delay(600);
    const doc = this.getDocumentData(type);
    return {
      score: doc.riskScore,
      level: doc.riskLevel,
      description: doc.riskDescription,
      contributors: doc.riskContributors,
    };
  }

  /**
   * Execute multi-stage pipeline with real-time callbacks
   */
  static async runPipelineSimulation(
    type: DocumentType,
    onStepChange: (stepIndex: number, stepName: string) => void
  ): Promise<DocumentData> {
    const steps = [
      'Document Upload',
      'OCR Extraction',
      'Validation',
      'Issuer Verification',
      'Tampering Analysis',
      'Face Verification',
      'Risk Assessment',
      'Complete',
    ];

    for (let i = 0; i < steps.length; i++) {
      onStepChange(i + 1, steps[i]);
      // Realistic stagger: quick first steps, deeper forensic steps
      const waitTime = i === 4 ? 700 : i === 6 ? 600 : 450;
      await delay(waitTime);
    }

    return this.getDocumentData(type);
  }
}
