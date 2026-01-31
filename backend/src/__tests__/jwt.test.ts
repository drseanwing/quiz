/**
 * Tests for JWT utility functions
 */
import {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  extractTokenFromHeader,
} from '../utils/jwt';

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  role: 'STUDENT' as const,
};

describe('extractTokenFromHeader', () => {
  it('extracts token from valid Bearer header', () => {
    expect(extractTokenFromHeader('Bearer abc123')).toBe('abc123');
  });

  it('returns null for undefined', () => {
    expect(extractTokenFromHeader(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractTokenFromHeader('')).toBeNull();
  });

  it('returns null for non-Bearer scheme', () => {
    expect(extractTokenFromHeader('Basic abc123')).toBeNull();
  });

  it('returns null for missing token', () => {
    expect(extractTokenFromHeader('Bearer')).toBeNull();
  });

  it('returns null for too many parts', () => {
    expect(extractTokenFromHeader('Bearer abc 123')).toBeNull();
  });

  it('is case-sensitive on Bearer keyword', () => {
    expect(extractTokenFromHeader('bearer abc123')).toBeNull();
  });
});

describe('generateAccessToken', () => {
  it('generates a valid JWT string', () => {
    const token = generateAccessToken(mockUser);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);
  });

  it('generates token that can be verified', () => {
    const token = generateAccessToken(mockUser);
    const result = verifyAccessToken(token);
    expect(result.valid).toBe(true);
    expect(result.payload?.userId).toBe('user-123');
    expect(result.payload?.email).toBe('test@example.com');
    expect(result.payload?.role).toBe('STUDENT');
    expect(result.payload?.type).toBe('access');
  });
});

describe('generateRefreshToken', () => {
  it('generates a valid JWT string', () => {
    const token = generateRefreshToken(mockUser);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);
  });

  it('generates token that can be verified as refresh', () => {
    const token = generateRefreshToken(mockUser);
    const result = verifyRefreshToken(token);
    expect(result.valid).toBe(true);
    expect(result.payload?.type).toBe('refresh');
    expect(result.payload?.userId).toBe('user-123');
  });
});

describe('generateTokenPair', () => {
  it('returns both tokens and expiresIn', () => {
    const pair = generateTokenPair(mockUser);
    expect(pair.accessToken).toBeTruthy();
    expect(pair.refreshToken).toBeTruthy();
    expect(typeof pair.expiresIn).toBe('number');
    expect(pair.expiresIn).toBeGreaterThan(0);
  });

  it('access and refresh tokens are different', () => {
    const pair = generateTokenPair(mockUser);
    expect(pair.accessToken).not.toBe(pair.refreshToken);
  });
});

describe('verifyAccessToken', () => {
  it('returns valid for correct access token', () => {
    const token = generateAccessToken(mockUser);
    const result = verifyAccessToken(token);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('rejects refresh token as access token', () => {
    const token = generateRefreshToken(mockUser);
    const result = verifyAccessToken(token);
    // Refresh token uses a different secret, so it should fail verification
    expect(result.valid).toBe(false);
  });

  it('rejects tampered token', () => {
    const token = generateAccessToken(mockUser);
    const tampered = token.slice(0, -5) + 'XXXXX';
    const result = verifyAccessToken(tampered);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid token');
  });

  it('rejects garbage string', () => {
    const result = verifyAccessToken('not-a-jwt');
    expect(result.valid).toBe(false);
  });
});

describe('verifyRefreshToken', () => {
  it('returns valid for correct refresh token', () => {
    const token = generateRefreshToken(mockUser);
    const result = verifyRefreshToken(token);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('rejects access token as refresh token', () => {
    const token = generateAccessToken(mockUser);
    const result = verifyRefreshToken(token);
    // Access token uses a different secret, so it should fail verification
    expect(result.valid).toBe(false);
  });

  it('rejects tampered token', () => {
    const token = generateRefreshToken(mockUser);
    const tampered = token.slice(0, -5) + 'XXXXX';
    const result = verifyRefreshToken(tampered);
    expect(result.valid).toBe(false);
  });
});
