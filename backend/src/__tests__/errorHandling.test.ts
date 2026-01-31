/**
 * @file        Error Handling & Validation Middleware Tests
 * @description Tests for error classes, error handler, and validation middleware
 */

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
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  errorHandler,
} from '@/middleware/errorHandler';
import { validateRequiredFields } from '@/middleware/validation';
import logger from '@/config/logger';
import type { Request, Response, NextFunction } from 'express';

// Helpers
function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    path: '/test',
    method: 'GET',
    ip: '127.0.0.1',
    body: {},
    ...overrides,
  } as unknown as Request;
}

function mockRes(): Response & { _status: number; _json: unknown } {
  const res = {
    _status: 0,
    _json: null as unknown,
    status(code: number) {
      res._status = code;
      return res;
    },
    json(data: unknown) {
      res._json = data;
      return res;
    },
  } as unknown as Response & { _status: number; _json: unknown };
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Error classes ───────────────────────────────────────────────────────────

describe('AppError', () => {
  it('creates error with code, message, and status code', () => {
    const err = new AppError('CUSTOM', 'Something broke', 422);
    expect(err.code).toBe('CUSTOM');
    expect(err.message).toBe('Something broke');
    expect(err.statusCode).toBe(422);
    expect(err.name).toBe('AppError');
    expect(err instanceof Error).toBe(true);
  });

  it('defaults to 500 status code', () => {
    const err = new AppError('CUSTOM', 'fail');
    expect(err.statusCode).toBe(500);
  });

  it('stores optional details', () => {
    const err = new AppError('CUSTOM', 'fail', 400, { field: 'email' });
    expect(err.details).toEqual({ field: 'email' });
  });

  it('has stack trace', () => {
    const err = new AppError('CUSTOM', 'fail');
    expect(err.stack).toBeDefined();
  });
});

describe('ValidationError', () => {
  it('creates 400 error with VALIDATION_ERROR code', () => {
    const err = new ValidationError('Bad input');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.name).toBe('ValidationError');
    expect(err.message).toBe('Bad input');
  });

  it('stores details', () => {
    const err = new ValidationError('Bad', { field: 'name' });
    expect(err.details).toEqual({ field: 'name' });
  });

  it('is an instance of AppError and Error', () => {
    const err = new ValidationError('Bad');
    expect(err instanceof AppError).toBe(true);
    expect(err instanceof Error).toBe(true);
  });
});

describe('AuthenticationError', () => {
  it('creates 401 error with default message', () => {
    const err = new AuthenticationError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('AUTHENTICATION_ERROR');
    expect(err.message).toBe('Authentication required');
    expect(err.name).toBe('AuthenticationError');
  });

  it('accepts custom message', () => {
    const err = new AuthenticationError('Token expired');
    expect(err.message).toBe('Token expired');
  });
});

describe('AuthorizationError', () => {
  it('creates 403 error with default message', () => {
    const err = new AuthorizationError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('AUTHORIZATION_ERROR');
    expect(err.message).toBe('Access denied');
    expect(err.name).toBe('AuthorizationError');
  });

  it('accepts custom message', () => {
    const err = new AuthorizationError('Admins only');
    expect(err.message).toBe('Admins only');
  });
});

describe('NotFoundError', () => {
  it('creates 404 error with resource name', () => {
    const err = new NotFoundError('User');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('User not found');
    expect(err.name).toBe('NotFoundError');
  });

  it('creates 404 error for different resources', () => {
    expect(new NotFoundError('Question').message).toBe('Question not found');
    expect(new NotFoundError('Quiz Attempt').message).toBe('Quiz Attempt not found');
  });
});

// ─── errorHandler middleware ─────────────────────────────────────────────────

describe('errorHandler', () => {
  it('returns correct status and body for ValidationError', () => {
    const err = new ValidationError('Email required', { field: 'email' });
    const res = mockRes();
    const next = jest.fn();

    errorHandler(err, mockReq(), res as unknown as Response, next);

    expect(res._status).toBe(400);
    const body = res._json as { success: boolean; error: { code: string; message: string; details: unknown } };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('Email required');
    expect(body.error.details).toEqual({ field: 'email' });
  });

  it('returns correct status and body for AuthenticationError', () => {
    const err = new AuthenticationError('Token expired');
    const res = mockRes();

    errorHandler(err, mockReq(), res as unknown as Response, jest.fn());

    expect(res._status).toBe(401);
    const body = res._json as { success: boolean; error: { code: string } };
    expect(body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('returns correct status and body for AuthorizationError', () => {
    const err = new AuthorizationError();
    const res = mockRes();

    errorHandler(err, mockReq(), res as unknown as Response, jest.fn());

    expect(res._status).toBe(403);
    const body = res._json as { success: boolean; error: { code: string } };
    expect(body.error.code).toBe('AUTHORIZATION_ERROR');
  });

  it('returns correct status and body for NotFoundError', () => {
    const err = new NotFoundError('Question Bank');
    const res = mockRes();

    errorHandler(err, mockReq(), res as unknown as Response, jest.fn());

    expect(res._status).toBe(404);
    const body = res._json as { success: boolean; error: { code: string; message: string } };
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toBe('Question Bank not found');
  });

  it('returns 500 for unknown errors without exposing details', () => {
    const err = new Error('Database connection failed: password=secret123');
    const res = mockRes();

    errorHandler(err, mockReq(), res as unknown as Response, jest.fn());

    expect(res._status).toBe(500);
    const body = res._json as { success: boolean; error: { code: string; message: string } };
    expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(body.error.message).toBe('An unexpected error occurred');
    // Should NOT leak the real error message
    expect(body.error.message).not.toContain('Database');
    expect(body.error.message).not.toContain('secret');
  });

  it('logs error with context', () => {
    const err = new Error('Test error');
    const req = mockReq({ path: '/api/users', method: 'POST' });

    errorHandler(err, req, mockRes() as unknown as Response, jest.fn());

    expect(logger.error).toHaveBeenCalledWith('Error occurred', expect.objectContaining({
      error: 'Test error',
      path: '/api/users',
      method: 'POST',
    }));
  });

  it('logs stack trace', () => {
    const err = new Error('With stack');

    errorHandler(err, mockReq(), mockRes() as unknown as Response, jest.fn());

    expect(logger.error).toHaveBeenCalledWith('Error occurred', expect.objectContaining({
      stack: expect.stringContaining('Error: With stack'),
    }));
  });
});

// ─── validateRequiredFields ──────────────────────────────────────────────────

describe('validateRequiredFields', () => {
  it('passes when all required fields are present', () => {
    const middleware = validateRequiredFields(['name', 'email']);
    const req = mockReq({ body: { name: 'Alice', email: 'a@b.com' } });
    const next = jest.fn();

    middleware(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('calls next with ValidationError when fields are missing', () => {
    const middleware = validateRequiredFields(['name', 'email']);
    const req = mockReq({ body: { name: 'Alice' } });
    const next = jest.fn();

    middleware(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    const err = next.mock.calls[0][0] as ValidationError;
    expect(err.details?.missing).toEqual(['email']);
  });

  it('treats null as missing', () => {
    const middleware = validateRequiredFields(['name']);
    const req = mockReq({ body: { name: null } });
    const next = jest.fn();

    middleware(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
  });

  it('treats empty string as missing', () => {
    const middleware = validateRequiredFields(['name']);
    const req = mockReq({ body: { name: '' } });
    const next = jest.fn();

    middleware(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
  });

  it('treats undefined as missing', () => {
    const middleware = validateRequiredFields(['name']);
    const req = mockReq({ body: {} });
    const next = jest.fn();

    middleware(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
  });

  it('reports all missing fields', () => {
    const middleware = validateRequiredFields(['a', 'b', 'c']);
    const req = mockReq({ body: { b: 'present' } });
    const next = jest.fn();

    middleware(req, {} as Response, next);

    const err = next.mock.calls[0][0] as ValidationError;
    expect(err.details?.missing).toEqual(['a', 'c']);
  });

  it('accepts zero as a valid value', () => {
    const middleware = validateRequiredFields(['score']);
    const req = mockReq({ body: { score: 0 } });
    const next = jest.fn();

    middleware(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('accepts false as a valid value', () => {
    const middleware = validateRequiredFields(['active']);
    const req = mockReq({ body: { active: false } });
    const next = jest.fn();

    middleware(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
  });
});
