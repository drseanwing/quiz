/**
 * @file        JWT Utilities
 * @module      Utils/JWT
 * @description JWT token generation, verification, and management
 */

import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { config } from '@/config';
import logger from '@/config/logger';
import { User, UserRole } from '@prisma/client';

/**
 * JWT token payload interface
 */
export interface ITokenPayload {
  /** User ID */
  userId: string;
  /** User email */
  email: string;
  /** User role */
  role: UserRole;
  /** Token type (access or refresh) */
  type: 'access' | 'refresh';
  /** Issued at timestamp */
  iat?: number;
  /** Expiration timestamp */
  exp?: number;
}

/**
 * JWT verification result
 */
export interface ITokenVerifyResult {
  /** Whether verification succeeded */
  valid: boolean;
  /** Decoded payload if valid */
  payload?: ITokenPayload;
  /** Error message if invalid */
  error?: string;
}

/**
 * JWT token pair
 */
export interface ITokenPair {
  /** Access token (short-lived) */
  accessToken: string;
  /** Refresh token (long-lived) */
  refreshToken: string;
  /** Access token expiry in seconds */
  expiresIn: number;
}

/**
 * Generate an access JWT token for a user
 *
 * @param user - User object or partial user data
 * @returns Signed JWT access token
 *
 * @example
 * const token = generateAccessToken(user);
 * // Returns: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 */
export function generateAccessToken(user: Pick<User, 'id' | 'email' | 'role'>): string {
  const payload: Omit<ITokenPayload, 'iat' | 'exp'> = {
    userId: user.id,
    email: user.email,
    role: user.role,
    type: 'access',
  };

  const token = jwt.sign(payload, config.jwt.secret as Secret, {
    expiresIn: config.jwt.expiresIn,
  } as SignOptions);

  logger.debug('Generated access token', {
    userId: user.id,
    email: user.email,
    expiresIn: config.jwt.expiresIn,
  });

  return token;
}

/**
 * Generate a refresh JWT token for a user
 *
 * @param user - User object or partial user data
 * @returns Signed JWT refresh token
 *
 * @example
 * const refreshToken = generateRefreshToken(user);
 * // Returns: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 */
export function generateRefreshToken(user: Pick<User, 'id' | 'email' | 'role'>): string {
  const payload: Omit<ITokenPayload, 'iat' | 'exp'> = {
    userId: user.id,
    email: user.email,
    role: user.role,
    type: 'refresh',
  };

  const token = jwt.sign(payload, config.jwt.refreshSecret as Secret, {
    expiresIn: config.jwt.refreshExpiresIn,
  } as SignOptions);

  logger.debug('Generated refresh token', {
    userId: user.id,
    email: user.email,
    expiresIn: config.jwt.refreshExpiresIn,
  });

  return token;
}

/**
 * Generate both access and refresh tokens for a user
 *
 * @param user - User object or partial user data
 * @returns Token pair with access token, refresh token, and expiry
 *
 * @example
 * const tokens = generateTokenPair(user);
 * // Returns: { accessToken: "...", refreshToken: "...", expiresIn: 3600 }
 */
export function generateTokenPair(user: Pick<User, 'id' | 'email' | 'role'>): ITokenPair {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // Calculate expiry in seconds
  const expiresIn = parseExpiryToSeconds(config.jwt.expiresIn);

  logger.info('Generated token pair', {
    userId: user.id,
    email: user.email,
  });

  return {
    accessToken,
    refreshToken,
    expiresIn,
  };
}

/**
 * Verify and decode a JWT access token
 *
 * @param token - JWT token string
 * @returns Verification result with payload if valid
 *
 * @example
 * const result = verifyAccessToken(token);
 * if (result.valid) {
 *   console.log('User ID:', result.payload.userId);
 * }
 */
export function verifyAccessToken(token: string): ITokenVerifyResult {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as ITokenPayload;

    // Validate token type
    if (decoded.type !== 'access') {
      logger.warn('Invalid token type for access token', {
        tokenType: decoded.type,
      });
      return {
        valid: false,
        error: 'Invalid token type',
      };
    }

    logger.debug('Access token verified successfully', {
      userId: decoded.userId,
      email: decoded.email,
    });

    return {
      valid: true,
      payload: decoded,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.debug('Access token expired', {
        expiredAt: error.expiredAt,
      });
      return {
        valid: false,
        error: 'Token expired',
      };
    }

    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid access token', {
        error: error.message,
      });
      return {
        valid: false,
        error: 'Invalid token',
      };
    }

    logger.error('Error verifying access token', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      valid: false,
      error: 'Token verification failed',
    };
  }
}

/**
 * Verify and decode a JWT refresh token
 *
 * @param token - JWT refresh token string
 * @returns Verification result with payload if valid
 *
 * @example
 * const result = verifyRefreshToken(refreshToken);
 * if (result.valid) {
 *   // Generate new access token
 * }
 */
export function verifyRefreshToken(token: string): ITokenVerifyResult {
  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret) as ITokenPayload;

    // Validate token type
    if (decoded.type !== 'refresh') {
      logger.warn('Invalid token type for refresh token', {
        tokenType: decoded.type,
      });
      return {
        valid: false,
        error: 'Invalid token type',
      };
    }

    logger.debug('Refresh token verified successfully', {
      userId: decoded.userId,
      email: decoded.email,
    });

    return {
      valid: true,
      payload: decoded,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.debug('Refresh token expired', {
        expiredAt: error.expiredAt,
      });
      return {
        valid: false,
        error: 'Refresh token expired',
      };
    }

    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid refresh token', {
        error: error.message,
      });
      return {
        valid: false,
        error: 'Invalid refresh token',
      };
    }

    logger.error('Error verifying refresh token', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      valid: false,
      error: 'Token verification failed',
    };
  }
}

/**
 * Parse expiry string (e.g., "1h", "7d") to seconds
 *
 * @param expiry - Expiry string in JWT format
 * @returns Number of seconds
 *
 * @example
 * parseExpiryToSeconds("1h")  // Returns: 3600
 * parseExpiryToSeconds("7d")  // Returns: 604800
 */
function parseExpiryToSeconds(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);

  if (!match) {
    logger.warn('Invalid expiry format, defaulting to 1 hour', { expiry });
    return 3600;
  }

  const [, value, unit] = match;

  if (!value || !unit) {
    logger.warn('Invalid expiry format components, defaulting to 1 hour', { expiry });
    return 3600;
  }

  const numValue = parseInt(value, 10);

  const units: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };

  return numValue * (units[unit] || 3600);
}

/**
 * Extract token from Authorization header
 *
 * @param authHeader - Authorization header value
 * @returns Extracted token or null
 *
 * @example
 * const token = extractTokenFromHeader("Bearer eyJhbGciOi...");
 * // Returns: "eyJhbGciOi..."
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    logger.debug('Invalid Authorization header format');
    return null;
  }

  return parts[1] ?? null;
}
