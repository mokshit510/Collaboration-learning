import multer from 'multer';
import config from '../config/env.js';

// Use memory storage so we can hash files directly and pipe them to Supabase/AI services
const storage = multer.memoryStorage();

const allowedMimeTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new Error('Only JPG, JPEG, PNG or WEBP images up to 2 MB are allowed.');
    err.statusCode = 400;
    cb(err, false);
  }
};

const limits = {
  fileSize: 2 * 1024 * 1024, // 2MB
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
