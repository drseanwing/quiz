/**
 * @file        Question Bank Routes
 * @module      Routes/QuestionBanks
 * @description Question bank management endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import { QuestionBankStatus } from '@prisma/client';
import * as questionBankService from '@/services/questionBankService';
import * as importExportService from '@/services/importExportService';
import {
  createQuestionBankValidator,
  updateQuestionBankValidator,
  questionBankIdValidator,
  questionBankQueryValidator,
} from '@/validators/questionBankValidators';
import { handleValidationErrors } from '@/middleware/validation';
import { authenticate, requireEditor } from '@/middleware/auth';
import logger from '@/config/logger';
import { Cache, buildCacheKey } from '@/utils/cache';

const router = Router();

// Cache for question banks list (30 seconds TTL)
const questionBanksCache = new Cache<questionBankService.IPaginatedResult<questionBankService.QuestionBankWithCreator>>();
const questionBankCache = new Cache<questionBankService.QuestionBankWithCreator>();

// Helper to invalidate caches on write operations
function invalidateBankCaches(bankId?: string): void {
  questionBanksCache.clear();
  if (bankId) {
    questionBankCache.delete(`bank:${bankId}`);
  } else {
    questionBankCache.clear();
  }
}

// All question bank routes require authentication
router.use(authenticate);

/**
 * GET /api/question-banks
 * List question banks with filtering and pagination (cached for 30 seconds)
 */
router.get(
  '/',
  questionBankQueryValidator,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const search = req.query.search as string | undefined;
      const status = req.query.status as QuestionBankStatus | undefined;

      const filters = {
        ...(search !== undefined && { search }),
        ...(status !== undefined && { status }),
      };

      const pagination = {
        page: Math.max(1, parseInt(req.query.page as string) || 1),
        pageSize: Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20)),
      };

      // Build cache key including user context and filters
      const cacheKey = buildCacheKey('banks-list', {
        userId: req.user!.userId,
        role: req.user!.role,
        search: search || '',
        status: status || '',
        page: pagination.page,
        pageSize: pagination.pageSize,
      });

      let result = questionBanksCache.get(cacheKey);

      if (!result) {
        result = await questionBankService.listQuestionBanks(
          filters,
          pagination,
          req.user!.userId,
          req.user!.role
        );
        questionBanksCache.set(cacheKey, result, 30);
      }

      // Add cache headers for conditional requests
      res.setHeader('Cache-Control', 'private, max-age=30');

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
 * Get a single question bank by ID (cached for 30 seconds)
 */
router.get(
  '/:id',
  questionBankIdValidator,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bankId = req.params.id as string;
      const cacheKey = buildCacheKey(`bank:${bankId}`, {
        userId: req.user!.userId,
        role: req.user!.role,
      });

      let bank = questionBankCache.get(cacheKey);

      if (!bank) {
        bank = await questionBankService.getQuestionBank(
          bankId,
          req.user!.userId,
          req.user!.role
        );
        questionBankCache.set(cacheKey, bank, 30);
      }

      // Add cache headers for conditional requests
      res.setHeader('Cache-Control', 'private, max-age=30');
      res.setHeader('Last-Modified', bank.updatedAt.toUTCString());

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

      // Invalidate caches on write
      invalidateBankCaches();

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
  requireEditor,
  updateQuestionBankValidator,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bankId = req.params.id as string;
      const bank = await questionBankService.updateQuestionBank(
        bankId,
        req.body,
        req.user!.userId,
        req.user!.role
      );

      // Invalidate caches on write
      invalidateBankCaches(bankId);

      logger.info('Question bank updated', {
        bankId,
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
  requireEditor,
  questionBankIdValidator,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bankId = req.params.id as string;
      await questionBankService.deleteQuestionBank(
        bankId,
        req.user!.userId,
        req.user!.role
      );

      // Invalidate caches on write
      invalidateBankCaches(bankId);

      logger.info('Question bank deleted', {
        bankId,
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
        req.params.id as string,
        req.user!.userId,
        req.user!.role
      );

      // Invalidate caches on write
      invalidateBankCaches();

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

/**
 * GET /api/question-banks/:id/export
 * Export a question bank as JSON
 */
router.get(
  '/:id/export',
  requireEditor,
  questionBankIdValidator,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await importExportService.exportQuestionBank(
        req.params.id as string,
        req.user!
      );

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/question-banks/import
 * Import a question bank from JSON
 */
router.post(
  '/import',
  requireEditor,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await importExportService.importQuestionBank(
        req.body,
        req.user!.userId
      );

      // Invalidate caches on write
      invalidateBankCaches();

      logger.info('Question bank imported via API', {
        bankId: result.id,
        userId: req.user!.userId,
        ip: req.ip,
      });

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
