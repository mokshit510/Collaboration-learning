import { supabaseClient } from '../config/supabase.js';
import config from '../config/env.js';
import { sendError } from '../utils/response.js';

/**
 * Authentication middleware: verifies Supabase JWT token or mock development token
 */
export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  // Verify Authorization header presence
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'Authentication required: Missing or invalid Bearer token', 401);
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return sendError(res, 'Authentication required: Token cannot be empty', 401);
  }

  // 1. Handle mock development tokens (starts with 'mock-jwt')
  if (token.startsWith('mock-jwt')) {
    const isAuthority = token.includes('authority') || req.headers['x-user-role'] === 'authority';
    req.user = {
      id: token.includes('0002') ? 'b1a2c3d4-0002-4000-8000-000000000002' : 'b1a2c3d4-0001-4000-8000-000000000001',
      email: isAuthority ? 'authority@ssb.gov.in' : 'officer@ssb.gov.in',
      role: isAuthority ? 'authority' : 'investigator',
      isMock: true,
    };
    return next();
  }

  // 2. Handle Supabase JWT tokens if configured
  if (config.supabase.isConfigured && supabaseClient) {
    try {
      const { data: { user }, error } = await supabaseClient.auth.getUser(token);

      if (error || !user) {
        return sendError(res, 'Invalid or expired authentication token', 401, error?.message);
      }

      req.user = {
        id: user.id,
        email: user.email,
        role: user.user_metadata?.role || req.headers['x-user-role'] || 'investigator',
        rawUser: user,
      };

      return next();
    } catch (err) {
      return sendError(res, 'Authentication verification failed', 401, err.message);
    }
  }

  // 3. Fallback for test / dev environment tokens
  if (!config.isProduction && (token === 'valid-test-token' || token.startsWith('test-'))) {
    req.user = {
      id: 'test-user-001',
      email: 'officer@ssb.gov.in',
      role: req.headers['x-user-role'] || 'investigator',
      isMock: true,
    };
    return next();
  }

  return sendError(res, 'Invalid authentication token', 401);
}

/**
 * Role-Based Access Control (RBAC) middleware
 * @param {string[]} allowedRoles
 */
export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Unauthorized: user identity not verified', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        `Forbidden: role '${req.user.role}' is not authorized to access this resource`,
        403
      );
    }

    next();
  };
}

export default {
  authenticate,
  requireRole,
};
