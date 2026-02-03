/**
 * @file        Admin Integration Tests
 * @description Integration tests for admin endpoints
 */

import request from 'supertest';
import { UserRole } from '@prisma/client';
import { generateAccessToken } from '@/utils/jwt';

// Mock Prisma at module level
jest.mock('@/config/database', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    questionBank: {
      count: jest.fn(),
    },
    attempt: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    auditLog: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn().mockResolvedValue({}),
    },
    inviteToken: {
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
  },
}));

// Mock email service
jest.mock('@/services/emailService', () => ({
  sendInviteEmail: jest.fn().mockResolvedValue(true),
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

describe('GET /api/admin/stats', () => {
  it('should return platform statistics for admin', async () => {
    const admin = createMockUser({ id: 'admin-1', role: UserRole.ADMIN });
    const accessToken = generateAccessToken(admin);

    mockPrisma.user.findUnique.mockResolvedValue(admin);
    mockPrisma.user.count
      .mockResolvedValueOnce(50) // total users
      .mockResolvedValueOnce(45) // active users
      .mockResolvedValueOnce(3) // editors
      .mockResolvedValueOnce(2); // admins
    mockPrisma.questionBank.count
      .mockResolvedValueOnce(10) // total banks
      .mockResolvedValueOnce(5) // draft
      .mockResolvedValueOnce(3) // open
      .mockResolvedValueOnce(2); // public
    mockPrisma.attempt.count
      .mockResolvedValueOnce(200) // total attempts
      .mockResolvedValueOnce(150); // completed

    const response = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('users');
    expect(response.body.data).toHaveProperty('questionBanks');
    expect(response.body.data).toHaveProperty('attempts');
  });

  it('should reject non-admin user', async () => {
    const user = createMockUser({ role: UserRole.USER });
    const accessToken = generateAccessToken(user);

    mockPrisma.user.findUnique.mockResolvedValue(user);

    const response = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it('should reject editor user', async () => {
    const editor = createMockUser({ role: UserRole.EDITOR });
    const accessToken = generateAccessToken(editor);

    mockPrisma.user.findUnique.mockResolvedValue(editor);

    const response = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it('should reject unauthenticated request', async () => {
    const response = await request(app)
      .get('/api/admin/stats');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});

describe('GET /api/admin/completions', () => {
  it('should list quiz completions for admin', async () => {
    const admin = createMockUser({ id: 'admin-1', role: UserRole.ADMIN });
    const accessToken = generateAccessToken(admin);

    const completions = [
      {
        id: 'attempt-1',
        userId: 'user-1',
        bankId: 'bank-1',
        completedAt: new Date(),
        score: 8,
        maxScore: 10,
        percentage: 80,
        passed: true,
        user: { firstName: 'John', surname: 'Doe', email: 'john@test.com' },
        bank: { title: 'Test Bank' },
      },
      {
        id: 'attempt-2',
        userId: 'user-2',
        bankId: 'bank-2',
        completedAt: new Date(),
        score: 5,
        maxScore: 10,
        percentage: 50,
        passed: false,
        user: { firstName: 'Jane', surname: 'Smith', email: 'jane@test.com' },
        bank: { title: 'Another Bank' },
      },
    ];

    mockPrisma.user.findUnique.mockResolvedValue(admin);
    mockPrisma.attempt.findMany.mockResolvedValue(completions);
    mockPrisma.attempt.count.mockResolvedValue(2);

    const response = await request(app)
      .get('/api/admin/completions')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.meta.totalCount).toBe(2);
  });

  it('should filter completions by bankId', async () => {
    const admin = createMockUser({ role: UserRole.ADMIN });
    const accessToken = generateAccessToken(admin);

    mockPrisma.user.findUnique.mockResolvedValue(admin);
    mockPrisma.attempt.findMany.mockResolvedValue([]);
    mockPrisma.attempt.count.mockResolvedValue(0);

    const response = await request(app)
      .get('/api/admin/completions?bankId=bank-1')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(mockPrisma.attempt.findMany).toHaveBeenCalled();
  });

  it('should filter completions by userId', async () => {
    const admin = createMockUser({ role: UserRole.ADMIN });
    const accessToken = generateAccessToken(admin);

    mockPrisma.user.findUnique.mockResolvedValue(admin);
    mockPrisma.attempt.findMany.mockResolvedValue([]);
    mockPrisma.attempt.count.mockResolvedValue(0);

    const response = await request(app)
      .get('/api/admin/completions?userId=user-1')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(mockPrisma.attempt.findMany).toHaveBeenCalled();
  });

  it('should filter completions by date range', async () => {
    const admin = createMockUser({ role: UserRole.ADMIN });
    const accessToken = generateAccessToken(admin);

    mockPrisma.user.findUnique.mockResolvedValue(admin);
    mockPrisma.attempt.findMany.mockResolvedValue([]);
    mockPrisma.attempt.count.mockResolvedValue(0);

    const response = await request(app)
      .get('/api/admin/completions?dateFrom=2025-01-01&dateTo=2025-12-31')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(mockPrisma.attempt.findMany).toHaveBeenCalled();
  });

  it('should filter completions by passed status', async () => {
    const admin = createMockUser({ role: UserRole.ADMIN });
    const accessToken = generateAccessToken(admin);

    mockPrisma.user.findUnique.mockResolvedValue(admin);
    mockPrisma.attempt.findMany.mockResolvedValue([]);
    mockPrisma.attempt.count.mockResolvedValue(0);

    const response = await request(app)
      .get('/api/admin/completions?passed=true')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(mockPrisma.attempt.findMany).toHaveBeenCalled();
  });

  it('should apply pagination', async () => {
    const admin = createMockUser({ role: UserRole.ADMIN });
    const accessToken = generateAccessToken(admin);

    mockPrisma.user.findUnique.mockResolvedValue(admin);
    mockPrisma.attempt.findMany.mockResolvedValue([]);
    mockPrisma.attempt.count.mockResolvedValue(100);

    const response = await request(app)
      .get('/api/admin/completions?page=2&pageSize=20')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.meta.page).toBe(2);
    expect(response.body.meta.pageSize).toBe(20);
  });

  it('should reject non-admin user', async () => {
    const user = createMockUser({ role: UserRole.USER });
    const accessToken = generateAccessToken(user);

    mockPrisma.user.findUnique.mockResolvedValue(user);

    const response = await request(app)
      .get('/api/admin/completions')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });
});

describe('GET /api/admin/logs', () => {
  it('should list audit logs for admin', async () => {
    const admin = createMockUser({ id: 'admin-1', role: UserRole.ADMIN });
    const accessToken = generateAccessToken(admin);

    const logs = [
      {
        id: 'log-1',
        action: 'USER_LOGIN',
        entityType: 'user',
        entityId: 'user-1',
        details: { ip: '127.0.0.1' },
        userId: 'user-1',
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
        createdAt: new Date(),
        user: { firstName: 'John', surname: 'Doe', email: 'john@test.com' },
      },
      {
        id: 'log-2',
        action: 'QUIZ_SUBMITTED',
        entityType: 'attempt',
        entityId: 'attempt-1',
        details: { score: 8 },
        userId: 'user-1',
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
        createdAt: new Date(),
        user: { firstName: 'John', surname: 'Doe', email: 'john@test.com' },
      },
    ];

    mockPrisma.user.findUnique.mockResolvedValue(admin);
    mockPrisma.auditLog.findMany.mockResolvedValue(logs);
    mockPrisma.auditLog.count.mockResolvedValue(2);

    const response = await request(app)
      .get('/api/admin/logs')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.meta.totalCount).toBe(2);
  });

  it('should filter logs by action', async () => {
    const admin = createMockUser({ role: UserRole.ADMIN });
    const accessToken = generateAccessToken(admin);

    mockPrisma.user.findUnique.mockResolvedValue(admin);
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.count.mockResolvedValue(0);

    const response = await request(app)
      .get('/api/admin/logs?action=USER_LOGIN')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(mockPrisma.auditLog.findMany).toHaveBeenCalled();
  });

  it('should filter logs by entityType', async () => {
    const admin = createMockUser({ role: UserRole.ADMIN });
    const accessToken = generateAccessToken(admin);

    mockPrisma.user.findUnique.mockResolvedValue(admin);
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.count.mockResolvedValue(0);

    const response = await request(app)
      .get('/api/admin/logs?entityType=user')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(mockPrisma.auditLog.findMany).toHaveBeenCalled();
  });

  it('should filter logs by userId', async () => {
    const admin = createMockUser({ role: UserRole.ADMIN });
    const accessToken = generateAccessToken(admin);

    mockPrisma.user.findUnique.mockResolvedValue(admin);
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.count.mockResolvedValue(0);

    const response = await request(app)
      .get('/api/admin/logs?userId=user-1')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(mockPrisma.auditLog.findMany).toHaveBeenCalled();
  });

  it('should filter logs by date range', async () => {
    const admin = createMockUser({ role: UserRole.ADMIN });
    const accessToken = generateAccessToken(admin);

    mockPrisma.user.findUnique.mockResolvedValue(admin);
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.count.mockResolvedValue(0);

    const response = await request(app)
      .get('/api/admin/logs?dateFrom=2025-01-01&dateTo=2025-12-31')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(mockPrisma.auditLog.findMany).toHaveBeenCalled();
  });

  it('should apply pagination', async () => {
    const admin = createMockUser({ role: UserRole.ADMIN });
    const accessToken = generateAccessToken(admin);

    mockPrisma.user.findUnique.mockResolvedValue(admin);
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.count.mockResolvedValue(200);

    const response = await request(app)
      .get('/api/admin/logs?page=3&pageSize=50')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.meta.page).toBe(3);
    expect(response.body.meta.pageSize).toBe(50);
  });

  it('should reject non-admin user', async () => {
    const user = createMockUser({ role: UserRole.USER });
    const accessToken = generateAccessToken(user);

    mockPrisma.user.findUnique.mockResolvedValue(user);

    const response = await request(app)
      .get('/api/admin/logs')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });
});

describe('POST /api/admin/invite-tokens', () => {
  it('should create invite token as admin', async () => {
    const admin = createMockUser({ id: 'admin-1', role: UserRole.ADMIN });
    const accessToken = generateAccessToken(admin);

    const inviteToken = {
      id: 'invite-1',
      token: 'abc123',
      email: 'newuser@example.com',
      firstName: 'New',
      bankId: null,
      bankTitle: null,
      used: false,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    };

    mockPrisma.user.findUnique.mockResolvedValue(admin);
    mockPrisma.inviteToken.create.mockResolvedValue(inviteToken);

    const response = await request(app)
      .post('/api/admin/invite-tokens')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        email: 'newuser@example.com',
        firstName: 'New',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.email).toBe('newuser@example.com');
    expect(response.body.data.token).toBeDefined();
  });

  it('should create invite token with bankId', async () => {
    const admin = createMockUser({ role: UserRole.ADMIN });
    const accessToken = generateAccessToken(admin);

    const inviteToken = {
      id: 'invite-1',
      token: 'abc123',
      email: 'newuser@example.com',
      firstName: 'New',
      bankId: 'bank-1',
      bankTitle: 'Test Bank',
      used: false,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    };

    mockPrisma.user.findUnique.mockResolvedValue(admin);
    mockPrisma.inviteToken.create.mockResolvedValue(inviteToken);

    const response = await request(app)
      .post('/api/admin/invite-tokens')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        email: 'newuser@example.com',
        firstName: 'New',
        bankId: 'bank-1',
        bankTitle: 'Test Bank',
      });

    expect(response.status).toBe(201);
    expect(response.body.data.bankId).toBe('bank-1');
  });

  it('should reject invite token creation by non-admin', async () => {
    const user = createMockUser({ role: UserRole.USER });
    const accessToken = generateAccessToken(user);

    mockPrisma.user.findUnique.mockResolvedValue(user);

    const response = await request(app)
      .post('/api/admin/invite-tokens')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        email: 'newuser@example.com',
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it('should reject invalid invite token data', async () => {
    const admin = createMockUser({ role: UserRole.ADMIN });
    const accessToken = generateAccessToken(admin);

    mockPrisma.user.findUnique.mockResolvedValue(admin);

    const response = await request(app)
      .post('/api/admin/invite-tokens')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        email: 'invalid-email',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});

describe('GET /api/admin/invite-tokens', () => {
  it('should list invite tokens for admin', async () => {
    const admin = createMockUser({ role: UserRole.ADMIN });
    const accessToken = generateAccessToken(admin);

    const tokens = [
      {
        id: 'invite-1',
        token: 'abc123',
        email: 'user1@example.com',
        firstName: 'User',
        bankId: null,
        bankTitle: null,
        used: false,
        expiresAt: new Date(),
        createdAt: new Date(),
      },
      {
        id: 'invite-2',
        token: 'def456',
        email: 'user2@example.com',
        firstName: 'Another',
        bankId: 'bank-1',
        bankTitle: 'Test Bank',
        used: true,
        expiresAt: new Date(),
        createdAt: new Date(),
      },
    ];

    mockPrisma.user.findUnique.mockResolvedValue(admin);
    mockPrisma.inviteToken.findMany.mockResolvedValue(tokens);
    mockPrisma.inviteToken.count.mockResolvedValue(2);

    const response = await request(app)
      .get('/api/admin/invite-tokens')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.meta.totalCount).toBe(2);
  });

  it('should apply pagination to invite tokens', async () => {
    const admin = createMockUser({ role: UserRole.ADMIN });
    const accessToken = generateAccessToken(admin);

    mockPrisma.user.findUnique.mockResolvedValue(admin);
    mockPrisma.inviteToken.findMany.mockResolvedValue([]);
    mockPrisma.inviteToken.count.mockResolvedValue(50);

    const response = await request(app)
      .get('/api/admin/invite-tokens?page=2&pageSize=10')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.meta.page).toBe(2);
    expect(response.body.meta.pageSize).toBe(10);
  });

  it('should reject invite token listing by non-admin', async () => {
    const user = createMockUser({ role: UserRole.USER });
    const accessToken = generateAccessToken(user);

    mockPrisma.user.findUnique.mockResolvedValue(user);

    const response = await request(app)
      .get('/api/admin/invite-tokens')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });
});
