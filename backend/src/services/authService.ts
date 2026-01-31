/**
 * @file        Authentication Service
 * @module      Services/Auth
 * @description User authentication, registration, and password management
 */

import { User, UserRole } from '@prisma/client';
import prisma from '@/config/database';
import { config } from '@/config';
import logger from '@/config/logger';
import { hashPassword, verifyPassword, validatePasswordStrength } from '@/utils/password';
import { generateTokenPair, verifyRefreshToken, ITokenPair } from '@/utils/jwt';
import {
  ValidationError,
  AuthenticationError,
  NotFoundError,
  AppError,
} from '@/middleware/errorHandler';
import {
  isLockedOut,
  recordFailedAttempt,
  clearFailedAttempts,
  getLockoutRemaining,
} from '@/utils/lockout';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '@/services/emailService';

/**
 * User registration request data
 */
export interface IRegisterRequest {
  email: string;
  password: string;
  firstName: string;
  surname: string;
  idNumber?: string;
}

/**
 * Login request data
 */
export interface ILoginRequest {
  email: string;
  password: string;
}

/**
 * Token refresh request data
 */
export interface ITokenRefreshRequest {
  refreshToken: string;
}

/**
 * Password reset request data
 */
export interface IPasswordResetRequest {
  email: string;
}

/**
 * Password reset completion data
 */
export interface IPasswordResetCompletion {
  token: string;
  password: string;
}

/**
 * Auth response with user and tokens
 */
export interface IAuthResponse {
  user: Omit<User, 'passwordHash'>;
  tokens: ITokenPair;
}

/**
 * Password reset response
 */
export interface IPasswordResetResponse {
  message: string;
  resetToken?: string; // Only in development/test
}

/**
 * Register a new user account
 *
 * @param data - User registration data
 * @returns Created user and authentication tokens
 * @throws ValidationError if validation fails
 * @throws AppError if user already exists
 *
 * @example
 * const result = await registerUser({
 *   email: 'user@health.qld.gov.au',
 *   password: 'SecurePass123',
 *   firstName: 'John',
 *   surname: 'Doe'
 * });
 */
export async function registerUser(data: IRegisterRequest): Promise<IAuthResponse> {
  // Self-registration always creates USER role - admin accounts must be created
  // by an existing admin via the admin user management endpoints
  const role = UserRole.USER;

  logger.info('User registration initiated', {
    email: data.email,
    role,
  });

  // Validate password strength
  const passwordValidation = validatePasswordStrength(data.password);
  if (!passwordValidation.valid) {
    logger.debug('Password validation failed', {
      email: data.email,
      errors: passwordValidation.errors,
    });
    throw new ValidationError(passwordValidation.errors[0] || 'Password is too weak', {
      errors: passwordValidation.errors,
    });
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase() },
  });

  if (existingUser) {
    logger.warn('Registration failed: User already exists', {
      email: data.email,
    });
    throw new AppError('USER_EXISTS', 'An account with this email already exists', 400);
  }

  // Hash password
  const passwordHash = await hashPassword(data.password);

  // Create user
  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      passwordHash,
      firstName: data.firstName,
      surname: data.surname,
      idNumber: data.idNumber,
      role,
      isActive: true,
    },
  });

  logger.info('User registered successfully', {
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  // Generate authentication tokens
  const tokens = generateTokenPair(user);

  // Remove password hash from response
  const { passwordHash: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    tokens,
  };
}

/**
 * Login with email and password
 *
 * @param data - Login credentials
 * @param ipAddress - Client IP address for audit logging
 * @returns User data and authentication tokens
 * @throws AuthenticationError if credentials are invalid
 *
 * @example
 * const result = await loginUser({
 *   email: 'user@health.qld.gov.au',
 *   password: 'SecurePass123'
 * }, req.ip);
 */
export async function loginUser(
  data: ILoginRequest,
  ipAddress?: string,
  userAgent?: string
): Promise<IAuthResponse> {
  logger.info('Login attempt', {
    email: data.email,
    ip: ipAddress,
  });

  // Check account lockout before attempting login
  if (isLockedOut(data.email)) {
    const remaining = getLockoutRemaining(data.email);
    logger.warn('Login blocked: Account locked', {
      email: data.email,
      ip: ipAddress,
      remainingSeconds: remaining,
    });
    throw new AuthenticationError(
      `Account is temporarily locked. Try again in ${Math.ceil(remaining / 60)} minutes`
    );
  }

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase() },
  });

  // Always perform bcrypt operation to prevent timing attacks
  // Use dummy hash if user doesn't exist to maintain consistent timing
  const passwordHash = user?.passwordHash || '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYAJZTQQe/G';
  const isPasswordValid = await verifyPassword(data.password, passwordHash);

  // Check all conditions after password verification to maintain timing consistency
  if (!user || !isPasswordValid) {
    // Record failed attempt for lockout tracking
    recordFailedAttempt(data.email);

    // Audit log: failed login attempt
    await prisma.auditLog.create({
      data: {
        userId: user?.id ?? null,
        action: 'LOGIN_FAILED',
        entityType: 'User',
        entityId: user?.id ?? null,
        details: { email: data.email, reason: !user ? 'user_not_found' : 'invalid_password' },
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      },
    }).catch((err) => {
      logger.error('Failed to create audit log for login failure', { error: err });
    });

    logger.warn('Login failed', {
      email: data.email,
      ip: ipAddress,
      reason: !user ? 'user_not_found' : 'invalid_password',
    });
    throw new AuthenticationError('Invalid email or password');
  }

  // Check if user is active
  if (!user.isActive) {
    logger.warn('Login failed: User account deactivated', {
      userId: user.id,
      email: user.email,
      ip: ipAddress,
    });
    throw new AuthenticationError('User account is deactivated');
  }

  // Clear failed attempts on successful login
  clearFailedAttempts(data.email);

  // Update last login timestamp
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Audit log: successful login
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      entityType: 'User',
      entityId: user.id,
      details: { email: user.email },
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    },
  }).catch((err) => {
    logger.error('Failed to create audit log for login success', { error: err });
  });

  logger.info('Login successful', {
    userId: user.id,
    email: user.email,
    role: user.role,
    ip: ipAddress,
  });

  // Generate authentication tokens
  const tokens = generateTokenPair(user);

  // Remove password hash from response
  const { passwordHash: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    tokens,
  };
}

/**
 * Refresh access token using refresh token
 *
 * @param data - Refresh token data
 * @returns New token pair
 * @throws AuthenticationError if refresh token is invalid
 *
 * @example
 * const tokens = await refreshAccessToken({
 *   refreshToken: 'eyJhbGciOi...'
 * });
 */
export async function refreshAccessToken(data: ITokenRefreshRequest): Promise<ITokenPair> {
  logger.debug('Token refresh requested');

  // Verify refresh token
  const result = verifyRefreshToken(data.refreshToken);

  if (!result.valid || !result.payload) {
    logger.warn('Token refresh failed: Invalid refresh token', {
      error: result.error,
    });
    throw new AuthenticationError(result.error || 'Invalid refresh token');
  }

  // Get current user data
  const user = await prisma.user.findUnique({
    where: { id: result.payload.userId },
    select: { id: true, email: true, role: true, isActive: true },
  });

  if (!user) {
    logger.warn('Token refresh failed: User not found', {
      userId: result.payload.userId,
    });
    throw new AuthenticationError('User account not found');
  }

  if (!user.isActive) {
    logger.warn('Token refresh failed: User account deactivated', {
      userId: user.id,
      email: user.email,
    });
    throw new AuthenticationError('User account is deactivated');
  }

  logger.info('Token refreshed successfully', {
    userId: user.id,
    email: user.email,
  });

  // Generate new token pair
  return generateTokenPair(user);
}

/**
 * Logout user (invalidate refresh token)
 * Note: JWT tokens cannot be truly invalidated without a blacklist
 * This is a placeholder for future token blacklist implementation
 *
 * @param userId - User ID
 *
 * @example
 * await logoutUser(req.user.userId);
 */
export async function logoutUser(userId: string): Promise<void> {
  logger.info('User logout', {
    userId,
  });

  // TODO: Implement refresh token blacklist
  // For now, we rely on client-side token removal

  // Update last activity timestamp
  await prisma.user.update({
    where: { id: userId },
    data: { updatedAt: new Date() },
  });
}

/**
 * Request password reset (send reset token)
 *
 * @param data - Password reset request data
 * @returns Reset token (only in development/test for security reasons)
 * @throws NotFoundError if user not found
 *
 * @example
 * const result = await requestPasswordReset({
 *   email: 'user@health.qld.gov.au'
 * });
 */
export async function requestPasswordReset(
  data: IPasswordResetRequest
): Promise<IPasswordResetResponse> {
  logger.info('Password reset requested', {
    email: data.email,
  });

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase() },
  });

  if (!user) {
    // Don't reveal if user exists for security reasons
    logger.debug('Password reset requested for non-existent user', {
      email: data.email,
    });
    return {
      message: 'If an account exists with this email, a password reset link has been sent',
    };
  }

  if (!user.isActive) {
    logger.warn('Password reset requested for deactivated account', {
      userId: user.id,
      email: user.email,
    });
    return {
      message: 'If an account exists with this email, a password reset link has been sent',
    };
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Hash token before storing (security: prevents token exposure if DB compromised)
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  // Store hashed reset token
  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      token: hashedToken,
      expiresAt,
    },
  });

  logger.info('Password reset token generated', {
    userId: user.id,
    email: user.email,
    expiresAt,
  });

  // Send password reset email - await to ensure delivery
  try {
    const emailSent = await sendPasswordResetEmail(user.email, resetToken);
    if (!emailSent) {
      logger.error('Password reset email delivery failed', {
        userId: user.id,
        email: user.email,
      });
    }
  } catch (err) {
    logger.error('Failed to send password reset email', {
      userId: user.id,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }

  const response: IPasswordResetResponse = {
    message: 'If an account exists with this email, a password reset link has been sent',
  };

  // Also return token in development/test for testing convenience
  if (config.isDevelopment || config.isTest) {
    response.resetToken = resetToken;
  }

  return response;
}

/**
 * Complete password reset with token
 *
 * @param data - Password reset completion data
 * @returns Success message
 * @throws ValidationError if password is invalid
 * @throws AuthenticationError if token is invalid or expired
 *
 * @example
 * await resetPassword({
 *   token: 'abc123...',
 *   password: 'NewSecurePass123'
 * });
 */
export async function resetPassword(
  data: IPasswordResetCompletion
): Promise<{ message: string }> {
  logger.info('Password reset completion requested');

  // Validate new password strength
  const passwordValidation = validatePasswordStrength(data.password);
  if (!passwordValidation.valid) {
    logger.debug('Password reset failed: Weak password', {
      errors: passwordValidation.errors,
    });
    throw new ValidationError(passwordValidation.errors[0] || 'Password is too weak', {
      errors: passwordValidation.errors,
    });
  }

  // Hash incoming token to match stored hash
  const hashedToken = crypto.createHash('sha256').update(data.token).digest('hex');

  // Find valid reset token
  const resetRecord = await prisma.passwordReset.findUnique({
    where: { token: hashedToken },
    include: { user: true },
  });

  if (!resetRecord) {
    logger.warn('Password reset failed: Invalid token');
    throw new AuthenticationError('Invalid or expired reset token');
  }

  // Check if token is used
  if (resetRecord.usedAt) {
    logger.warn('Password reset failed: Token already used', {
      userId: resetRecord.userId,
    });
    throw new AuthenticationError('Reset token has already been used');
  }

  // Check if token is expired
  if (resetRecord.expiresAt < new Date()) {
    logger.warn('Password reset failed: Token expired', {
      userId: resetRecord.userId,
      expiresAt: resetRecord.expiresAt,
    });
    throw new AuthenticationError('Reset token has expired');
  }

  // Check if user is active
  if (!resetRecord.user.isActive) {
    logger.warn('Password reset failed: User account deactivated', {
      userId: resetRecord.userId,
    });
    throw new AuthenticationError('User account is deactivated');
  }

  // Hash new password
  const passwordHash = await hashPassword(data.password);

  // Update password and mark token as used
  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash },
    }),
    prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() },
    }),
  ]);

  logger.info('Password reset completed successfully', {
    userId: resetRecord.userId,
    email: resetRecord.user.email,
  });

  return {
    message: 'Password has been reset successfully',
  };
}

/**
 * Login using invite token
 *
 * @param token - Invite token
 * @param password - User's chosen password
 * @returns User data and authentication tokens
 * @throws AuthenticationError if token is invalid or expired
 *
 * @example
 * const result = await loginWithToken('abc123...', 'SecurePass123');
 */
export async function loginWithToken(
  token: string,
  password?: string
): Promise<IAuthResponse> {
  logger.info('Token-based login requested');

  // Find valid invite token
  const inviteRecord = await prisma.inviteToken.findUnique({
    where: { token },
  });

  if (!inviteRecord) {
    logger.warn('Token login failed: Invalid token');
    throw new AuthenticationError('Invalid or expired invite token');
  }

  // Check if token is used
  if (inviteRecord.usedAt) {
    logger.warn('Token login failed: Token already used', {
      email: inviteRecord.email,
    });
    throw new AuthenticationError('Invite token has already been used');
  }

  // Check if token is expired
  if (inviteRecord.expiresAt < new Date()) {
    logger.warn('Token login failed: Token expired', {
      email: inviteRecord.email,
      expiresAt: inviteRecord.expiresAt,
    });
    throw new AuthenticationError('Invite token has expired');
  }

  // Check if user already exists
  let user = await prisma.user.findUnique({
    where: { email: inviteRecord.email.toLowerCase() },
  });

  if (user) {
    // Existing user: require password verification to prevent auth bypass
    if (!password) {
      throw new AuthenticationError('Password is required');
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      logger.warn('Token login failed: Invalid password for existing user', {
        email: inviteRecord.email,
      });
      throw new AuthenticationError('Invalid password');
    }
  } else if (password) {
    // New user: validate password strength and create account
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      logger.debug('Token login failed: Weak password', {
        email: inviteRecord.email,
        errors: passwordValidation.errors,
      });
      throw new ValidationError(passwordValidation.errors[0] || 'Password is too weak', {
        errors: passwordValidation.errors,
      });
    }

    logger.info('Auto-creating user account from invite token', {
      email: inviteRecord.email,
    });

    const passwordHash = await hashPassword(password);

    user = await prisma.user.create({
      data: {
        email: inviteRecord.email.toLowerCase(),
        passwordHash,
        firstName: inviteRecord.firstName || 'User',
        surname: inviteRecord.surname || 'Account',
        role: UserRole.USER,
        isActive: true,
      },
    });
  } else {
    throw new AuthenticationError('Password required for new account');
  }

  if (!user.isActive) {
    logger.warn('Token login failed: User account deactivated', {
      userId: user.id,
      email: user.email,
    });
    throw new AuthenticationError('User account is deactivated');
  }

  // Mark invite token as used
  await prisma.inviteToken.update({
    where: { id: inviteRecord.id },
    data: { usedAt: new Date() },
  });

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  logger.info('Token login successful', {
    userId: user.id,
    email: user.email,
  });

  // Generate authentication tokens
  const tokens = generateTokenPair(user);

  // Remove password hash from response
  const { passwordHash: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    tokens,
  };
}
