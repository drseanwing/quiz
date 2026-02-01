/**
 * @file        Password Utilities
 * @module      Utils/Password
 * @description Password hashing, verification, and strength validation
 */

import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { config } from '@/config';
import logger from '@/config/logger';

/**
 * Bcrypt cost factor (work factor)
 * Higher values = more secure but slower
 * Default: 12 (recommended for production)
 */
const BCRYPT_ROUNDS = 12;

/**
 * Password validation result
 */
export interface IPasswordValidationResult {
  /** Whether password is valid */
  valid: boolean;
  /** Error messages if invalid */
  errors: string[];
}

/**
 * Hash a password using bcrypt
 *
 * @param password - Plain text password
 * @returns Hashed password
 * @throws Error if hashing fails
 *
 * @example
 * const hash = await hashPassword("MySecurePassword123");
 * // Returns: "$2b$12$..."
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    logger.debug('Password hashed successfully', {
      passwordLength: password.length,
      rounds: BCRYPT_ROUNDS,
    });

    return hash;
  } catch (error) {
    logger.error('Failed to hash password', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new Error('Password hashing failed');
  }
}

/**
 * Verify a password against a hash
 *
 * @param password - Plain text password to verify
 * @param hash - Hashed password to compare against
 * @returns True if password matches, false otherwise
 *
 * @example
 * const isValid = await verifyPassword("MySecurePassword123", storedHash);
 * if (isValid) {
 *   // Password is correct
 * }
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const isValid = await bcrypt.compare(password, hash);

    logger.debug('Password verification completed', {
      isValid,
      passwordLength: password.length,
    });

    return isValid;
  } catch (error) {
    logger.error('Failed to verify password', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Validate password strength and complexity requirements
 *
 * @param password - Plain text password to validate
 * @returns Validation result with errors if invalid
 *
 * @example
 * const result = validatePasswordStrength("weak");
 * if (!result.valid) {
 *   console.log(result.errors); // ["Password must be at least 8 characters"]
 * }
 */
export function validatePasswordStrength(password: string): IPasswordValidationResult {
  const errors: string[] = [];

  // Check minimum length
  if (password.length < config.password.minLength) {
    errors.push(`Password must be at least ${config.password.minLength} characters`);
  }

  // Check maximum length (prevent DoS via bcrypt)
  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }

  // Check for uppercase letter
  if (config.password.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Check for lowercase letter
  if (config.password.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Check for number
  if (config.password.requireNumber && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Check for common weak passwords
  const weakPasswords = [
    'password',
    'password123',
    '12345678',
    'qwerty',
    'abc123',
    'letmein',
    'admin',
    'welcome',
  ];

  if (weakPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common. Please choose a stronger password');
  }

  logger.debug('Password strength validation completed', {
    valid: errors.length === 0,
    errorCount: errors.length,
    passwordLength: password.length,
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if a password meets complexity requirements
 * (Alias for validatePasswordStrength that returns boolean)
 *
 * @param password - Plain text password to check
 * @returns True if password meets requirements, false otherwise
 *
 * @example
 * if (isPasswordComplex("MySecurePassword123")) {
 *   // Password meets requirements
 * }
 */
export function isPasswordComplex(password: string): boolean {
  const result = validatePasswordStrength(password);
  return result.valid;
}

/**
 * Generate a random password that meets complexity requirements
 *
 * @param length - Desired password length (default: 12)
 * @returns Generated password
 *
 * @example
 * const password = generateRandomPassword(16);
 * // Returns: "aB3$dE7&gH9@kL2"
 */
export function generateRandomPassword(length: number = 12): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%&*';

  const allChars = uppercase + lowercase + numbers + special;

  // Ensure at least one of each required type (using crypto-secure random)
  let password = '';
  password += uppercase[crypto.randomInt(uppercase.length)];
  password += lowercase[crypto.randomInt(lowercase.length)];
  password += numbers[crypto.randomInt(numbers.length)];
  password += special[crypto.randomInt(special.length)];

  // Fill remaining length with random characters
  for (let i = password.length; i < length; i++) {
    password += allChars[crypto.randomInt(allChars.length)];
  }

  // Shuffle the password using Fisher-Yates with crypto-secure random
  const chars = password.split('');
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    const temp = chars[i] ?? '';
    chars[i] = chars[j] ?? '';
    chars[j] = temp;
  }
  password = chars.join('');

  logger.debug('Generated random password', {
    length: password.length,
  });

  return password;
}

/**
 * Calculate password strength score (0-4)
 *
 * @param password - Plain text password
 * @returns Strength score: 0 (very weak) to 4 (very strong)
 *
 * @example
 * const score = calculatePasswordStrength("MyPassword123!");
 * // Returns: 3 (strong)
 */
export function calculatePasswordStrength(password: string): number {
  let score = 0;

  // Length score
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;

  // Character variety score
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  // Cap at 4
  return Math.min(score, 4);
}

/**
 * Get human-readable password strength description
 *
 * @param password - Plain text password
 * @returns Strength description
 *
 * @example
 * getPasswordStrengthDescription("weak");
 * // Returns: "Very Weak"
 *
 * getPasswordStrengthDescription("MySecurePassword123!");
 * // Returns: "Very Strong"
 */
export function getPasswordStrengthDescription(password: string): string {
  const score = calculatePasswordStrength(password);

  const descriptions = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];

  return descriptions[score] || 'Very Weak';
}
