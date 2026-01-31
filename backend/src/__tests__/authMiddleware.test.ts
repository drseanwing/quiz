/**
 * @file        Auth & Authorization Middleware Tests
 * @description Tests for authenticate, optionalAuth, requireRole, and email domain middleware
 */

import { UserRole } from '@prisma/client';

// Mock Prisma
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
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

// Mock JWT utils
const mockVerifyAccessToken = jest.fn();
const mockExtractTokenFromHeader = jest.fn();

jest.mock('@/utils/jwt', () => ({
  verifyAccessToken: (...args: unknown[]) => mockVerifyAccessToken(...args),
  extractTokenFromHeader: (...args: unknown[]) => mockExtractTokenFromHeader(...args),
}));

import { authenticate, optionalAuth, requireRole, requireAdmin, requireEditor } from '@/middleware/auth';
import { validateEmailDomain, isEmailDomainAllowed } from '@/middleware/emailDomain';
import { AuthenticationError, AuthorizationError, ValidationError } from '@/middleware/errorHandler';
import type { Request, Response, NextFunction } from 'express';

// Helpers
function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: { authorization: 'Bearer valid-token' },
    path: '/test',
    method: 'GET',
    ip: '127.0.0.1',
    body: {},
    ...overrides,
  } as unknown as Request;
}

function mockRes(): Response {
  return {} as Response;
}

const validPayload = {
  userId: 'user-1',
  email: 'test@health.qld.gov.au',
  role: 'USER' as UserRole,
  type: 'access' as const,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockExtractTokenFromHeader.mockReturnValue('valid-token');
  mockVerifyAccessToken.mockReturnValue({ valid: true, payload: validPayload });
  mockPrisma.user.findUnique.mockResolvedValue({
    id: 'user-1',
    email: 'test@health.qld.gov.au',
    role: 'USER',
    isActive: true,
  });
});

// ─── authenticate ────────────────────────────────────────────────────────────

describe('authenticate', () => {
  it('attaches user to request on valid token', async () => {
    const req = mockReq();
    const next = jest.fn();

    await authenticate(req, mockRes(), next);

    expect(req.user).toBeDefined();
    expect(req.user!.userId).toBe('user-1');
    expect(next).toHaveBeenCalledWith();
  });

  it('uses live DB role instead of JWT role', async () => {
    // JWT says USER, but DB says ADMIN
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'test@health.qld.gov.au',
      role: 'ADMIN',
      isActive: true,
    });

    const req = mockReq();
    const next = jest.fn();

    await authenticate(req, mockRes(), next);

    expect(req.user!.role).toBe('ADMIN');
  });

  it('calls next with AuthenticationError when no token provided', async () => {
    mockExtractTokenFromHeader.mockReturnValue(null);
    const next = jest.fn();

    await authenticate(mockReq(), mockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    const err = next.mock.calls[0][0] as AuthenticationError;
    expect(err.message).toContain('token required');
  });

  it('calls next with AuthenticationError when token is invalid', async () => {
    mockVerifyAccessToken.mockReturnValue({ valid: false, error: 'Invalid token' });
    const next = jest.fn();

    await authenticate(mockReq(), mockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    const err = next.mock.calls[0][0] as AuthenticationError;
    expect(err.message).toContain('Invalid');
  });

  it('calls next with AuthenticationError when token is expired', async () => {
    mockVerifyAccessToken.mockReturnValue({ valid: false, error: 'Token expired' });
    const next = jest.fn();

    await authenticate(mockReq(), mockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    const err = next.mock.calls[0][0] as AuthenticationError;
    expect(err.message).toContain('expired');
  });

  it('calls next with AuthenticationError when user not found in DB', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const next = jest.fn();

    await authenticate(mockReq(), mockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    const err = next.mock.calls[0][0] as AuthenticationError;
    expect(err.message).toContain('not found');
  });

  it('calls next with AuthenticationError when user is deactivated', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'test@health.qld.gov.au',
      role: 'USER',
      isActive: false,
    });
    const next = jest.fn();

    await authenticate(mockReq(), mockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
    const err = next.mock.calls[0][0] as AuthenticationError;
    expect(err.message).toContain('deactivated');
  });

  it('queries user with correct select fields', async () => {
    const next = jest.fn();
    await authenticate(mockReq(), mockRes(), next);

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { id: true, email: true, role: true, isActive: true },
    });
  });
});

// ─── optionalAuth ────────────────────────────────────────────────────────────

describe('optionalAuth', () => {
  it('attaches user on valid token', async () => {
    const req = mockReq();
    const next = jest.fn();

    await optionalAuth(req, mockRes(), next);

    expect(req.user).toBeDefined();
    expect(req.user!.userId).toBe('user-1');
    expect(next).toHaveBeenCalledWith();
  });

  it('continues without error when no token provided', async () => {
    mockExtractTokenFromHeader.mockReturnValue(null);
    const req = mockReq();
    const next = jest.fn();

    await optionalAuth(req, mockRes(), next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledWith();
  });

  it('continues without error when token is invalid', async () => {
    mockVerifyAccessToken.mockReturnValue({ valid: false, error: 'Invalid token' });
    const req = mockReq();
    const next = jest.fn();

    await optionalAuth(req, mockRes(), next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledWith();
  });

  it('does not attach user when user is inactive', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'test@health.qld.gov.au',
      role: 'USER',
      isActive: false,
    });
    const req = mockReq();
    const next = jest.fn();

    await optionalAuth(req, mockRes(), next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledWith();
  });

  it('does not attach user when user not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const req = mockReq();
    const next = jest.fn();

    await optionalAuth(req, mockRes(), next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledWith();
  });

  it('continues without error when DB throws', async () => {
    mockPrisma.user.findUnique.mockRejectedValue(new Error('DB down'));
    const req = mockReq();
    const next = jest.fn();

    await optionalAuth(req, mockRes(), next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledWith();
  });

  it('uses live DB role for attached user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'test@health.qld.gov.au',
      role: 'EDITOR',
      isActive: true,
    });
    const req = mockReq();
    const next = jest.fn();

    await optionalAuth(req, mockRes(), next);

    expect(req.user!.role).toBe('EDITOR');
  });
});

// ─── requireRole ─────────────────────────────────────────────────────────────

describe('requireRole', () => {
  it('allows user with matching role', () => {
    const middleware = requireRole('USER' as UserRole);
    const req = mockReq();
    req.user = { ...validPayload };
    const next = jest.fn();

    middleware(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith();
  });

  it('allows user with one of multiple matching roles', () => {
    const middleware = requireRole(['EDITOR', 'ADMIN'] as UserRole[]);
    const req = mockReq();
    req.user = { ...validPayload, role: 'ADMIN' as UserRole };
    const next = jest.fn();

    middleware(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith();
  });

  it('rejects user without matching role', () => {
    const middleware = requireRole('ADMIN' as UserRole);
    const req = mockReq();
    req.user = { ...validPayload, role: 'USER' as UserRole };
    const next = jest.fn();

    middleware(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(AuthorizationError));
  });

  it('rejects when no user is attached to request', () => {
    const middleware = requireRole('USER' as UserRole);
    const req = mockReq();
    delete req.user;
    const next = jest.fn();

    middleware(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
  });

  it('includes required roles in error message', () => {
    const middleware = requireRole(['EDITOR', 'ADMIN'] as UserRole[]);
    const req = mockReq();
    req.user = { ...validPayload, role: 'USER' as UserRole };
    const next = jest.fn();

    middleware(req, mockRes(), next);

    const err = next.mock.calls[0][0] as AuthorizationError;
    expect(err.message).toContain('EDITOR');
    expect(err.message).toContain('ADMIN');
  });
});

// ─── requireAdmin ────────────────────────────────────────────────────────────

describe('requireAdmin', () => {
  it('allows ADMIN users', () => {
    const req = mockReq();
    req.user = { ...validPayload, role: 'ADMIN' as UserRole };
    const next = jest.fn();

    requireAdmin(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith();
  });

  it('rejects USER role', () => {
    const req = mockReq();
    req.user = { ...validPayload, role: 'USER' as UserRole };
    const next = jest.fn();

    requireAdmin(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(AuthorizationError));
  });

  it('rejects EDITOR role', () => {
    const req = mockReq();
    req.user = { ...validPayload, role: 'EDITOR' as UserRole };
    const next = jest.fn();

    requireAdmin(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(AuthorizationError));
  });
});

// ─── requireEditor ───────────────────────────────────────────────────────────

describe('requireEditor', () => {
  it('allows EDITOR users', () => {
    const req = mockReq();
    req.user = { ...validPayload, role: 'EDITOR' as UserRole };
    const next = jest.fn();

    requireEditor(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith();
  });

  it('allows ADMIN users', () => {
    const req = mockReq();
    req.user = { ...validPayload, role: 'ADMIN' as UserRole };
    const next = jest.fn();

    requireEditor(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith();
  });

  it('rejects USER role', () => {
    const req = mockReq();
    req.user = { ...validPayload, role: 'USER' as UserRole };
    const next = jest.fn();

    requireEditor(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(AuthorizationError));
  });
});

// ─── validateEmailDomain ─────────────────────────────────────────────────────

describe('validateEmailDomain', () => {
  it('allows email from permitted domain', () => {
    const req = mockReq({ body: { email: 'user@health.qld.gov.au' } });
    const next = jest.fn();

    validateEmailDomain(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith();
  });

  it('rejects email from disallowed domain', () => {
    const req = mockReq({ body: { email: 'user@gmail.com' } });
    const next = jest.fn();

    validateEmailDomain(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    const err = next.mock.calls[0][0] as ValidationError;
    expect(err.message).toContain('health.qld.gov.au');
  });

  it('skips validation for authenticated ADMIN users', () => {
    const req = mockReq({
      body: { email: 'admin@gmail.com' },
    });
    req.user = { ...validPayload, role: 'ADMIN' as UserRole };
    const next = jest.fn();

    validateEmailDomain(req, mockRes(), next);

    // Should pass even with non-allowed domain
    expect(next).toHaveBeenCalledWith();
  });

  it('does NOT skip validation for EDITOR role', () => {
    const req = mockReq({
      body: { email: 'editor@gmail.com' },
    });
    req.user = { ...validPayload, role: 'EDITOR' as UserRole };
    const next = jest.fn();

    validateEmailDomain(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
  });

  it('does NOT skip validation for USER role', () => {
    const req = mockReq({
      body: { email: 'user@gmail.com' },
    });
    req.user = { ...validPayload, role: 'USER' as UserRole };
    const next = jest.fn();

    validateEmailDomain(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
  });

  it('passes through when email is missing from body', () => {
    const req = mockReq({ body: {} });
    const next = jest.fn();

    validateEmailDomain(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith();
  });

  it('performs case-insensitive domain comparison', () => {
    const req = mockReq({ body: { email: 'user@HEALTH.QLD.GOV.AU' } });
    const next = jest.fn();

    validateEmailDomain(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith();
  });

  it('rejects email without @ sign', () => {
    const req = mockReq({ body: { email: 'invalidemail' } });
    const next = jest.fn();

    validateEmailDomain(req, mockRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    const err = next.mock.calls[0][0] as ValidationError;
    expect(err.message).toContain('Invalid email');
  });
});

// ─── isEmailDomainAllowed ────────────────────────────────────────────────────

describe('isEmailDomainAllowed', () => {
  it('returns true for allowed domain', () => {
    expect(isEmailDomainAllowed('user@health.qld.gov.au')).toBe(true);
  });

  it('returns false for disallowed domain', () => {
    expect(isEmailDomainAllowed('user@gmail.com')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isEmailDomainAllowed('user@HEALTH.QLD.GOV.AU')).toBe(true);
  });
});
