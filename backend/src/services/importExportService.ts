/**
 * @file        Import/Export Service
 * @module      Services/ImportExport
 * @description Question bank import and export functionality
 */

import prisma from '@/config/database';
import { QuestionType } from '@prisma/client';
import { NotFoundError, ValidationError } from '@/middleware/errorHandler';
import { canAccessBank } from '@/services/questionBankService';
import type { ITokenPayload } from '@/utils/jwt';
import { sanitizeHtml } from '@/services/sanitizer';
import { sanitizeOptions, sanitizeCorrectAnswer } from '@/services/questionService';
import logger from '@/config/logger';

const MAX_IMPORT_QUESTIONS = 500;

function isValidUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

// ─── Export Types ──────────────────────────────────────────────────────────

interface IExportedQuestion {
  type: QuestionType;
  prompt: string;
  promptImage: string | null;
  options: unknown;
  correctAnswer: unknown;
  feedback: string;
  feedbackImage: string | null;
  referenceLink: string | null;
  order: number;
}

interface IExportedQuestionBank {
  version: '1.0';
  exportedAt: string;
  bank: {
    title: string;
    description: string | null;
    timeLimit: number;
    randomQuestions: boolean;
    randomAnswers: boolean;
    passingScore: number;
    feedbackTiming: string;
    questionCount: number;
    maxAttempts: number;
  };
  questions: IExportedQuestion[];
}

// ─── Export ────────────────────────────────────────────────────────────────

/**
 * Export a question bank with all its questions as JSON
 */
export async function exportQuestionBank(
  bankId: string,
  user: ITokenPayload
): Promise<IExportedQuestionBank> {
  const bank = await prisma.questionBank.findUnique({
    where: { id: bankId },
    include: {
      questions: {
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!bank) {
    throw new NotFoundError('Question bank');
  }

  if (!canAccessBank(bank, user.userId, user.role)) {
    throw new NotFoundError('Question bank');
  }

  logger.info('Question bank exported', {
    bankId,
    questionCount: bank.questions.length,
    userId: user.userId,
  });

  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    bank: {
      title: bank.title,
      description: bank.description,
      timeLimit: bank.timeLimit,
      randomQuestions: bank.randomQuestions,
      randomAnswers: bank.randomAnswers,
      passingScore: bank.passingScore,
      feedbackTiming: bank.feedbackTiming,
      questionCount: bank.questionCount,
      maxAttempts: bank.maxAttempts,
    },
    questions: bank.questions.map((q) => ({
      type: q.type,
      prompt: q.prompt,
      promptImage: q.promptImage,
      options: q.options,
      correctAnswer: q.correctAnswer,
      feedback: q.feedback,
      feedbackImage: q.feedbackImage,
      referenceLink: q.referenceLink,
      order: q.order,
    })),
  };
}

// ─── Import ────────────────────────────────────────────────────────────────

/**
 * Validate an import data structure
 */
function validateImportData(data: unknown): IExportedQuestionBank {
  if (typeof data !== 'object' || data === null) {
    throw new ValidationError('Invalid import data: expected an object');
  }

  const obj = data as Record<string, unknown>;

  if (obj.version !== '1.0') {
    throw new ValidationError('Unsupported import format version');
  }

  if (typeof obj.bank !== 'object' || obj.bank === null) {
    throw new ValidationError('Invalid import data: missing bank configuration');
  }

  const bank = obj.bank as Record<string, unknown>;
  if (typeof bank.title !== 'string' || bank.title.trim().length === 0) {
    throw new ValidationError('Invalid import data: bank title is required');
  }

  if (!Array.isArray(obj.questions)) {
    throw new ValidationError('Invalid import data: questions must be an array');
  }

  if (obj.questions.length > MAX_IMPORT_QUESTIONS) {
    throw new ValidationError(
      `Import exceeds maximum of ${MAX_IMPORT_QUESTIONS} questions`
    );
  }

  const validTypes = Object.values(QuestionType);
  const errors: string[] = [];

  (obj.questions as Record<string, unknown>[]).forEach((q, i) => {
    if (typeof q.type !== 'string' || !validTypes.includes(q.type as QuestionType)) {
      errors.push(`Question ${i + 1}: invalid type '${q.type}'`);
    }
    if (typeof q.prompt !== 'string' || q.prompt.trim().length === 0) {
      errors.push(`Question ${i + 1}: prompt is required`);
    }
    if (typeof q.feedback !== 'string') {
      errors.push(`Question ${i + 1}: feedback is required`);
    }
    if (q.options === undefined || q.options === null) {
      errors.push(`Question ${i + 1}: options are required`);
    }
    if (q.correctAnswer === undefined || q.correctAnswer === null) {
      errors.push(`Question ${i + 1}: correctAnswer is required`);
    }
  });

  if (errors.length > 0) {
    throw new ValidationError('Import validation failed', {
      errors,
    });
  }

  return data as IExportedQuestionBank;
}

/**
 * Import a question bank from exported JSON data
 */
export async function importQuestionBank(
  data: unknown,
  userId: string
): Promise<{ id: string; title: string; questionCount: number }> {
  const validated = validateImportData(data);

  const result = await prisma.$transaction(async (tx) => {
    // Create the question bank
    const bank = await tx.questionBank.create({
      data: {
        title: validated.bank.title,
        description: validated.bank.description,
        timeLimit: validated.bank.timeLimit ?? 0,
        randomQuestions: validated.bank.randomQuestions ?? true,
        randomAnswers: validated.bank.randomAnswers ?? true,
        passingScore: validated.bank.passingScore ?? 80,
        feedbackTiming: (validated.bank.feedbackTiming ?? 'END') as 'IMMEDIATE' | 'END' | 'NONE',
        questionCount: validated.bank.questionCount ?? 10,
        maxAttempts: validated.bank.maxAttempts ?? 0,
        createdById: userId,
        // Imported banks start as DRAFT
      },
    });

    // Create questions
    if (validated.questions.length > 0) {
      await tx.question.createMany({
        data: validated.questions.map((q, index) => ({
          bankId: bank.id,
          type: q.type,
          prompt: sanitizeHtml(q.prompt),
          promptImage: isValidUrl(q.promptImage) ? q.promptImage : null,
          options: sanitizeOptions(q.options, q.type) as object,
          correctAnswer: sanitizeCorrectAnswer(q.correctAnswer) as object,
          feedback: sanitizeHtml(q.feedback),
          feedbackImage: isValidUrl(q.feedbackImage) ? q.feedbackImage : null,
          referenceLink: isValidUrl(q.referenceLink) ? q.referenceLink : null,
          order: q.order ?? index,
        })),
      });
    }

    return bank;
  });

  logger.info('Question bank imported', {
    bankId: result.id,
    title: result.title,
    questionCount: validated.questions.length,
    userId,
  });

  return {
    id: result.id,
    title: result.title,
    questionCount: validated.questions.length,
  };
}
