import multer from 'multer';
import config from '../config/env.js';

// Use memory storage so we can hash files directly and pipe them to Supabase/AI services
const storage = multer.memoryStorage();

const allowedMimeTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
];

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(`Unsupported file type: ${file.mimetype}. Allowed types: JPEG, PNG, WEBP, PDF`),
      false
    );
  }
};

const limits = {
  fileSize: config.upload.maxSizeMb * 1024 * 1024, // e.g. 10MB
  files: 5,
};

export const upload = multer({
  storage,
  fileFilter,
  limits,
});

/**
 * Single document upload middleware (field name: 'document')
 */
export const uploadSingleDocument = upload.single('document');

/**
 * Multi-file upload for document + optional selfie (live capture)
 */
export const uploadVerificationFiles = upload.fields([
  { name: 'document', maxCount: 1 },
  { name: 'selfie', maxCount: 1 },
]);

export default {
  upload,
  uploadSingleDocument,
  uploadVerificationFiles,
};
