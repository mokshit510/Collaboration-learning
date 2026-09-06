import { sendSuccess, sendError } from '../utils/response.js';
import DocumentService from '../services/documentService.js';

/**
 * Controller for Document management endpoints
 */
export class DocumentController {
  /**
   * POST /api/documents/upload
   * Uploads a document file and saves metadata with SHA-256 hash
   */
  static async upload(req, res, next) {
    try {
      if (!req.file) {
        return sendError(res, 'No document file provided. Please upload a file in the "document" field.', 400);
      }

      const documentType = req.body.documentType || 'passport';
      const validTypes = ['passport', 'visa', 'other'];

      if (!validTypes.includes(documentType)) {
        return sendError(
          res,
          `Invalid documentType '${documentType}'. Must be one of: ${validTypes.join(', ')}`,
          400
        );
      }

      const userId = req.user?.id || 'mock-officer-001';

      const document = await DocumentService.uploadDocument({
        file: req.file,
        documentType,
        userId,
        metadata: {
          originalName: req.file.originalname,
          sizeBytes: req.file.size,
          mimetype: req.file.mimetype,
          uploadedByRole: req.user?.role || 'investigator',
        },
      });

      return sendSuccess(
        res,
        document,
        'Document successfully uploaded and registered',
        201
      );
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/documents
   * Get documents list for the authenticated user or authority
   */
  static async list(req, res, next) {
    try {
      const { page = 1, limit = 20, documentType } = req.query;
      const userId = req.user?.id;
      const role = req.user?.role || 'investigator';

      const result = await DocumentService.getDocuments({
        userId,
        role,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        documentType,
      });

      return sendSuccess(res, result.documents, 'Documents retrieved successfully', 200, {
        total: result.total,
        page: result.page,
        limit: result.limit,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/documents/:id
   * Get single document details by ID
   */
  static async getById(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const role = req.user?.role || 'investigator';

      const document = await DocumentService.getDocumentById(id, { userId, role });

      if (!document) {
        return sendError(res, `Document not found with ID: ${id}`, 404);
      }

      return sendSuccess(res, document, 'Document details retrieved successfully');
    } catch (err) {
      next(err);
    }
  }
}

export default DocumentController;
