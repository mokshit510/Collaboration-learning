import { Router } from 'express';
import SessionController from '../controllers/sessionController.js';

const router = Router();

// Active / Current session
router.get('/current', SessionController.getCurrent);
router.post('/init', SessionController.initSession);

// Session by ID
router.get('/:sessionId', SessionController.getById);
router.post('/:sessionId/heartbeat', SessionController.heartbeat);
router.post('/:sessionId/stage', SessionController.updateStage);
router.post('/:sessionId/request-face', SessionController.requestFace);
router.post('/:sessionId/reset', SessionController.resetSession);

export default router;
