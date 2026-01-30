/**
 * @file        Validation Middleware
 * @module      Middleware/Validation
 * @description Express-validator result handler middleware
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationError as ExpressValidationError } from 'express-validator';
import { ValidationError } from './errorHandler';
import logger from '@/config/logger';

/**
 * Validation result handler middleware
 * Processes express-validator validation results
 * Throws ValidationError if validation fails
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 *
 * @throws ValidationError if validation fails
 *
 * @example
 * router.post('/register',
 *   registerValidator,
 *   handleValidationErrors,
 *   registerHandler
 * );
 */
export function handleValidationErrors(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorArray = errors.array();

    logger.debug('Validation failed', {
      path: req.path,
      method: req.method,
      errors: errorArray,
      body: req.body,
    });

    // Format errors for response
    const formattedErrors = errorArray.map((error: ExpressValidationError) => {
      if (error.type === 'field') {
        return {
          field: error.path,
          message: error.msg,
          value: error.value,
        };
      }
      return {
        message: error.msg,
      };
    });

    throw new ValidationError(
      formattedErrors[0]?.message || 'Validation failed',
      {
        errors: formattedErrors,
      }
    );
  }

  next();
}

/**
 * Validate request body contains all required fields
 * Generic validation for required fields
 *
 * @param fields - Array of required field names
 * @returns Express middleware function
 *
 * @example
 * router.post('/api/example',
 *   validateRequiredFields(['name', 'email']),
 *   handler
 * );
 */
export function validateRequiredFields(fields: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const missing: string[] = [];

    for (const field of fields) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      logger.debug('Required fields missing', {
        path: req.path,
        missing,
      });

      throw new ValidationError('Required fields missing', {
        missing,
      });
    }

    next();
  };
}

/**
 * Sanitize request body
 * Removes undefined, null, and empty string values
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 *
 * @example
 * router.patch('/api/example', sanitizeBody, handler);
 */
export function sanitizeBody(req: Request, res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      if (
        req.body[key] === undefined ||
        req.body[key] === null ||
        req.body[key] === ''
      ) {
        delete req.body[key];
      }
    }
  }

  next();
}
