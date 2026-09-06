/**
 * Standardized API Response Utilities
 */

/**
 * Send a standardized success JSON response
 * @param {import('express').Response} res
 * @param {any} data
 * @param {string} [message='Success']
 * @param {number} [statusCode=200]
 * @param {object} [meta={}]
 */
export function sendSuccess(res, data = null, message = 'Success', statusCode = 200, meta = {}) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta: Object.keys(meta).length > 0 ? meta : undefined,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Send a standardized error JSON response
 * @param {import('express').Response} res
 * @param {string} [message='Internal Server Error']
 * @param {number} [statusCode=500]
 * @param {any} [details=null]
 */
export function sendError(res, message = 'Internal Server Error', statusCode = 500, details = null) {
  return res.status(statusCode).json({
    success: false,
    message,
    error: details || undefined,
    timestamp: new Date().toISOString(),
  });
}

export default {
  sendSuccess,
  sendError,
};
