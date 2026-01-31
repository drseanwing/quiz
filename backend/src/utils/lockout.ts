/**
 * @file        Account lockout tracking
 * @module      Utils/Lockout
 * @description In-memory tracking of failed login attempts with timed lockout
 */

import { config } from '@/config';
import logger from '@/config/logger';

/**
 * Failed attempt record for a single email address
 */
interface ILockoutRecord {
  /** Number of consecutive failed attempts */
  attempts: number;
  /** Timestamp when lockout expires (null if not locked) */
  lockedUntil: Date | null;
  /** Timestamp of the first failed attempt in the current window */
  firstAttemptAt: Date;
}

/**
 * In-memory store of failed login attempts keyed by lowercase email
 */
const lockoutStore = new Map<string, ILockoutRecord>();

/**
 * Check whether an account is currently locked out
 *
 * @param email - User email address
 * @returns True if the account is locked out
 */
export function isLockedOut(email: string): boolean {
  const key = email.toLowerCase();
  const record = lockoutStore.get(key);

  if (!record || !record.lockedUntil) {
    return false;
  }

  if (record.lockedUntil > new Date()) {
    return true;
  }

  // Lockout has expired — clear the record
  lockoutStore.delete(key);
  return false;
}

/**
 * Get the remaining lockout duration in seconds
 *
 * @param email - User email address
 * @returns Remaining seconds, or 0 if not locked
 */
export function getLockoutRemaining(email: string): number {
  const key = email.toLowerCase();
  const record = lockoutStore.get(key);

  if (!record || !record.lockedUntil) {
    return 0;
  }

  const remaining = Math.ceil(
    (record.lockedUntil.getTime() - Date.now()) / 1000
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
export function recordFailedAttempt(email: string): ILockoutRecord {
  const key = email.toLowerCase();
  const existing = lockoutStore.get(key);

  const now = new Date();
  let record: ILockoutRecord;

  if (existing && !existing.lockedUntil) {
    record = {
      attempts: existing.attempts + 1,
      lockedUntil: null,
      firstAttemptAt: existing.firstAttemptAt,
    };
  } else {
    record = {
      attempts: 1,
      lockedUntil: null,
      firstAttemptAt: now,
    };
  }

  // Check if threshold reached
  if (record.attempts >= config.lockout.maxAttempts) {
    const lockoutMs = config.lockout.durationMinutes * 60 * 1000;
    record.lockedUntil = new Date(Date.now() + lockoutMs);

    logger.warn('Account locked due to failed login attempts', {
      email: key,
      attempts: record.attempts,
      lockedUntil: record.lockedUntil,
      durationMinutes: config.lockout.durationMinutes,
    });
  }

  lockoutStore.set(key, record);
  return record;
}

/**
 * Clear failed attempt tracking after a successful login
 *
 * @param email - User email address
 */
export function clearFailedAttempts(email: string): void {
  const key = email.toLowerCase();
  if (lockoutStore.has(key)) {
    lockoutStore.delete(key);
    logger.debug('Cleared failed login attempts', { email: key });
  }
}

/**
 * Get the current number of failed attempts for an email
 *
 * @param email - User email address
 * @returns Number of failed attempts
 */
export function getFailedAttemptCount(email: string): number {
  const key = email.toLowerCase();
  const record = lockoutStore.get(key);
  return record?.attempts ?? 0;
}

/**
 * Purge expired lockout records to prevent unbounded memory growth.
 */
function purgeExpiredRecords(): void {
  const now = new Date();
  let purged = 0;
  for (const [key, record] of lockoutStore) {
    if (record.lockedUntil && record.lockedUntil <= now) {
      lockoutStore.delete(key);
      purged++;
    }
  }
  if (purged > 0) {
    logger.debug('Purged expired lockout records', { purged, remaining: lockoutStore.size });
  }
}

// Periodic cleanup every 10 minutes
const purgeTimer = setInterval(purgeExpiredRecords, 10 * 60 * 1000);
purgeTimer.unref(); // Don't keep process alive for cleanup

/**
 * Clear all lockout records (used for testing)
 */
export function clearAllLockouts(): void {
  lockoutStore.clear();
}
