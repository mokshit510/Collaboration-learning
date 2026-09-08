import { Router } from 'express';
import { uploadFaceFiles } from '../middleware/uploadMiddleware.js';
import FaceController from '../controllers/faceController.js';

const router = Router();

// Middleware helper that handles multer for multipart/form-data while letting application/json pass through
const handleFaceUploadOrJson = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    return uploadFaceFiles(req, res, (err) => {
      if (err) {
        return res.status(err.statusCode || 400).json({
          success: false,
          error: err.code || 'FACE_IMAGE_INVALID',
          message: err.message || 'File upload error during face verification',
        });
      }
      next();
    });
  }
  next();
};

// Supports both POST /api/v1/face and POST /api/v1/face/verify
router.post('/', handleFaceUploadOrJson, FaceController.verify);
router.post('/verify', handleFaceUploadOrJson, FaceController.verify);
router.get('/latest', FaceController.getLatest);
router.get('/:sessionId', FaceController.getLatest);

export default router;
