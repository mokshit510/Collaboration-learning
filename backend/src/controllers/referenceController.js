import { sendSuccess, sendError } from '../utils/response.js';
import ReferenceVerificationService from '../services/referenceVerificationService.js';

export class ReferenceController {
  /**
   * Handle POST /api/v1/reference/compare
   * Compares OCR-derived document data against the Supabase synthetic reference database.
   */
  static async compare(req, res, next) {
    try {
      // Accept either { document: { ... } } or direct { ... } payload
      const documentData = req.body.document || req.body;

      if (!documentData || typeof documentData !== 'object') {
        return sendError(
          res,
          'Invalid request: Missing document data for reference comparison.',
          400
        );
      }

      const docNumber =
        documentData.documentNumber ||
        documentData.passportNumber ||
        documentData.docNumber;

      if (!docNumber || !String(docNumber).trim()) {
        return sendError(
          res,
          'Invalid request: documentNumber is required for reference comparison.',
          400
        );
      }

      const result = await ReferenceVerificationService.compareWithReferenceDatabase(documentData);

      return sendSuccess(
        res,
        result,
        'Synthetic reference verification completed successfully'
      );
    } catch (err) {
      console.error('[REFERENCE] Controller error:', err.message);

      if (err.message?.includes('unavailable') || err.code === 'ECONNREFUSED') {
        return sendError(
          res,
          'Synthetic Reference Database is currently unavailable. Please check Supabase configuration.',
          503
        );
      }

      return sendError(
        res,
        err.message || 'Synthetic reference comparison failed.',
        err.statusCode || err.status || 500
      );
    }
  }
}

export default ReferenceController;
