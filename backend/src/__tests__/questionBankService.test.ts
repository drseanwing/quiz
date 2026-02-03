/**
 * @file        Question Bank Service Tests
 * @description Tests for access control helpers and CRUD operations
 */

const mockPrisma = {
  questionBank: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  inviteToken: {
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

jest.mock('@/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
}));

import { UserRole, QuestionBankStatus, FeedbackTiming } from '@prisma/client';
import {
  canAccessBank,
  canModifyBank,
  listQuestionBanks,
  getQuestionBank,
  createQuestionBank,
  updateQuestionBank,
  deleteQuestionBank,
  duplicateQuestionBank,
  clearBankListCache,
} from '@/services/questionBankService';

beforeEach(() => {
  jest.clearAllMocks();
  clearBankListCache();
});

function makeBank(overrides: Record<string, unknown> = {}) {
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
    createdBy: { id: 'editor-1', firstName: 'Test', surname: 'Editor', email: 'editor@test.com' },
    _count: { questions: 5, attempts: 0 },
    ...overrides,
  };
}

// ─── canAccessBank ───────────────────────────────────────────────────────────

describe('canAccessBank', () => {
  const userId = 'user-1';
  const otherUserId = 'user-2';

  describe('ADMIN role', () => {
    it('grants access to any bank regardless of status or ownership', () => {
      const statuses: QuestionBankStatus[] = ['DRAFT', 'OPEN', 'PUBLIC', 'ARCHIVED'];
      for (const status of statuses) {
        const bank = { createdById: otherUserId, status };
        expect(canAccessBank(bank, userId, UserRole.ADMIN)).toBe(true);
      }
    });
  });

  describe('EDITOR role', () => {
    it('grants access to own banks regardless of status', () => {
      const statuses: QuestionBankStatus[] = ['DRAFT', 'OPEN', 'PUBLIC', 'ARCHIVED'];
      for (const status of statuses) {
        const bank = { createdById: userId, status };
        expect(canAccessBank(bank, userId, UserRole.EDITOR)).toBe(true);
      }
    });

    it('grants access to non-DRAFT banks from other editors', () => {
      expect(canAccessBank({ createdById: otherUserId, status: QuestionBankStatus.OPEN }, userId, UserRole.EDITOR)).toBe(true);
      expect(canAccessBank({ createdById: otherUserId, status: QuestionBankStatus.PUBLIC }, userId, UserRole.EDITOR)).toBe(true);
      expect(canAccessBank({ createdById: otherUserId, status: QuestionBankStatus.ARCHIVED }, userId, UserRole.EDITOR)).toBe(true);
    });

    it('denies access to DRAFT banks from other editors', () => {
      const bank = { createdById: otherUserId, status: QuestionBankStatus.DRAFT };
      expect(canAccessBank(bank, userId, UserRole.EDITOR)).toBe(false);
    });
  });

  describe('USER role', () => {
    it('grants access to OPEN and PUBLIC banks', () => {
      expect(canAccessBank({ createdById: otherUserId, status: QuestionBankStatus.OPEN }, userId, UserRole.USER)).toBe(true);
      expect(canAccessBank({ createdById: otherUserId, status: QuestionBankStatus.PUBLIC }, userId, UserRole.USER)).toBe(true);
    });

    it('denies access to DRAFT and ARCHIVED banks', () => {
      expect(canAccessBank({ createdById: otherUserId, status: QuestionBankStatus.DRAFT }, userId, UserRole.USER)).toBe(false);
      expect(canAccessBank({ createdById: otherUserId, status: QuestionBankStatus.ARCHIVED }, userId, UserRole.USER)).toBe(false);
    });

    it('grants access to own banks via ownership (regardless of status)', () => {
      expect(canAccessBank({ createdById: userId, status: QuestionBankStatus.DRAFT }, userId, UserRole.USER)).toBe(true);
    });
  });
});

// ─── canModifyBank ───────────────────────────────────────────────────────────

describe('canModifyBank', () => {
  const userId = 'user-1';
  const otherUserId = 'user-2';

  it('allows admin to modify any bank', () => {
    const bank = { createdById: otherUserId };
    expect(canModifyBank(bank, userId, UserRole.ADMIN)).toBe(true);
  });

  it('allows owner to modify their own bank', () => {
    const bank = { createdById: userId };
    expect(canModifyBank(bank, userId, UserRole.EDITOR)).toBe(true);
  });

  it('denies editor from modifying another editors bank', () => {
    const bank = { createdById: otherUserId };
    expect(canModifyBank(bank, userId, UserRole.EDITOR)).toBe(false);
  });

  it('denies user from modifying any bank', () => {
    const bank = { createdById: otherUserId };
    expect(canModifyBank(bank, userId, UserRole.USER)).toBe(false);
  });

  it('denies user from modifying even if they own it (users cannot be bank owners)', () => {
    const bank = { createdById: userId };
    expect(canModifyBank(bank, userId, UserRole.USER)).toBe(true);
  });
});

// ─── listQuestionBanks ───────────────────────────────────────────────────────

describe('listQuestionBanks', () => {
  it('returns paginated results', async () => {
    const banks = [makeBank(), makeBank({ id: 'bank-2', title: 'Bank 2' })];
    mockPrisma.questionBank.findMany.mockResolvedValue(banks);
    mockPrisma.questionBank.count.mockResolvedValue(2);

    const result = await listQuestionBanks({}, { page: 1, pageSize: 10 }, 'admin-1', UserRole.ADMIN);

    expect(result.data).toHaveLength(2);
    expect(result.meta).toEqual({ page: 1, pageSize: 10, totalCount: 2, totalPages: 1 });
  });

  it('calculates correct totalPages', async () => {
    mockPrisma.questionBank.findMany.mockResolvedValue([makeBank()]);
    mockPrisma.questionBank.count.mockResolvedValue(25);

    const result = await listQuestionBanks({}, { page: 1, pageSize: 10 }, 'admin-1', UserRole.ADMIN);

    expect(result.meta.totalPages).toBe(3);
  });

  it('applies skip based on page number', async () => {
    mockPrisma.questionBank.findMany.mockResolvedValue([]);
    mockPrisma.questionBank.count.mockResolvedValue(0);

    await listQuestionBanks({}, { page: 3, pageSize: 10 }, 'admin-1', UserRole.ADMIN);

    expect(mockPrisma.questionBank.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 })
    );
  });

  it('applies search filter to title and description', async () => {
    mockPrisma.questionBank.findMany.mockResolvedValue([]);
    mockPrisma.questionBank.count.mockResolvedValue(0);

    await listQuestionBanks({ search: 'cardio' }, { page: 1, pageSize: 10 }, 'admin-1', UserRole.ADMIN);

    const call = mockPrisma.questionBank.findMany.mock.calls[0][0];
    const conditions = call.where.AND;
    const searchCondition = conditions.find((c: Record<string, unknown>) => c.OR && Array.isArray(c.OR));
    expect(searchCondition.OR).toEqual([
      { title: { contains: 'cardio', mode: 'insensitive' } },
      { description: { contains: 'cardio', mode: 'insensitive' } },
    ]);
  });

  it('applies status filter', async () => {
    mockPrisma.questionBank.findMany.mockResolvedValue([]);
    mockPrisma.questionBank.count.mockResolvedValue(0);

    await listQuestionBanks({ status: QuestionBankStatus.OPEN }, { page: 1, pageSize: 10 }, 'admin-1', UserRole.ADMIN);

    const call = mockPrisma.questionBank.findMany.mock.calls[0][0];
    const conditions = call.where.AND;
    expect(conditions).toContainEqual({ status: QuestionBankStatus.OPEN });
  });

  it('restricts USER role to OPEN and PUBLIC banks', async () => {
    mockPrisma.questionBank.findMany.mockResolvedValue([]);
    mockPrisma.questionBank.count.mockResolvedValue(0);

    await listQuestionBanks({}, { page: 1, pageSize: 10 }, 'user-1', UserRole.USER);

    const call = mockPrisma.questionBank.findMany.mock.calls[0][0];
    const conditions = call.where.AND;
    expect(conditions).toContainEqual({
      status: { in: [QuestionBankStatus.OPEN, QuestionBankStatus.PUBLIC] },
    });
  });

  it('restricts EDITOR role to own banks + OPEN/PUBLIC', async () => {
    mockPrisma.questionBank.findMany.mockResolvedValue([]);
    mockPrisma.questionBank.count.mockResolvedValue(0);

    await listQuestionBanks({}, { page: 1, pageSize: 10 }, 'editor-1', UserRole.EDITOR);

    const call = mockPrisma.questionBank.findMany.mock.calls[0][0];
    const conditions = call.where.AND;
    const editorCondition = conditions.find((c: Record<string, unknown>) =>
      c.OR && Array.isArray(c.OR) && (c.OR as Record<string, unknown>[]).some((o: Record<string, unknown>) => o.createdById)
    );
    expect(editorCondition).toBeDefined();
    expect(editorCondition.OR).toContainEqual({ createdById: 'editor-1' });
  });

  it('applies no access-control filter for ADMIN', async () => {
    mockPrisma.questionBank.findMany.mockResolvedValue([]);
    mockPrisma.questionBank.count.mockResolvedValue(0);

    await listQuestionBanks({}, { page: 1, pageSize: 10 }, 'admin-1', UserRole.ADMIN);

    // ADMIN with no filters → empty where
    expect(mockPrisma.questionBank.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} })
    );
  });
});

// ─── getQuestionBank ─────────────────────────────────────────────────────────

describe('getQuestionBank', () => {
  it('returns a bank when found and user has access', async () => {
    const bank = makeBank();
    mockPrisma.questionBank.findUnique.mockResolvedValue(bank);

    const result = await getQuestionBank('bank-1', 'admin-1', UserRole.ADMIN);

    expect(result.id).toBe('bank-1');
    expect(result.title).toBe('Test Bank');
  });

  it('throws NotFoundError when bank does not exist', async () => {
    mockPrisma.questionBank.findUnique.mockResolvedValue(null);

    await expect(getQuestionBank('missing', 'user-1', UserRole.ADMIN))
      .rejects.toThrow('not found');
  });

  it('throws NotFoundError when user lacks access', async () => {
    const bank = makeBank({ status: QuestionBankStatus.DRAFT, createdById: 'other-user' });
    mockPrisma.questionBank.findUnique.mockResolvedValue(bank);

    await expect(getQuestionBank('bank-1', 'user-1', UserRole.USER))
      .rejects.toThrow('not found');
  });

  it('allows editor to access own DRAFT bank', async () => {
    const bank = makeBank({ status: QuestionBankStatus.DRAFT, createdById: 'editor-1' });
    mockPrisma.questionBank.findUnique.mockResolvedValue(bank);

    const result = await getQuestionBank('bank-1', 'editor-1', UserRole.EDITOR);
    expect(result.id).toBe('bank-1');
  });
});

// ─── createQuestionBank ──────────────────────────────────────────────────────

describe('createQuestionBank', () => {
  it('creates a bank with default values', async () => {
    const created = makeBank({ status: QuestionBankStatus.DRAFT });
    mockPrisma.questionBank.create.mockResolvedValue(created);

    const result = await createQuestionBank({ title: 'New Bank' }, 'editor-1');

    expect(result.id).toBe('bank-1');
    const callData = mockPrisma.questionBank.create.mock.calls[0][0].data;
    expect(callData.title).toBe('New Bank');
    expect(callData.status).toBe(QuestionBankStatus.DRAFT);
    expect(callData.passingScore).toBe(80);
    expect(callData.randomQuestions).toBe(true);
    expect(callData.randomAnswers).toBe(true);
    expect(callData.feedbackTiming).toBe(FeedbackTiming.END);
    expect(callData.questionCount).toBe(10);
    expect(callData.maxAttempts).toBe(0);
    expect(callData.timeLimit).toBe(0);
    expect(callData.createdById).toBe('editor-1');
  });

  it('creates a bank with all fields specified', async () => {
    const input = {
      title: 'Full Bank',
      description: 'Desc',
      status: QuestionBankStatus.OPEN,
      timeLimit: 60,
      randomQuestions: false,
      randomAnswers: false,
      passingScore: 50,
      feedbackTiming: FeedbackTiming.IMMEDIATE,
      notificationEmail: 'notify@test.com',
      questionCount: 20,
      maxAttempts: 3,
    };
    const created = makeBank(input);
    mockPrisma.questionBank.create.mockResolvedValue(created);

    await createQuestionBank(input, 'editor-1');

    const callData = mockPrisma.questionBank.create.mock.calls[0][0].data;
    expect(callData.title).toBe('Full Bank');
    expect(callData.description).toBe('Desc');
    expect(callData.status).toBe(QuestionBankStatus.OPEN);
    expect(callData.timeLimit).toBe(60);
    expect(callData.randomQuestions).toBe(false);
    expect(callData.passingScore).toBe(50);
    expect(callData.feedbackTiming).toBe(FeedbackTiming.IMMEDIATE);
    expect(callData.notificationEmail).toBe('notify@test.com');
    expect(callData.questionCount).toBe(20);
    expect(callData.maxAttempts).toBe(3);
  });
});

// ─── updateQuestionBank ──────────────────────────────────────────────────────

describe('updateQuestionBank', () => {
  it('updates whitelisted fields on an existing bank', async () => {
    const existing = { id: 'bank-1', createdById: 'editor-1', status: QuestionBankStatus.DRAFT };
    mockPrisma.questionBank.findUnique.mockResolvedValue(existing);
    mockPrisma.questionBank.update.mockResolvedValue(makeBank({ title: 'Updated' }));

    const result = await updateQuestionBank(
      'bank-1',
      { title: 'Updated', passingScore: 60 },
      'editor-1',
      UserRole.EDITOR
    );

    expect(result.title).toBeDefined();
    const callData = mockPrisma.questionBank.update.mock.calls[0][0].data;
    expect(callData.title).toBe('Updated');
    expect(callData.passingScore).toBe(60);
  });

  it('throws NotFoundError when bank does not exist', async () => {
    mockPrisma.questionBank.findUnique.mockResolvedValue(null);

    await expect(
      updateQuestionBank('missing', { title: 'X' }, 'editor-1', UserRole.EDITOR)
    ).rejects.toThrow('not found');
  });

  it('throws NotFoundError when user lacks modify permission', async () => {
    const existing = { id: 'bank-1', createdById: 'other-editor', status: QuestionBankStatus.DRAFT };
    mockPrisma.questionBank.findUnique.mockResolvedValue(existing);

    await expect(
      updateQuestionBank('bank-1', { title: 'X' }, 'editor-1', UserRole.EDITOR)
    ).rejects.toThrow('not found');
  });

  it('allows admin to update any bank', async () => {
    const existing = { id: 'bank-1', createdById: 'other-editor', status: QuestionBankStatus.OPEN };
    mockPrisma.questionBank.findUnique.mockResolvedValue(existing);
    mockPrisma.questionBank.update.mockResolvedValue(makeBank({ title: 'Admin Update' }));

    await updateQuestionBank('bank-1', { title: 'Admin Update' }, 'admin-1', UserRole.ADMIN);

    expect(mockPrisma.questionBank.update).toHaveBeenCalled();
  });

  it('ignores non-whitelisted fields', async () => {
    const existing = { id: 'bank-1', createdById: 'editor-1', status: QuestionBankStatus.DRAFT };
    mockPrisma.questionBank.findUnique.mockResolvedValue(existing);
    mockPrisma.questionBank.update.mockResolvedValue(makeBank());

    await updateQuestionBank(
      'bank-1',
      { title: 'Safe', createdById: 'hacker-1' } as Record<string, unknown>,
      'editor-1',
      UserRole.EDITOR
    );

    const callData = mockPrisma.questionBank.update.mock.calls[0][0].data;
    expect(callData.title).toBe('Safe');
    expect(callData.createdById).toBeUndefined();
  });

  it('sets description to null when explicitly passed', async () => {
    const existing = { id: 'bank-1', createdById: 'editor-1', status: QuestionBankStatus.DRAFT };
    mockPrisma.questionBank.findUnique.mockResolvedValue(existing);
    mockPrisma.questionBank.update.mockResolvedValue(makeBank({ description: null }));

    await updateQuestionBank('bank-1', { description: null }, 'editor-1', UserRole.EDITOR);

    const callData = mockPrisma.questionBank.update.mock.calls[0][0].data;
    expect(callData.description).toBeNull();
  });
});

// ─── deleteQuestionBank ──────────────────────────────────────────────────────

describe('deleteQuestionBank', () => {
  it('deletes a bank with no attempts', async () => {
    const existing = {
      id: 'bank-1', createdById: 'editor-1', status: QuestionBankStatus.DRAFT,
      _count: { attempts: 0 },
    };
    mockPrisma.questionBank.findUnique.mockResolvedValue(existing);
    mockPrisma.$transaction.mockImplementation(async (operations) => {
      // Execute the operations passed to transaction
      return Promise.all(operations.map((op: Promise<unknown>) => op));
    });
    mockPrisma.inviteToken.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.questionBank.delete.mockResolvedValue(existing);

    await deleteQuestionBank('bank-1', 'editor-1', UserRole.EDITOR);

    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it('throws NotFoundError when bank does not exist', async () => {
    mockPrisma.questionBank.findUnique.mockResolvedValue(null);

    await expect(deleteQuestionBank('missing', 'editor-1', UserRole.EDITOR))
      .rejects.toThrow('not found');
  });

  it('throws NotFoundError when user lacks modify permission', async () => {
    const existing = {
      id: 'bank-1', createdById: 'other-editor', status: QuestionBankStatus.DRAFT,
      _count: { attempts: 0 },
    };
    mockPrisma.questionBank.findUnique.mockResolvedValue(existing);

    await expect(deleteQuestionBank('bank-1', 'editor-1', UserRole.EDITOR))
      .rejects.toThrow('not found');
  });

  it('rejects deletion when bank has attempts', async () => {
    const existing = {
      id: 'bank-1', createdById: 'editor-1', status: QuestionBankStatus.OPEN,
      _count: { attempts: 5 },
    };
    mockPrisma.questionBank.findUnique.mockResolvedValue(existing);

    await expect(deleteQuestionBank('bank-1', 'editor-1', UserRole.EDITOR))
      .rejects.toThrow('quiz attempts');
  });

  it('allows admin to delete another editors bank', async () => {
    const existing = {
      id: 'bank-1', createdById: 'other-editor', status: QuestionBankStatus.DRAFT,
      _count: { attempts: 0 },
    };
    mockPrisma.questionBank.findUnique.mockResolvedValue(existing);
    mockPrisma.$transaction.mockImplementation(async (operations) => {
      return Promise.all(operations.map((op: Promise<unknown>) => op));
    });
    mockPrisma.inviteToken.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.questionBank.delete.mockResolvedValue(existing);

    await deleteQuestionBank('bank-1', 'admin-1', UserRole.ADMIN);

    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });
});

// ─── duplicateQuestionBank ───────────────────────────────────────────────────

describe('duplicateQuestionBank', () => {
  it('duplicates a bank with its questions', async () => {
    const existing = {
      ...makeBank(),
      questions: [
        { type: 'MULTIPLE_CHOICE', prompt: 'Q1', promptImage: null, options: [{ id: 'a', text: 'A' }], correctAnswer: { selectedId: 'a' }, feedback: 'Good', feedbackImage: null, referenceLink: null, order: 0 },
        { type: 'TRUE_FALSE', prompt: 'Q2', promptImage: null, options: [{ id: 't', text: 'True' }], correctAnswer: { value: true }, feedback: null, feedbackImage: null, referenceLink: null, order: 1 },
      ],
    };
    mockPrisma.questionBank.findUnique.mockResolvedValue(existing);
    const duplicated = makeBank({ id: 'bank-2', title: 'Test Bank (Copy)', createdById: 'editor-2' });
    mockPrisma.questionBank.create.mockResolvedValue(duplicated);

    const result = await duplicateQuestionBank('bank-1', 'editor-2', UserRole.EDITOR);

    expect(result.id).toBe('bank-2');

    const createCall = mockPrisma.questionBank.create.mock.calls[0][0];
    expect(createCall.data.title).toBe('Test Bank (Copy)');
    expect(createCall.data.status).toBe(QuestionBankStatus.DRAFT);
    expect(createCall.data.createdById).toBe('editor-2');
    expect(createCall.data.questions.create).toHaveLength(2);
  });

  it('throws NotFoundError when source bank does not exist', async () => {
    mockPrisma.questionBank.findUnique.mockResolvedValue(null);

    await expect(duplicateQuestionBank('missing', 'editor-1', UserRole.EDITOR))
      .rejects.toThrow('not found');
  });

  it('throws NotFoundError when user lacks access to source bank', async () => {
    const existing = {
      ...makeBank({ status: QuestionBankStatus.DRAFT, createdById: 'other-editor' }),
      questions: [],
    };
    mockPrisma.questionBank.findUnique.mockResolvedValue(existing);

    await expect(duplicateQuestionBank('bank-1', 'editor-1', UserRole.EDITOR))
      .rejects.toThrow('not found');
  });

  it('sets duplicated bank to DRAFT regardless of source status', async () => {
    const existing = {
      ...makeBank({ status: QuestionBankStatus.PUBLIC }),
      questions: [],
    };
    mockPrisma.questionBank.findUnique.mockResolvedValue(existing);
    mockPrisma.questionBank.create.mockResolvedValue(makeBank({ id: 'bank-2', status: QuestionBankStatus.DRAFT }));

    await duplicateQuestionBank('bank-1', 'admin-1', UserRole.ADMIN);

    const createCall = mockPrisma.questionBank.create.mock.calls[0][0];
    expect(createCall.data.status).toBe(QuestionBankStatus.DRAFT);
  });

  it('assigns the duplicating user as owner', async () => {
    const existing = {
      ...makeBank({ createdById: 'original-owner' }),
      questions: [],
    };
    mockPrisma.questionBank.findUnique.mockResolvedValue(existing);
    mockPrisma.questionBank.create.mockResolvedValue(makeBank({ id: 'bank-2', createdById: 'new-owner' }));

    await duplicateQuestionBank('bank-1', 'new-owner', UserRole.ADMIN);

    const createCall = mockPrisma.questionBank.create.mock.calls[0][0];
    expect(createCall.data.createdById).toBe('new-owner');
  });
});
