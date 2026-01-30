/**
 * @file        Auth Validators
 * @module      Validators/Auth
 * @description Express-validator schemas for authentication endpoints
 */

import { body } from 'express-validator';
import { config } from '@/config';
import { isEmailDomainAllowed } from '@/middleware/emailDomain';

/**
 * Registration validator
 * Validates user registration request body
 */
export const registerValidator = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email address is required')
    .normalizeEmail()
    .custom((email, { req }) => {
      const role = req.body.role || 'USER';
      if (!isEmailDomainAllowed(email, role)) {
        throw new Error(`Email must be from @${config.email.allowedDomain} domain`);
      }
      return true;
    }),

  body('password')
    .isString()
    .withMessage('Password is required')
    .isLength({ min: config.password.minLength, max: 128 })
    .withMessage(
      `Password must be between ${config.password.minLength} and 128 characters`
    ),

  body('firstName')
    .trim()
    .isString()
    .withMessage('First name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name contains invalid characters'),

  body('surname')
    .trim()
    .isString()
    .withMessage('Surname is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Surname must be between 1 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Surname contains invalid characters'),

  body('idNumber')
    .optional()
    .trim()
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('ID number must be between 1 and 50 characters'),
];

/**
 * Login validator
 * Validates user login request body
 */
export const loginValidator = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email address is required')
    .normalizeEmail(),

  body('password')
    .isString()
    .withMessage('Password is required')
    .notEmpty()
    .withMessage('Password cannot be empty'),
];

/**
 * Password reset request validator
 * Validates forgot password request body
 */
export const forgotPasswordValidator = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email address is required')
    .normalizeEmail(),
];

/**
 * Password reset completion validator
 * Validates reset password request body with token
 */
export const resetPasswordValidator = [
  body('token')
    .isString()
    .withMessage('Reset token is required')
    .notEmpty()
    .withMessage('Reset token cannot be empty'),

  body('password')
    .isString()
    .withMessage('Password is required')
    .isLength({ min: config.password.minLength, max: 128 })
    .withMessage(
      `Password must be between ${config.password.minLength} and 128 characters`
    ),
];

/**
 * Token refresh validator
 * Validates refresh token request body
 */
export const refreshTokenValidator = [
  body('refreshToken')
    .isString()
    .withMessage('Refresh token is required')
    .notEmpty()
    .withMessage('Refresh token cannot be empty'),
];

/**
 * Token-based login validator
 * Validates invite token from query string
 */
export const tokenLoginValidator = [
  // Token comes from query string, not body
  // Validation handled in route handler
];

/**
 * Change password validator
 * Validates change password request (requires current password)
 */
export const changePasswordValidator = [
  body('currentPassword')
    .isString()
    .withMessage('Current password is required')
    .notEmpty()
    .withMessage('Current password cannot be empty'),

  body('newPassword')
    .isString()
    .withMessage('New password is required')
    .isLength({ min: config.password.minLength, max: 128 })
    .withMessage(
      `New password must be between ${config.password.minLength} and 128 characters`
    )
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    }),
];
