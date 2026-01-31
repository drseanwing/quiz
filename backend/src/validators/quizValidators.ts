/**
 * @file        Quiz Validators
 * @module      Validators/Quiz
 * @description Express-validator schemas for quiz attempt endpoints
 */

import { body, param, query } from 'express-validator';

/**
 * Bank ID param validator for starting a quiz
 */
export const startQuizValidator = [
  param('bankId')
    .isUUID()
    .withMessage('Invalid question bank ID format'),
];

/**
 * Attempt ID param validator
 */
export const attemptIdValidator = [
  param('id')
    .isUUID()
    .withMessage('Invalid attempt ID format'),
];

/**
 * Save progress validator
 */
export const saveProgressValidator = [
  param('id')
    .isUUID()
    .withMessage('Invalid attempt ID format'),

  body('responses')
    .isObject()
    .withMessage('Responses must be an object'),

  body('timeSpent')
    .isInt({ min: 0 })
    .withMessage('timeSpent must be a non-negative integer'),
];

/**
 * List user attempts query validator
 */
export const listAttemptsValidator = [
  query('bankId')
    .optional()
    .isUUID()
    .withMessage('Invalid bank ID format'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('PageSize must be 1-100'),
];
