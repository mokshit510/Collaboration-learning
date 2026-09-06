import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { uploadSingleDocument } from '../middleware/uploadMiddleware.js';
import DocumentController from '../controllers/documentController.js';

const router = Router();

// All document routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/documents/upload
 * @desc    Upload document file and create screening entry
 * @access  Protected
 */
router.post('/upload', uploadSingleDocument, DocumentController.upload);

/**
 * @route   GET /api/documents
 * @desc    Get documents (scoped by user role)
 * @access  Protected
 */
router.get('/', DocumentController.list);

/**
 * @route   GET /api/documents/:id
 * @desc    Get document details by ID
 * @access  Protected
 */
router.get('/:id', DocumentController.getById);

export default router;
