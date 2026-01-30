/**
 * @file        Question Service
 * @module      Services/Question
 * @description CRUD operations for question management within question banks
 */

import { QuestionType, UserRole } from '@prisma/client';
import prisma from '@/config/database';
import logger from '@/config/logger';
import {
  NotFoundError,
  AuthorizationError,
} from '@/middleware/errorHandler';
import { canModifyBank, canAccessBank } from './questionBankService';

export interface ICreateQuestionRequest {
  type: QuestionType;
  prompt: string;
  promptImage?: string;
  options: unknown;
  correctAnswer: unknown;
  feedback: string;
  feedbackImage?: string;
  referenceLink?: string;
}

export interface IUpdateQuestionRequest {
  type?: QuestionType;
  prompt?: string;
  promptImage?: string | null;
  options?: unknown;
  correctAnswer?: unknown;
  feedback?: string;
  feedbackImage?: string | null;
  referenceLink?: string | null;
}

const questionSelect = {
  id: true,
  bankId: true,
  type: true,
  prompt: true,
  promptImage: true,
  options: true,
  correctAnswer: true,
  feedback: true,
  feedbackImage: true,
  referenceLink: true,
  order: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Verify that the user has permission to modify the bank containing a question
 */
async function verifyBankModifyAccess(bankId: string, userId: string, userRole: UserRole) {
  const bank = await prisma.questionBank.findUnique({
    where: { id: bankId },
    select: { id: true, createdById: true, status: true },
  });

  if (!bank) {
    throw new NotFoundError('Question bank not found');
  }

  if (!canModifyBank(bank, userId, userRole)) {
    throw new AuthorizationError('You do not have permission to modify this question bank');
  }

  return bank;
}

/**
 * Verify that the user has permission to view the bank containing a question
 */
async function verifyBankReadAccess(bankId: string, userId: string, userRole: UserRole) {
  const bank = await prisma.questionBank.findUnique({
    where: { id: bankId },
    select: { id: true, createdById: true, status: true },
  });

  if (!bank) {
    throw new NotFoundError('Question bank not found');
  }

  if (!canAccessBank(bank, userId, userRole)) {
    throw new AuthorizationError('You do not have access to this question bank');
  }

  return bank;
}

/**
 * List all questions in a question bank
 */
export async function listQuestions(
  bankId: string,
  userId: string,
  userRole: UserRole
) {
  await verifyBankReadAccess(bankId, userId, userRole);

  const questions = await prisma.question.findMany({
    where: { bankId },
    select: questionSelect,
    orderBy: { order: 'asc' },
  });

  return questions;
}

/**
 * Get a single question by ID
 */
export async function getQuestion(
  id: string,
  userId: string,
  userRole: UserRole
) {
  const question = await prisma.question.findUnique({
    where: { id },
    select: {
      ...questionSelect,
      bank: { select: { id: true, createdById: true, status: true } },
    },
  });

  if (!question) {
    throw new NotFoundError('Question not found');
  }

  if (!canAccessBank(question.bank, userId, userRole)) {
    throw new AuthorizationError('You do not have access to this question');
  }

  const { bank: _, ...questionData } = question;
  return questionData;
}

/**
 * Create a new question in a question bank
 */
export async function createQuestion(
  bankId: string,
  data: ICreateQuestionRequest,
  userId: string,
  userRole: UserRole
) {
  await verifyBankModifyAccess(bankId, userId, userRole);

  // Get the current max order for this bank
  const maxOrder = await prisma.question.aggregate({
    where: { bankId },
    _max: { order: true },
  });

  const question = await prisma.question.create({
    data: {
      bankId,
      type: data.type,
      prompt: data.prompt,
      promptImage: data.promptImage,
      options: data.options as object,
      correctAnswer: data.correctAnswer as object,
      feedback: data.feedback,
      feedbackImage: data.feedbackImage,
      referenceLink: data.referenceLink,
      order: (maxOrder._max.order ?? -1) + 1,
    },
    select: questionSelect,
  });

  logger.info('Question created', {
    questionId: question.id,
    bankId,
    type: data.type,
    createdBy: userId,
  });

  return question;
}

/**
 * Update a question
 */
export async function updateQuestion(
  id: string,
  data: IUpdateQuestionRequest,
  userId: string,
  userRole: UserRole
) {
  const existing = await prisma.question.findUnique({
    where: { id },
    select: { id: true, bankId: true },
  });

  if (!existing) {
    throw new NotFoundError('Question not found');
  }

  await verifyBankModifyAccess(existing.bankId, userId, userRole);

  const question = await prisma.question.update({
    where: { id },
    data: {
      ...(data.type !== undefined && { type: data.type }),
      ...(data.prompt !== undefined && { prompt: data.prompt }),
      ...(data.promptImage !== undefined && { promptImage: data.promptImage }),
      ...(data.options !== undefined && { options: data.options as object }),
      ...(data.correctAnswer !== undefined && { correctAnswer: data.correctAnswer as object }),
      ...(data.feedback !== undefined && { feedback: data.feedback }),
      ...(data.feedbackImage !== undefined && { feedbackImage: data.feedbackImage }),
      ...(data.referenceLink !== undefined && { referenceLink: data.referenceLink }),
    },
    select: questionSelect,
  });

  logger.info('Question updated', {
    questionId: id,
    bankId: existing.bankId,
    updatedBy: userId,
  });

  return question;
}

/**
 * Delete a question
 */
export async function deleteQuestion(
  id: string,
  userId: string,
  userRole: UserRole
) {
  const existing = await prisma.question.findUnique({
    where: { id },
    select: { id: true, bankId: true, order: true },
  });

  if (!existing) {
    throw new NotFoundError('Question not found');
  }

  await verifyBankModifyAccess(existing.bankId, userId, userRole);

  // Delete question and reorder remaining questions
  await prisma.$transaction([
    prisma.question.delete({ where: { id } }),
    prisma.question.updateMany({
      where: {
        bankId: existing.bankId,
        order: { gt: existing.order },
      },
      data: {
        order: { decrement: 1 },
      },
    }),
  ]);

  logger.info('Question deleted', {
    questionId: id,
    bankId: existing.bankId,
    deletedBy: userId,
  });
}

/**
 * Duplicate a question within the same bank
 */
export async function duplicateQuestion(
  id: string,
  userId: string,
  userRole: UserRole
) {
  const existing = await prisma.question.findUnique({
    where: { id },
    select: questionSelect,
  });

  if (!existing) {
    throw new NotFoundError('Question not found');
  }

  await verifyBankModifyAccess(existing.bankId, userId, userRole);

  // Get the current max order
  const maxOrder = await prisma.question.aggregate({
    where: { bankId: existing.bankId },
    _max: { order: true },
  });

  const question = await prisma.question.create({
    data: {
      bankId: existing.bankId,
      type: existing.type,
      prompt: existing.prompt,
      promptImage: existing.promptImage,
      options: existing.options as object,
      correctAnswer: existing.correctAnswer as object,
      feedback: existing.feedback,
      feedbackImage: existing.feedbackImage,
      referenceLink: existing.referenceLink,
      order: (maxOrder._max.order ?? -1) + 1,
    },
    select: questionSelect,
  });

  logger.info('Question duplicated', {
    originalQuestionId: id,
    newQuestionId: question.id,
    bankId: existing.bankId,
    duplicatedBy: userId,
  });

  return question;
}

/**
 * Reorder questions in a bank
 */
export async function reorderQuestions(
  bankId: string,
  questionIds: string[],
  userId: string,
  userRole: UserRole
) {
  await verifyBankModifyAccess(bankId, userId, userRole);

  // Verify all question IDs belong to this bank
  const questions = await prisma.question.findMany({
    where: { bankId },
    select: { id: true },
  });

  const bankQuestionIds = new Set(questions.map((q) => q.id));
  for (const qId of questionIds) {
    if (!bankQuestionIds.has(qId)) {
      throw new NotFoundError(`Question ${qId} not found in this bank`);
    }
  }

  // Update orders in a transaction
  await prisma.$transaction(
    questionIds.map((qId, index) =>
      prisma.question.update({
        where: { id: qId },
        data: { order: index },
      })
    )
  );

  logger.info('Questions reordered', {
    bankId,
    questionCount: questionIds.length,
    reorderedBy: userId,
  });

  // Return updated questions
  return prisma.question.findMany({
    where: { bankId },
    select: questionSelect,
    orderBy: { order: 'asc' },
  });
}
