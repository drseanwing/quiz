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
import prisma from '@/config/database';
import { sendCompletionNotification } from '@/services/emailService';
import { logQuizSubmission } from '@/services/auditService';
import logger from '@/config/logger';

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
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 50));
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
        req.params.id as string,
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
        req.params.id as string,
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
        req.params.id as string,
        req.user!.userId
      );

      // Fire-and-forget: audit log (independent of email)
      logQuizSubmission(results.id, results.bankId, results.score, results.passed, {
        userId: req.user!.userId,
        ipAddress: req.ip || undefined,
        userAgent: req.get('user-agent') || undefined,
      }).catch(err => {
        logger.error('Post-submission audit log failed', {
          attemptId: results.id,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      });

      // Fire-and-forget: email notification (separate from audit log)
      // Only send completion email if the attempt passed (FR-NT-001)
      if (results.passed) {
        (async () => {
          try {
            const [bank, user] = await Promise.all([
              prisma.questionBank.findUnique({
                where: { id: results.bankId },
                select: { notificationEmail: true },
              }),
              prisma.user.findUnique({
                where: { id: req.user!.userId },
                select: { firstName: true, surname: true },
              }),
            ]);

            if (bank?.notificationEmail && user) {
              await sendCompletionNotification(results.id, bank.notificationEmail, {
                userName: `${user.firstName} ${user.surname}`,
                bankTitle: results.bankTitle,
                score: results.score,
                maxScore: results.maxScore,
                percentage: results.percentage,
                passed: results.passed,
              });
            }
          } catch (err) {
            logger.error('Post-submission email notification failed', {
              attemptId: results.id,
              error: err instanceof Error ? err.message : 'Unknown error',
            });
          }
        })();
      }

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
        req.params.id as string,
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
