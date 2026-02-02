/**
 * @file        Question Validators
 * @module      Validators/Question
 * @description Express-validator schemas for question endpoints
 */

import { body, param } from 'express-validator';
import { QuestionType } from '@prisma/client';

const validTypes = Object.values(QuestionType);

/**
 * Validates options structure based on question type
 */
function validateOptionsStructure(value: any, questionType: QuestionType): boolean | never {
  if (!questionType) {
    throw new Error('Question type is required to validate options');
  }

  switch (questionType) {
    case QuestionType.MULTIPLE_CHOICE_SINGLE:
    case QuestionType.MULTIPLE_CHOICE_MULTI:
    case QuestionType.DRAG_ORDER:
      // Must be an array of objects with id and text
      if (!Array.isArray(value)) {
        throw new Error(`Options for ${questionType} must be an array`);
      }
      if (value.length === 0) {
        throw new Error(`Options for ${questionType} must not be empty`);
      }
      for (let i = 0; i < value.length; i++) {
        const option = value[i];
        if (typeof option !== 'object' || option === null) {
          throw new Error(`Option at index ${i} must be an object`);
        }
        if (typeof option.id !== 'string' || !option.id) {
          throw new Error(`Option at index ${i} must have a non-empty string 'id' field`);
        }
        if (typeof option.text !== 'string') {
          throw new Error(`Option at index ${i} must have a string 'text' field`);
        }
      }
      return true;

    case QuestionType.IMAGE_MAP:
      // Must be an object with image and regions
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new Error('Options for IMAGE_MAP must be an object');
      }
      if (typeof value.image !== 'string' || !value.image) {
        throw new Error('Options for IMAGE_MAP must have a non-empty string "image" field');
      }
      if (!Array.isArray(value.regions)) {
        throw new Error('Options for IMAGE_MAP must have a "regions" array');
      }
      return true;

    case QuestionType.SLIDER:
      // Must be an object with min, max, and step
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new Error('Options for SLIDER must be an object');
      }
      if (typeof value.min !== 'number') {
        throw new Error('Options for SLIDER must have a numeric "min" field');
      }
      if (typeof value.max !== 'number') {
        throw new Error('Options for SLIDER must have a numeric "max" field');
      }
      if (typeof value.step !== 'number') {
        throw new Error('Options for SLIDER must have a numeric "step" field');
      }
      if (value.min >= value.max) {
        throw new Error('Options for SLIDER: "min" must be less than "max"');
      }
      if (value.step <= 0) {
        throw new Error('Options for SLIDER: "step" must be greater than 0');
      }
      return true;

    case QuestionType.TRUE_FALSE:
      // TRUE_FALSE doesn't require options, but if provided should be empty or null
      return true;

    default:
      throw new Error(`Unknown question type: ${questionType}`);
  }
}

/**
 * Validates correctAnswer structure based on question type
 */
function validateCorrectAnswerStructure(value: any, questionType: QuestionType): boolean | never {
  if (!questionType) {
    throw new Error('Question type is required to validate correctAnswer');
  }

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Correct answer must be an object');
  }

  switch (questionType) {
    case QuestionType.MULTIPLE_CHOICE_SINGLE:
      // Must have optionId: string
      if (typeof value.optionId !== 'string' || !value.optionId) {
        throw new Error('Correct answer for MULTIPLE_CHOICE_SINGLE must have a non-empty string "optionId" field');
      }
      return true;

    case QuestionType.MULTIPLE_CHOICE_MULTI:
      // Must have optionIds: string[]
      if (!Array.isArray(value.optionIds)) {
        throw new Error('Correct answer for MULTIPLE_CHOICE_MULTI must have an "optionIds" array');
      }
      if (value.optionIds.length === 0) {
        throw new Error('Correct answer for MULTIPLE_CHOICE_MULTI must have at least one optionId');
      }
      for (let i = 0; i < value.optionIds.length; i++) {
        if (typeof value.optionIds[i] !== 'string' || !value.optionIds[i]) {
          throw new Error(`optionIds[${i}] must be a non-empty string`);
        }
      }
      return true;

    case QuestionType.TRUE_FALSE:
      // Must have value: boolean
      if (typeof value.value !== 'boolean') {
        throw new Error('Correct answer for TRUE_FALSE must have a boolean "value" field');
      }
      return true;

    case QuestionType.DRAG_ORDER:
      // Must have order: string[]
      if (!Array.isArray(value.order)) {
        throw new Error('Correct answer for DRAG_ORDER must have an "order" array');
      }
      if (value.order.length === 0) {
        throw new Error('Correct answer for DRAG_ORDER must have at least one item in "order"');
      }
      for (let i = 0; i < value.order.length; i++) {
        if (typeof value.order[i] !== 'string' || !value.order[i]) {
          throw new Error(`order[${i}] must be a non-empty string`);
        }
      }
      return true;

    case QuestionType.IMAGE_MAP:
      // Must have regionId or similar identifier
      if (typeof value.regionId !== 'string' || !value.regionId) {
        throw new Error('Correct answer for IMAGE_MAP must have a non-empty string "regionId" field');
      }
      return true;

    case QuestionType.SLIDER:
      // Must have value: number, optional tolerance: number
      if (typeof value.value !== 'number') {
        throw new Error('Correct answer for SLIDER must have a numeric "value" field');
      }
      if (value.tolerance !== undefined && typeof value.tolerance !== 'number') {
        throw new Error('Correct answer for SLIDER "tolerance" must be a number if provided');
      }
      if (value.tolerance !== undefined && value.tolerance < 0) {
        throw new Error('Correct answer for SLIDER "tolerance" must be non-negative');
      }
      return true;

    default:
      throw new Error(`Unknown question type: ${questionType}`);
  }
}

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
    .withMessage('Options are required')
    .custom((value, { req }) => {
      const questionType = req.body.type;
      return validateOptionsStructure(value, questionType);
    }),

  body('correctAnswer')
    .exists()
    .withMessage('Correct answer is required')
    .custom((value, { req }) => {
      const questionType = req.body.type;
      return validateCorrectAnswerStructure(value, questionType);
    }),

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
    .optional()
    .custom((value, { req }) => {
      if (value !== undefined) {
        const questionType = req.body.type;
        return validateOptionsStructure(value, questionType);
      }
      return true;
    }),

  body('correctAnswer')
    .optional()
    .custom((value, { req }) => {
      if (value !== undefined) {
        const questionType = req.body.type;
        return validateCorrectAnswerStructure(value, questionType);
      }
      return true;
    }),

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
