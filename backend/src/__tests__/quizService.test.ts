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
    updateMany: jest.fn(),
    count: jest.fn(),
  },
  $transaction: jest.fn(),
};

jest.mock('@/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
}));

import { startQuiz, getAttempt, saveProgress, submitAttempt, getResults, listUserAttempts } from '@/services/quizService';

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

// ─── saveProgress ─────────────────────────────────────────────────────────────

function makeAttemptForSave(overrides: Record<string, unknown> = {}) {
  return {
    id: 'attempt-1',
    userId: 'user-1',
    bankId: 'bank-1',
    status: 'IN_PROGRESS',
    startedAt: new Date(),
    questionOrder: ['q1', 'q2'],
    responses: {},
    bank: { timeLimit: 0, feedbackTiming: 'END' },
    ...overrides,
  };
}

describe('saveProgress', () => {
  it('throws NotFoundError when attempt does not exist', async () => {
    mockPrisma.quizAttempt.findUnique.mockResolvedValue(null);
    await expect(saveProgress('no-attempt', 'user-1', {}, 0)).rejects.toThrow('not found');
  });

  it('throws NotFoundError when attempt belongs to another user', async () => {
    mockPrisma.quizAttempt.findUnique.mockResolvedValue(makeAttemptForSave({ userId: 'other-user' }));
    await expect(saveProgress('attempt-1', 'user-1', {}, 0)).rejects.toThrow('not found');
  });

  it('rejects save when attempt is not in progress', async () => {
    mockPrisma.quizAttempt.findUnique.mockResolvedValue(makeAttemptForSave({ status: 'COMPLETED' }));
    await expect(saveProgress('attempt-1', 'user-1', {}, 0)).rejects.toThrow('no longer in progress');
  });

  it('merges responses and saves', async () => {
    mockPrisma.quizAttempt.findUnique.mockResolvedValue(
      makeAttemptForSave({ responses: { q1: { selectedId: 't' } } })
    );
    mockPrisma.quizAttempt.update.mockResolvedValue({});

    const result = await saveProgress('attempt-1', 'user-1', { q2: { selectedId: 'f' } }, 60);

    expect(result.savedAt).toBeDefined();
    const updateCall = mockPrisma.quizAttempt.update.mock.calls[0][0];
    expect(updateCall.data.responses).toEqual({ q1: { selectedId: 't' }, q2: { selectedId: 'f' } });
    expect(updateCall.data.timeSpent).toBe(60);
  });

  it('ignores response keys not in questionOrder', async () => {
    mockPrisma.quizAttempt.findUnique.mockResolvedValue(makeAttemptForSave());
    mockPrisma.quizAttempt.update.mockResolvedValue({});

    await saveProgress('attempt-1', 'user-1', { q1: 'a', q999: 'injected' }, 10);

    const updateCall = mockPrisma.quizAttempt.update.mock.calls[0][0];
    expect(updateCall.data.responses).toEqual({ q1: 'a' });
    expect(updateCall.data.responses.q999).toBeUndefined();
  });

  it('clamps negative timeSpent to zero', async () => {
    mockPrisma.quizAttempt.findUnique.mockResolvedValue(makeAttemptForSave());
    mockPrisma.quizAttempt.update.mockResolvedValue({});

    await saveProgress('attempt-1', 'user-1', {}, -100);

    const updateCall = mockPrisma.quizAttempt.update.mock.calls[0][0];
    expect(updateCall.data.timeSpent).toBe(0);
  });

  it('throws when attempt has timed out', async () => {
    const pastStart = new Date(Date.now() - 120 * 60 * 1000); // 2 hours ago
    mockPrisma.quizAttempt.findUnique.mockResolvedValue(
      makeAttemptForSave({
        startedAt: pastStart,
        bank: { timeLimit: 30, feedbackTiming: 'END' }, // 30 minute limit exceeded
      })
    );
    // Mock for autoTimeoutAttempt inner call
    mockPrisma.quizAttempt.findUnique
      .mockResolvedValueOnce(makeAttemptForSave({
        startedAt: pastStart,
        bank: { timeLimit: 30, feedbackTiming: 'END' },
      }))
      .mockResolvedValueOnce({
        ...makeAttemptForSave({ startedAt: pastStart }),
        bank: { passingScore: 70, timeLimit: 30 },
      });
    mockPrisma.question.findMany.mockResolvedValue([]);
    mockPrisma.quizAttempt.updateMany.mockResolvedValue({ count: 1 });

    await expect(saveProgress('attempt-1', 'user-1', {}, 60)).rejects.toThrow('timed out');
  });

  it('provides immediate feedback when feedbackTiming is IMMEDIATE', async () => {
    mockPrisma.quizAttempt.findUnique.mockResolvedValue(
      makeAttemptForSave({ bank: { timeLimit: 0, feedbackTiming: 'IMMEDIATE' } })
    );
    mockPrisma.quizAttempt.update.mockResolvedValue({});
    mockPrisma.question.findMany.mockResolvedValue([
      {
        id: 'q1',
        type: 'TRUE_FALSE',
        options: [{ id: 't', text: 'True' }, { id: 'f', text: 'False' }],
        correctAnswer: { value: true },
        feedback: 'Correct!',
        feedbackImage: null,
      },
    ]);

    const result = await saveProgress('attempt-1', 'user-1', { q1: { value: true } }, 10);

    expect(result.immediateFeedback).toBeDefined();
    expect(result.immediateFeedback).toHaveLength(1);
    expect(result.immediateFeedback![0].questionId).toBe('q1');
    expect(result.immediateFeedback![0].isCorrect).toBe(true);
    expect(result.immediateFeedback![0].feedback).toBe('Correct!');
  });

  it('does not provide feedback for already-answered questions', async () => {
    mockPrisma.quizAttempt.findUnique.mockResolvedValue(
      makeAttemptForSave({
        responses: { q1: { selectedId: 't' } }, // q1 already answered
        bank: { timeLimit: 0, feedbackTiming: 'IMMEDIATE' },
      })
    );
    mockPrisma.quizAttempt.update.mockResolvedValue({});

    // Re-saving q1 should not trigger feedback (not newly answered)
    const result = await saveProgress('attempt-1', 'user-1', { q1: { selectedId: 'f' } }, 20);

    expect(result.immediateFeedback).toBeUndefined();
  });
});

// ─── submitAttempt ────────────────────────────────────────────────────────────

function makeAttemptForSubmit(overrides: Record<string, unknown> = {}) {
  return {
    id: 'attempt-1',
    userId: 'user-1',
    bankId: 'bank-1',
    status: 'IN_PROGRESS',
    startedAt: new Date(),
    questionOrder: ['q1'],
    responses: { q1: { value: true } },
    bank: { id: 'bank-1', title: 'Test Bank', passingScore: 70, feedbackTiming: 'END', timeLimit: 0 },
    ...overrides,
  };
}

describe('submitAttempt', () => {
  it('throws NotFoundError when attempt does not exist', async () => {
    mockPrisma.quizAttempt.findUnique.mockResolvedValue(null);
    await expect(submitAttempt('no-attempt', 'user-1')).rejects.toThrow('not found');
  });

  it('throws NotFoundError when attempt belongs to another user', async () => {
    mockPrisma.quizAttempt.findUnique.mockResolvedValue(makeAttemptForSubmit({ userId: 'other-user' }));
    await expect(submitAttempt('attempt-1', 'user-1')).rejects.toThrow('not found');
  });

  it('rejects submission of completed attempt', async () => {
    mockPrisma.quizAttempt.findUnique.mockResolvedValue(makeAttemptForSubmit({ status: 'COMPLETED' }));
    await expect(submitAttempt('attempt-1', 'user-1')).rejects.toThrow('no longer in progress');
  });

  it('scores and completes attempt on submission', async () => {
    mockPrisma.quizAttempt.findUnique.mockResolvedValue(makeAttemptForSubmit());
    mockPrisma.question.findMany.mockResolvedValue([
      {
        id: 'q1',
        type: 'TRUE_FALSE',
        prompt: 'Is this true?',
        promptImage: null,
        options: [{ id: 't', text: 'True' }, { id: 'f', text: 'False' }],
        correctAnswer: { value: true },
        feedback: 'Correct!',
        feedbackImage: null,
        referenceLink: null,
      },
    ]);
    mockPrisma.quizAttempt.updateMany.mockResolvedValue({ count: 1 });

    const result = await submitAttempt('attempt-1', 'user-1');

    expect(result.status).toBe('COMPLETED');
    expect(result.score).toBe(1);
    expect(result.maxScore).toBe(1);
    expect(result.percentage).toBe(100);
    expect(result.passed).toBe(true);
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].isCorrect).toBe(true);
  });

  it('calculates failing score correctly', async () => {
    mockPrisma.quizAttempt.findUnique.mockResolvedValue(
      makeAttemptForSubmit({ responses: { q1: { value: false } } }) // wrong answer
    );
    mockPrisma.question.findMany.mockResolvedValue([
      {
        id: 'q1',
        type: 'TRUE_FALSE',
        prompt: 'Q1',
        promptImage: null,
        options: [{ id: 't', text: 'True' }, { id: 'f', text: 'False' }],
        correctAnswer: { value: true },
        feedback: 'Wrong!',
        feedbackImage: null,
        referenceLink: null,
      },
    ]);
    mockPrisma.quizAttempt.updateMany.mockResolvedValue({ count: 1 });

    const result = await submitAttempt('attempt-1', 'user-1');

    expect(result.score).toBe(0);
    expect(result.percentage).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.questions[0].isCorrect).toBe(false);
  });

  it('omits question details when feedbackTiming is NONE', async () => {
    mockPrisma.quizAttempt.findUnique.mockResolvedValue(
      makeAttemptForSubmit({
        bank: { id: 'bank-1', title: 'Test Bank', passingScore: 70, feedbackTiming: 'NONE', timeLimit: 0 },
      })
    );
    mockPrisma.question.findMany.mockResolvedValue([
      {
        id: 'q1',
        type: 'TRUE_FALSE',
        prompt: 'Q1',
        promptImage: null,
        options: [{ id: 't', text: 'True' }, { id: 'f', text: 'False' }],
        correctAnswer: { value: true },
        feedback: 'feedback',
        feedbackImage: null,
        referenceLink: null,
      },
    ]);
    mockPrisma.quizAttempt.updateMany.mockResolvedValue({ count: 1 });

    const result = await submitAttempt('attempt-1', 'user-1');

    expect(result.questions).toHaveLength(0);
  });

  it('updates attempt with score and completion timestamp', async () => {
    mockPrisma.quizAttempt.findUnique.mockResolvedValue(makeAttemptForSubmit());
    mockPrisma.question.findMany.mockResolvedValue([
      {
        id: 'q1',
        type: 'TRUE_FALSE',
        prompt: 'Q1',
        promptImage: null,
        options: [{ id: 't', text: 'True' }, { id: 'f', text: 'False' }],
        correctAnswer: { value: true },
        feedback: '',
        feedbackImage: null,
        referenceLink: null,
      },
    ]);
    mockPrisma.quizAttempt.updateMany.mockResolvedValue({ count: 1 });

    await submitAttempt('attempt-1', 'user-1');

    const updateCall = mockPrisma.quizAttempt.updateMany.mock.calls[0][0];
    expect(updateCall.data.status).toBe('COMPLETED');
    expect(updateCall.data.completedAt).toBeInstanceOf(Date);
    expect(typeof updateCall.data.score).toBe('number');
    expect(typeof updateCall.data.percentage).toBe('number');
  });

  it('unanswered questions score zero', async () => {
    mockPrisma.quizAttempt.findUnique.mockResolvedValue(
      makeAttemptForSubmit({
        questionOrder: ['q1', 'q2'],
        responses: { q1: { value: true } }, // q2 unanswered
      })
    );
    mockPrisma.question.findMany.mockResolvedValue([
      {
        id: 'q1', type: 'TRUE_FALSE', prompt: 'Q1', promptImage: null,
        options: [{ id: 't', text: 'True' }, { id: 'f', text: 'False' }],
        correctAnswer: { value: true }, feedback: '', feedbackImage: null, referenceLink: null,
      },
      {
        id: 'q2', type: 'TRUE_FALSE', prompt: 'Q2', promptImage: null,
        options: [{ id: 't', text: 'True' }, { id: 'f', text: 'False' }],
        correctAnswer: { value: true }, feedback: '', feedbackImage: null, referenceLink: null,
      },
    ]);
    mockPrisma.quizAttempt.updateMany.mockResolvedValue({ count: 1 });

    const result = await submitAttempt('attempt-1', 'user-1');

    expect(result.score).toBe(1); // 1 correct out of 2
    expect(result.maxScore).toBe(2);
    expect(result.percentage).toBe(50);
  });
});

// ─── getResults ───────────────────────────────────────────────────────────────

describe('getResults', () => {
  it('throws NotFoundError when attempt does not exist', async () => {
    mockPrisma.quizAttempt.findUnique.mockResolvedValue(null);
    await expect(getResults('no-attempt', 'user-1')).rejects.toThrow('not found');
  });

  it('throws NotFoundError when attempt belongs to another user', async () => {
    mockPrisma.quizAttempt.findUnique.mockResolvedValue({
      id: 'a1',
      userId: 'other-user',
      status: 'COMPLETED',
    });
    await expect(getResults('a1', 'user-1')).rejects.toThrow('not found');
  });

  it('rejects if attempt is still in progress', async () => {
    mockPrisma.quizAttempt.findUnique.mockResolvedValue({
      id: 'a1',
      userId: 'user-1',
      status: 'IN_PROGRESS',
      bank: { id: 'bank-1', title: 'Test', feedbackTiming: 'END', passingScore: 70 },
    });
    await expect(getResults('a1', 'user-1')).rejects.toThrow('not been completed');
  });

  it('returns full results with question details for END feedback', async () => {
    mockPrisma.quizAttempt.findUnique.mockResolvedValue({
      id: 'a1',
      userId: 'user-1',
      bankId: 'bank-1',
      status: 'COMPLETED',
      score: 1,
      maxScore: 1,
      percentage: 100,
      passed: true,
      timeSpent: 120,
      startedAt: new Date(),
      completedAt: new Date(),
      questionOrder: ['q1'],
      responses: { q1: { value: true } },
      bank: { id: 'bank-1', title: 'Test Bank', feedbackTiming: 'END', passingScore: 70 },
    });
    mockPrisma.question.findMany.mockResolvedValue([
      {
        id: 'q1', type: 'TRUE_FALSE', prompt: 'Q1', promptImage: null,
        options: [{ id: 't', text: 'True' }, { id: 'f', text: 'False' }],
        correctAnswer: { value: true }, feedback: 'Great!', feedbackImage: null, referenceLink: 'https://example.com',
      },
    ]);

    const result = await getResults('a1', 'user-1');

    expect(result.bankTitle).toBe('Test Bank');
    expect(result.passed).toBe(true);
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].feedback).toBe('Great!');
    expect(result.questions[0].correctAnswer).toEqual({ value: true });
  });

  it('returns empty question details for NONE feedback', async () => {
    mockPrisma.quizAttempt.findUnique.mockResolvedValue({
      id: 'a1',
      userId: 'user-1',
      bankId: 'bank-1',
      status: 'COMPLETED',
      score: 0,
      maxScore: 1,
      percentage: 0,
      passed: false,
      timeSpent: 60,
      startedAt: new Date(),
      completedAt: new Date(),
      questionOrder: ['q1'],
      responses: {},
      bank: { id: 'bank-1', title: 'Test Bank', feedbackTiming: 'NONE', passingScore: 70 },
    });

    const result = await getResults('a1', 'user-1');

    expect(result.questions).toHaveLength(0);
    // question.findMany should not have been called
    expect(mockPrisma.question.findMany).not.toHaveBeenCalled();
  });

  it('accepts TIMED_OUT status as completed', async () => {
    mockPrisma.quizAttempt.findUnique.mockResolvedValue({
      id: 'a1',
      userId: 'user-1',
      bankId: 'bank-1',
      status: 'TIMED_OUT',
      score: 0,
      maxScore: 1,
      percentage: 0,
      passed: false,
      timeSpent: 1800,
      startedAt: new Date(),
      completedAt: new Date(),
      questionOrder: ['q1'],
      responses: {},
      bank: { id: 'bank-1', title: 'Test', feedbackTiming: 'END', passingScore: 70 },
    });
    mockPrisma.question.findMany.mockResolvedValue([
      {
        id: 'q1', type: 'TRUE_FALSE', prompt: 'Q1', promptImage: null,
        options: [{ id: 't', text: 'True' }], correctAnswer: { value: true },
        feedback: '', feedbackImage: null, referenceLink: null,
      },
    ]);

    const result = await getResults('a1', 'user-1');

    expect(result.status).toBe('TIMED_OUT');
    expect(result.questions).toHaveLength(1);
  });
});
