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
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

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
