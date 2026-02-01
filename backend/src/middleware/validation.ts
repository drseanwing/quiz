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
  _res: Response,
  next: NextFunction
): void {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorArray = errors.array();

    logger.debug('Validation failed', {
      path: req.path,
      method: req.method,
      errors: errorArray.map((e: ExpressValidationError) =>
        e.type === 'field' ? { field: e.path, message: e.msg } : { message: e.msg }
      ),
    });

    // Format errors for response
    // Do not include submitted values in error response to prevent data leakage
    const formattedErrors = errorArray.map((error: ExpressValidationError) => {
      if (error.type === 'field') {
        return {
          field: error.path,
          message: error.msg,
        };
      }
      return {
        message: error.msg,
      };
    });

    return next(new ValidationError(
      formattedErrors[0]?.message || 'Validation failed',
      {
        errors: formattedErrors,
      }
    ));
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
  return (req: Request, _res: Response, next: NextFunction): void => {
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

      return next(new ValidationError('Required fields missing', {
        missing,
      }));
    }

    next();
  };
}

