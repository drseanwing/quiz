/**
 * @file        Question Validators
 * @module      Validators/Question
 * @description Express-validator schemas for question endpoints
 */

import { body, param } from 'express-validator';
import { QuestionType } from '@prisma/client';

const validTypes = Object.values(QuestionType);

/**
 * Bank ID param validator for nested routes
 */
export const bankIdParamValidator = [
  param('bankId')
    .isUUID()
    .withMessage('Invalid question bank ID format'),
];

/**
 * Question ID param validator
 */
export const questionIdParamValidator = [
  param('id')
    .isUUID()
    .withMessage('Invalid question ID format'),
];

/**
 * Create question validator
 * Validates POST /api/question-banks/:bankId/questions request body
 */
export const createQuestionValidator = [
  param('bankId')
    .isUUID()
    .withMessage('Invalid question bank ID format'),

  body('type')
    .isIn(validTypes)
    .withMessage(`Question type must be one of: ${validTypes.join(', ')}`),

  body('prompt')
    .trim()
    .isString()
    .withMessage('Prompt is required')
    .isLength({ min: 1, max: 10000 })
    .withMessage('Prompt must be between 1 and 10000 characters'),

  body('promptImage')
    .optional()
    .trim()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Prompt image path must not exceed 500 characters'),

  body('options')
    .exists()
    .withMessage('Options are required'),

  body('correctAnswer')
    .exists()
    .withMessage('Correct answer is required'),

  body('feedback')
    .trim()
    .isString()
    .withMessage('Feedback is required')
    .isLength({ min: 1, max: 10000 })
    .withMessage('Feedback must be between 1 and 10000 characters'),

  body('feedbackImage')
    .optional()
    .trim()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Feedback image path must not exceed 500 characters'),

  body('referenceLink')
    .optional()
    .trim()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Reference link must not exceed 500 characters'),
];

/**
 * Update question validator
 * Validates PATCH /api/questions/:id request body
 */
export const updateQuestionValidator = [
  param('id')
    .isUUID()
    .withMessage('Invalid question ID format'),

  body('type')
    .optional()
    .isIn(validTypes)
    .withMessage(`Question type must be one of: ${validTypes.join(', ')}`),

  body('options')
    .optional(),

  body('correctAnswer')
    .optional(),

  body('prompt')
    .optional()
    .trim()
    .isString()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Prompt must be between 1 and 10000 characters'),

  body('promptImage')
    .optional({ values: 'null' })
    .trim()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Prompt image path must not exceed 500 characters'),

  body('feedback')
    .optional()
    .trim()
    .isString()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Feedback must be between 1 and 10000 characters'),

  body('feedbackImage')
    .optional({ values: 'null' })
    .trim()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Feedback image path must not exceed 500 characters'),

  body('referenceLink')
    .optional({ values: 'null' })
    .trim()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Reference link must not exceed 500 characters'),
];

/**
 * Reorder questions validator
 * Validates PATCH /api/question-banks/:bankId/questions/reorder
 */
export const reorderQuestionsValidator = [
  param('bankId')
    .isUUID()
    .withMessage('Invalid question bank ID format'),

  body('questionIds')
    .isArray({ min: 1 })
    .withMessage('questionIds must be a non-empty array'),

  body('questionIds.*')
    .isUUID()
    .withMessage('Each question ID must be a valid UUID'),
];
