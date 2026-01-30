/**
 * @file        Attempt Routes
 * @module      Routes/Attempts
 * @description Quiz attempt management endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import * as quizService from '@/services/quizService';
import {
  attemptIdValidator,
  saveProgressValidator,
  listAttemptsValidator,
} from '@/validators/quizValidators';
import { handleValidationErrors } from '@/middleware/validation';
import { authenticate } from '@/middleware/auth';

const router = Router();

// All attempt routes require authentication
router.use(authenticate);

/**
 * GET /api/attempts/mine
 * List current user's attempts
 */
router.get(
  '/mine',
  listAttemptsValidator,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bankId = req.query.bankId as string | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 50;
      const result = await quizService.listUserAttempts(
        req.user!.userId,
        bankId,
        page,
        pageSize
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
 * GET /api/attempts/:id
 * Get an attempt's current state
 */
router.get(
  '/:id',
  attemptIdValidator,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const attempt = await quizService.getAttempt(
        req.params.id,
        req.user!.userId
      );

      res.json({
        success: true,
        data: attempt,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/attempts/:id
 * Save progress (auto-save)
 */
router.patch(
  '/:id',
  saveProgressValidator,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await quizService.saveProgress(
        req.params.id,
        req.user!.userId,
        req.body.responses,
        req.body.timeSpent
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/attempts/:id/submit
 * Submit an attempt for scoring
 */
router.post(
  '/:id/submit',
  attemptIdValidator,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const results = await quizService.submitAttempt(
        req.params.id,
        req.user!.userId
      );

      res.json({
        success: true,
        data: results,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/attempts/:id/results
 * Get results for a completed attempt
 */
router.get(
  '/:id/results',
  attemptIdValidator,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const results = await quizService.getResults(
        req.params.id,
        req.user!.userId
      );

      res.json({
        success: true,
        data: results,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
