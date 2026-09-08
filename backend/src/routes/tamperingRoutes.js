import { Router } from 'express';
import { uploadSingleDocument } from '../middleware/uploadMiddleware.js';
import TamperingController from '../controllers/tamperingController.js';

const router = Router();

// Middleware helper that handles multer for multipart/form-data while letting application/json pass through
const handleUploadOrJson = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    return uploadSingleDocument(req, res, (err) => {
      if (err) {
        return res.status(err.statusCode || 400).json({
          success: false,
          message: err.message || 'File upload error',
        });
      }
      next();
    });
  }
  next();
};

// Compatible with POST /api/v1/tampering and POST /api/v1/tampering/analyze
router.post('/', handleUploadOrJson, TamperingController.analyze);
router.post('/analyze', handleUploadOrJson, TamperingController.analyze);

export default router;
