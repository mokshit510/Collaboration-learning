import { Router } from 'express';
import NfcController from '../controllers/nfcController.js';

const router = Router();

// Compatible with: POST /api/v1/nfc/verify
router.post('/verify', NfcController.verify);
router.get('/latest', NfcController.getLatest);

export default router;
