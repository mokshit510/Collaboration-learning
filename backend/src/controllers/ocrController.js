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

      if (err.response) {
        console.error(
          '[OCR] Python service response:',
          err.response.data
        );
      }

      next(err);
    }
  }
}

export default OcrController;
