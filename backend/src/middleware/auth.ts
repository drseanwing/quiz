/**
 * @file        Authentication Middleware
 * @module      Middleware/Auth
 * @description JWT authentication and role-based authorization middleware
 */

import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { verifyAccessToken, extractTokenFromHeader, ITokenPayload } from '@/utils/jwt';
import { AuthenticationError, AuthorizationError } from './errorHandler';
import logger from '@/config/logger';
import prisma from '@/config/database';

/**
 * Extend Express Request to include authenticated user data
 */
declare global {
  namespace Express {
    interface Request {
      /** Authenticated user data from JWT */
      user?: ITokenPayload;
    }
  }
}

/**
 * JWT authentication middleware
 * Verifies access token and attaches user data to request
 * Throws AuthenticationError if token is missing or invalid
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 *
 * @example
 * router.get('/protected', authenticate, (req, res) => {
 *   const userId = req.user.userId;
 * });
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      logger.debug('Authentication failed: No token provided', {
        path: req.path,
        method: req.method,
        ip: req.ip,
      });
      throw new AuthenticationError('Authentication token required');
    }

    // Verify token
    const result = verifyAccessToken(token);

    if (!result.valid || !result.payload) {
      logger.debug('Authentication failed: Invalid token', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        error: result.error,
      });
      throw new AuthenticationError(result.error || 'Invalid authentication token');
    }

    // Check if user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: result.payload.userId },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!user) {
      logger.warn('Authentication failed: User not found', {
        userId: result.payload.userId,
        email: result.payload.email,
        path: req.path,
      });
      throw new AuthenticationError('User account not found');
    }

    if (!user.isActive) {
      logger.warn('Authentication failed: User account deactivated', {
        userId: user.id,
        email: user.email,
        path: req.path,
      });
      throw new AuthenticationError('User account is deactivated');
    }

    // Attach user data to request
    req.user = result.payload;

    logger.debug('Authentication successful', {
      userId: result.payload.userId,
      email: result.payload.email,
      role: result.payload.role,
      path: req.path,
    });

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication middleware
 * Attaches user data to request if valid token is provided
 * Does not throw error if token is missing or invalid
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 *
 * @example
 * router.get('/public', optionalAuth, (req, res) => {
 *   if (req.user) {
 *     // User is authenticated
 *   }
 * });
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      // No token provided, continue without authentication
      return next();
    }

    const result = verifyAccessToken(token);

    if (result.valid && result.payload) {
      // Check if user exists and is active
      const user = await prisma.user.findUnique({
        where: { id: result.payload.userId },
        select: { id: true, email: true, role: true, isActive: true },
      });

      if (user && user.isActive) {
        req.user = result.payload;
        logger.debug('Optional auth: User authenticated', {
          userId: result.payload.userId,
        });
      }
    }

    next();
  } catch (error) {
    // Log error but continue without authentication
    logger.debug('Optional auth: Token validation failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    next();
  }
}

/**
 * Role-based authorization middleware factory
 * Requires authenticate middleware to run first
 * Throws AuthorizationError if user doesn't have required role
 *
 * @param roles - Required roles (user must have at least one)
 * @returns Express middleware function
 *
 * @example
 * router.delete('/admin', authenticate, requireRole(['ADMIN']), handler);
 * router.post('/question-banks', authenticate, requireRole(['EDITOR', 'ADMIN']), handler);
 */
export function requireRole(roles: UserRole | UserRole[]) {
  const roleArray = Array.isArray(roles) ? roles : [roles];

  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required');
      }

      const userRole = req.user.role;

      if (!roleArray.includes(userRole)) {
        logger.warn('Authorization failed: Insufficient permissions', {
          userId: req.user.userId,
          userRole,
          requiredRoles: roleArray,
          path: req.path,
          method: req.method,
        });

        throw new AuthorizationError(
          `This action requires one of the following roles: ${roleArray.join(', ')}`
        );
      }

      logger.debug('Authorization successful', {
        userId: req.user.userId,
        userRole,
        requiredRoles: roleArray,
        path: req.path,
      });

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Admin-only middleware
 * Shorthand for requireRole(['ADMIN'])
 *
 * @example
 * router.get('/admin/users', authenticate, requireAdmin, handler);
 */
export const requireAdmin = requireRole([UserRole.ADMIN]);

/**
 * Editor or Admin middleware
 * Shorthand for requireRole(['EDITOR', 'ADMIN'])
 *
 * @example
 * router.post('/question-banks', authenticate, requireEditor, handler);
 */
export const requireEditor = requireRole([UserRole.EDITOR, UserRole.ADMIN]);

/**
 * Authenticated user middleware
 * Alias for authenticate - for clarity in routes
 *
 * @example
 * router.get('/profile', requireAuth, handler);
 */
export const requireAuth = authenticate;
