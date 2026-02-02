/**
 * @file        User Service
 * @module      Services/User
 * @description User management business logic for profile and admin operations
 */

import { User, UserRole, Prisma } from '@prisma/client';
import prisma from '@/config/database';
import logger from '@/config/logger';
import { hashPassword, verifyPassword, validatePasswordStrength } from '@/utils/password';
import {
  ValidationError,
  AuthenticationError,
  NotFoundError,
  AppError,
} from '@/middleware/errorHandler';

/**
 * User without the password hash, safe for API responses
 */
export type SafeUser = Omit<User, 'passwordHash'>;

/**
 * Pagination parameters
 */
export interface IPaginationParams {
  page: number;
  pageSize: number;
}

/**
 * Paginated result
 */
export interface IPaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

/**
 * User list filter parameters
 */
export interface IUserListFilters {
  search?: string;
  role?: UserRole;
  isActive?: boolean;
}

/**
 * Update profile request data
 */
export interface IUpdateProfileRequest {
  firstName?: string;
  surname?: string;
  idNumber?: string | null;
}

/**
 * Change password request data
 */
export interface IChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * Admin create user request data
 */
export interface IAdminCreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  surname: string;
  idNumber?: string;
  role?: UserRole;
}

/**
 * Admin update user request data
 */
export interface IAdminUpdateUserRequest {
  firstName?: string;
  surname?: string;
  idNumber?: string | null;
  role?: UserRole;
  isActive?: boolean;
}

/**
 * Strip password hash from user object
 */
function toSafeUser(user: User): SafeUser {
  const { passwordHash: _, ...safe } = user;
  return safe;
}

/**
 * Get current user profile
 *
 * @param userId - Authenticated user's ID
 * @returns User profile without password hash
 * @throws NotFoundError if user not found
 */
export async function getCurrentUser(userId: string): Promise<SafeUser> {
  logger.debug('Fetching current user profile', { userId });

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  return toSafeUser(user);
}

/**
 * Update current user profile
 *
 * @param userId - Authenticated user's ID
 * @param data - Profile update data
 * @returns Updated user profile
 * @throws NotFoundError if user not found
 */
export async function updateCurrentUser(
  userId: string,
  data: IUpdateProfileRequest
): Promise<SafeUser> {
  logger.debug('Updating user profile', { userId });

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      firstName: data.firstName ?? user.firstName,
      surname: data.surname ?? user.surname,
      idNumber: data.idNumber !== undefined ? data.idNumber : user.idNumber,
    },
  });

  logger.info('User profile updated', {
    userId,
    fields: Object.keys(data),
  });

  return toSafeUser(updated);
}

/**
 * Change user password
 *
 * @param userId - Authenticated user's ID
 * @param data - Current and new password
 * @returns Success message
 * @throws AuthenticationError if current password is wrong
 * @throws ValidationError if new password is too weak
 */
export async function changePassword(
  userId: string,
  data: IChangePasswordRequest
): Promise<{ message: string }> {
  logger.debug('Password change requested', { userId });

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  // Verify current password
  const isValid = await verifyPassword(data.currentPassword, user.passwordHash);
  if (!isValid) {
    logger.warn('Password change failed: Current password incorrect', { userId });
    throw new AuthenticationError('Current password is incorrect');
  }

  // Validate new password strength
  const validation = validatePasswordStrength(data.newPassword);
  if (!validation.valid) {
    throw new ValidationError(validation.errors[0] || 'New password is too weak', {
      errors: validation.errors,
    });
  }

  const passwordHash = await hashPassword(data.newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  // Revoke all existing refresh tokens to invalidate other sessions
  await prisma.refreshToken.updateMany({
    where: { userId, revoked: false },
    data: { revoked: true },
  });

  logger.info('Password changed successfully', { userId });

  return { message: 'Password changed successfully' };
}

/**
 * List all users with filtering and pagination (admin only)
 *
 * @param filters - Search, role, and active status filters
 * @param pagination - Page number and page size
 * @returns Paginated user list
 */
export async function listUsers(
  filters: IUserListFilters,
  pagination: IPaginationParams
): Promise<IPaginatedResult<SafeUser>> {
  logger.debug('Listing users', { filters, pagination });

  const where: Prisma.UserWhereInput = {};

  if (filters.search) {
    where.OR = [
      { email: { contains: filters.search, mode: 'insensitive' } },
      { firstName: { contains: filters.search, mode: 'insensitive' } },
      { surname: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  if (filters.role) {
    where.role = filters.role;
  }

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  const [users, totalCount] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: users.map(toSafeUser),
    meta: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pagination.pageSize),
    },
  };
}

/**
 * Get user by ID (admin only)
 *
 * @param userId - Target user ID
 * @returns User profile without password hash
 * @throws NotFoundError if user not found
 */
export async function getUserById(userId: string): Promise<SafeUser> {
  logger.debug('Fetching user by ID', { userId });

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  return toSafeUser(user);
}

/**
 * Create a new user (admin only)
 *
 * @param data - User creation data
 * @returns Created user profile
 * @throws AppError if email already exists
 * @throws ValidationError if password is too weak
 */
export async function createUser(data: IAdminCreateUserRequest): Promise<SafeUser> {
  logger.info('Admin creating user', { email: data.email, role: data.role || 'USER' });

  // Check for existing user
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    throw new AppError('USER_EXISTS', 'An account with this email already exists', 400);
  }

  // Validate password
  const validation = validatePasswordStrength(data.password);
  if (!validation.valid) {
    throw new ValidationError(validation.errors[0] || 'Password is too weak', {
      errors: validation.errors,
    });
  }

  const passwordHash = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      surname: data.surname,
      idNumber: data.idNumber ?? null,
      role: data.role || UserRole.USER,
      isActive: true,
    },
  });

  logger.info('User created by admin', {
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return toSafeUser(user);
}

/**
 * Update a user (admin only)
 *
 * @param userId - Target user ID
 * @param data - User update data
 * @returns Updated user profile
 * @throws NotFoundError if user not found
 */
export async function updateUser(
  userId: string,
  data: IAdminUpdateUserRequest
): Promise<SafeUser> {
  logger.debug('Admin updating user', { userId, fields: Object.keys(data) });

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  const updateData: Prisma.UserUpdateInput = {};

  if (data.firstName !== undefined) updateData.firstName = data.firstName;
  if (data.surname !== undefined) updateData.surname = data.surname;
  if (data.idNumber !== undefined) updateData.idNumber = data.idNumber;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  logger.info('User updated by admin', {
    userId,
    fields: Object.keys(data),
  });

  return toSafeUser(updated);
}

/**
 * Deactivate a user account (admin only)
 *
 * @param userId - Target user ID
 * @returns Deactivated user profile
 * @throws NotFoundError if user not found
 */
export async function deactivateUser(userId: string): Promise<SafeUser> {
  logger.debug('Deactivating user', { userId });

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  if (!user.isActive) {
    throw new AppError('ALREADY_DEACTIVATED', 'User account is already deactivated', 400);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
  });

  logger.info('User deactivated', { userId, email: user.email });

  return toSafeUser(updated);
}

/**
 * Reset a user's password (admin only)
 *
 * @param userId - Target user ID
 * @param newPassword - New password to set
 * @returns Success message
 * @throws NotFoundError if user not found
 * @throws ValidationError if new password is too weak
 */
export async function adminResetPassword(
  userId: string,
  newPassword: string
): Promise<{ message: string }> {
  logger.debug('Admin password reset requested', { userId });

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  const validation = validatePasswordStrength(newPassword);
  if (!validation.valid) {
    throw new ValidationError(validation.errors[0] || 'Password is too weak', {
      errors: validation.errors,
    });
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  logger.info('Password reset by admin', { userId, email: user.email });

  return { message: 'Password has been reset successfully' };
}
