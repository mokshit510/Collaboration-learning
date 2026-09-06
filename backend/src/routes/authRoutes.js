import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import AuthController from '../controllers/authController.js';

const router = Router();

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & return JWT token + user profile
 * @access  Public
 */
router.post('/login', AuthController.login);

/**
 * @route   POST /api/auth/logout
 * @desc    Sign out and revoke active session
 * @access  Protected
 */
router.post('/logout', authenticate, AuthController.logout);

/**
 * @route   GET /api/auth/me
 * @desc    Get currently authenticated user's profile
 * @access  Protected
 */
router.get('/me', authenticate, AuthController.me);

export default router;
