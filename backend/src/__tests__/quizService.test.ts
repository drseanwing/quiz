/**
 * @file        Quiz Service Tests
 * @description Tests for quiz attempt lifecycle with mocked Prisma
 */

const mockPrisma = {
  questionBank: { findUnique: jest.fn() },
  question: { findMany: jest.fn() },
  quizAttempt: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
};

jest.mock('@/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
}));

import { startQuiz, getAttempt, listUserAttempts } from '@/services/quizService';

beforeEach(() => {
  jest.clearAllMocks();
});

function makeBank(overrides: Record<string, unknown> = {}) {
  return {
    id: 'bank-1',
    title: 'Test Bank',
    status: 'OPEN',
    timeLimit: 30,
    randomQuestions: false,
    randomAnswers: false,
    passingScore: 70,
    feedbackTiming: 'END',
    questionCount: 2,
    maxAttempts: 0,
    questions: [
      { id: 'q1', type: 'TRUE_FALSE', prompt: 'Q1', promptImage: null, options: [{ id: 't', text: 'True' }, { id: 'f', text: 'False' }], order: 0 },
      { id: 'q2', type: 'TRUE_FALSE', prompt: 'Q2', promptImage: null, options: [{ id: 't', text: 'True' }, { id: 'f', text: 'False' }], order: 1 },
    ],
    ...overrides,
  };
}

// ─── startQuiz ───────────────────────────────────────────────────────────────

describe('startQuiz', () => {
  it('throws NotFoundError when bank does not exist', async () => {
    mockPrisma.questionBank.findUnique.mockResolvedValue(null);
    await expect(startQuiz('no-bank', 'user-1')).rejects.toThrow('not found');
  });

  it('rejects DRAFT bank', async () => {
    mockPrisma.questionBank.findUnique.mockResolvedValue(makeBank({ status: 'DRAFT' }));
    await expect(startQuiz('bank-1', 'user-1')).rejects.toThrow('not currently available');
  });

  it('rejects ARCHIVED bank', async () => {
    mockPrisma.questionBank.findUnique.mockResolvedValue(makeBank({ status: 'ARCHIVED' }));
    await expect(startQuiz('bank-1', 'user-1')).rejects.toThrow('not currently available');
  });

  it('rejects bank with no questions', async () => {
    mockPrisma.questionBank.findUnique.mockResolvedValue(makeBank({ questions: [] }));
    await expect(startQuiz('bank-1', 'user-1')).rejects.toThrow('no questions');
  });

  it('creates attempt on valid OPEN bank', async () => {
    const bank = makeBank();
    mockPrisma.questionBank.findUnique.mockResolvedValue(bank);

    const mockAttempt = {
      id: 'attempt-1',
      userId: 'user-1',
      bankId: 'bank-1',
      status: 'IN_PROGRESS',
      questionOrder: ['q1', 'q2'],
      responses: {},
      startedAt: new Date(),
    };

    // Mock the serializable transaction
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        quizAttempt: {
          count: jest.fn().mockResolvedValue(0),
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(mockAttempt),
        },
      };
      return fn(tx);
    });

    const result = await startQuiz('bank-1', 'user-1');

    expect(result.attemptId).toBe('attempt-1');
    expect(result.bankTitle).toBe('Test Bank');
    expect(result.timeLimit).toBe(30);
    expect(result.questions).toHaveLength(2);
    expect(result.feedbackTiming).toBe('END');
  });

  it('creates attempt on PUBLIC bank', async () => {
    const bank = makeBank({ status: 'PUBLIC' });
    mockPrisma.questionBank.findUnique.mockResolvedValue(bank);

    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        quizAttempt: {
          count: jest.fn().mockResolvedValue(0),
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({
            id: 'attempt-2',
            userId: 'user-1',
            bankId: 'bank-1',
            status: 'IN_PROGRESS',
            questionOrder: ['q1', 'q2'],
            responses: {},
            startedAt: new Date(),
          }),
        },
      };
      return fn(tx);
    });

    const result = await startQuiz('bank-1', 'user-1');
    expect(result.attemptId).toBe('attempt-2');
  });

  it('rejects when max attempts reached', async () => {
    const bank = makeBank({ maxAttempts: 2 });
    mockPrisma.questionBank.findUnique.mockResolvedValue(bank);

    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        quizAttempt: {
          count: jest.fn().mockResolvedValue(2), // Already 2 completed
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn(),
        },
      };
      return fn(tx);
    });

    await expect(startQuiz('bank-1', 'user-1')).rejects.toThrow('maximum number of attempts');
  });

  it('strips correct answers and feedback from returned questions', async () => {
    const bank = makeBank({
      questions: [
        {
          id: 'q1',
          type: 'TRUE_FALSE',
          prompt: 'Q1',
          promptImage: null,
          options: [{ id: 't', text: 'True' }],
          correctAnswer: { selectedId: 't' },
          feedback: 'secret feedback',
          order: 0,
        },
      ],
      questionCount: 1,
    });
    mockPrisma.questionBank.findUnique.mockResolvedValue(bank);

    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        quizAttempt: {
          count: jest.fn().mockResolvedValue(0),
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({
            id: 'attempt-3',
            userId: 'user-1',
            bankId: 'bank-1',
            status: 'IN_PROGRESS',
            questionOrder: ['q1'],
            responses: {},
            startedAt: new Date(),
          }),
        },
      };
      return fn(tx);
    });

    const result = await startQuiz('bank-1', 'user-1');
    const q = result.questions[0];

    // Should only have id, type, prompt, promptImage, options
    expect(q.id).toBe('q1');
    expect(q.type).toBe('TRUE_FALSE');
    expect(q.prompt).toBe('Q1');
    expect((q as Record<string, unknown>).correctAnswer).toBeUndefined();
    expect((q as Record<string, unknown>).feedback).toBeUndefined();
  });
});

// ─── getAttempt ──────────────────────────────────────────────────────────────

describe('getAttempt', () => {
  it('throws NotFoundError when attempt does not exist', async () => {
    mockPrisma.quizAttempt.findUnique.mockResolvedValue(null);
    await expect(getAttempt('no-attempt', 'user-1')).rejects.toThrow('not found');
  });

  it('throws NotFoundError when attempt belongs to another user', async () => {
    mockPrisma.quizAttempt.findUnique.mockResolvedValue({
      id: 'attempt-1',
      userId: 'other-user',
      status: 'IN_PROGRESS',
    });
    await expect(getAttempt('attempt-1', 'user-1')).rejects.toThrow('not found');
  });

  it('returns attempt state for owning user', async () => {
    mockPrisma.quizAttempt.findUnique.mockResolvedValue({
      id: 'attempt-1',
      userId: 'user-1',
      bankId: 'bank-1',
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      timeSpent: 120,
      questionOrder: ['q1'],
      responses: { q1: { selectedId: 't' } },
      bank: {
        id: 'bank-1',
        title: 'Test Bank',
        timeLimit: 0,
        feedbackTiming: 'END',
        randomAnswers: false,
      },
    });

    mockPrisma.question.findMany.mockResolvedValue([
      { id: 'q1', type: 'TRUE_FALSE', prompt: 'Is this true?', promptImage: null, options: [{ id: 't', text: 'True' }] },
    ]);

    const result = await getAttempt('attempt-1', 'user-1');

    expect(result.id).toBe('attempt-1');
    expect(result.bankTitle).toBe('Test Bank');
    expect(result.status).toBe('IN_PROGRESS');
    expect(result.questions).toHaveLength(1);
    expect(result.responses).toEqual({ q1: { selectedId: 't' } });
  });
});

// ─── listUserAttempts ────────────────────────────────────────────────────────

describe('listUserAttempts', () => {
  it('returns paginated attempt summaries', async () => {
    mockPrisma.quizAttempt.findMany.mockResolvedValue([
      {
        id: 'a1',
        bankId: 'bank-1',
        status: 'COMPLETED',
        score: 80,
        maxScore: 100,
        percentage: 80,
        passed: true,
        startedAt: new Date(),
        completedAt: new Date(),
        timeSpent: 300,
        bank: { title: 'Test Bank' },
      },
    ]);
    mockPrisma.quizAttempt.count.mockResolvedValue(1);

    const result = await listUserAttempts('user-1');

    expect(result.data).toHaveLength(1);
    expect(result.data[0].bankTitle).toBe('Test Bank');
    expect(result.data[0].passed).toBe(true);
    expect(result.meta.totalCount).toBe(1);
  });

  it('filters by bankId when provided', async () => {
    mockPrisma.quizAttempt.findMany.mockResolvedValue([]);
    mockPrisma.quizAttempt.count.mockResolvedValue(0);

    await listUserAttempts('user-1', 'bank-1');

    const findCall = mockPrisma.quizAttempt.findMany.mock.calls[0][0];
    expect(findCall.where.bankId).toBe('bank-1');
  });
});
