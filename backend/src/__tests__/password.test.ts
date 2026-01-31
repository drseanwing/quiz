/**
 * @file        Password Utility Tests
 * @description Unit tests for password hashing, verification, and validation
 */

import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  isPasswordComplex,
  generateRandomPassword,
  calculatePasswordStrength,
  getPasswordStrengthDescription,
} from '@/utils/password';

// =============================================================================
// hashPassword + verifyPassword
// =============================================================================

describe('hashPassword + verifyPassword', () => {
  it('hashes a password and verifies it correctly', async () => {
    const password = 'SecureTest123';
    const hash = await hashPassword(password);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
    expect(hash.startsWith('$2b$')).toBe(true);

    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it('rejects wrong password', async () => {
    const hash = await hashPassword('CorrectPassword1');
    const isValid = await verifyPassword('WrongPassword1', hash);
    expect(isValid).toBe(false);
  });

  it('produces different hashes for same password', async () => {
    const password = 'SamePassword123';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    expect(hash1).not.toBe(hash2);
  });
});

// =============================================================================
// validatePasswordStrength
// =============================================================================

describe('validatePasswordStrength', () => {
  it('accepts a strong password', () => {
    const result = validatePasswordStrength('StrongPass123');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects short passwords', () => {
    const result = validatePasswordStrength('Sh1');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('at least'))).toBe(true);
  });

  it('rejects passwords over 128 chars', () => {
    const longPassword = 'A1' + 'a'.repeat(128);
    const result = validatePasswordStrength(longPassword);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('128'))).toBe(true);
  });

  it('rejects common weak passwords', () => {
    const result = validatePasswordStrength('password123');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('common'))).toBe(true);
  });

  it('rejects common passwords case-insensitively', () => {
    const result = validatePasswordStrength('PASSWORD123');
    expect(result.valid).toBe(false);
  });
});

// =============================================================================
// isPasswordComplex
// =============================================================================

describe('isPasswordComplex', () => {
  it('returns true for complex password', () => {
    expect(isPasswordComplex('ComplexPass1')).toBe(true);
  });

  it('returns false for weak password', () => {
    expect(isPasswordComplex('abc')).toBe(false);
  });
});

// =============================================================================
// generateRandomPassword
// =============================================================================

describe('generateRandomPassword', () => {
  it('generates password of requested length', () => {
    const password = generateRandomPassword(16);
    expect(password.length).toBe(16);
  });

  it('generates password of default length 12', () => {
    const password = generateRandomPassword();
    expect(password.length).toBe(12);
  });

  it('generates complex passwords that pass validation', () => {
    for (let i = 0; i < 10; i++) {
      const password = generateRandomPassword(16);
      expect(isPasswordComplex(password)).toBe(true);
    }
  });

  it('generates unique passwords', () => {
    const passwords = new Set<string>();
    for (let i = 0; i < 20; i++) {
      passwords.add(generateRandomPassword());
    }
    expect(passwords.size).toBe(20);
  });
});

// =============================================================================
// calculatePasswordStrength
// =============================================================================

describe('calculatePasswordStrength', () => {
  it('gives 0 for very short password', () => {
    expect(calculatePasswordStrength('ab')).toBe(0);
  });

  it('gives higher score for longer passwords', () => {
    const short = calculatePasswordStrength('abcdefgh');
    const medium = calculatePasswordStrength('abcdefghijkl');
    expect(medium).toBeGreaterThanOrEqual(short);
  });

  it('gives higher score for mixed case + numbers + special chars', () => {
    const simple = calculatePasswordStrength('abcdefghijklmnop');
    const complex = calculatePasswordStrength('AbcDef12!@#$');
    expect(complex).toBeGreaterThan(simple);
  });

  it('caps score at 4', () => {
    const score = calculatePasswordStrength('VeryComplexPassword123!@#$%^&*');
    expect(score).toBeLessThanOrEqual(4);
  });
});

// =============================================================================
// getPasswordStrengthDescription
// =============================================================================

describe('getPasswordStrengthDescription', () => {
  it('returns "Very Weak" for weak passwords', () => {
    expect(getPasswordStrengthDescription('ab')).toBe('Very Weak');
  });

  it('returns "Very Strong" for excellent passwords', () => {
    expect(getPasswordStrengthDescription('SuperSecure1234!@#$')).toBe('Very Strong');
  });

  it('returns a valid description for any input', () => {
    const descriptions = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
    expect(descriptions).toContain(getPasswordStrengthDescription('test'));
    expect(descriptions).toContain(getPasswordStrengthDescription('MyPassword123!'));
  });
});
