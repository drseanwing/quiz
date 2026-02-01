/**
 * @file        Quiz Service
 * @module      Services/Quiz
 * @description Quiz attempt management: starting, saving progress, submitting, results
 */

import crypto from 'crypto';
import { QuestionType, QuestionBankStatus, AttemptStatus, FeedbackTiming } from '@prisma/client';
import prisma from '@/config/database';
import logger from '@/config/logger';
import { AppError, NotFoundError } from '@/middleware/errorHandler';
import { scoreQuestion, calculateTotalScore, IScoringResult } from './scoringService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Question data sent to the quiz player (no correct answers) */
export interface IQuizQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  promptImage: string | null;
  options: unknown;
}

/** Result returned when starting a quiz */
export interface IStartQuizResult {
  attemptId: string;
  bankTitle: string;
  timeLimit: number;
  questionCount: number;
  feedbackTiming: FeedbackTiming;
  questions: IQuizQuestion[];
}

/** Attempt state returned to the quiz player */
export interface IAttemptState {
  id: string;
  bankId: string;
  bankTitle: string;
  status: AttemptStatus;
  startedAt: string;
  timeSpent: number;
  timeLimit: number;
  feedbackTiming: FeedbackTiming;
  questionCount: number;
  questions: IQuizQuestion[];
  responses: Record<string, unknown>;
}

/** Per-question result with feedback */
export interface IQuestionResult {
  id: string;
  type: QuestionType;
  prompt: string;
  promptImage: string | null;
  options: unknown;
  correctAnswer: unknown;
  feedback: string;
  feedbackImage: string | null;
  referenceLink: string | null;
  userResponse: unknown;
  score: number;
  isCorrect: boolean;
}

/** Full results after submission */
export interface IQuizResults {
  id: string;
  bankId: string;
  bankTitle: string;
  status: AttemptStatus;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  timeSpent: number;
  startedAt: string;
  completedAt: string | null;
  feedbackTiming: FeedbackTiming;
  questions: IQuestionResult[];
}

/** Feedback for a single question (IMMEDIATE mode) */
export interface IImmediateFeedback {
  questionId: string;
  correctAnswer: unknown;
  feedback: string;
  feedbackImage: string | null;
  score: number;
  isCorrect: boolean;
}

/** Save progress result */
export interface ISaveProgressResult {
  savedAt: string;
  immediateFeedback?: IImmediateFeedback[];
}

/** Attempt summary for listing */
export interface IAttemptSummary {
  id: string;
  bankId: string;
  bankTitle: string;
  status: AttemptStatus;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  startedAt: string;
  completedAt: string | null;
  timeSpent: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fisher-Yates shuffle using crypto-secure PRNG */
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    const temp = result[i] as T;
    result[i] = result[j] as T;
    result[j] = temp;
  }
  return result;
}

/** Check if an attempt has timed out (timeLimit is in minutes, 0 = no limit) */
function isTimedOut(startedAt: Date, timeLimitMinutes: number): boolean {
  if (timeLimitMinutes <= 0) return false;
  const elapsed = Date.now() - startedAt.getTime();
  return elapsed > timeLimitMinutes * 60 * 1000;
}

/** Prepare a question for the quiz player (strip answers/feedback) */
function toQuizQuestion(
  question: { id: string; type: QuestionType; prompt: string; promptImage: string | null; options: unknown },
  randomizeAnswers: boolean
): IQuizQuestion {
  let options = question.options;

  // Shuffle options for MC and drag-order question types
  if (randomizeAnswers && Array.isArray(options)) {
    if (
      question.type === QuestionType.MULTIPLE_CHOICE_SINGLE ||
      question.type === QuestionType.MULTIPLE_CHOICE_MULTI ||
      question.type === QuestionType.DRAG_ORDER
    ) {
      options = shuffle(options);
    }
  }

  return {
    id: question.id,
    type: question.type,
    prompt: question.prompt,
    promptImage: question.promptImage,
    options,
  };
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Start a new quiz attempt
 */
export async function startQuiz(
  bankId: string,
  userId: string
): Promise<IStartQuizResult> {
  // Load bank with questions
  const bank = await prisma.questionBank.findUnique({
    where: { id: bankId },
    select: {
      id: true,
      title: true,
      status: true,
      timeLimit: true,
      randomQuestions: true,
      randomAnswers: true,
      passingScore: true,
      feedbackTiming: true,
      questionCount: true,
      maxAttempts: true,
      questions: {
        select: {
          id: true,
          type: true,
          prompt: true,
          promptImage: true,
          options: true,
          order: true,
        },
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!bank) {
    throw new NotFoundError('Question bank');
  }

  // Only OPEN or PUBLIC banks can be taken
  if (bank.status !== QuestionBankStatus.OPEN && bank.status !== QuestionBankStatus.PUBLIC) {
    throw new AppError('BANK_NOT_AVAILABLE', 'This quiz is not currently available', 403);
  }

  if (bank.questions.length === 0) {
    throw new AppError('NO_QUESTIONS', 'This quiz has no questions', 400);
  }

  // Select questions (before transaction to avoid holding locks during shuffle)
  let selectedQuestions = [...bank.questions];
  if (bank.randomQuestions) {
    selectedQuestions = shuffle(selectedQuestions);
  }
  const limit = bank.questionCount > 0 ? bank.questionCount : selectedQuestions.length;
  selectedQuestions = selectedQuestions.slice(0, limit);
  const questionOrder = selectedQuestions.map(q => q.id);
  const quizQuestions = selectedQuestions.map(q => toQuizQuestion(q, bank.randomAnswers));

  // Use serializable transaction to prevent race conditions on attempt limits
  const attempt = await prisma.$transaction(async (tx) => {
    // Check attempt limit
    if (bank.maxAttempts > 0) {
      const attemptCount = await tx.quizAttempt.count({
        where: {
          userId,
          bankId,
          status: { in: [AttemptStatus.COMPLETED, AttemptStatus.TIMED_OUT] },
        },
      });

      if (attemptCount >= bank.maxAttempts) {
        throw new AppError(
          'MAX_ATTEMPTS_REACHED',
          `You have reached the maximum number of attempts (${bank.maxAttempts}) for this quiz`,
          403
        );
      }
    }

    // Check for an existing in-progress attempt
    const existingAttempt = await tx.quizAttempt.findFirst({
      where: { userId, bankId, status: AttemptStatus.IN_PROGRESS },
    });

    if (existingAttempt) {
      if (bank.timeLimit > 0 && isTimedOut(existingAttempt.startedAt, bank.timeLimit)) {
        await tx.quizAttempt.update({
          where: { id: existingAttempt.id },
          data: { status: AttemptStatus.TIMED_OUT, completedAt: new Date() },
        });
      } else {
        throw new AppError(
          'ATTEMPT_IN_PROGRESS',
          'You already have an in-progress attempt for this quiz',
          409
        );
      }
    }

    // Create attempt within transaction
    return tx.quizAttempt.create({
      data: {
        userId,
        bankId,
        status: AttemptStatus.IN_PROGRESS,
        questionOrder: questionOrder,
        responses: {},
      },
    });
  }, { isolationLevel: 'Serializable' });

  logger.info('Quiz attempt started', {
    attemptId: attempt.id,
    bankId,
    userId,
    questionCount: quizQuestions.length,
  });

  return {
    attemptId: attempt.id,
    bankTitle: bank.title,
    timeLimit: bank.timeLimit,
    questionCount: quizQuestions.length,
    feedbackTiming: bank.feedbackTiming,
    questions: quizQuestions,
  };
}

/**
 * Get the current state of an in-progress attempt
 */
export async function getAttempt(
  attemptId: string,
  userId: string
): Promise<IAttemptState> {
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      bank: {
        select: {
          id: true,
          title: true,
          timeLimit: true,
          feedbackTiming: true,
          randomAnswers: true,
        },
      },
    },
  });

  if (!attempt || attempt.userId !== userId) {
    throw new NotFoundError('Quiz attempt');
  }

  // Auto-timeout check
  if (attempt.status === AttemptStatus.IN_PROGRESS && attempt.bank.timeLimit > 0 && isTimedOut(attempt.startedAt, attempt.bank.timeLimit)) {
    await autoTimeoutAttempt(attempt.id);
    attempt.status = AttemptStatus.TIMED_OUT;
    attempt.completedAt = new Date();
  }

  // Load questions in the stored order
  const questionOrder = attempt.questionOrder as string[];
  const questions = await prisma.question.findMany({
    where: { id: { in: questionOrder } },
    select: {
      id: true,
      type: true,
      prompt: true,
      promptImage: true,
      options: true,
    },
  });

  // Reorder according to questionOrder
  const questionMap = new Map(questions.map(q => [q.id, q]));
  const orderedQuestions: IQuizQuestion[] = [];
  for (const qId of questionOrder) {
    const q = questionMap.get(qId);
    if (q) {
      orderedQuestions.push(toQuizQuestion(q, attempt.bank.randomAnswers));
    }
  }

  return {
    id: attempt.id,
    bankId: attempt.bankId,
    bankTitle: attempt.bank.title,
    status: attempt.status,
    startedAt: attempt.startedAt.toISOString(),
    timeSpent: attempt.timeSpent,
    timeLimit: attempt.bank.timeLimit,
    feedbackTiming: attempt.bank.feedbackTiming,
    questionCount: orderedQuestions.length,
    questions: orderedQuestions,
    responses: attempt.responses as Record<string, unknown>,
  };
}

/**
 * Save progress (auto-save)
 */
export async function saveProgress(
  attemptId: string,
  userId: string,
  responses: Record<string, unknown>,
  timeSpent: number
): Promise<ISaveProgressResult> {
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      userId: true,
      bankId: true,
      status: true,
      startedAt: true,
      questionOrder: true,
      responses: true,
      bank: {
        select: { timeLimit: true, feedbackTiming: true },
      },
    },
  });

  if (!attempt || attempt.userId !== userId) {
    throw new NotFoundError('Quiz attempt');
  }

  if (attempt.status !== AttemptStatus.IN_PROGRESS) {
    throw new AppError('ATTEMPT_NOT_IN_PROGRESS', 'This attempt is no longer in progress', 400);
  }

  // Check timeout
  if (attempt.bank.timeLimit > 0 && isTimedOut(attempt.startedAt, attempt.bank.timeLimit)) {
    await autoTimeoutAttempt(attempt.id);
    throw new AppError('ATTEMPT_TIMED_OUT', 'This attempt has timed out', 400);
  }

  // Validate that response keys match questionOrder
  const questionOrder = new Set(attempt.questionOrder as string[]);
  const validResponses: Record<string, unknown> = {};
  for (const [qId, answer] of Object.entries(responses)) {
    if (questionOrder.has(qId)) {
      validResponses[qId] = answer;
    }
  }

  // Merge with existing responses
  const existingResponses = (attempt.responses as Record<string, unknown>) || {};
  const mergedResponses = { ...existingResponses, ...validResponses };

  // Use updateMany with status guard to prevent writing to a completed/timed-out attempt
  await prisma.quizAttempt.updateMany({
    where: { id: attemptId, status: AttemptStatus.IN_PROGRESS },
    data: {
      responses: mergedResponses as object,
      timeSpent: Math.max(0, timeSpent),
    },
  });

  const result: ISaveProgressResult = {
    savedAt: new Date().toISOString(),
  };

  // Provide immediate feedback if configured
  if (attempt.bank.feedbackTiming === FeedbackTiming.IMMEDIATE) {
    const newlyAnswered = Object.keys(validResponses).filter(qId => !(qId in existingResponses));
    if (newlyAnswered.length > 0) {
      const questions = await prisma.question.findMany({
        where: { id: { in: newlyAnswered } },
        select: {
          id: true,
          type: true,
          options: true,
          correctAnswer: true,
          feedback: true,
          feedbackImage: true,
        },
      });

      result.immediateFeedback = questions.map(q => {
        const scoring = scoreQuestion(q.type, validResponses[q.id], q.correctAnswer, q.options);
        return {
          questionId: q.id,
          correctAnswer: q.correctAnswer,
          feedback: q.feedback,
          feedbackImage: q.feedbackImage,
          score: scoring.score,
          isCorrect: scoring.isCorrect,
        };
      });
    }
  }

  return result;
}

/**
 * Submit a quiz attempt for scoring
 */
export async function submitAttempt(
  attemptId: string,
  userId: string
): Promise<IQuizResults> {
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      bank: {
        select: {
          id: true,
          title: true,
          passingScore: true,
          feedbackTiming: true,
          timeLimit: true,
        },
      },
    },
  });

  if (!attempt || attempt.userId !== userId) {
    throw new NotFoundError('Quiz attempt');
  }

  if (attempt.status !== AttemptStatus.IN_PROGRESS) {
    throw new AppError('ATTEMPT_NOT_IN_PROGRESS', 'This attempt is no longer in progress', 400);
  }

  const questionOrder = attempt.questionOrder as string[];
  const responses = (attempt.responses as Record<string, unknown>) || {};

  // Load questions
  const questions = await prisma.question.findMany({
    where: { id: { in: questionOrder } },
    select: {
      id: true,
      type: true,
      prompt: true,
      promptImage: true,
      options: true,
      correctAnswer: true,
      feedback: true,
      feedbackImage: true,
      referenceLink: true,
    },
  });

  const questionMap = new Map(questions.map(q => [q.id, q]));

  // Score each question
  const questionResults: IQuestionResult[] = [];
  const scores: IScoringResult[] = [];

  for (const qId of questionOrder) {
    const q = questionMap.get(qId);
    if (!q) continue;

    const userResponse = responses[qId] ?? null;
    const scoring = scoreQuestion(q.type, userResponse, q.correctAnswer, q.options);
    scores.push(scoring);

    questionResults.push({
      id: q.id,
      type: q.type,
      prompt: q.prompt,
      promptImage: q.promptImage,
      options: q.options,
      correctAnswer: q.correctAnswer,
      feedback: q.feedback,
      feedbackImage: q.feedbackImage,
      referenceLink: q.referenceLink,
      userResponse,
      score: scoring.score,
      isCorrect: scoring.isCorrect,
    });
  }

  // Calculate total
  const total = calculateTotalScore(scores, attempt.bank.passingScore);

  // Determine status
  const timedOut = attempt.bank.timeLimit > 0 && isTimedOut(attempt.startedAt, attempt.bank.timeLimit);
  const finalStatus = timedOut ? AttemptStatus.TIMED_OUT : AttemptStatus.COMPLETED;

  // Update attempt
  const completedAt = new Date();
  const timeSpent = Math.round((completedAt.getTime() - attempt.startedAt.getTime()) / 1000);

  // Use updateMany with status guard to prevent double-scoring race
  // (e.g., concurrent submitAttempt and autoTimeoutAttempt)
  const updated = await prisma.quizAttempt.updateMany({
    where: { id: attemptId, status: AttemptStatus.IN_PROGRESS },
    data: {
      status: finalStatus,
      score: total.score,
      maxScore: total.maxScore,
      percentage: total.percentage,
      passed: total.passed,
      completedAt,
      timeSpent,
    },
  });

  if (updated.count === 0) {
    throw new AppError('ATTEMPT_ALREADY_COMPLETED', 'This quiz attempt has already been submitted or timed out', 409);
  }

  logger.info('Quiz attempt submitted', {
    attemptId,
    userId,
    bankId: attempt.bankId,
    score: total.score,
    maxScore: total.maxScore,
    percentage: total.percentage,
    passed: total.passed,
    status: finalStatus,
  });

  return {
    id: attempt.id,
    bankId: attempt.bankId,
    bankTitle: attempt.bank.title,
    status: finalStatus,
    score: total.score,
    maxScore: total.maxScore,
    percentage: total.percentage,
    passed: total.passed,
    timeSpent,
    startedAt: attempt.startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    feedbackTiming: attempt.bank.feedbackTiming,
    questions: attempt.bank.feedbackTiming !== FeedbackTiming.NONE ? questionResults : [],
  };
}

/**
 * Get results for a completed attempt
 */
export async function getResults(
  attemptId: string,
  userId: string
): Promise<IQuizResults> {
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      bank: {
        select: {
          id: true,
          title: true,
          feedbackTiming: true,
          passingScore: true,
        },
      },
    },
  });

  if (!attempt || attempt.userId !== userId) {
    throw new NotFoundError('Quiz attempt');
  }

  if (attempt.status !== AttemptStatus.COMPLETED && attempt.status !== AttemptStatus.TIMED_OUT) {
    throw new AppError('ATTEMPT_NOT_COMPLETED', 'This attempt has not been completed yet', 400);
  }

  const questionOrder = attempt.questionOrder as string[];
  const responses = (attempt.responses as Record<string, unknown>) || {};

  // Build question results
  let questionResults: IQuestionResult[] = [];

  if (attempt.bank.feedbackTiming !== FeedbackTiming.NONE) {
    const questions = await prisma.question.findMany({
      where: { id: { in: questionOrder } },
      select: {
        id: true,
        type: true,
        prompt: true,
        promptImage: true,
        options: true,
        correctAnswer: true,
        feedback: true,
        feedbackImage: true,
        referenceLink: true,
      },
    });

    const questionMap = new Map(questions.map(q => [q.id, q]));

    for (const qId of questionOrder) {
      const q = questionMap.get(qId);
      if (!q) continue;

      const userResponse = responses[qId] ?? null;
      const scoring = scoreQuestion(q.type, userResponse, q.correctAnswer, q.options);

      questionResults.push({
        id: q.id,
        type: q.type,
        prompt: q.prompt,
        promptImage: q.promptImage,
        options: q.options,
        correctAnswer: q.correctAnswer,
        feedback: q.feedback,
        feedbackImage: q.feedbackImage,
        referenceLink: q.referenceLink,
        userResponse,
        score: scoring.score,
        isCorrect: scoring.isCorrect,
      });
    }
  }

  return {
    id: attempt.id,
    bankId: attempt.bankId,
    bankTitle: attempt.bank.title,
    status: attempt.status,
    score: attempt.score,
    maxScore: attempt.maxScore,
    percentage: attempt.percentage,
    passed: attempt.passed,
    timeSpent: attempt.timeSpent,
    startedAt: attempt.startedAt.toISOString(),
    completedAt: attempt.completedAt?.toISOString() ?? null,
    feedbackTiming: attempt.bank.feedbackTiming,
    questions: questionResults,
  };
}

/**
 * List attempts for the current user
 */
export async function listUserAttempts(
  userId: string,
  bankId?: string,
  page = 1,
  pageSize = 50
): Promise<{ data: IAttemptSummary[]; meta: { page: number; pageSize: number; totalCount: number; totalPages: number } }> {
  const where: Record<string, unknown> = { userId };
  if (bankId) {
    where.bankId = bankId;
  }

  const skip = (page - 1) * pageSize;

  const [attempts, totalCount] = await Promise.all([
    prisma.quizAttempt.findMany({
      where,
      include: {
        bank: { select: { title: true } },
      },
      orderBy: { startedAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.quizAttempt.count({ where }),
  ]);

  return {
    data: attempts.map(a => ({
      id: a.id,
      bankId: a.bankId,
      bankTitle: a.bank.title,
      status: a.status,
      score: a.score,
      maxScore: a.maxScore,
      percentage: a.percentage,
      passed: a.passed,
      startedAt: a.startedAt.toISOString(),
      completedAt: a.completedAt?.toISOString() ?? null,
      timeSpent: a.timeSpent,
    })),
    meta: { page, pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) },
  };
}

/**
 * Auto-timeout an attempt (internal)
 */
async function autoTimeoutAttempt(attemptId: string): Promise<void> {
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      bank: { select: { passingScore: true, timeLimit: true } },
    },
  });

  if (!attempt || attempt.status !== AttemptStatus.IN_PROGRESS) return;

  const questionOrder = attempt.questionOrder as string[];
  const responses = (attempt.responses as Record<string, unknown>) || {};

  // Score what the user has answered
  const questions = await prisma.question.findMany({
    where: { id: { in: questionOrder } },
    select: { id: true, type: true, options: true, correctAnswer: true },
  });

  const questionMap = new Map(questions.map(q => [q.id, q]));
  const scores: IScoringResult[] = [];

  for (const qId of questionOrder) {
    const q = questionMap.get(qId);
    if (!q) continue;
    const userResponse = responses[qId] ?? null;
    scores.push(scoreQuestion(q.type, userResponse, q.correctAnswer, q.options));
  }

  const total = calculateTotalScore(scores, attempt.bank.passingScore);
  const timeSpent = attempt.bank.timeLimit * 60;

  // Use conditional update to prevent double-scoring race with submitAttempt
  const updated = await prisma.quizAttempt.updateMany({
    where: { id: attemptId, status: AttemptStatus.IN_PROGRESS },
    data: {
      status: AttemptStatus.TIMED_OUT,
      score: total.score,
      maxScore: total.maxScore,
      percentage: total.percentage,
      passed: total.passed,
      completedAt: new Date(),
      timeSpent,
    },
  });

  if (updated.count > 0) {
    logger.info('Quiz attempt auto-timed-out', {
      attemptId,
      score: total.score,
      maxScore: total.maxScore,
    });
  }
}
