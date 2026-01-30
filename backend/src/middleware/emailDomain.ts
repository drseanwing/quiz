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
 * Admin users can use any email domain
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
    const { email, role } = req.body;

    if (!email) {
      // Let express-validator handle missing email
      return next();
    }

    // Admin users can use any email domain
    if (role === 'ADMIN') {
      logger.debug('Email domain validation skipped for admin', {
        email,
      });
      return next();
    }

    // Extract domain from email
    const emailDomain = email.toLowerCase().split('@')[1];

    if (!emailDomain) {
      throw new ValidationError('Invalid email format', {
        field: 'email',
        value: email,
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
          value: email,
          allowed: allowedDomain,
          provided: emailDomain,
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
 * Utility function for use outside middleware
 *
 * @param email - Email address to check
 * @param role - User role (ADMIN exempted from restriction)
 * @returns True if email domain is allowed
 *
 * @example
 * if (isEmailDomainAllowed('user@health.qld.gov.au', 'USER')) {
 *   // Email is valid
 * }
 */
export function isEmailDomainAllowed(email: string, role?: string): boolean {
  // Admin users can use any email domain
  if (role === 'ADMIN') {
    return true;
  }

  const emailDomain = email.toLowerCase().split('@')[1];
  const allowedDomain = config.email.allowedDomain.toLowerCase();

  return emailDomain === allowedDomain;
}
