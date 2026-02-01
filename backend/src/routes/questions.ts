/**
 * @file        Question Routes
 * @module      Routes/Questions
 * @description Question management endpoints (nested under question banks)
 */

import { Router, Request, Response, NextFunction } from 'express';
import * as questionService from '@/services/questionService';
import {
  createQuestionValidator,
  updateQuestionValidator,
  questionIdParamValidator,
  bankIdParamValidator,
  reorderQuestionsValidator,
} from '@/validators/questionValidators';
import { handleValidationErrors } from '@/middleware/validation';
import { authenticate } from '@/middleware/auth';
import logger from '@/config/logger';

const router = Router();

// All question routes require authentication
router.use(authenticate);

/**
 * GET /api/question-banks/:bankId/questions
 * List all questions in a question bank
 */
router.get(
  '/question-banks/:bankId/questions',
  bankIdParamValidator,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const questions = await questionService.listQuestions(
        req.params.bankId as string,
        req.user!.userId,
        req.user!.role
      );

      res.json({
        success: true,
        data: questions,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/questions/:id
 * Get a single question by ID
 */
router.get(
  '/questions/:id',
  questionIdParamValidator,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const question = await questionService.getQuestion(
        req.params.id as string,
        req.user!.userId,
        req.user!.role
      );

      res.json({
        success: true,
        data: question,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/question-banks/:bankId/questions
 * Create a new question in a question bank
 */
router.post(
  '/question-banks/:bankId/questions',
  createQuestionValidator,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const question = await questionService.createQuestion(
        req.params.bankId as string,
        req.body,
        req.user!.userId,
        req.user!.role
      );

      logger.info('Question created', {
        questionId: question.id,
        bankId: req.params.bankId,
        userId: req.user!.userId,
        ip: req.ip,
      });

      res.status(201).json({
        success: true,
        data: question,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/questions/:id
 * Update a question
 */
router.patch(
  '/questions/:id',
  updateQuestionValidator,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const question = await questionService.updateQuestion(
        req.params.id as string,
        req.body,
        req.user!.userId,
        req.user!.role
      );

      logger.info('Question updated', {
        questionId: req.params.id,
        userId: req.user!.userId,
        ip: req.ip,
      });

      res.json({
        success: true,
        data: question,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/questions/:id
 * Delete a question
 */
router.delete(
  '/questions/:id',
  questionIdParamValidator,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await questionService.deleteQuestion(
        req.params.id as string,
        req.user!.userId,
        req.user!.role
      );

      logger.info('Question deleted', {
        questionId: req.params.id,
        userId: req.user!.userId,
        ip: req.ip,
      });

      res.json({
        success: true,
        data: { message: 'Question deleted successfully' },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/questions/:id/duplicate
 * Duplicate a question within its bank
 */
router.post(
  '/questions/:id/duplicate',
  questionIdParamValidator,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const question = await questionService.duplicateQuestion(
        req.params.id as string,
        req.user!.userId,
        req.user!.role
      );

      logger.info('Question duplicated', {
        originalQuestionId: req.params.id,
        newQuestionId: question.id,
        userId: req.user!.userId,
        ip: req.ip,
      });

      res.status(201).json({
        success: true,
        data: question,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/question-banks/:bankId/questions/reorder
 * Reorder questions in a bank
 */
router.patch(
  '/question-banks/:bankId/questions/reorder',
  reorderQuestionsValidator,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const questions = await questionService.reorderQuestions(
        req.params.bankId as string,
        req.body.questionIds,
        req.user!.userId,
        req.user!.role
      );

      logger.info('Questions reordered', {
        bankId: req.params.bankId,
        userId: req.user!.userId,
        ip: req.ip,
      });

      res.json({
        success: true,
        data: questions,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
