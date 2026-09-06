import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { uploadSingleDocument } from '../middleware/uploadMiddleware.js';
import OcrController from '../controllers/ocrController.js';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  uploadSingleDocument,
  OcrController.process
);

export default router;
