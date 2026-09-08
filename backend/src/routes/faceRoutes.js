import { Router } from 'express';
import FaceController from '../controllers/faceController.js';

const router = Router();

// Compatible with: POST /api/v1/face/verify
router.post('/verify', FaceController.verify);
router.get('/latest', FaceController.getLatest);

export default router;
