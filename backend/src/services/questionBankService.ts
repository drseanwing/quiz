/**
 * @file        Question Bank Service
 * @module      Services/QuestionBank
 * @description CRUD operations for question bank management
 */

import { QuestionBankStatus, FeedbackTiming, UserRole } from '@prisma/client';
import prisma from '@/config/database';
import logger from '@/config/logger';
import {
  AppError,
  NotFoundError,
} from '@/middleware/errorHandler';

/**
 * Safe question bank type (with creator info)
 */
type QuestionBankWithCreator = {
  id: string;
  title: string;
  description: string | null;
  status: QuestionBankStatus;
  timeLimit: number;
  randomQuestions: boolean;
  randomAnswers: boolean;
  passingScore: number;
  feedbackTiming: FeedbackTiming;
  notificationEmail: string | null;
  questionCount: number;
  maxAttempts: number;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: { id: string; firstName: string; surname: string; email: string };
  _count: { questions: number; attempts: number };
};

export interface IPaginationParams {
  page: number;
  pageSize: number;
}

export interface IPaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

export interface IQuestionBankFilters {
  search?: string;
  status?: QuestionBankStatus;
  createdById?: string;
}

export interface ICreateQuestionBankRequest {
  title: string;
  description?: string;
  status?: QuestionBankStatus;
  timeLimit?: number;
  randomQuestions?: boolean;
  randomAnswers?: boolean;
  passingScore?: number;
  feedbackTiming?: FeedbackTiming;
  notificationEmail?: string;
  questionCount?: number;
  maxAttempts?: number;
}

export interface IUpdateQuestionBankRequest {
  title?: string;
  description?: string | null;
  status?: QuestionBankStatus;
  timeLimit?: number;
  randomQuestions?: boolean;
  randomAnswers?: boolean;
  passingScore?: number;
  feedbackTiming?: FeedbackTiming;
  notificationEmail?: string | null;
  questionCount?: number;
  maxAttempts?: number;
}

const questionBankSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  timeLimit: true,
  randomQuestions: true,
  randomAnswers: true,
  passingScore: true,
  feedbackTiming: true,
  notificationEmail: true,
  questionCount: true,
  maxAttempts: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  createdBy: {
    select: { id: true, firstName: true, surname: true, email: true },
  },
  _count: {
    select: { questions: true, attempts: true },
  },
} as const;

/**
 * Check if a user can access a question bank
 */
export function canAccessBank(
  bank: { createdById: string; status: QuestionBankStatus },
  userId: string,
  userRole: UserRole
): boolean {
  if (userRole === UserRole.ADMIN) return true;
  if (bank.createdById === userId) return true;
  if (userRole === UserRole.EDITOR && bank.status !== QuestionBankStatus.DRAFT) return true;
  if (userRole === UserRole.USER && (bank.status === QuestionBankStatus.OPEN || bank.status === QuestionBankStatus.PUBLIC)) return true;
  return false;
}

/**
 * Check if a user can modify a question bank
 */
export function canModifyBank(
  bank: { createdById: string },
  userId: string,
  userRole: UserRole
): boolean {
  if (userRole === UserRole.ADMIN) return true;
  if (bank.createdById === userId) return true;
  return false;
}

/**
 * List question banks with filtering and pagination
 */
export async function listQuestionBanks(
  filters: IQuestionBankFilters,
  pagination: IPaginationParams,
  userId: string,
  userRole: UserRole
): Promise<IPaginatedResult<QuestionBankWithCreator>> {
  const { page, pageSize } = pagination;
  const skip = (page - 1) * pageSize;

  // Build where clause with proper AND composition to prevent RBAC bypass
  const conditions: Record<string, unknown>[] = [];

  // Access control filter (role-based visibility)
  if (userRole === UserRole.USER) {
    conditions.push({ status: { in: [QuestionBankStatus.OPEN, QuestionBankStatus.PUBLIC] } });
  } else if (userRole === UserRole.EDITOR) {
    conditions.push({
      OR: [
        { createdById: userId },
        { status: { in: [QuestionBankStatus.OPEN, QuestionBankStatus.PUBLIC] } },
      ],
    });
  }
  // ADMIN: no access control filter needed

  // Search filter
  if (filters.search) {
    conditions.push({
      OR: [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ],
    });
  }

  if (filters.status) {
    conditions.push({ status: filters.status });
  }

  if (filters.createdById) {
    conditions.push({ createdById: filters.createdById });
  }

  const where = conditions.length > 0 ? { AND: conditions } : {};

  const [data, totalCount] = await Promise.all([
    prisma.questionBank.findMany({
      where,
      select: questionBankSelect,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.questionBank.count({ where }),
  ]);

  return {
    data: data as unknown as QuestionBankWithCreator[],
    meta: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}

/**
 * Get a single question bank by ID
 */
export async function getQuestionBank(
  id: string,
  userId: string,
  userRole: UserRole
): Promise<QuestionBankWithCreator> {
  const bank = await prisma.questionBank.findUnique({
    where: { id },
    select: questionBankSelect,
  });

  if (!bank || !canAccessBank(bank, userId, userRole)) {
    throw new NotFoundError('Question bank');
  }

  return bank as unknown as QuestionBankWithCreator;
}

/**
 * Create a new question bank
 */
export async function createQuestionBank(
  data: ICreateQuestionBankRequest,
  createdById: string
): Promise<QuestionBankWithCreator> {
  const bank = await prisma.questionBank.create({
    data: {
      title: data.title,
      ...(data.description !== undefined && { description: data.description }),
      status: data.status || QuestionBankStatus.DRAFT,
      timeLimit: data.timeLimit ?? 0,
      randomQuestions: data.randomQuestions ?? true,
      randomAnswers: data.randomAnswers ?? true,
      passingScore: data.passingScore ?? 80,
      feedbackTiming: data.feedbackTiming || FeedbackTiming.END,
      ...(data.notificationEmail !== undefined && { notificationEmail: data.notificationEmail }),
      questionCount: data.questionCount ?? 10,
      maxAttempts: data.maxAttempts ?? 0,
      createdById,
    },
    select: questionBankSelect,
  });

  logger.info('Question bank created', {
    bankId: bank.id,
    title: bank.title,
    createdBy: createdById,
  });

  return bank as unknown as QuestionBankWithCreator;
}

/**
 * Update a question bank
 */
export async function updateQuestionBank(
  id: string,
  data: IUpdateQuestionBankRequest,
  userId: string,
  userRole: UserRole
): Promise<QuestionBankWithCreator> {
  const existing = await prisma.questionBank.findUnique({
    where: { id },
    select: { id: true, createdById: true, status: true },
  });

  if (!existing || !canModifyBank(existing, userId, userRole)) {
    throw new NotFoundError('Question bank');
  }

  // Whitelist allowed fields to prevent unexpected column writes
  const updateData: Record<string, unknown> = {};
  const allowedFields: (keyof IUpdateQuestionBankRequest)[] = [
    'title', 'description', 'status', 'timeLimit', 'randomQuestions',
    'randomAnswers', 'passingScore', 'feedbackTiming', 'notificationEmail',
    'questionCount', 'maxAttempts',
  ];
  for (const key of allowedFields) {
    if (data[key] !== undefined) {
      updateData[key] = data[key];
    }
  }

  const bank = await prisma.questionBank.update({
    where: { id },
    data: updateData,
    select: questionBankSelect,
  });

  logger.info('Question bank updated', {
    bankId: id,
    updatedBy: userId,
  });

  return bank as unknown as QuestionBankWithCreator;
}

/**
 * Delete a question bank (cascades to questions)
 */
export async function deleteQuestionBank(
  id: string,
  userId: string,
  userRole: UserRole
): Promise<void> {
  const existing = await prisma.questionBank.findUnique({
    where: { id },
    select: { id: true, createdById: true, status: true, _count: { select: { attempts: true } } },
  });

  if (!existing || !canModifyBank(existing, userId, userRole)) {
    throw new NotFoundError('Question bank');
  }

  if (existing._count.attempts > 0) {
    throw new AppError(
      'BANK_HAS_ATTEMPTS',
      'Cannot delete a question bank that has quiz attempts. Archive it instead.',
      400
    );
  }

  await prisma.questionBank.delete({ where: { id } });

  logger.info('Question bank deleted', {
    bankId: id,
    deletedBy: userId,
  });
}

/**
 * Duplicate a question bank with all its questions
 */
export async function duplicateQuestionBank(
  id: string,
  userId: string,
  userRole: UserRole
): Promise<QuestionBankWithCreator> {
  const existing = await prisma.questionBank.findUnique({
    where: { id },
    select: {
      ...questionBankSelect,
      questions: {
        select: {
          type: true,
          prompt: true,
          promptImage: true,
          options: true,
          correctAnswer: true,
          feedback: true,
          feedbackImage: true,
          referenceLink: true,
          order: true,
        },
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!existing || !canAccessBank(existing, userId, userRole)) {
    throw new NotFoundError('Question bank');
  }

  const bank = await prisma.questionBank.create({
    data: {
      title: `${existing.title} (Copy)`,
      description: existing.description,
      status: QuestionBankStatus.DRAFT,
      timeLimit: existing.timeLimit,
      randomQuestions: existing.randomQuestions,
      randomAnswers: existing.randomAnswers,
      passingScore: existing.passingScore,
      feedbackTiming: existing.feedbackTiming,
      notificationEmail: existing.notificationEmail,
      questionCount: existing.questionCount,
      maxAttempts: existing.maxAttempts,
      createdById: userId,
      questions: {
        create: existing.questions.map((q) => ({
          type: q.type,
          prompt: q.prompt,
          promptImage: q.promptImage,
          options: q.options as object,
          correctAnswer: q.correctAnswer as object,
          feedback: q.feedback,
          feedbackImage: q.feedbackImage,
          referenceLink: q.referenceLink,
          order: q.order,
        })),
      },
    },
    select: questionBankSelect,
  });

  logger.info('Question bank duplicated', {
    originalBankId: id,
    newBankId: bank.id,
    duplicatedBy: userId,
  });

  return bank as unknown as QuestionBankWithCreator;
}
