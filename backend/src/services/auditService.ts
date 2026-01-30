/**
 * @file        Audit Logging Service
 * @module      Services/Audit
 * @description Creates audit log entries for security and compliance tracking
 */

import prisma from '@/config/database';
import logger from '@/config/logger';

export interface IAuditContext {
  userId?: string | undefined;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

/**
 * Create an audit log entry
 */
export async function logAudit(
  action: string,
  entityType: string,
  entityId: string | null,
  details: Record<string, unknown> | null,
  context: IAuditContext
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: context.userId || null,
        action,
        entityType,
        entityId: entityId || null,
        details: (details as object) || undefined,
        ipAddress: context.ipAddress || null,
        userAgent: context.userAgent || null,
      },
    });
  } catch (error) {
    // Audit logging should never fail the main operation
    logger.error('Failed to create audit log', {
      action,
      entityType,
      entityId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// ---------------------------------------------------------------------------
// Convenience functions for common audit events
// ---------------------------------------------------------------------------

export async function logLogin(userId: string, success: boolean, ctx: IAuditContext): Promise<void> {
  await logAudit(
    success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILURE',
    'user',
    userId,
    { success },
    { ...ctx, userId: success ? userId : undefined }
  );
}

export async function logPasswordChange(userId: string, ctx: IAuditContext): Promise<void> {
  await logAudit('PASSWORD_CHANGE', 'user', userId, null, ctx);
}

export async function logRoleChange(
  targetUserId: string,
  oldRole: string,
  newRole: string,
  ctx: IAuditContext
): Promise<void> {
  await logAudit('ROLE_CHANGE', 'user', targetUserId, { oldRole, newRole }, ctx);
}

export async function logUserCreated(userId: string, ctx: IAuditContext): Promise<void> {
  await logAudit('USER_CREATED', 'user', userId, null, ctx);
}

export async function logUserDeactivated(userId: string, ctx: IAuditContext): Promise<void> {
  await logAudit('USER_DEACTIVATED', 'user', userId, null, ctx);
}

export async function logBankStatusChange(
  bankId: string,
  oldStatus: string,
  newStatus: string,
  ctx: IAuditContext
): Promise<void> {
  await logAudit('BANK_STATUS_CHANGE', 'questionBank', bankId, { oldStatus, newStatus }, ctx);
}

export async function logDataExport(entityType: string, entityId: string, ctx: IAuditContext): Promise<void> {
  await logAudit('DATA_EXPORT', entityType, entityId, null, ctx);
}

export async function logQuizSubmission(
  attemptId: string,
  bankId: string,
  score: number,
  passed: boolean,
  ctx: IAuditContext
): Promise<void> {
  await logAudit('QUIZ_SUBMITTED', 'quizAttempt', attemptId, { bankId, score, passed }, ctx);
}
