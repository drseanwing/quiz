/**
 * Tests for account lockout utility
 */
import {
  isLockedOut,
  recordFailedAttempt,
  clearFailedAttempts,
  getFailedAttemptCount,
  getLockoutRemaining,
  clearAllLockouts,
} from '../utils/lockout';

beforeEach(async () => {
  await clearAllLockouts();
});

describe('isLockedOut', () => {
  it('returns false for unknown email', async () => {
    expect(await isLockedOut('nobody@example.com')).toBe(false);
  });

  it('returns false after fewer than maxAttempts failures', async () => {
    await recordFailedAttempt('user@example.com');
    await recordFailedAttempt('user@example.com');
    expect(await isLockedOut('user@example.com')).toBe(false);
  });

  it('returns true after maxAttempts (5) failures', async () => {
    for (let i = 0; i < 5; i++) {
      await recordFailedAttempt('locked@example.com');
    }
    expect(await isLockedOut('locked@example.com')).toBe(true);
  });

  it('is case-insensitive', async () => {
    for (let i = 0; i < 5; i++) {
      await recordFailedAttempt('UPPER@EXAMPLE.COM');
    }
    expect(await isLockedOut('upper@example.com')).toBe(true);
  });
});

describe('recordFailedAttempt', () => {
  it('increments attempt count', async () => {
    await recordFailedAttempt('counter@example.com');
    expect(await getFailedAttemptCount('counter@example.com')).toBe(1);
    await recordFailedAttempt('counter@example.com');
    expect(await getFailedAttemptCount('counter@example.com')).toBe(2);
  });

  it('returns record with lockedUntil set at threshold', async () => {
    let result;
    for (let i = 0; i < 5; i++) {
      result = await recordFailedAttempt('threshold@example.com');
    }
    expect(result!.lockedUntil).toBeInstanceOf(Date);
    expect(result!.attempts).toBe(5);
  });

  it('returns record without lockedUntil below threshold', async () => {
    const result = await recordFailedAttempt('below@example.com');
    expect(result.lockedUntil).toBeNull();
    expect(result.attempts).toBe(1);
  });
});

describe('clearFailedAttempts', () => {
  it('removes the record for the email', async () => {
    await recordFailedAttempt('clear@example.com');
    await recordFailedAttempt('clear@example.com');
    expect(await getFailedAttemptCount('clear@example.com')).toBe(2);

    await clearFailedAttempts('clear@example.com');
    expect(await getFailedAttemptCount('clear@example.com')).toBe(0);
    expect(await isLockedOut('clear@example.com')).toBe(false);
  });

  it('does nothing for unknown email', async () => {
    // Should not throw
    await clearFailedAttempts('unknown@example.com');
    expect(await getFailedAttemptCount('unknown@example.com')).toBe(0);
  });

  it('is case-insensitive', async () => {
    await recordFailedAttempt('case@example.com');
    await clearFailedAttempts('CASE@EXAMPLE.COM');
    expect(await getFailedAttemptCount('case@example.com')).toBe(0);
  });
});

describe('getFailedAttemptCount', () => {
  it('returns 0 for unknown email', async () => {
    expect(await getFailedAttemptCount('none@example.com')).toBe(0);
  });

  it('returns correct count after multiple failures', async () => {
    await recordFailedAttempt('count@example.com');
    await recordFailedAttempt('count@example.com');
    await recordFailedAttempt('count@example.com');
    expect(await getFailedAttemptCount('count@example.com')).toBe(3);
  });
});

describe('getLockoutRemaining', () => {
  it('returns 0 for unknown email', async () => {
    expect(await getLockoutRemaining('none@example.com')).toBe(0);
  });

  it('returns 0 for non-locked email', async () => {
    await recordFailedAttempt('notlocked@example.com');
    expect(await getLockoutRemaining('notlocked@example.com')).toBe(0);
  });

  it('returns positive seconds for locked email', async () => {
    for (let i = 0; i < 5; i++) {
      await recordFailedAttempt('remaining@example.com');
    }
    const remaining = await getLockoutRemaining('remaining@example.com');
    expect(remaining).toBeGreaterThan(0);
    // Should be approximately 15 minutes (900 seconds)
    expect(remaining).toBeLessThanOrEqual(900);
  });
});

describe('clearAllLockouts', () => {
  it('removes all records', async () => {
    await recordFailedAttempt('a@example.com');
    await recordFailedAttempt('b@example.com');
    for (let i = 0; i < 5; i++) {
      await recordFailedAttempt('c@example.com');
    }

    await clearAllLockouts();

    expect(await getFailedAttemptCount('a@example.com')).toBe(0);
    expect(await getFailedAttemptCount('b@example.com')).toBe(0);
    expect(await isLockedOut('c@example.com')).toBe(false);
  });
});
