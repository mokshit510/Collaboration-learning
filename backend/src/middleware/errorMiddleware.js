import { sendError } from '../utils/response.js';
import config from '../config/env.js';

/**
 * Handle requests to non-existent routes (404)
 */
export function notFoundHandler(req, res, next) {
  return sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
}

/**
 * Global application error handler
 */
export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';

  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = 'Only JPG, JPEG, PNG or WEBP images up to 2 MB are allowed.';
  }

  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);

  const errorDetails = config.isProduction
    ? null
    : {
        stack: err.stack,
        code: err.code || undefined,
      };

  return sendError(res, message, statusCode, errorDetails);
}

export default {
  notFoundHandler,
  errorHandler,
};
