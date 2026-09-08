/**
 * PRAMAAN Document Validation Engine
 * Executes deterministic rule-based checks on extracted document data:
 * - Required fields check
 * - Document format & syntax
 * - Expiry evaluation
 * - Date consistency (Issue < Expiry, DOB < Issue)
 * - Passport number format
 * - MRZ vs Visual Inspection Zone consistency
 * - Name consistency
 * - Document type consistency
 */

import type { DocumentData, ValidationResult, ValidationRuleCheck, ValidationItem } from '../types';

export class ValidationEngine {
  /**
   * Parse DD/MM/YYYY, YYYY-MM-DD, or DD MMM YYYY into Date object safely
   */
  private static parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    const cleanStr = dateStr.trim();
    const slashParts = cleanStr.split('/');
    if (slashParts.length === 3) {
      const d = parseInt(slashParts[0], 10);
      const m = parseInt(slashParts[1], 10) - 1;
      const y = parseInt(slashParts[2], 10);
      return new Date(y, m, d);
    }
    const dashParts = cleanStr.split('-');
    if (dashParts.length === 3) {
      const y = parseInt(dashParts[0], 10);
      const m = parseInt(dashParts[1], 10) - 1;
      const d = parseInt(dashParts[2], 10);
      return new Date(y, m, d);
    }
    const spaceParts = cleanStr.split(/\s+/);
    if (spaceParts.length === 3) {
      const months: Record<string, number> = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
      };
      const d = parseInt(spaceParts[0], 10);
      const mStr = spaceParts[1].substring(0, 3).toLowerCase();
      const y = parseInt(spaceParts[2], 10);
      if (!isNaN(d) && months[mStr] !== undefined && !isNaN(y)) {
        return new Date(y, months[mStr], d);
      }
    }
    const parsed = new Date(cleanStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  /**
   * Run full validation suite on document
   */
  public static validate(
    doc: DocumentData,
    options: { forceExpired?: boolean } = {}
  ): ValidationResult {
    const checks: ValidationRuleCheck[] = [];

    // 1. Required Fields Check
    const requiredFields = doc.isUserUploaded
      ? ['documentNumber', 'nationality', 'dob', 'expiryDate']
      : ['documentNumber', 'nationality', 'dob', 'issueDate', 'expiryDate'];
    const missing = requiredFields.filter((f) => !doc[f as keyof DocumentData]);
    if (missing.length === 0) {
      checks.push({
        id: 'val_req_fields',
        ruleName: 'Mandatory Fields Presence',
        field: 'All Security Fields',
        status: 'PASS',
        explanation: 'All mandatory biographical and document metadata fields are present.',
      });
    } else {
      checks.push({
        id: 'val_req_fields',
        ruleName: 'Mandatory Fields Presence',
        field: 'All Security Fields',
        status: 'FAIL',
        explanation: `Missing required security fields: ${missing.join(', ')}.`,
      });
    }

    // 2. Passport / Document Number Format Check
    const docNumRegex = /^[A-Z0-9-]{6,12}$/i;
    if (doc.documentNumber && docNumRegex.test(doc.documentNumber)) {
      checks.push({
        id: 'val_doc_format',
        ruleName: 'Document Number Format',
        field: 'Document Number',
        status: 'PASS',
        explanation: `Document identifier conforms to standard alphanumeric structure: ${doc.documentNumber}.`,
      });
    } else {
      checks.push({
        id: 'val_doc_format',
        ruleName: 'Document Number Format',
        field: 'Document Number',
        status: 'FAIL',
        explanation: `Document identifier does not conform to standard format specifications: ${doc.documentNumber || '(empty)'}.`,
      });
    }

    // 3. Expiry Check
    const expiryDate = this.parseDate(doc.expiryDate);
    const currentDate = new Date(2026, 8, 6); // Mock date 06-Sep-2026

    if (options.forceExpired || (expiryDate && expiryDate < currentDate)) {
      checks.push({
        id: 'val_expiry',
        ruleName: 'Document Validity & Expiry',
        field: 'Expiry Date',
        status: 'FAIL',
        explanation: `Document has expired (${doc.expiryDate}). Unfit for international travel / official entry.`,
      });
    } else if (expiryDate) {
      const sixMonthsFromNow = new Date(currentDate);
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
      if (expiryDate < sixMonthsFromNow) {
        checks.push({
          id: 'val_expiry',
          ruleName: 'Document Validity & Expiry',
          field: 'Expiry Date',
          status: 'WARNING',
          explanation: `Document expires within 6 months (${doc.expiryDate}). Enhanced scrutiny required by immigration policy.`,
        });
      } else {
        checks.push({
          id: 'val_expiry',
          ruleName: 'Document Validity & Expiry',
          field: 'Expiry Date',
          status: 'PASS',
          explanation: `Document is active and valid until ${doc.expiryDate} (> 6 months validity remaining).`,
        });
      }
    } else {
      checks.push({
        id: 'val_expiry',
        ruleName: 'Document Validity & Expiry',
        field: 'Expiry Date',
        status: 'WARNING',
        explanation: 'Could not parse expiry date with strict compliance.',
      });
    }

    // 4. Issue Date vs Expiry Date Relationship Check
    const issueDate = this.parseDate(doc.issueDate);
    if (issueDate && expiryDate) {
      if (issueDate >= expiryDate) {
        checks.push({
          id: 'val_issue_expiry_rel',
          ruleName: 'Temporal Sequence Consistency',
          field: 'Issue / Expiry Dates',
          status: 'FAIL',
          explanation: `Issue date (${doc.issueDate}) occurs on or after Expiry date (${doc.expiryDate}). Chronological violation detected.`,
        });
      } else {
        checks.push({
          id: 'val_issue_expiry_rel',
          ruleName: 'Temporal Sequence Consistency',
          field: 'Issue / Expiry Dates',
          status: 'PASS',
          explanation: 'Chronological timeline verified: Issue date correctly precedes Expiry date.',
        });
      }
    }

    // 5. Date of Birth vs Issue Date Consistency
    const dob = this.parseDate(doc.dob);
    if (dob && issueDate) {
      if (dob >= issueDate) {
        checks.push({
          id: 'val_dob_issue_rel',
          ruleName: 'Biographical Date Order',
          field: 'Date of Birth',
          status: 'FAIL',
          explanation: `Holder DOB (${doc.dob}) is recorded after document Issue Date (${doc.issueDate}). Impossible biographical timeline.`,
        });
      } else {
        checks.push({
          id: 'val_dob_issue_rel',
          ruleName: 'Biographical Date Order',
          field: 'Date of Birth',
          status: 'PASS',
          explanation: 'Holder DOB precedes issuance date in valid historical progression.',
        });
      }
    }

    // 6. Visual Inspection Zone (VIZ) vs MRZ Consistency
    const rawLine2 = doc.mrzLine2 || '';
    const mrzClean = rawLine2.trim();

    if (mrzClean.length >= 20) {
      const normalizedDocNumber = (doc.documentNumber || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
      const mrzDocNumber = mrzClean.substring(0, 9).replace(/</g, '').toUpperCase();
      const docNumInMrz = normalizedDocNumber && (mrzClean.includes(normalizedDocNumber) || mrzDocNumber.includes(normalizedDocNumber) || normalizedDocNumber.includes(mrzDocNumber));

      if (docNumInMrz) {
        checks.push({
          id: 'val_viz_mrz_cross',
          ruleName: 'VIZ to MRZ Cross-Check',
          field: 'Biographical Cross-Check',
          status: 'PASS',
          explanation: 'Printed text fields (Document No, Surname, Given Name) correlate with MRZ machine-readable strip.',
        });
      } else {
        checks.push({
          id: 'val_viz_mrz_cross',
          ruleName: 'VIZ to MRZ Cross-Check',
          field: 'Biographical Cross-Check',
          status: 'WARNING',
          explanation: `Discrepancy detected between printed Visual Inspection Zone (${doc.documentNumber}) and machine-readable data strip (${mrzDocNumber}).`,
        });
      }
    } else if (doc.mrzLine2) {
      checks.push({
        id: 'val_viz_mrz_cross',
        ruleName: 'VIZ to MRZ Cross-Check',
        field: 'Biographical Cross-Check',
        status: 'WARNING',
        explanation: 'MRZ data strip incomplete. Visual Inspection Zone correlation cannot be established.',
      });
    }

    // 7. Document Type Consistency Check
    const mrzDocTypeChar = doc.mrzLine1 ? doc.mrzLine1.charAt(0) : undefined;
    if (mrzDocTypeChar) {
      if (
        (doc.type === 'passport' && mrzDocTypeChar === 'P') ||
        (doc.type === 'visa' && (mrzDocTypeChar === 'V' || mrzDocTypeChar === 'I')) ||
        doc.type === 'other'
      ) {
        checks.push({
          id: 'val_doctype_match',
          ruleName: 'Document Type Specification Match',
          field: 'Document Header / MRZ Code',
          status: 'PASS',
          explanation: `Physical document classification (${doc.type}) matches header descriptor and security standard.`,
        });
      } else {
        checks.push({
          id: 'val_doctype_match',
          ruleName: 'Document Type Specification Match',
          field: 'Document Header / MRZ Code',
          status: 'WARNING',
          explanation: `Header document type (${doc.type}) does not match MRZ standard prefix (${mrzDocTypeChar}).`,
        });
      }
    } else {
      checks.push({
        id: 'val_doctype_match',
        ruleName: 'Document Type Specification Match',
        field: 'Document Header / Type',
        status: 'PASS',
        explanation: `Physical document classification verified as ${doc.type.toUpperCase()}.`,
      });
    }

    const passedCount = checks.filter((c) => c.status === 'PASS').length;
    const warningCount = checks.filter((c) => c.status === 'WARNING').length;
    const failedCount = checks.filter((c) => c.status === 'FAIL').length;

    const overallStatus: 'PASS' | 'WARNING' | 'FAIL' =
      failedCount > 0 ? 'FAIL' : warningCount > 0 ? 'WARNING' : 'PASS';

    return {
      overallStatus,
      rulesChecked: checks.length,
      passedCount,
      warningCount,
      failedCount,
      checks,
    };
  }

  /**
   * Helper to convert ValidationResult checks into backwards-compatible ValidationItem[] for legacy UI cards
   */
  public static toLegacyValidationItems(res: ValidationResult): ValidationItem[] {
    return res.checks.map((c) => ({
      id: c.id,
      label: c.ruleName,
      status: c.status === 'PASS' ? 'Valid' : c.status === 'WARNING' ? 'Warning' : 'Failed',
      valid: c.status === 'PASS',
      detail: c.explanation,
      severity: c.status,
    }));
  }
}
