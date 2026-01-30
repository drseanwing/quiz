/**
 * @file        Quiz Routes
 * @module      Routes/Quizzes
 * @description Quiz start endpoint
 */

import { Router, Request, Response, NextFunction } from 'express';
import * as quizService from '@/services/quizService';
import { startQuizValidator } from '@/validators/quizValidators';
import { handleValidationErrors } from '@/middleware/validation';
import { authenticate } from '@/middleware/auth';

const router = Router();

// All quiz routes require authentication
router.use(authenticate);

/**
 * POST /api/quizzes/:bankId/start
 * Start a new quiz attempt
 */
router.post(
  '/:bankId/start',
  startQuizValidator,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await quizService.startQuiz(
        req.params.bankId,
        req.user!.userId
      );

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
