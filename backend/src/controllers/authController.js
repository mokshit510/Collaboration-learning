import { sendSuccess, sendError } from '../utils/response.js';
import AuthService from '../services/authService.js';

/**
 * Authentication Controller
 */
export class AuthController {
  /**
   * POST /api/auth/login
   */
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return sendError(res, 'Email and password are required', 400);
      }

      const result = await AuthService.login(email, password);

      return sendSuccess(res, result, 'Authentication successful');
    } catch (err) {
      return sendError(res, err.message || 'Authentication failed', 401);
    }
  }

  /**
   * POST /api/auth/logout
   */
  static async logout(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.split(' ')[1];

      await AuthService.logout(token);

      return sendSuccess(res, null, 'Logged out successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/auth/me
   */
  static async me(req, res, next) {
    try {
      if (!req.user) {
        return sendError(res, 'Unauthorized', 401);
      }

      const profile = await AuthService.getProfile(req.user.id, req.user.email);

      return sendSuccess(res, profile, 'User profile retrieved');
    } catch (err) {
      next(err);
    }
  }
}

export default AuthController;
