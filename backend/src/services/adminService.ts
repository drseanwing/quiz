/**
 * @file        Admin Service
 * @module      Services/Admin
 * @description Admin operations: completions, logs, stats, invite tokens
 */

import crypto from 'crypto';
import { AttemptStatus } from '@prisma/client';
import prisma from '@/config/database';
import logger from '@/config/logger';
import { NotFoundError } from '@/middleware/errorHandler';
import type { IPaginationParams, IPaginatedResult } from './questionBankService';

// ---------------------------------------------------------------------------
// Completions (quiz attempt results)
// ---------------------------------------------------------------------------

export interface ICompletionFilters {
  bankId?: string | undefined;
  userId?: string | undefined;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
  passed?: boolean | undefined;
}

export interface ICompletionRow {
  id: string;
  userName: string;
  userEmail: string;
  bankTitle: string;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  status: AttemptStatus;
  completedAt: Date | null;
  timeSpent: number;
}

export async function listCompletions(
  filters: ICompletionFilters,
  pagination: IPaginationParams
): Promise<IPaginatedResult<ICompletionRow>> {
  const { page, pageSize } = pagination;
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {
    status: { in: [AttemptStatus.COMPLETED, AttemptStatus.TIMED_OUT] },
  };

  if (filters.bankId) where.bankId = filters.bankId;
  if (filters.userId) where.userId = filters.userId;
  if (typeof filters.passed === 'boolean') where.passed = filters.passed;
  if (filters.dateFrom || filters.dateTo) {
    const completedAt: Record<string, Date> = {};
    if (filters.dateFrom) completedAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) completedAt.lte = new Date(filters.dateTo);
    where.completedAt = completedAt;
  }

  const [data, totalCount] = await Promise.all([
    prisma.quizAttempt.findMany({
      where,
      include: {
        user: { select: { firstName: true, surname: true, email: true } },
        bank: { select: { title: true } },
      },
      skip,
      take: pageSize,
      orderBy: { completedAt: 'desc' },
    }),
    prisma.quizAttempt.count({ where }),
  ]);

  const rows: ICompletionRow[] = data.map(a => ({
    id: a.id,
    userName: `${a.user.firstName} ${a.user.surname}`,
    userEmail: a.user.email,
    bankTitle: a.bank.title,
    score: a.score,
    maxScore: a.maxScore,
    percentage: a.percentage,
    passed: a.passed,
    status: a.status,
    completedAt: a.completedAt,
    timeSpent: a.timeSpent,
  }));

  return {
    data: rows,
    meta: { page, pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) },
  };
}

/**
 * Export completions as CSV text
 */
export async function exportCompletionsCSV(filters: ICompletionFilters): Promise<string> {
  const all = await listCompletions(filters, { page: 1, pageSize: 10000 });

  const header = 'Name,Email,Quiz,Score,Max Score,Percentage,Passed,Status,Completed At,Time (s)\n';
  const rows = all.data.map(r =>
    [
      csvEscape(r.userName),
      csvEscape(r.userEmail),
      csvEscape(r.bankTitle),
      r.score.toFixed(1),
      r.maxScore,
      r.percentage.toFixed(1),
      r.passed ? 'Yes' : 'No',
      r.status,
      r.completedAt ? r.completedAt.toISOString() : '',
      r.timeSpent,
    ].join(',')
  ).join('\n');

  return header + rows;
}

function csvEscape(value: string): string {
  // Prevent CSV formula injection: prefix dangerous leading chars with a single quote
  let safe = value;
  if (/^[=+\-@\t\r]/.test(safe)) {
    safe = `'${safe}`;
  }
  if (safe.includes(',') || safe.includes('"') || safe.includes('\n') || safe !== value) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

// ---------------------------------------------------------------------------
// Audit Logs
// ---------------------------------------------------------------------------

export interface ILogFilters {
  action?: string | undefined;
  entityType?: string | undefined;
  userId?: string | undefined;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
}

export interface ILogRow {
  id: string;
  userId: string | null;
  userName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  details: unknown;
  ipAddress: string | null;
  createdAt: Date;
}

export async function listLogs(
  filters: ILogFilters,
  pagination: IPaginationParams
): Promise<IPaginatedResult<ILogRow>> {
  const { page, pageSize } = pagination;
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};
  if (filters.action) where.action = filters.action;
  if (filters.entityType) where.entityType = filters.entityType;
  if (filters.userId) where.userId = filters.userId;
  if (filters.dateFrom || filters.dateTo) {
    const createdAt: Record<string, Date> = {};
    if (filters.dateFrom) createdAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) createdAt.lte = new Date(filters.dateTo);
    where.createdAt = createdAt;
  }

  const [data, totalCount] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { firstName: true, surname: true } },
      },
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditLog.count({ where }),
  ]);

  const rows: ILogRow[] = data.map(l => ({
    id: l.id,
    userId: l.userId,
    userName: l.user ? `${l.user.firstName} ${l.user.surname}` : null,
    action: l.action,
    entityType: l.entityType,
    entityId: l.entityId,
    details: l.details,
    ipAddress: l.ipAddress,
    createdAt: l.createdAt,
  }));

  return {
    data: rows,
    meta: { page, pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) },
  };
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

export interface IPlatformStats {
  totalUsers: number;
  activeUsers: number;
  totalBanks: number;
  activeBanks: number;
  totalAttempts: number;
  completedAttempts: number;
  completionRate: number;
  averageScore: number;
  passRate: number;
}

export async function getPlatformStats(): Promise<IPlatformStats> {
  const [
    totalUsers,
    activeUsers,
    totalBanks,
    activeBanks,
    totalAttempts,
    completedAttempts,
    scoreAgg,
    passedCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.questionBank.count(),
    prisma.questionBank.count({ where: { status: { in: ['OPEN', 'PUBLIC'] } } }),
    prisma.quizAttempt.count(),
    prisma.quizAttempt.count({ where: { status: { in: [AttemptStatus.COMPLETED, AttemptStatus.TIMED_OUT] } } }),
    prisma.quizAttempt.aggregate({
      where: { status: { in: [AttemptStatus.COMPLETED, AttemptStatus.TIMED_OUT] } },
      _avg: { percentage: true },
    }),
    prisma.quizAttempt.count({
      where: { status: { in: [AttemptStatus.COMPLETED, AttemptStatus.TIMED_OUT] }, passed: true },
    }),
  ]);

  return {
    totalUsers,
    activeUsers,
    totalBanks,
    activeBanks,
    totalAttempts,
    completedAttempts,
    completionRate: totalAttempts > 0 ? Math.round((completedAttempts / totalAttempts) * 100) : 0,
    averageScore: Math.round((scoreAgg._avg.percentage ?? 0) * 100) / 100,
    passRate: completedAttempts > 0 ? Math.round((passedCount / completedAttempts) * 100) : 0,
  };
}

// ---------------------------------------------------------------------------
// Invite Tokens
// ---------------------------------------------------------------------------

export interface ICreateInviteRequest {
  email: string;
  firstName?: string;
  surname?: string;
  bankId?: string;
  expiresInDays?: number;
}

export interface IInviteTokenRow {
  id: string;
  token: string;
  email: string;
  firstName: string | null;
  surname: string | null;
  bankTitle: string | null;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export async function createInviteToken(data: ICreateInviteRequest): Promise<IInviteTokenRow> {
  // Verify bank exists if provided
  if (data.bankId) {
    const bank = await prisma.questionBank.findUnique({
      where: { id: data.bankId },
      select: { id: true },
    });
    if (!bank) throw new NotFoundError('Question bank');
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (data.expiresInDays || 7));

  const invite = await prisma.inviteToken.create({
    data: {
      token,
      email: data.email,
      firstName: data.firstName || null,
      surname: data.surname || null,
      bankId: data.bankId || null,
      expiresAt,
    },
    include: {
      bank: { select: { title: true } },
    },
  });

  logger.info('Invite token created', { email: data.email, tokenId: invite.id });

  return {
    id: invite.id,
    token: invite.token,
    email: invite.email,
    firstName: invite.firstName,
    surname: invite.surname,
    bankTitle: invite.bank?.title ?? null,
    expiresAt: invite.expiresAt,
    usedAt: invite.usedAt,
    createdAt: invite.createdAt,
  };
}

export async function listInviteTokens(
  pagination: IPaginationParams
): Promise<IPaginatedResult<IInviteTokenRow>> {
  const { page, pageSize } = pagination;
  const skip = (page - 1) * pageSize;

  const [data, totalCount] = await Promise.all([
    prisma.inviteToken.findMany({
      include: { bank: { select: { title: true } } },
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.inviteToken.count(),
  ]);

  const rows: IInviteTokenRow[] = data.map(t => ({
    id: t.id,
    token: t.token,
    email: t.email,
    firstName: t.firstName,
    surname: t.surname,
    bankTitle: t.bank?.title ?? null,
    expiresAt: t.expiresAt,
    usedAt: t.usedAt,
    createdAt: t.createdAt,
  }));

  return {
    data: rows,
    meta: { page, pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) },
  };
}

export async function validateInviteToken(token: string): Promise<{
  valid: boolean;
  email?: string | undefined;
  firstName?: string | undefined;
  surname?: string | undefined;
  bankId?: string | undefined;
}> {
  const invite = await prisma.inviteToken.findUnique({ where: { token } });

  if (!invite) return { valid: false };
  if (invite.usedAt) return { valid: false };
  if (invite.expiresAt < new Date()) return { valid: false };

  return {
    valid: true,
    email: invite.email,
    firstName: invite.firstName ?? undefined,
    surname: invite.surname ?? undefined,
    bankId: invite.bankId ?? undefined,
  };
}

export async function markTokenUsed(token: string): Promise<void> {
  await prisma.inviteToken.update({
    where: { token },
    data: { usedAt: new Date() },
  });
}
