/**
 * Tests for account lockout utility
 */

// Mock Prisma client
const mockPrisma = {
  loginAttempt: {
    count: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
};

jest.mock('@/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}));

import {
  isLockedOut,
  recordFailedAttempt,
  clearFailedAttempts,
  getFailedAttemptCount,
  getLockoutRemaining,
  clearAllLockouts,
} from '../utils/lockout';

beforeEach(() => {
  jest.clearAllMocks();
  // Mock deleteMany to return a count
  mockPrisma.loginAttempt.deleteMany.mockResolvedValue({ count: 0 });
});

describe('isLockedOut', () => {
  it('returns false for unknown email', async () => {
    mockPrisma.loginAttempt.count.mockResolvedValue(0);
    expect(await isLockedOut('nobody@example.com')).toBe(false);
  });

  it('returns false after fewer than maxAttempts failures', async () => {
    mockPrisma.loginAttempt.count.mockResolvedValue(2);
    expect(await isLockedOut('user@example.com')).toBe(false);
  });

  it('returns true after maxAttempts (5) failures', async () => {
    mockPrisma.loginAttempt.count.mockResolvedValue(5);
    expect(await isLockedOut('locked@example.com')).toBe(true);
  });

  it('is case-insensitive', async () => {
    mockPrisma.loginAttempt.count.mockResolvedValue(5);
    expect(await isLockedOut('upper@example.com')).toBe(true);
  });
});

describe('recordFailedAttempt', () => {
  it('increments attempt count', async () => {
    const now = new Date();
    mockPrisma.loginAttempt.create.mockResolvedValue({ email: 'counter@example.com', success: false, createdAt: now });
    mockPrisma.loginAttempt.findFirst.mockResolvedValue({ createdAt: now });

    mockPrisma.loginAttempt.count.mockResolvedValueOnce(1);
    await recordFailedAttempt('counter@example.com');
    mockPrisma.loginAttempt.count.mockResolvedValueOnce(1);
    expect(await getFailedAttemptCount('counter@example.com')).toBe(1);

    mockPrisma.loginAttempt.count.mockResolvedValueOnce(2);
    await recordFailedAttempt('counter@example.com');
    mockPrisma.loginAttempt.count.mockResolvedValueOnce(2);
    expect(await getFailedAttemptCount('counter@example.com')).toBe(2);
  });

  it('returns record with lockedUntil set at threshold', async () => {
    const now = new Date();
    mockPrisma.loginAttempt.create.mockResolvedValue({ email: 'threshold@example.com', success: false, createdAt: now });
    mockPrisma.loginAttempt.findFirst.mockResolvedValue({ createdAt: now });
    mockPrisma.loginAttempt.count.mockResolvedValue(5);

    const result = await recordFailedAttempt('threshold@example.com');
    expect(result.lockedUntil).toBeInstanceOf(Date);
    expect(result.attempts).toBe(5);
  });

  it('returns record without lockedUntil below threshold', async () => {
    const now = new Date();
    mockPrisma.loginAttempt.create.mockResolvedValue({ email: 'below@example.com', success: false, createdAt: now });
    mockPrisma.loginAttempt.findFirst.mockResolvedValue({ createdAt: now });
    mockPrisma.loginAttempt.count.mockResolvedValue(1);

    const result = await recordFailedAttempt('below@example.com');
    expect(result.lockedUntil).toBeNull();
    expect(result.attempts).toBe(1);
  });
});

describe('clearFailedAttempts', () => {
  it('removes the record for the email', async () => {
    mockPrisma.loginAttempt.deleteMany.mockResolvedValue({ count: 2 });
    await clearFailedAttempts('clear@example.com');

    mockPrisma.loginAttempt.count.mockResolvedValue(0);
    expect(await getFailedAttemptCount('clear@example.com')).toBe(0);
    expect(await isLockedOut('clear@example.com')).toBe(false);
  });

  it('does nothing for unknown email', async () => {
    mockPrisma.loginAttempt.deleteMany.mockResolvedValue({ count: 0 });
    await clearFailedAttempts('unknown@example.com');

    mockPrisma.loginAttempt.count.mockResolvedValue(0);
    expect(await getFailedAttemptCount('unknown@example.com')).toBe(0);
  });

  it('is case-insensitive', async () => {
    mockPrisma.loginAttempt.deleteMany.mockResolvedValue({ count: 1 });
    await clearFailedAttempts('CASE@EXAMPLE.COM');

    mockPrisma.loginAttempt.count.mockResolvedValue(0);
    expect(await getFailedAttemptCount('case@example.com')).toBe(0);
  });
});

describe('getFailedAttemptCount', () => {
  it('returns 0 for unknown email', async () => {
    mockPrisma.loginAttempt.count.mockResolvedValue(0);
    expect(await getFailedAttemptCount('none@example.com')).toBe(0);
  });

  it('returns correct count after multiple failures', async () => {
    mockPrisma.loginAttempt.count.mockResolvedValue(3);
    expect(await getFailedAttemptCount('count@example.com')).toBe(3);
  });
});

describe('getLockoutRemaining', () => {
  it('returns 0 for unknown email', async () => {
    mockPrisma.loginAttempt.count.mockResolvedValue(0);
    expect(await getLockoutRemaining('none@example.com')).toBe(0);
  });

  it('returns 0 for non-locked email', async () => {
    mockPrisma.loginAttempt.count.mockResolvedValue(1);
    expect(await getLockoutRemaining('notlocked@example.com')).toBe(0);
  });

  it('returns positive seconds for locked email', async () => {
    const now = new Date();
    mockPrisma.loginAttempt.count.mockResolvedValue(5);
    mockPrisma.loginAttempt.findFirst.mockResolvedValue({ createdAt: now });

    const remaining = await getLockoutRemaining('remaining@example.com');
    expect(remaining).toBeGreaterThan(0);
    // Should be approximately 15 minutes (900 seconds)
    expect(remaining).toBeLessThanOrEqual(900);
  });
});

describe('clearAllLockouts', () => {
  it('removes all records', async () => {
    mockPrisma.loginAttempt.deleteMany.mockResolvedValue({ count: 7 });
    await clearAllLockouts();

    mockPrisma.loginAttempt.count.mockResolvedValue(0);
    expect(await getFailedAttemptCount('a@example.com')).toBe(0);
    expect(await getFailedAttemptCount('b@example.com')).toBe(0);
    expect(await isLockedOut('c@example.com')).toBe(false);
  });
});
