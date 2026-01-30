/**
 * @file        Email Domain Validation Middleware
 * @module      Middleware/EmailDomain
 * @description Validates email domain restrictions for user registration
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '@/config';
import { ValidationError } from './errorHandler';
import logger from '@/config/logger';

/**
 * Validate email domain middleware
 * Ensures non-admin users have email addresses from allowed domain
 * Only skips validation for authenticated admins (verified via JWT, not request body)
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 *
 * @throws ValidationError if email domain is not allowed
 *
 * @example
 * router.post('/register', validateEmailDomain, handler);
 */
export function validateEmailDomain(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const { email } = req.body;

    if (!email) {
      // Let express-validator handle missing email
      return next();
    }

    // Only skip domain validation for authenticated admin users (from JWT token),
    // never based on user-supplied body fields to prevent bypass attacks
    if (req.user?.role === 'ADMIN') {
      logger.debug('Email domain validation skipped for authenticated admin', {
        email,
        adminUserId: req.user.userId,
      });
      return next();
    }

    // Extract domain from email
    const emailDomain = email.toLowerCase().split('@')[1];

    if (!emailDomain) {
      throw new ValidationError('Invalid email format', {
        field: 'email',
      });
    }

    // Check against allowed domain
    const allowedDomain = config.email.allowedDomain.toLowerCase();

    if (emailDomain !== allowedDomain) {
      logger.warn('Email domain validation failed', {
        email,
        emailDomain,
        allowedDomain,
        ip: req.ip,
      });

      throw new ValidationError(
        `Email must be from @${allowedDomain} domain`,
        {
          field: 'email',
          allowed: allowedDomain,
        }
      );
    }

    logger.debug('Email domain validation passed', {
      email,
      domain: emailDomain,
    });

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Check if email is from allowed domain
 * Utility function for use outside middleware (e.g., validators)
 * Always enforces domain check during self-registration
 *
 * @param email - Email address to check
 * @returns True if email domain is allowed
 *
 * @example
 * if (isEmailDomainAllowed('user@health.qld.gov.au')) {
 *   // Email is valid
 * }
 */
export function isEmailDomainAllowed(email: string): boolean {
  const emailDomain = email.toLowerCase().split('@')[1];
  const allowedDomain = config.email.allowedDomain.toLowerCase();

  return emailDomain === allowedDomain;
}
