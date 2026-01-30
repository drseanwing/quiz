/**
 * @file        Authentication Routes
 * @module      Routes/Auth
 * @description Authentication endpoints for user management
 */

import { Router, Request, Response, NextFunction } from 'express';
import * as authService from '@/services/authService';
import {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  refreshTokenValidator,
} from '@/validators/authValidators';
import { handleValidationErrors } from '@/middleware/validation';
import { validateEmailDomain } from '@/middleware/emailDomain';
import { authRateLimiter, passwordResetRateLimiter } from '@/middleware/rateLimiter';
import logger from '@/config/logger';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user account
 *
 * @body {string} email - User email address
 * @body {string} password - User password
 * @body {string} firstName - User first name
 * @body {string} surname - User surname
 * @body {string} [idNumber] - Optional ID number
 *
 * @returns {201} User created successfully with authentication tokens
 * @returns {400} Validation error or user already exists
 */
router.post(
  '/register',
  authRateLimiter,
  registerValidator,
  handleValidationErrors,
  validateEmailDomain,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.registerUser(req.body);

      logger.info('User registration successful', {
        userId: result.user.id,
        email: result.user.email,
        ip: req.ip,
      });

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/login
 * Login with email and password
 *
 * @body {string} email - User email address
 * @body {string} password - User password
 *
 * @returns {200} Login successful with user data and tokens
 * @returns {401} Invalid credentials
 */
router.post(
  '/login',
  authRateLimiter,
  loginValidator,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.loginUser(req.body, req.ip);

      logger.info('Login successful', {
        userId: result.user.id,
        email: result.user.email,
        ip: req.ip,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 *
 * @body {string} refreshToken - Valid refresh token
 *
 * @returns {200} New token pair
 * @returns {401} Invalid or expired refresh token
 */
router.post(
  '/refresh',
  refreshTokenValidator,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tokens = await authService.refreshAccessToken(req.body);

      logger.debug('Token refreshed', {
        ip: req.ip,
      });

      res.json({
        success: true,
        data: tokens,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/logout
 * Logout user (invalidate tokens on client side)
 * Note: Requires authentication middleware
 *
 * @returns {200} Logout successful
 * @returns {401} Not authenticated
 */
router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // User ID comes from auth middleware (added later)
    const userId = req.user?.userId;

    if (userId) {
      await authService.logoutUser(userId);

      logger.info('Logout successful', {
        userId,
        ip: req.ip,
      });
    }

    res.json({
      success: true,
      data: {
        message: 'Logged out successfully',
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/forgot-password
 * Request password reset
 *
 * @body {string} email - User email address
 *
 * @returns {200} Password reset email sent (or generic message for security)
 */
router.post(
  '/forgot-password',
  passwordResetRateLimiter,
  forgotPasswordValidator,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.requestPasswordReset(req.body);

      logger.info('Password reset requested', {
        email: req.body.email,
        ip: req.ip,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/reset-password
 * Complete password reset with token
 *
 * @body {string} token - Password reset token
 * @body {string} password - New password
 *
 * @returns {200} Password reset successful
 * @returns {400} Validation error or invalid/expired token
 */
router.post(
  '/reset-password',
  resetPasswordValidator,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.resetPassword(req.body);

      logger.info('Password reset completed', {
        ip: req.ip,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/auth/token-login
 * Auto-login using invite token
 *
 * @query {string} token - Invite token
 * @query {string} [password] - Password for new account creation
 *
 * @returns {200} Login successful with user data and tokens
 * @returns {401} Invalid or expired invite token
 */
router.get('/token-login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = req.query;

    if (!token || typeof token !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invite token is required',
        },
      });
      return;
    }

    const result = await authService.loginWithToken(
      token,
      password as string | undefined
    );

    logger.info('Token login successful', {
      userId: result.user.id,
      email: result.user.email,
      ip: req.ip,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
