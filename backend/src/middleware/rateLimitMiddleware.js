import rateLimit from 'express-rate-limit';
import config from '../config/env.js';

/**
 * Global rate limiter for standard endpoints
 */
export const standardLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs, // 15 minutes default
  max: config.rateLimit.max, // 100 requests default
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
    timestamp: new Date().toISOString(),
  },
});

/**
 * Stricter rate limiter for compute-heavy verification & AI screening routes
 */
export const verificationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Verification rate limit exceeded. Please wait a moment before submitting more documents.',
    timestamp: new Date().toISOString(),
  },
});

export default {
  standardLimiter,
  verificationLimiter,
};
