/**
 * @file        Account lockout tracking
 * @module      Utils/Lockout
 * @description Database-backed tracking of failed login attempts with timed lockout
 */

import { prisma } from '@/config/database';
import { config } from '@/config';
import logger from '@/config/logger';

/**
 * Failed attempt record for a single email address
 */
export interface ILockoutRecord {
  /** Number of consecutive failed attempts */
  attempts: number;
  /** Timestamp when lockout expires (null if not locked) */
  lockedUntil: Date | null;
  /** Timestamp of the first failed attempt in the current window */
  firstAttemptAt: Date;
}

/**
 * Get the start of the current lockout window
 */
function getWindowStart(): Date {
  return new Date(Date.now() - config.lockout.durationMinutes * 60 * 1000);
}

/**
 * Check whether an account is currently locked out
 *
 * @param email - User email address
 * @returns True if the account is locked out
 */
export async function isLockedOut(email: string): Promise<boolean> {
  const key = email.toLowerCase();
  const windowStart = getWindowStart();

  const failedCount = await prisma.loginAttempt.count({
    where: {
      email: key,
      success: false,
      createdAt: { gte: windowStart },
    },
  });

  return failedCount >= config.lockout.maxAttempts;
}

/**
 * Get the remaining lockout duration in seconds
 *
 * @param email - User email address
 * @returns Remaining seconds, or 0 if not locked
 */
export async function getLockoutRemaining(email: string): Promise<number> {
  const key = email.toLowerCase();
  const windowStart = getWindowStart();

  const failedCount = await prisma.loginAttempt.count({
    where: {
      email: key,
      success: false,
      createdAt: { gte: windowStart },
    },
  });

  if (failedCount < config.lockout.maxAttempts) {
    return 0;
  }

  // Find the oldest failed attempt in the window to calculate when lockout expires
  const oldestInWindow = await prisma.loginAttempt.findFirst({
    where: {
      email: key,
      success: false,
      createdAt: { gte: windowStart },
    },
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true },
  });

  if (!oldestInWindow) {
    return 0;
  }

  const lockoutExpiresAt = new Date(
    oldestInWindow.createdAt.getTime() + config.lockout.durationMinutes * 60 * 1000
  );

  const remaining = Math.ceil(
    (lockoutExpiresAt.getTime() - Date.now()) / 1000
  );

  return Math.max(0, remaining);
}

/**
 * Record a failed login attempt for an email address.
 * Locks the account if the threshold is reached.
 *
 * @param email - User email address
 * @returns The updated lockout record
 */
export async function recordFailedAttempt(email: string): Promise<ILockoutRecord> {
  const key = email.toLowerCase();

  // Create the failed attempt record
  await prisma.loginAttempt.create({
    data: {
      email: key,
      success: false,
    },
  });

  const windowStart = getWindowStart();

  // Count failures in the current window
  const failedCount = await prisma.loginAttempt.count({
    where: {
      email: key,
      success: false,
      createdAt: { gte: windowStart },
    },
  });

  // Find the first attempt in the window
  const firstAttempt = await prisma.loginAttempt.findFirst({
    where: {
      email: key,
      success: false,
      createdAt: { gte: windowStart },
    },
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true },
  });

  let lockedUntil: Date | null = null;

  if (failedCount >= config.lockout.maxAttempts) {
    lockedUntil = new Date(
      (firstAttempt?.createdAt ?? new Date()).getTime() +
        config.lockout.durationMinutes * 60 * 1000
    );

    logger.warn('Account locked due to failed login attempts', {
      email: key,
      attempts: failedCount,
      lockedUntil,
      durationMinutes: config.lockout.durationMinutes,
    });
  }

  return {
    attempts: failedCount,
    lockedUntil,
    firstAttemptAt: firstAttempt?.createdAt ?? new Date(),
  };
}

/**
 * Clear failed attempt tracking after a successful login.
 * Inserts a success record so the count query window resets.
 * Also deletes old failed attempts for the email to keep the table clean.
 *
 * @param email - User email address
 */
export async function clearFailedAttempts(email: string): Promise<void> {
  const key = email.toLowerCase();

  // Delete all failed attempts for this email (resets the window)
  const { count } = await prisma.loginAttempt.deleteMany({
    where: {
      email: key,
      success: false,
    },
  });

  if (count > 0) {
    logger.debug('Cleared failed login attempts', { email: key, deleted: count });
  }
}

/**
 * Get the current number of failed attempts for an email within the lockout window
 *
 * @param email - User email address
 * @returns Number of failed attempts
 */
export async function getFailedAttemptCount(email: string): Promise<number> {
  const key = email.toLowerCase();
  const windowStart = getWindowStart();

  return prisma.loginAttempt.count({
    where: {
      email: key,
      success: false,
      createdAt: { gte: windowStart },
    },
  });
}

/**
 * Delete login attempt records older than 24 hours.
 * Call from a scheduled job or at application startup.
 */
export async function cleanupOldAttempts(): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const { count } = await prisma.loginAttempt.deleteMany({
    where: {
      createdAt: { lt: cutoff },
    },
  });

  if (count > 0) {
    logger.debug('Cleaned up old login attempt records', { deleted: count });
  }

  return count;
}

/**
 * Clear all lockout records (used for testing)
 */
export async function clearAllLockouts(): Promise<void> {
  await prisma.loginAttempt.deleteMany({});
}
