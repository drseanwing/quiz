/**
 * @file        Question Bank Validators
 * @module      Validators/QuestionBank
 * @description Express-validator schemas for question bank endpoints
 */

import { body, query, param } from 'express-validator';
import { QuestionBankStatus, FeedbackTiming } from '@prisma/client';

const validStatuses = Object.values(QuestionBankStatus);
const validFeedbackTimings = Object.values(FeedbackTiming);

/**
 * Create question bank validator
 * Validates POST /api/question-banks request body
 */
export const createQuestionBankValidator = [
  body('title')
    .trim()
    .isString()
    .withMessage('Title is required')
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),

  body('description')
    .optional()
    .trim()
    .isString()
    .isLength({ max: 2000 })
    .withMessage('Description must be at most 2000 characters'),

  body('status')
    .optional()
    .isIn(validStatuses)
    .withMessage(`Status must be one of: ${validStatuses.join(', ')}`),

  body('timeLimit')
    .optional()
    .isInt({ min: 0, max: 7200 })
    .withMessage('Time limit must be between 0 and 7200 seconds')
    .toInt(),

  body('randomQuestions')
    .optional()
    .isBoolean()
    .withMessage('randomQuestions must be a boolean'),

  body('randomAnswers')
    .optional()
    .isBoolean()
    .withMessage('randomAnswers must be a boolean'),

  body('passingScore')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Passing score must be between 0 and 100')
    .toInt(),

  body('feedbackTiming')
    .optional()
    .isIn(validFeedbackTimings)
    .withMessage(`Feedback timing must be one of: ${validFeedbackTimings.join(', ')}`),

  body('notificationEmail')
    .optional({ values: 'null' })
    .trim()
    .isEmail()
    .withMessage('Notification email must be a valid email address')
    .normalizeEmail(),

  body('questionCount')
    .optional()
    .isInt({ min: 1, max: 500 })
    .withMessage('Question count must be between 1 and 500')
    .toInt(),

  body('maxAttempts')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Max attempts must be between 0 and 100')
    .toInt(),
];

/**
 * Update question bank validator
 * Validates PATCH /api/question-banks/:id request body
 */
export const updateQuestionBankValidator = [
  param('id')
    .isUUID()
    .withMessage('Invalid question bank ID format'),

  body('title')
    .optional()
    .trim()
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),

  body('description')
    .optional({ values: 'null' })
    .trim()
    .isString()
    .isLength({ max: 2000 })
    .withMessage('Description must be at most 2000 characters'),

  body('status')
    .optional()
    .isIn(validStatuses)
    .withMessage(`Status must be one of: ${validStatuses.join(', ')}`),

  body('timeLimit')
    .optional()
    .isInt({ min: 0, max: 7200 })
    .withMessage('Time limit must be between 0 and 7200 seconds')
    .toInt(),

  body('randomQuestions')
    .optional()
    .isBoolean()
    .withMessage('randomQuestions must be a boolean'),

  body('randomAnswers')
    .optional()
    .isBoolean()
    .withMessage('randomAnswers must be a boolean'),

  body('passingScore')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Passing score must be between 0 and 100')
    .toInt(),

  body('feedbackTiming')
    .optional()
    .isIn(validFeedbackTimings)
    .withMessage(`Feedback timing must be one of: ${validFeedbackTimings.join(', ')}`),

  body('notificationEmail')
    .optional({ values: 'null' })
    .trim()
    .isEmail()
    .withMessage('Notification email must be a valid email address')
    .normalizeEmail(),

  body('questionCount')
    .optional()
    .isInt({ min: 1, max: 500 })
    .withMessage('Question count must be between 1 and 500')
    .toInt(),

  body('maxAttempts')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Max attempts must be between 0 and 100')
    .toInt(),
];

/**
 * Question bank ID param validator
 */
export const questionBankIdValidator = [
  param('id')
    .isUUID()
    .withMessage('Invalid question bank ID format'),
];

/**
 * Question bank list query validator
 */
export const questionBankQueryValidator = [
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

  query('status')
    .optional()
    .isIn(validStatuses)
    .withMessage(`Status must be one of: ${validStatuses.join(', ')}`),
];
