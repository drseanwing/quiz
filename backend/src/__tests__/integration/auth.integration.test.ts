/**
 * @file        Auth Integration Tests
 * @description Integration tests for authentication endpoints
 */

import request from 'supertest';
import { UserRole } from '@prisma/client';
import { hashPassword } from '@/utils/password';
import { generateAccessToken, generateRefreshToken } from '@/utils/jwt';

// Mock Prisma at module level - must be defined inline in jest.mock
jest.mock('@/config/database', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({}),
    },
    refreshToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn((callback) => {
      // If callback provided, execute it with mocked prisma
      if (typeof callback === 'function') {
        return callback(require('@/config/database').default);
      }
      // If array provided, resolve all promises
      return Promise.all(callback);
    }),
  },
}));

// Mock email service
jest.mock('@/services/emailService', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
}));

// Mock rate limiter to avoid rate limit issues in tests
jest.mock('@/middleware/rateLimiter', () => ({
  generalRateLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  authRateLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  passwordResetRateLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  uploadRateLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// Mock email domain validator
jest.mock('@/middleware/emailDomain', () => ({
  validateEmailDomain: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// Import app after mocks are set up
import app from '@/index';

// Get reference to mocked prisma
const mockPrisma = jest.mocked(require('@/config/database').default);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/auth/register', () => {
  it('should register a new user with valid data', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null); // No existing user
    mockPrisma.user.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'user-1',
      email: data.email,
      firstName: data.firstName,
      surname: data.surname,
      role: UserRole.USER,
      isActive: true,
      passwordHash: data.passwordHash,
      idNumber: null,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    mockPrisma.refreshToken.create.mockResolvedValue({});

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'StrongP@ss123',
        firstName: 'John',
        surname: 'Doe',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe('test@example.com');
    expect(response.body.data.user.firstName).toBe('John');
    expect(response.body.data.user.surname).toBe('Doe');
    expect(response.body.data.tokens.accessToken).toBeDefined();
    expect(response.body.data.tokens.refreshToken).toBeDefined();
    expect(response.body.data.user.passwordHash).toBeUndefined();
  });

  it('should reject registration with duplicate email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'existing-user',
      email: 'existing@example.com',
    });

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'existing@example.com',
        password: 'StrongP@ss123',
        firstName: 'John',
        surname: 'Doe',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain('already exists');
  });

  it('should reject registration with invalid data', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'invalid-email',
        password: '123',
        firstName: '',
        surname: '',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should reject registration with weak password', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'weak',
        firstName: 'John',
        surname: 'Doe',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should lowercase email on registration', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'user-1',
      email: data.email,
      firstName: data.firstName,
      surname: data.surname,
      role: UserRole.USER,
      isActive: true,
      passwordHash: data.passwordHash,
      idNumber: null,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    mockPrisma.refreshToken.create.mockResolvedValue({});

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'Test@EXAMPLE.COM',
        password: 'StrongP@ss123',
        firstName: 'John',
        surname: 'Doe',
      });

    expect(response.status).toBe(201);
    expect(response.body.data.user.email).toBe('test@example.com');
  });
});

describe('POST /api/auth/login', () => {
  it('should login with valid credentials', async () => {
    const hash = await hashPassword('StrongP@ss123');
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      firstName: 'John',
      surname: 'Doe',
      role: UserRole.USER,
      isActive: true,
      passwordHash: hash,
      idNumber: null,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPrisma.user.update.mockResolvedValue({});
    mockPrisma.refreshToken.create.mockResolvedValue({});

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'StrongP@ss123',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe('test@example.com');
    expect(response.body.data.tokens.accessToken).toBeDefined();
    expect(response.body.data.tokens.refreshToken).toBeDefined();
  });

  it('should reject login with wrong password', async () => {
    const hash = await hashPassword('StrongP@ss123');
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      passwordHash: hash,
      isActive: true,
      role: UserRole.USER,
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'WrongPassword1!',
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain('Invalid email or password');
  });

  it('should reject login for non-existent user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nobody@example.com',
        password: 'AnyPass123!',
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain('Invalid email or password');
  });

  it('should reject login for deactivated user', async () => {
    const hash = await hashPassword('StrongP@ss123');
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      passwordHash: hash,
      isActive: false,
      role: UserRole.USER,
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'StrongP@ss123',
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain('deactivated');
  });

  it('should reject login with missing credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});

describe('POST /api/auth/refresh', () => {
  it('should refresh access token with valid refresh token', async () => {
    const user = {
      id: 'user-1',
      email: 'test@example.com',
      role: UserRole.USER,
    };
    const refreshToken = generateRefreshToken(user);
    const hashedToken = require('crypto').createHash('sha256').update(refreshToken).digest('hex');

    mockPrisma.refreshToken.findFirst.mockResolvedValue({
      id: 'token-1',
      token: hashedToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    });
    mockPrisma.user.findUnique.mockResolvedValue({
      ...user,
      isActive: true,
      firstName: 'John',
      surname: 'Doe',
    });
    mockPrisma.refreshToken.create.mockResolvedValue({});

    const response = await request(app)
      .post('/api/auth/refresh')
      .send({
        refreshToken,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toBeDefined();
    expect(response.body.data.refreshToken).toBeDefined();
  });

  it('should reject invalid refresh token', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .send({
        refreshToken: 'invalid-token',
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should reject expired refresh token', async () => {
    // Create token that appears expired
    const response = await request(app)
      .post('/api/auth/refresh')
      .send({
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired.signature',
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should reject refresh token not in database', async () => {
    const user = {
      id: 'user-1',
      email: 'test@example.com',
      role: UserRole.USER,
    };
    const refreshToken = generateRefreshToken(user);

    mockPrisma.refreshToken.findFirst.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/auth/refresh')
      .send({
        refreshToken,
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});

describe('POST /api/auth/logout', () => {
  it('should logout authenticated user', async () => {
    const user = {
      id: 'user-1',
      email: 'test@example.com',
      role: UserRole.USER,
    };
    const accessToken = generateAccessToken(user);

    mockPrisma.user.findUnique.mockResolvedValue({
      ...user,
      isActive: true,
    });
    mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

    const response = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.message).toContain('Logged out');
  });

  it('should reject logout without authentication', async () => {
    const response = await request(app)
      .post('/api/auth/logout');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should reject logout with invalid token', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', 'Bearer invalid-token');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
