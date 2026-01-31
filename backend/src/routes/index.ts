/**
 * @file        Main router
 * @module      Routes
 * @description Aggregates all API routes
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import authRoutes from './auth';
import userRoutes from './users';
import questionBankRoutes from './questionBanks';
import questionRoutes from './questions';
import uploadRoutes from './uploads';
import quizRoutes from './quizzes';
import attemptRoutes from './attempts';
import adminRoutes from './admin';

const router = Router();

/**
 * Health check endpoint
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
  });
});

/**
 * API information endpoint
 */
router.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      name: 'REdI Quiz Platform API',
      version: '1.0.0',
      description: 'Resuscitation EDucation Initiative Online Assessment System',
    },
  });
});

// Route modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/question-banks', questionBankRoutes);
router.use('/', questionRoutes);
router.use('/uploads', uploadRoutes);
router.use('/quizzes', quizRoutes);
router.use('/attempts', attemptRoutes);
router.use('/admin', adminRoutes);

export default router;
