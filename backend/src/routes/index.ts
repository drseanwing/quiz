/**
 * @file        Main router
 * @module      Routes
 * @description Aggregates all API routes
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';
import prisma from '@/config/database';
import authRoutes from './auth';
import userRoutes from './users';
import questionBankRoutes from './questionBanks';
import questionRoutes from './questions';
import uploadRoutes from './uploads';
import quizRoutes from './quizzes';
import attemptRoutes from './attempts';
import adminRoutes from './admin';
import { Cache } from '@/utils/cache';

const pkg = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf8'));
const router = Router();

// Cache for health check DB ping (10 seconds TTL)
const healthCache = new Cache<'ok' | 'error'>();
const HEALTH_CACHE_KEY = 'health:db';
const HEALTH_CACHE_TTL = 10;

/**
 * Health check endpoint — verifies API + database connectivity
 */
router.get('/health', async (_req: Request, res: Response) => {
  // Check cache first
  let dbStatus = healthCache.get(HEALTH_CACHE_KEY);

  if (!dbStatus) {
    // Cache miss - perform DB check
    dbStatus = 'ok';
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'error';
    }

    // Cache the result
    healthCache.set(HEALTH_CACHE_KEY, dbStatus, HEALTH_CACHE_TTL);
  }

  const healthy = dbStatus === 'ok';
  res.status(healthy ? 200 : 503).json({
    success: healthy,
    data: {
      status: healthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: pkg.version,
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
      version: pkg.version,
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
