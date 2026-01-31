/**
 * @file        Admin Routes
 * @module      Routes/Admin
 * @description Admin-only endpoints for platform management
 */

import { Router, Request, Response, NextFunction } from 'express';
import * as adminService from '@/services/adminService';
import {
  completionsQueryValidator,
  logsQueryValidator,
  createInviteValidator,
  inviteTokensQueryValidator,
} from '@/validators/adminValidators';
import { handleValidationErrors } from '@/middleware/validation';
import { authenticate, requireAdmin } from '@/middleware/auth';
import * as emailService from '@/services/emailService';
import { logDataExport } from '@/services/auditService';
import logger from '@/config/logger';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate);
router.use(requireAdmin);

/**
 * GET /api/admin/stats
 * Platform statistics
 */
router.get(
  '/stats',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await adminService.getPlatformStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/admin/completions
 * List quiz completions with filtering and pagination
 */
router.get(
  '/completions',
  completionsQueryValidator,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        bankId: req.query.bankId as string | undefined,
        userId: req.query.userId as string | undefined,
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
        passed: req.query.passed !== undefined ? req.query.passed === 'true' : undefined,
      };

      const pagination = {
        page: Math.max(1, parseInt(req.query.page as string) || 1),
        pageSize: Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20)),
      };

      const result = await adminService.listCompletions(filters, pagination);
      res.json({ success: true, data: result.data, meta: result.meta });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/admin/completions/export
 * Export completions as CSV
 */
router.get(
  '/completions/export',
  completionsQueryValidator,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        bankId: req.query.bankId as string | undefined,
        userId: req.query.userId as string | undefined,
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
        passed: req.query.passed !== undefined ? req.query.passed === 'true' : undefined,
      };

      const csv = await adminService.exportCompletionsCSV(filters);

      await logDataExport('completions', 'csv', {
        userId: req.user!.userId,
        ipAddress: req.ip || undefined,
        userAgent: req.get('user-agent') || undefined,
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=completions.csv');
      res.send(csv);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/admin/logs
 * List audit logs
 */
router.get(
  '/logs',
  logsQueryValidator,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        action: req.query.action as string | undefined,
        entityType: req.query.entityType as string | undefined,
        userId: req.query.userId as string | undefined,
        dateFrom: req.query.dateFrom as string | undefined,
        dateTo: req.query.dateTo as string | undefined,
      };

      const pagination = {
        page: Math.max(1, parseInt(req.query.page as string) || 1),
        pageSize: Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20)),
      };

      const result = await adminService.listLogs(filters, pagination);
      res.json({ success: true, data: result.data, meta: result.meta });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/admin/invite-tokens
 * Create a new invite token
 */
router.post(
  '/invite-tokens',
  createInviteValidator,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invite = await adminService.createInviteToken(req.body);

      // Send invite email
      try {
        await emailService.sendInviteEmail(invite.email, {
          firstName: invite.firstName || undefined,
          bankTitle: invite.bankTitle || undefined,
          inviteToken: invite.token,
        });
      } catch (emailErr) {
        logger.warn('Invite email failed but token was created', {
          tokenId: invite.id,
          error: emailErr instanceof Error ? emailErr.message : 'Unknown error',
        });
      }

      logger.info('Invite token created', {
        tokenId: invite.id,
        email: invite.email,
        createdBy: req.user!.userId,
      });

      res.status(201).json({ success: true, data: invite });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/admin/invite-tokens
 * List invite tokens
 */
router.get(
  '/invite-tokens',
  inviteTokensQueryValidator,
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pagination = {
        page: Math.max(1, parseInt(req.query.page as string) || 1),
        pageSize: Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20)),
      };

      const result = await adminService.listInviteTokens(pagination);
      res.json({ success: true, data: result.data, meta: result.meta });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
