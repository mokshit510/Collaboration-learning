import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import ReferenceController from '../controllers/referenceController.js';

const router = Router();

// Require standard authentication (supports Bearer JWT and mock-jwt in development)
router.use(authenticate);

// POST /api/v1/reference/compare
router.post('/compare', ReferenceController.compare);

export default router;
