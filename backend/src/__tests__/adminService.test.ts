/**
 * @file        Admin Service Tests
 * @description Tests for completions, logs, stats, and invite token operations
 */

import { AttemptStatus } from '@prisma/client';

// Mock Prisma client
const mockPrisma = {
  quizAttempt: {
    findMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },
  auditLog: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  user: {
    count: jest.fn(),
  },
  questionBank: {
    count: jest.fn(),
    findUnique: jest.fn(),
  },
  inviteToken: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

jest.mock('@/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
}));

jest.mock('@/config/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import {
  listCompletions,
  exportCompletionsCSV,
  listLogs,
  getPlatformStats,
  createInviteToken,
  listInviteTokens,
  clearStatsCache,
} from '@/services/adminService';
import { NotFoundError } from '@/middleware/errorHandler';

beforeEach(() => {
  jest.clearAllMocks();
  clearStatsCache();
});

// ─── listCompletions ─────────────────────────────────────────────────────────

describe('listCompletions', () => {
  const sampleAttempt = {
    id: 'a1',
    user: { firstName: 'Alice', surname: 'Smith', email: 'alice@test.com' },
    bank: { title: 'Quiz 1' },
    score: 8,
    maxScore: 10,
    percentage: 80,
    passed: true,
    status: AttemptStatus.COMPLETED,
    completedAt: new Date('2026-01-15'),
    timeSpent: 120,
  };

  beforeEach(() => {
    mockPrisma.quizAttempt.findMany.mockResolvedValue([sampleAttempt]);
    mockPrisma.quizAttempt.count.mockResolvedValue(1);
  });

  it('returns paginated completion data', async () => {
    const result = await listCompletions({}, { page: 1, pageSize: 20 });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].userName).toBe('Alice Smith');
    expect(result.data[0].bankTitle).toBe('Quiz 1');
    expect(result.meta.totalCount).toBe(1);
    expect(result.meta.totalPages).toBe(1);
  });

  it('only queries completed and timed-out attempts', async () => {
    await listCompletions({}, { page: 1, pageSize: 20 });

    const whereArg = mockPrisma.quizAttempt.findMany.mock.calls[0][0].where;
    expect(whereArg.status.in).toEqual([AttemptStatus.COMPLETED, AttemptStatus.TIMED_OUT]);
  });

  it('applies bankId filter', async () => {
    await listCompletions({ bankId: 'bank-1' }, { page: 1, pageSize: 20 });

    const whereArg = mockPrisma.quizAttempt.findMany.mock.calls[0][0].where;
    expect(whereArg.bankId).toBe('bank-1');
  });

  it('applies userId filter', async () => {
    await listCompletions({ userId: 'user-1' }, { page: 1, pageSize: 20 });

    const whereArg = mockPrisma.quizAttempt.findMany.mock.calls[0][0].where;
    expect(whereArg.userId).toBe('user-1');
  });

  it('applies passed filter', async () => {
    await listCompletions({ passed: true }, { page: 1, pageSize: 20 });

    const whereArg = mockPrisma.quizAttempt.findMany.mock.calls[0][0].where;
    expect(whereArg.passed).toBe(true);
  });

  it('applies date range filter', async () => {
    await listCompletions(
      { dateFrom: '2026-01-01', dateTo: '2026-01-31' },
      { page: 1, pageSize: 20 }
    );

    const whereArg = mockPrisma.quizAttempt.findMany.mock.calls[0][0].where;
    expect(whereArg.completedAt.gte).toEqual(new Date('2026-01-01'));
    expect(whereArg.completedAt.lte).toEqual(new Date('2026-01-31'));
  });

  it('calculates pagination skip correctly', async () => {
    await listCompletions({}, { page: 3, pageSize: 10 });

    const callArgs = mockPrisma.quizAttempt.findMany.mock.calls[0][0];
    expect(callArgs.skip).toBe(20);
    expect(callArgs.take).toBe(10);
  });
});

// ─── exportCompletionsCSV ────────────────────────────────────────────────────

describe('exportCompletionsCSV', () => {
  it('generates CSV with header and data rows', async () => {
    mockPrisma.quizAttempt.findMany.mockResolvedValue([
      {
        id: 'a1',
        user: { firstName: 'Bob', surname: 'Jones', email: 'bob@test.com' },
        bank: { title: 'Safety Quiz' },
        score: 9,
        maxScore: 10,
        percentage: 90,
        passed: true,
        status: AttemptStatus.COMPLETED,
        completedAt: new Date('2026-01-15T10:00:00Z'),
        timeSpent: 300,
      },
    ]);
    mockPrisma.quizAttempt.count.mockResolvedValue(1);

    const csv = await exportCompletionsCSV({});

    expect(csv).toContain('Name,Email,Quiz,Score,Max Score,Percentage,Passed,Status,Completed At,Time (s)');
    expect(csv).toContain('Bob Jones');
    expect(csv).toContain('bob@test.com');
    expect(csv).toContain('Safety Quiz');
    expect(csv).toContain('9.0');
    expect(csv).toContain('Yes');
  });

  it('escapes CSV formula injection', async () => {
    mockPrisma.quizAttempt.findMany.mockResolvedValue([
      {
        id: 'a1',
        user: { firstName: '=cmd', surname: '|calc', email: '+a@test.com' },
        bank: { title: '-dangerous' },
        score: 5,
        maxScore: 10,
        percentage: 50,
        passed: false,
        status: AttemptStatus.COMPLETED,
        completedAt: new Date(),
        timeSpent: 100,
      },
    ]);
    mockPrisma.quizAttempt.count.mockResolvedValue(1);

    const csv = await exportCompletionsCSV({});

    // Should have formula-injection-safe prefixed values
    expect(csv).not.toMatch(/^=cmd/m);
    expect(csv).toContain("'=cmd");
  });

  it('caps export at 50000 rows', async () => {
    mockPrisma.quizAttempt.findMany.mockResolvedValue([]);

    await exportCompletionsCSV({});

    const callArgs = mockPrisma.quizAttempt.findMany.mock.calls[0][0];
    expect(callArgs.take).toBe(1000); // BATCH_SIZE for cursor pagination
  });
});

// ─── listLogs ────────────────────────────────────────────────────────────────

describe('listLogs', () => {
  const sampleLog = {
    id: 'log-1',
    userId: 'user-1',
    user: { firstName: 'Admin', surname: 'User' },
    action: 'LOGIN_SUCCESS',
    entityType: 'user',
    entityId: 'user-1',
    details: { ip: '127.0.0.1' },
    ipAddress: '192.168.1.1',
    createdAt: new Date('2026-01-15'),
  };

  beforeEach(() => {
    mockPrisma.auditLog.findMany.mockResolvedValue([sampleLog]);
    mockPrisma.auditLog.count.mockResolvedValue(1);
  });

  it('returns paginated log data', async () => {
    const result = await listLogs({}, { page: 1, pageSize: 25 });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].action).toBe('LOGIN_SUCCESS');
    expect(result.data[0].userName).toBe('Admin User');
  });

  it('applies action filter', async () => {
    await listLogs({ action: 'LOGIN_FAIL' }, { page: 1, pageSize: 25 });

    const whereArg = mockPrisma.auditLog.findMany.mock.calls[0][0].where;
    expect(whereArg.action).toBe('LOGIN_FAIL');
  });

  it('applies entityType filter', async () => {
    await listLogs({ entityType: 'questionBank' }, { page: 1, pageSize: 25 });

    const whereArg = mockPrisma.auditLog.findMany.mock.calls[0][0].where;
    expect(whereArg.entityType).toBe('questionBank');
  });

  it('applies date range filter', async () => {
    await listLogs(
      { dateFrom: '2026-01-01', dateTo: '2026-01-31' },
      { page: 1, pageSize: 25 }
    );

    const whereArg = mockPrisma.auditLog.findMany.mock.calls[0][0].where;
    expect(whereArg.createdAt.gte).toEqual(new Date('2026-01-01'));
  });

  it('handles logs without user', async () => {
    mockPrisma.auditLog.findMany.mockResolvedValue([
      { ...sampleLog, user: null, userId: null },
    ]);

    const result = await listLogs({}, { page: 1, pageSize: 25 });

    expect(result.data[0].userName).toBeNull();
  });
});

// ─── getPlatformStats ────────────────────────────────────────────────────────

describe('getPlatformStats', () => {
  beforeEach(() => {
    mockPrisma.user.count
      .mockResolvedValueOnce(100)   // totalUsers
      .mockResolvedValueOnce(90);   // activeUsers
    mockPrisma.questionBank.count
      .mockResolvedValueOnce(20)    // totalBanks
      .mockResolvedValueOnce(15);   // activeBanks
    mockPrisma.quizAttempt.count
      .mockResolvedValueOnce(500)   // totalAttempts
      .mockResolvedValueOnce(400)   // completedAttempts
      .mockResolvedValueOnce(320);  // passedCount
    mockPrisma.quizAttempt.aggregate.mockResolvedValue({
      _avg: { percentage: 75.5 },
    });
  });

  it('returns all platform statistics', async () => {
    const stats = await getPlatformStats();

    expect(stats.totalUsers).toBe(100);
    expect(stats.activeUsers).toBe(90);
    expect(stats.totalBanks).toBe(20);
    expect(stats.activeBanks).toBe(15);
    expect(stats.totalAttempts).toBe(500);
    expect(stats.completedAttempts).toBe(400);
  });

  it('calculates completion rate', async () => {
    const stats = await getPlatformStats();

    expect(stats.completionRate).toBe(80); // 400/500 = 80%
  });

  it('calculates average score', async () => {
    const stats = await getPlatformStats();

    expect(stats.averageScore).toBe(75.5);
  });

  it('calculates pass rate', async () => {
    const stats = await getPlatformStats();

    expect(stats.passRate).toBe(80); // 320/400 = 80%
  });

  it('handles zero attempts gracefully', async () => {
    mockPrisma.user.count.mockReset().mockResolvedValue(0);
    mockPrisma.questionBank.count.mockReset().mockResolvedValue(0);
    mockPrisma.quizAttempt.count.mockReset().mockResolvedValue(0);
    mockPrisma.quizAttempt.aggregate.mockReset().mockResolvedValue({
      _avg: { percentage: null },
    });

    const stats = await getPlatformStats();

    expect(stats.completionRate).toBe(0);
    expect(stats.averageScore).toBe(0);
    expect(stats.passRate).toBe(0);
  });
});

// ─── createInviteToken ───────────────────────────────────────────────────────

describe('createInviteToken', () => {
  it('creates invite with hashed token and returns plaintext', async () => {
    mockPrisma.inviteToken.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'inv-1',
      token: data.token, // hashed
      email: data.email,
      firstName: data.firstName,
      surname: data.surname,
      bank: null,
      expiresAt: data.expiresAt,
      usedAt: null,
      createdAt: new Date(),
    }));

    const result = await createInviteToken({ email: 'new@test.com' });

    expect(result.token).toBeDefined();
    expect(result.token.length).toBe(64); // 32 bytes hex = 64 chars
    expect(result.email).toBe('new@test.com');

    // Verify the stored token is hashed (different from returned plaintext)
    const storedHash = mockPrisma.inviteToken.create.mock.calls[0][0].data.token;
    expect(storedHash).not.toBe(result.token);
    expect(storedHash.length).toBe(64); // SHA-256 = 64 hex chars
  });

  it('sets expiry based on expiresInDays', async () => {
    mockPrisma.inviteToken.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'inv-1',
      token: data.token,
      email: data.email,
      firstName: null,
      surname: null,
      bank: null,
      expiresAt: data.expiresAt,
      usedAt: null,
      createdAt: new Date(),
    }));

    await createInviteToken({ email: 'new@test.com', expiresInDays: 14 });

    const storedExpiry = mockPrisma.inviteToken.create.mock.calls[0][0].data.expiresAt as Date;
    const now = new Date();
    const diffDays = (storedExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeCloseTo(14, 0);
  });

  it('defaults to 7 days expiry', async () => {
    mockPrisma.inviteToken.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'inv-1',
      token: data.token,
      email: data.email,
      firstName: null,
      surname: null,
      bank: null,
      expiresAt: data.expiresAt,
      usedAt: null,
      createdAt: new Date(),
    }));

    await createInviteToken({ email: 'new@test.com' });

    const storedExpiry = mockPrisma.inviteToken.create.mock.calls[0][0].data.expiresAt as Date;
    const now = new Date();
    const diffDays = (storedExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeCloseTo(7, 0);
  });

  it('throws NotFoundError when bankId does not exist', async () => {
    mockPrisma.questionBank.findUnique.mockResolvedValue(null);

    await expect(
      createInviteToken({ email: 'new@test.com', bankId: 'bad-id' })
    ).rejects.toThrow(NotFoundError);
  });

  it('verifies bank exists when bankId is provided', async () => {
    mockPrisma.questionBank.findUnique.mockResolvedValue({ id: 'bank-1' });
    mockPrisma.inviteToken.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'inv-1',
      token: data.token,
      email: data.email,
      firstName: null,
      surname: null,
      bank: { title: 'Test Quiz' },
      expiresAt: data.expiresAt,
      usedAt: null,
      createdAt: new Date(),
    }));

    const result = await createInviteToken({ email: 'new@test.com', bankId: 'bank-1' });

    expect(mockPrisma.questionBank.findUnique).toHaveBeenCalledWith({
      where: { id: 'bank-1' },
      select: { id: true },
    });
    expect(result.bankTitle).toBe('Test Quiz');
  });
});

// ─── listInviteTokens ────────────────────────────────────────────────────────

describe('listInviteTokens', () => {
  it('returns paginated invite tokens with masked tokens', async () => {
    mockPrisma.inviteToken.findMany.mockResolvedValue([
      {
        id: 'inv-1',
        token: 'abc123hashedvalue',
        email: 'user@test.com',
        firstName: 'Alice',
        surname: 'Smith',
        bank: { title: 'Quiz 1' },
        expiresAt: new Date('2026-02-01'),
        usedAt: null,
        createdAt: new Date('2026-01-15'),
      },
    ]);
    mockPrisma.inviteToken.count.mockResolvedValue(1);

    const result = await listInviteTokens({ page: 1, pageSize: 20 });

    expect(result.data).toHaveLength(1);
    // Token should be masked
    expect(result.data[0].token).toBe('****');
    expect(result.data[0].email).toBe('user@test.com');
    expect(result.data[0].bankTitle).toBe('Quiz 1');
  });

  it('returns correct pagination meta', async () => {
    mockPrisma.inviteToken.findMany.mockResolvedValue([]);
    mockPrisma.inviteToken.count.mockResolvedValue(45);

    const result = await listInviteTokens({ page: 2, pageSize: 20 });

    expect(result.meta.page).toBe(2);
    expect(result.meta.pageSize).toBe(20);
    expect(result.meta.totalCount).toBe(45);
    expect(result.meta.totalPages).toBe(3);
  });

  it('handles invite without bank', async () => {
    mockPrisma.inviteToken.findMany.mockResolvedValue([
      {
        id: 'inv-2',
        token: 'hash',
        email: 'user@test.com',
        firstName: null,
        surname: null,
        bank: null,
        expiresAt: new Date(),
        usedAt: null,
        createdAt: new Date(),
      },
    ]);
    mockPrisma.inviteToken.count.mockResolvedValue(1);

    const result = await listInviteTokens({ page: 1, pageSize: 20 });

    expect(result.data[0].bankTitle).toBeNull();
  });
});
