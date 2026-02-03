/**
 * @file        Quiz Integration Tests
 * @description Integration tests for quiz delivery endpoints
 */

import request from 'supertest';
import { UserRole, QuestionBankStatus, FeedbackTiming, QuestionType } from '@prisma/client';
import { generateAccessToken } from '@/utils/jwt';

// Mock Prisma at module level
jest.mock('@/config/database', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
    questionBank: {
      findUnique: jest.fn(),
    },
    attempt: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    question: {
      findMany: jest.fn(),
    },
    response: {
      createMany: jest.fn(),
      updateMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({}),
    },
  },
}));

// Mock email service
jest.mock('@/services/emailService', () => ({
  sendCompletionNotification: jest.fn().mockResolvedValue(true),
}));

// Mock rate limiter
jest.mock('@/middleware/rateLimiter', () => ({
  generalRateLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  authRateLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  passwordResetRateLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  uploadRateLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// Import app after mocks are set up
import app from '@/index';

// Get reference to mocked prisma
const mockPrisma = jest.mocked(require('@/config/database').default);

beforeEach(() => {
  jest.clearAllMocks();
});

// Helper to create mock user
function createMockUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'John',
    surname: 'Doe',
    role: UserRole.USER,
    isActive: true,
    ...overrides,
  };
}

// Helper to create mock question bank
function createMockBank(overrides: Record<string, unknown> = {}) {
  return {
    id: 'bank-1',
    title: 'Test Bank',
    description: 'A test bank',
    status: QuestionBankStatus.OPEN,
    timeLimit: 30,
    randomQuestions: true,
    randomAnswers: true,
    passingScore: 80,
    feedbackTiming: FeedbackTiming.END,
    notificationEmail: null,
    questionCount: 10,
    maxAttempts: 0,
    createdById: 'editor-1',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    _count: { attempts: 0, questions: 10 },
    ...overrides,
  };
}

// Helper to create mock question
function createMockQuestion(overrides: Record<string, unknown> = {}) {
  return {
    id: 'question-1',
    bankId: 'bank-1',
    type: QuestionType.MULTIPLE_CHOICE,
    prompt: 'What is 2+2?',
    promptImage: null,
    options: [
      { id: 'a', text: '3' },
      { id: 'b', text: '4' },
      { id: 'c', text: '5' },
    ],
    correctAnswer: { selectedId: 'b' },
    feedback: 'The answer is 4',
    feedbackImage: null,
    referenceLink: null,
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// Helper to create mock attempt
function createMockAttempt(overrides: Record<string, unknown> = {}) {
  return {
    id: 'attempt-1',
    userId: 'user-1',
    bankId: 'bank-1',
    startedAt: new Date(),
    completedAt: null,
    timeSpent: 0,
    score: null,
    maxScore: null,
    percentage: null,
    passed: null,
    responses: [],
    user: createMockUser(),
    bank: createMockBank(),
    ...overrides,
  };
}

describe('POST /api/quizzes/:bankId/start', () => {
  it('should start a new quiz attempt', async () => {
    const user = createMockUser();
    const accessToken = generateAccessToken(user);
    const bank = createMockBank();
    const questions = [
      createMockQuestion({ id: 'q1', order: 0 }),
      createMockQuestion({ id: 'q2', order: 1, prompt: 'What is 3+3?' }),
    ];
    const attempt = createMockAttempt();

    mockPrisma.user.findUnique.mockResolvedValue(user);
    mockPrisma.questionBank.findUnique.mockResolvedValue(bank);
    mockPrisma.question.findMany.mockResolvedValue(questions);
    mockPrisma.attempt.count.mockResolvedValue(0);
    mockPrisma.attempt.create.mockResolvedValue(attempt);

    const response = await request(app)
      .post('/api/quizzes/bank-1/start')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe('attempt-1');
    expect(response.body.data.bankId).toBe('bank-1');
  });

  it('should reject starting quiz without authentication', async () => {
    const response = await request(app)
      .post('/api/quizzes/bank-1/start');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should reject starting quiz for non-existent bank', async () => {
    const user = createMockUser();
    const accessToken = generateAccessToken(user);

    mockPrisma.user.findUnique.mockResolvedValue(user);
    mockPrisma.questionBank.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/quizzes/missing-bank/start')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  it('should reject starting DRAFT bank for non-owner', async () => {
    const user = createMockUser({ role: UserRole.USER });
    const accessToken = generateAccessToken(user);
    const draftBank = createMockBank({
      status: QuestionBankStatus.DRAFT,
      createdById: 'other-editor',
    });

    mockPrisma.user.findUnique.mockResolvedValue(user);
    mockPrisma.questionBank.findUnique.mockResolvedValue(draftBank);

    const response = await request(app)
      .post('/api/quizzes/bank-1/start')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  it('should reject starting when max attempts reached', async () => {
    const user = createMockUser();
    const accessToken = generateAccessToken(user);
    const bank = createMockBank({ maxAttempts: 3 });

    mockPrisma.user.findUnique.mockResolvedValue(user);
    mockPrisma.questionBank.findUnique.mockResolvedValue(bank);
    mockPrisma.attempt.count.mockResolvedValue(3);

    const response = await request(app)
      .post('/api/quizzes/bank-1/start')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain('maximum');
  });

  it('should reject starting bank with no questions', async () => {
    const user = createMockUser();
    const accessToken = generateAccessToken(user);
    const bank = createMockBank({ _count: { questions: 0, attempts: 0 } });

    mockPrisma.user.findUnique.mockResolvedValue(user);
    mockPrisma.questionBank.findUnique.mockResolvedValue(bank);
    mockPrisma.question.findMany.mockResolvedValue([]);
    mockPrisma.attempt.count.mockResolvedValue(0);

    const response = await request(app)
      .post('/api/quizzes/bank-1/start')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});

describe('GET /api/attempts/:id', () => {
  it('should get attempt by ID for owner', async () => {
    const user = createMockUser();
    const accessToken = generateAccessToken(user);
    const attempt = createMockAttempt();

    mockPrisma.user.findUnique.mockResolvedValue(user);
    mockPrisma.attempt.findUnique.mockResolvedValue(attempt);

    const response = await request(app)
      .get('/api/attempts/attempt-1')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe('attempt-1');
  });

  it('should reject getting attempt without authentication', async () => {
    const response = await request(app)
      .get('/api/attempts/attempt-1');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should reject getting other users attempt', async () => {
    const user = createMockUser({ id: 'user-1' });
    const accessToken = generateAccessToken(user);
    const otherUsersAttempt = createMockAttempt({ userId: 'user-2' });

    mockPrisma.user.findUnique.mockResolvedValue(user);
    mockPrisma.attempt.findUnique.mockResolvedValue(otherUsersAttempt);

    const response = await request(app)
      .get('/api/attempts/attempt-1')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  it('should return 404 for non-existent attempt', async () => {
    const user = createMockUser();
    const accessToken = generateAccessToken(user);

    mockPrisma.user.findUnique.mockResolvedValue(user);
    mockPrisma.attempt.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .get('/api/attempts/missing-attempt')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });
});

describe('POST /api/attempts/:id/submit', () => {
  it('should submit attempt and return results', async () => {
    const user = createMockUser();
    const accessToken = generateAccessToken(user);
    const attempt = createMockAttempt({
      responses: [
        { questionId: 'q1', answer: { selectedId: 'b' } },
        { questionId: 'q2', answer: { selectedId: 'a' } },
      ],
    });
    const questions = [
      createMockQuestion({ id: 'q1', correctAnswer: { selectedId: 'b' } }),
      createMockQuestion({ id: 'q2', correctAnswer: { selectedId: 'b' } }),
    ];
    const bank = createMockBank();

    mockPrisma.user.findUnique.mockResolvedValue(user);
    mockPrisma.attempt.findUnique.mockResolvedValue(attempt);
    mockPrisma.questionBank.findUnique.mockResolvedValue(bank);
    mockPrisma.question.findMany.mockResolvedValue(questions);
    mockPrisma.attempt.update.mockResolvedValue({
      ...attempt,
      completedAt: new Date(),
      score: 1,
      maxScore: 2,
      percentage: 50,
      passed: false,
    });

    const response = await request(app)
      .post('/api/attempts/attempt-1/submit')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.score).toBeDefined();
    expect(response.body.data.passed).toBeDefined();
  });

  it('should reject submitting without authentication', async () => {
    const response = await request(app)
      .post('/api/attempts/attempt-1/submit');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should reject submitting other users attempt', async () => {
    const user = createMockUser({ id: 'user-1' });
    const accessToken = generateAccessToken(user);
    const otherUsersAttempt = createMockAttempt({ userId: 'user-2' });

    mockPrisma.user.findUnique.mockResolvedValue(user);
    mockPrisma.attempt.findUnique.mockResolvedValue(otherUsersAttempt);

    const response = await request(app)
      .post('/api/attempts/attempt-1/submit')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  it('should reject submitting already completed attempt', async () => {
    const user = createMockUser();
    const accessToken = generateAccessToken(user);
    const completedAttempt = createMockAttempt({
      completedAt: new Date(),
      score: 8,
      passed: true,
    });

    mockPrisma.user.findUnique.mockResolvedValue(user);
    mockPrisma.attempt.findUnique.mockResolvedValue(completedAttempt);

    const response = await request(app)
      .post('/api/attempts/attempt-1/submit')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain('already');
  });

  it('should calculate correct passing result', async () => {
    const user = createMockUser();
    const accessToken = generateAccessToken(user);
    const attempt = createMockAttempt({
      responses: [
        { questionId: 'q1', answer: { selectedId: 'b' } },
        { questionId: 'q2', answer: { selectedId: 'b' } },
      ],
    });
    const questions = [
      createMockQuestion({ id: 'q1', correctAnswer: { selectedId: 'b' } }),
      createMockQuestion({ id: 'q2', correctAnswer: { selectedId: 'b' } }),
    ];
    const bank = createMockBank({ passingScore: 80 });

    mockPrisma.user.findUnique.mockResolvedValue(user);
    mockPrisma.attempt.findUnique.mockResolvedValue(attempt);
    mockPrisma.questionBank.findUnique.mockResolvedValue(bank);
    mockPrisma.question.findMany.mockResolvedValue(questions);
    mockPrisma.attempt.update.mockResolvedValue({
      ...attempt,
      completedAt: new Date(),
      score: 2,
      maxScore: 2,
      percentage: 100,
      passed: true,
    });

    const response = await request(app)
      .post('/api/attempts/attempt-1/submit')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.passed).toBe(true);
  });
});

describe('GET /api/attempts/mine', () => {
  it('should list current users attempts', async () => {
    const user = createMockUser();
    const accessToken = generateAccessToken(user);
    const attempts = [
      createMockAttempt({ id: 'attempt-1' }),
      createMockAttempt({ id: 'attempt-2', completedAt: new Date() }),
    ];

    mockPrisma.user.findUnique.mockResolvedValue(user);
    mockPrisma.attempt.findMany.mockResolvedValue(attempts);
    mockPrisma.attempt.count.mockResolvedValue(2);

    const response = await request(app)
      .get('/api/attempts/mine')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.meta.totalCount).toBe(2);
  });

  it('should reject listing attempts without authentication', async () => {
    const response = await request(app)
      .get('/api/attempts/mine');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should filter attempts by bankId', async () => {
    const user = createMockUser();
    const accessToken = generateAccessToken(user);

    mockPrisma.user.findUnique.mockResolvedValue(user);
    mockPrisma.attempt.findMany.mockResolvedValue([]);
    mockPrisma.attempt.count.mockResolvedValue(0);

    const response = await request(app)
      .get('/api/attempts/mine?bankId=bank-1')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(mockPrisma.attempt.findMany).toHaveBeenCalled();
  });

  it('should apply pagination', async () => {
    const user = createMockUser();
    const accessToken = generateAccessToken(user);

    mockPrisma.user.findUnique.mockResolvedValue(user);
    mockPrisma.attempt.findMany.mockResolvedValue([]);
    mockPrisma.attempt.count.mockResolvedValue(100);

    const response = await request(app)
      .get('/api/attempts/mine?page=2&pageSize=20')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.meta.page).toBe(2);
    expect(response.body.meta.pageSize).toBe(20);
  });
});

describe('GET /api/attempts/:id/results', () => {
  it('should get results for completed attempt', async () => {
    const user = createMockUser();
    const accessToken = generateAccessToken(user);
    const completedAttempt = createMockAttempt({
      completedAt: new Date(),
      score: 8,
      maxScore: 10,
      percentage: 80,
      passed: true,
    });
    const bank = createMockBank({ feedbackTiming: FeedbackTiming.END });

    mockPrisma.user.findUnique.mockResolvedValue(user);
    mockPrisma.attempt.findUnique.mockResolvedValue(completedAttempt);
    mockPrisma.questionBank.findUnique.mockResolvedValue(bank);

    const response = await request(app)
      .get('/api/attempts/attempt-1/results')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.score).toBe(8);
    expect(response.body.data.passed).toBe(true);
  });

  it('should reject getting results for incomplete attempt', async () => {
    const user = createMockUser();
    const accessToken = generateAccessToken(user);
    const incompleteAttempt = createMockAttempt({
      completedAt: null,
    });

    mockPrisma.user.findUnique.mockResolvedValue(user);
    mockPrisma.attempt.findUnique.mockResolvedValue(incompleteAttempt);

    const response = await request(app)
      .get('/api/attempts/attempt-1/results')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain('not completed');
  });

  it('should reject getting results without authentication', async () => {
    const response = await request(app)
      .get('/api/attempts/attempt-1/results');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
