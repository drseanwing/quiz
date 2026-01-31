/**
 * @file        User Routes
 * @module      Routes/Users
 * @description User management endpoints for profile and admin operations
 */

import { Router, Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import * as userService from '@/services/userService';
import {
  updateProfileValidator,
  changePasswordValidator,
  createUserValidator,
  updateUserValidator,
  userQueryValidator,
  userIdParamValidator,
  adminResetPasswordValidator,
} from '@/validators/userValidators';
import { handleValidationErrors } from '@/middleware/validation';
import { AuthorizationError } from '@/middleware/errorHandler';
import { authenticate, requireAdmin } from '@/middleware/auth';
import logger from '@/config/logger';

const router = Router();

// All user routes require authentication
// Note: generalRateLimiter is applied at app level for all /api routes
router.use(authenticate);

// ─── Current User (Self) ────────────────────────────────────────────────────

/**
 * GET /api/users/me
 * Get current user profile
 *
 * @returns {200} User profile
 * @returns {401} Not authenticated
 */
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userService.getCurrentUser(req.user!.userId);

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/users/me
 * Update current user profile
 *
 * @body {string} [firstName] - Updated first name
 * @body {string} [surname] - Updated surname
 * @body {string|null} [idNumber] - Updated ID number
 *
 * @returns {200} Updated user profile
 * @returns {400} Validation error
 */
router.patch(
  '/me',
  updateProfileValidator,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await userService.updateCurrentUser(req.user!.userId, req.body);

      logger.info('Profile updated', {
        userId: req.user!.userId,
        ip: req.ip,
      });

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/users/me/password
 * Change current user's password
 *
 * @body {string} currentPassword - Current password
 * @body {string} newPassword - New password
 *
 * @returns {200} Password changed
 * @returns {401} Current password incorrect
 * @returns {400} New password too weak
 */
router.patch(
  '/me/password',
  changePasswordValidator,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await userService.changePassword(req.user!.userId, req.body);

      logger.info('Password changed', {
        userId: req.user!.userId,
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

// ─── Admin User Management ─────────────────────────────────────────────────

/**
 * GET /api/users
 * List all users (admin only)
 *
 * @query {number} [page=1] - Page number
 * @query {number} [pageSize=20] - Items per page
 * @query {string} [search] - Search by name or email
 * @query {string} [role] - Filter by role
 * @query {string} [isActive] - Filter by active status
 *
 * @returns {200} Paginated user list
 * @returns {403} Not admin
 */
router.get(
  '/',
  requireAdmin,
  userQueryValidator,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        search: req.query.search as string | undefined,
        role: req.query.role as UserRole | undefined,
        isActive: req.query.isActive !== undefined
          ? req.query.isActive === 'true'
          : undefined,
      };

      const pagination = {
        page: Math.max(1, parseInt(req.query.page as string) || 1),
        pageSize: Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20)),
      };

      const result = await userService.listUsers(filters, pagination);

      res.json({
        success: true,
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/users/:id
 * Get user by ID (admin only)
 *
 * @param {string} id - User UUID
 *
 * @returns {200} User profile
 * @returns {404} User not found
 */
router.get(
  '/:id',
  requireAdmin,
  userIdParamValidator,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await userService.getUserById(req.params.id);

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/users
 * Create a new user (admin only)
 *
 * @body {string} email - User email
 * @body {string} password - User password
 * @body {string} firstName - First name
 * @body {string} surname - Surname
 * @body {string} [idNumber] - Optional ID number
 * @body {string} [role] - User role (USER, EDITOR, ADMIN)
 *
 * @returns {201} Created user
 * @returns {400} Validation error or email exists
 */
router.post(
  '/',
  requireAdmin,
  createUserValidator,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await userService.createUser(req.body);

      logger.info('User created by admin', {
        createdUserId: user.id,
        adminUserId: req.user!.userId,
        ip: req.ip,
      });

      res.status(201).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/users/:id
 * Update a user (admin only)
 *
 * @param {string} id - User UUID
 * @body {string} [firstName] - Updated first name
 * @body {string} [surname] - Updated surname
 * @body {string|null} [idNumber] - Updated ID number
 * @body {string} [role] - Updated role
 * @body {boolean} [isActive] - Updated active status
 *
 * @returns {200} Updated user
 * @returns {404} User not found
 */
router.patch(
  '/:id',
  requireAdmin,
  updateUserValidator,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Prevent admins from deactivating or demoting themselves
      if (req.params.id === req.user!.userId) {
        if (req.body.isActive === false) {
          throw new AuthorizationError('Cannot deactivate your own account');
        }
        if (req.body.role && req.body.role !== req.user!.role) {
          throw new AuthorizationError('Cannot change your own role');
        }
      }

      const user = await userService.updateUser(req.params.id, req.body);

      logger.info('User updated by admin', {
        updatedUserId: req.params.id,
        adminUserId: req.user!.userId,
        ip: req.ip,
      });

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/users/:id
 * Deactivate a user (admin only, soft delete)
 *
 * @param {string} id - User UUID
 *
 * @returns {200} User deactivated
 * @returns {404} User not found
 */
router.delete(
  '/:id',
  requireAdmin,
  userIdParamValidator,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await userService.deactivateUser(req.params.id);

      logger.info('User deactivated by admin', {
        deactivatedUserId: req.params.id,
        adminUserId: req.user!.userId,
        ip: req.ip,
      });

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/users/:id/reset-password
 * Reset a user's password (admin only)
 *
 * @param {string} id - User UUID
 * @body {string} password - New password
 *
 * @returns {200} Password reset
 * @returns {404} User not found
 * @returns {400} Password too weak
 */
router.post(
  '/:id/reset-password',
  requireAdmin,
  adminResetPasswordValidator,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await userService.adminResetPassword(
        req.params.id,
        req.body.password
      );

      logger.info('Password reset by admin', {
        targetUserId: req.params.id,
        adminUserId: req.user!.userId,
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

export default router;
