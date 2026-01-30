/**
 * @file        User Validators
 * @module      Validators/User
 * @description Express-validator schemas for user management endpoints
 */

import { body, query, param } from 'express-validator';
import { config } from '@/config';
import { UserRole } from '@prisma/client';

const validRoles = Object.values(UserRole);

/**
 * Update profile validator
 * Validates PATCH /api/users/me request body
 */
export const updateProfileValidator = [
  body('firstName')
    .optional()
    .trim()
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name contains invalid characters'),

  body('surname')
    .optional()
    .trim()
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Surname must be between 1 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Surname contains invalid characters'),

  body('idNumber')
    .optional({ values: 'null' })
    .trim()
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('ID number must be between 1 and 50 characters'),
];

/**
 * Change password validator
 * Validates PATCH /api/users/me/password request body
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

/**
 * Create user validator (admin)
 * Validates POST /api/users request body
 */
export const createUserValidator = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email address is required')
    .normalizeEmail(),

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

  body('role')
    .optional()
    .isIn(validRoles)
    .withMessage(`Role must be one of: ${validRoles.join(', ')}`),
];

/**
 * Update user validator (admin)
 * Validates PATCH /api/users/:id request body
 */
export const updateUserValidator = [
  param('id')
    .isUUID()
    .withMessage('Invalid user ID format'),

  body('firstName')
    .optional()
    .trim()
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name contains invalid characters'),

  body('surname')
    .optional()
    .trim()
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Surname must be between 1 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Surname contains invalid characters'),

  body('idNumber')
    .optional({ values: 'null' })
    .trim()
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('ID number must be between 1 and 50 characters'),

  body('role')
    .optional()
    .isIn(validRoles)
    .withMessage(`Role must be one of: ${validRoles.join(', ')}`),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

/**
 * User query filters validator
 * Validates GET /api/users query parameters
 */
export const userQueryValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),

  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Page size must be between 1 and 100')
    .toInt(),

  query('search')
    .optional()
    .trim()
    .isString()
    .isLength({ max: 200 })
    .withMessage('Search term must not exceed 200 characters'),

  query('role')
    .optional()
    .isIn(validRoles)
    .withMessage(`Role filter must be one of: ${validRoles.join(', ')}`),

  query('isActive')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('isActive filter must be true or false'),
];

/**
 * User ID param validator
 * Validates :id path parameter
 */
export const userIdParamValidator = [
  param('id')
    .isUUID()
    .withMessage('Invalid user ID format'),
];
