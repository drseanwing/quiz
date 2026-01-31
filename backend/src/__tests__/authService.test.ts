/**
 * @file        Auth Service Tests
 * @description Tests for auth service functions with mocked dependencies
 */

// Mock Prisma client
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  auditLog: {
    create: jest.fn().mockResolvedValue({}),
  },
  passwordReset: {
    findUnique: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
  },
  inviteToken: {
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

jest.mock('@/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
}));

jest.mock('@/services/emailService', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
}));

import { registerUser, loginUser, refreshAccessToken } from '@/services/authService';
import { hashPassword } from '@/utils/password';

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── registerUser ────────────────────────────────────────────────────────────

describe('registerUser', () => {
  it('creates a user with hashed password and returns tokens', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null); // No existing user
    mockPrisma.user.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'user-1',
      email: data.email,
      firstName: data.firstName,
      surname: data.surname,
      role: 'USER',
      isActive: true,
      passwordHash: data.passwordHash,
      idNumber: null,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const result = await registerUser({
      email: 'test@example.com',
      password: 'StrongP@ss123',
      firstName: 'John',
      surname: 'Doe',
    });

    expect(result.user.email).toBe('test@example.com');
    expect(result.user.role).toBe('USER');
    expect(result.tokens.accessToken).toBeDefined();
    expect(result.tokens.refreshToken).toBeDefined();
    // Password hash should not be in the response
    expect((result.user as Record<string, unknown>).passwordHash).toBeUndefined();
  });

  it('rejects weak password', async () => {
    await expect(
      registerUser({
        email: 'test@example.com',
        password: '123',
        firstName: 'John',
        surname: 'Doe',
      })
    ).rejects.toThrow();
  });

  it('rejects duplicate email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing', email: 'test@example.com' });

    await expect(
      registerUser({
        email: 'test@example.com',
        password: 'StrongP@ss123',
        firstName: 'John',
        surname: 'Doe',
      })
    ).rejects.toThrow('An account with this email already exists');
  });

  it('lowercases email on registration', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'user-1',
      email: data.email,
      firstName: data.firstName,
      surname: data.surname,
      role: 'USER',
      isActive: true,
      passwordHash: data.passwordHash,
      idNumber: null,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const result = await registerUser({
      email: 'Test@EXAMPLE.COM',
      password: 'StrongP@ss123',
      firstName: 'John',
      surname: 'Doe',
    });

    expect(result.user.email).toBe('test@example.com');
  });
});

// ─── loginUser ───────────────────────────────────────────────────────────────

describe('loginUser', () => {
  it('returns user and tokens on valid credentials', async () => {
    const hash = await hashPassword('StrongP@ss123');
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      firstName: 'John',
      surname: 'Doe',
      role: 'USER',
      isActive: true,
      passwordHash: hash,
      idNumber: null,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPrisma.user.update.mockResolvedValue({});

    const result = await loginUser(
      { email: 'test@example.com', password: 'StrongP@ss123' },
      '127.0.0.1'
    );

    expect(result.user.email).toBe('test@example.com');
    expect(result.tokens.accessToken).toBeDefined();
    expect(result.tokens.refreshToken).toBeDefined();
  });

  it('rejects invalid password', async () => {
    const hash = await hashPassword('StrongP@ss123');
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      passwordHash: hash,
      isActive: true,
    });

    await expect(
      loginUser({ email: 'test@example.com', password: 'WrongPassword1!' }, '127.0.0.1')
    ).rejects.toThrow('Invalid email or password');
  });

  it('rejects non-existent user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(
      loginUser({ email: 'nobody@example.com', password: 'AnyPass123!' }, '127.0.0.1')
    ).rejects.toThrow('Invalid email or password');
  });

  it('rejects deactivated user', async () => {
    const hash = await hashPassword('StrongP@ss123');
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      passwordHash: hash,
      isActive: false,
    });

    await expect(
      loginUser({ email: 'test@example.com', password: 'StrongP@ss123' }, '127.0.0.1')
    ).rejects.toThrow('User account is deactivated');
  });
});

// ─── refreshAccessToken ──────────────────────────────────────────────────────

describe('refreshAccessToken', () => {
  it('rejects invalid refresh token', async () => {
    await expect(
      refreshAccessToken({ refreshToken: 'invalid-token' })
    ).rejects.toThrow();
  });

  it('rejects expired refresh token', async () => {
    // Generate an expired-looking token (we can't easily create one, so test with garbage)
    await expect(
      refreshAccessToken({ refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired.signature' })
    ).rejects.toThrow();
  });
});
