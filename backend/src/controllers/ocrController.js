import { sendSuccess, sendError } from '../utils/response.js';
import OcrService from '../services/ocrService.js';

export class OcrController {
  static async process(req, res, next) {
    try {
      if (!req.file) {
        return sendError(
          res,
          'No document file provided. Please upload a file in the "document" field.',
          400
        );
      }

      const result = await OcrService.run(req.file);

      return sendSuccess(
        res,
        result,
        'OCR completed successfully'
      );
    } catch (err) {
      console.error('[OCR] Processing failed:', err.message);

      if (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED')) {
        return sendError(
          res,
          'OCR service is currently unavailable. Please verify the AI service is running.',
          503
        );
      }

      if (err.response) {
        console.error(
          '[OCR] Python service response error:',
          err.response.data
        );
        const detail =
          err.response.data?.detail ||
          err.response.data?.message ||
          'OCR processing failed on AI service.';
        return sendError(res, detail, err.response.status || 500);
      }

      return sendError(
        res,
        err.message || 'OCR processing failed.',
        err.statusCode || err.status || 500
      );
    }
  }
}

export default OcrController;
