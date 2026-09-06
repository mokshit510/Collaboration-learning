import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin, supabaseClient } from '../config/supabase.js';
import config from '../config/env.js';
import { hashBuffer } from '../utils/hash.js';

// In-memory document store fallback when Supabase is not connected (dev/mock mode)
const inMemoryDocuments = new Map();

/**
 * Service to manage document uploads, metadata, and storage
 */
export class DocumentService {
  /**
   * Upload document buffer and register in the database
   * @param {object} params
   * @param {Express.Multer.File} params.file
   * @param {'passport' | 'visa' | 'other'} [params.documentType='passport']
   * @param {string} params.userId
   * @param {object} [params.metadata={}]
   */
  static async uploadDocument({ file, documentType = 'passport', userId, metadata = {} }) {
    if (!file || !file.buffer) {
      throw new Error('No valid file buffer provided for upload');
    }

    // Compute cryptographic SHA-256 hash for document integrity
    const fileHash = hashBuffer(file.buffer);
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${userId}/${Date.now()}-${sanitizedFilename}`;
    const docId = uuidv4();

    const docRecord = {
      id: docId,
      user_id: userId,
      file_name: file.originalname,
      file_size: file.size,
      mime_type: file.mimetype,
      storage_path: storagePath,
      file_hash: fileHash,
      document_type: documentType,
      status: 'uploaded',
      metadata: {
        ...metadata,
        uploadedAt: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Attempt Supabase upload if configured
    if (config.supabase.isConfigured && supabaseAdmin) {
      try {
        // 1. Upload file buffer to private Supabase Storage bucket
        const { error: storageError } = await supabaseAdmin.storage
          .from('documents')
          .upload(storagePath, file.buffer, {
            contentType: file.mimetype,
            upsert: false,
          });

        if (storageError) {
          console.warn('[DocumentService] Storage bucket upload warning:', storageError.message);
        }

        // 2. Insert metadata record into PostgreSQL `documents` table
        const { data, error: dbError } = await supabaseAdmin
          .from('documents')
          .insert(docRecord)
          .select()
          .single();

        if (dbError) {
          console.warn('[DocumentService] DB insert warning, using local cache:', dbError.message);
        } else if (data) {
          inMemoryDocuments.set(data.id, data);
          return data;
        }
      } catch (err) {
        console.warn('[DocumentService] Supabase operation fallback:', err.message);
      }
    }

    // Dev/Mock fallback in memory
    inMemoryDocuments.set(docId, docRecord);
    return docRecord;
  }

  /**
   * Get list of documents with role-based filtering
   * @param {object} params
   * @param {string} params.userId
   * @param {string} params.role
   * @param {number} [params.page=1]
   * @param {number} [params.limit=20]
   * @param {string} [params.documentType]
   */
  static async getDocuments({ userId, role, page = 1, limit = 20, documentType }) {
    if (config.supabase.isConfigured && supabaseClient) {
      try {
        let query = supabaseClient.from('documents').select('*', { count: 'exact' });

        // Investigators see only their own uploads; authorities see all
        if (role !== 'authority' && role !== 'admin') {
          query = query.eq('user_id', userId);
        }

        if (documentType) {
          query = query.eq('document_type', documentType);
        }

        const offset = (page - 1) * limit;
        query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

        const { data, count, error } = await query;
        if (!error && data) {
          return {
            documents: data,
            total: count || data.length,
            page,
            limit,
          };
        }
      } catch (err) {
        console.warn('[DocumentService] Fetching from DB failed, using local store:', err.message);
      }
    }

    // In-memory fallback
    let all = Array.from(inMemoryDocuments.values());
    if (role !== 'authority' && role !== 'admin') {
      all = all.filter((doc) => doc.user_id === userId);
    }
    if (documentType) {
      all = all.filter((doc) => doc.document_type === documentType);
    }

    all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const offset = (page - 1) * limit;
    const paginated = all.slice(offset, offset + limit);

    return {
      documents: paginated,
      total: all.length,
      page,
      limit,
    };
  }

  /**
   * Get single document by ID
   * @param {string} id
   * @param {object} userContext
   * @param {string} userContext.userId
   * @param {string} userContext.role
   */
  static async getDocumentById(id, { userId, role }) {
    if (config.supabase.isConfigured && supabaseClient) {
      try {
        let query = supabaseClient.from('documents').select('*').eq('id', id);
        if (role !== 'authority' && role !== 'admin') {
          query = query.eq('user_id', userId);
        }
        const { data, error } = await query.single();
        if (!error && data) {
          return data;
        }
      } catch (err) {
        console.warn('[DocumentService] DB getDocumentById error:', err.message);
      }
    }

    const doc = inMemoryDocuments.get(id);
    if (!doc) return null;

    if (role !== 'authority' && role !== 'admin' && doc.user_id !== userId) {
      return null;
    }

    return doc;
  }
}

export default DocumentService;
