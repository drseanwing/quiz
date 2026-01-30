/**
 * @file        Question Bank Routes
 * @module      Routes/QuestionBanks
 * @description Question bank management endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import { QuestionBankStatus } from '@prisma/client';
import * as questionBankService from '@/services/questionBankService';
import {
  createQuestionBankValidator,
  updateQuestionBankValidator,
  questionBankIdValidator,
  questionBankQueryValidator,
} from '@/validators/questionBankValidators';
import { handleValidationErrors } from '@/middleware/validation';
import { authenticate, requireEditor } from '@/middleware/auth';
import logger from '@/config/logger';

const router = Router();

// All question bank routes require authentication
router.use(authenticate);

/**
 * GET /api/question-banks
 * List question banks with filtering and pagination
 */
router.get(
  '/',
  questionBankQueryValidator,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        search: req.query.search as string | undefined,
        status: req.query.status as QuestionBankStatus | undefined,
      };

      const pagination = {
        page: parseInt(req.query.page as string) || 1,
        pageSize: parseInt(req.query.pageSize as string) || 20,
      };

      const result = await questionBankService.listQuestionBanks(
        filters,
        pagination,
        req.user!.userId,
        req.user!.role
      );

      res.json({
        success: true,
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/question-banks/:id
 * Get a single question bank by ID
 */
router.get(
  '/:id',
  questionBankIdValidator,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bank = await questionBankService.getQuestionBank(
        req.params.id,
        req.user!.userId,
        req.user!.role
      );

      res.json({
        success: true,
        data: bank,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/question-banks
 * Create a new question bank (editor/admin only)
 */
router.post(
  '/',
  requireEditor,
  createQuestionBankValidator,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bank = await questionBankService.createQuestionBank(
        req.body,
        req.user!.userId
      );

      logger.info('Question bank created', {
        bankId: bank.id,
        userId: req.user!.userId,
        ip: req.ip,
      });

      res.status(201).json({
        success: true,
        data: bank,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/question-banks/:id
 * Update a question bank (owner/admin only)
 */
router.patch(
  '/:id',
  updateQuestionBankValidator,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bank = await questionBankService.updateQuestionBank(
        req.params.id,
        req.body,
        req.user!.userId,
        req.user!.role
      );

      logger.info('Question bank updated', {
        bankId: req.params.id,
        userId: req.user!.userId,
        ip: req.ip,
      });

      res.json({
        success: true,
        data: bank,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/question-banks/:id
 * Delete a question bank (owner/admin only)
 */
router.delete(
  '/:id',
  questionBankIdValidator,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await questionBankService.deleteQuestionBank(
        req.params.id,
        req.user!.userId,
        req.user!.role
      );

      logger.info('Question bank deleted', {
        bankId: req.params.id,
        userId: req.user!.userId,
        ip: req.ip,
      });

      res.json({
        success: true,
        data: { message: 'Question bank deleted successfully' },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/question-banks/:id/duplicate
 * Duplicate a question bank with all questions
 */
router.post(
  '/:id/duplicate',
  requireEditor,
  questionBankIdValidator,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bank = await questionBankService.duplicateQuestionBank(
        req.params.id,
        req.user!.userId,
        req.user!.role
      );

      logger.info('Question bank duplicated', {
        originalBankId: req.params.id,
        newBankId: bank.id,
        userId: req.user!.userId,
        ip: req.ip,
      });

      res.status(201).json({
        success: true,
        data: bank,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
