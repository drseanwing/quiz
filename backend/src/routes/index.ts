/**
 * @file        Main router
 * @module      Routes
 * @description Aggregates all API routes
 */

import { Router } from 'express';
import type { Request, Response } from 'express';

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
      uptime: process.uptime(),
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

// TODO: Add route modules here
// router.use('/auth', authRoutes);
// router.use('/users', userRoutes);
// router.use('/question-banks', questionBankRoutes);
// router.use('/questions', questionRoutes);
// router.use('/quizzes', quizRoutes);
// router.use('/attempts', attemptRoutes);
// router.use('/admin', adminRoutes);
// router.use('/uploads', uploadRoutes);

export default router;
