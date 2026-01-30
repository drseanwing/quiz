/**
 * @file        Admin Validators
 * @module      Validators/Admin
 * @description Express-validator schemas for admin endpoints
 */

import { body, query } from 'express-validator';

/**
 * Completions query validator
 */
export const completionsQueryValidator = [
  query('bankId').optional().isUUID().withMessage('Invalid bank ID'),
  query('userId').optional().isUUID().withMessage('Invalid user ID'),
  query('dateFrom').optional().isISO8601().withMessage('Invalid dateFrom format'),
  query('dateTo').optional().isISO8601().withMessage('Invalid dateTo format'),
  query('passed').optional().isBoolean().withMessage('passed must be boolean'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('PageSize must be 1-100'),
];

/**
 * Logs query validator
 */
export const logsQueryValidator = [
  query('action').optional().isString().isLength({ max: 100 }).withMessage('Invalid action'),
  query('entityType').optional().isString().isLength({ max: 100 }).withMessage('Invalid entity type'),
  query('userId').optional().isUUID().withMessage('Invalid user ID'),
  query('dateFrom').optional().isISO8601().withMessage('Invalid dateFrom format'),
  query('dateTo').optional().isISO8601().withMessage('Invalid dateTo format'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('PageSize must be 1-100'),
];

/**
 * Create invite token validator
 */
export const createInviteValidator = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('firstName')
    .optional()
    .trim()
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be 1-100 characters'),
  body('surname')
    .optional()
    .trim()
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Surname must be 1-100 characters'),
  body('bankId')
    .optional()
    .isUUID()
    .withMessage('Invalid bank ID'),
  body('expiresInDays')
    .optional()
    .isInt({ min: 1, max: 90 })
    .withMessage('Expiry must be 1-90 days'),
];

/**
 * Invite tokens list query validator
 */
export const inviteTokensQueryValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('PageSize must be 1-100'),
];
