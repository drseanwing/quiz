/**
 * @file        Email Service Tests
 * @description Tests for email sending, templates, and logging
 */

// Mock Prisma client
const mockPrisma = {
  emailLog: {
    create: jest.fn().mockResolvedValue({}),
  },
};

jest.mock('@/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
}));

// Mock config with controllable email settings
const mockConfig = {
  appUrl: 'https://quiz.example.com',
  email: {
    mockEmail: false,
    powerAutomateUrl: 'https://powerautomate.example.com/webhook',
    replyTo: 'test@example.com',
    fromName: 'Test Platform',
  },
};

jest.mock('@/config', () => ({
  config: mockConfig,
}));

jest.mock('@/config/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import {
  sendCompletionNotification,
  sendPasswordResetEmail,
  sendInviteEmail,
} from '@/services/emailService';
import logger from '@/config/logger';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
  mockConfig.email.mockEmail = false;
  mockConfig.email.powerAutomateUrl = 'https://powerautomate.example.com/webhook';
  mockFetch.mockResolvedValue({ ok: true, status: 200 });
});

// ─── sendCompletionNotification ──────────────────────────────────────────────

describe('sendCompletionNotification', () => {
  const baseData = {
    userName: 'Jane Doe',
    userEmail: 'jane@example.com',
    bankTitle: 'Safety Quiz',
    score: 8,
    maxScore: 10,
    percentage: 80,
    passed: true,
  };

  it('sends email via Power Automate webhook', async () => {
    await sendCompletionNotification('attempt-1', 'admin@example.com', baseData);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://powerautomate.example.com/webhook');
    expect(options.method).toBe('POST');
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' });

    const body = JSON.parse(options.body);
    expect(body.to).toBe('admin@example.com');
    expect(body.replyTo).toBe('test@example.com');
    expect(body.fromName).toBe('Test Platform');
  });

  it('includes PASSED status and green color for passing results', async () => {
    await sendCompletionNotification('attempt-1', 'admin@example.com', baseData);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.subject).toContain('PASSED');
    expect(body.body).toContain('#2B9E9E');
    expect(body.body).toContain('PASSED');
  });

  it('includes NOT PASSED status and red color for failing results', async () => {
    await sendCompletionNotification('attempt-1', 'admin@example.com', {
      ...baseData,
      passed: false,
      percentage: 40,
      score: 4,
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.subject).toContain('NOT PASSED');
    expect(body.body).toContain('#E55B64');
    expect(body.body).toContain('NOT PASSED');
  });

  it('formats score with one decimal place', async () => {
    await sendCompletionNotification('attempt-1', 'admin@example.com', {
      ...baseData,
      score: 7.5,
      maxScore: 10,
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.body).toContain('7.5');
    expect(body.body).toContain('/ 10');
  });

  it('rounds percentage to whole number', async () => {
    await sendCompletionNotification('attempt-1', 'admin@example.com', {
      ...baseData,
      percentage: 83.333,
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.body).toContain('83%');
  });

  it('escapes HTML in user name and bank title', async () => {
    await sendCompletionNotification('attempt-1', 'admin@example.com', {
      ...baseData,
      userName: '<script>alert("xss")</script>',
      bankTitle: 'Quiz & "Test"',
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.body).not.toContain('<script>');
    expect(body.body).toContain('&lt;script&gt;');
    expect(body.body).toContain('Quiz &amp; &quot;Test&quot;');
  });

  it('sanitizes subject line (strips control characters)', async () => {
    await sendCompletionNotification('attempt-1', 'admin@example.com', {
      ...baseData,
      bankTitle: "Quiz\r\nBcc: attacker@evil.com",
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.subject).not.toContain('\r');
    expect(body.subject).not.toContain('\n');
    expect(body.subject).toContain('QuizBcc: attacker@evil.com');
  });

  it('logs email to database on success', async () => {
    await sendCompletionNotification('attempt-1', 'admin@example.com', baseData);

    expect(mockPrisma.emailLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        attemptId: 'attempt-1',
        recipient: 'admin@example.com',
        status: 'sent',
        error: null,
      }),
    });
  });

  it('logs email failure to database when fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    await sendCompletionNotification('attempt-1', 'admin@example.com', baseData);

    expect(mockPrisma.emailLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        attemptId: 'attempt-1',
        status: 'failed',
        error: 'Send failed',
      }),
    });
  });

  it('logs email failure when Power Automate returns non-200', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    await sendCompletionNotification('attempt-1', 'admin@example.com', baseData);

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to send email',
      expect.objectContaining({
        error: 'Power Automate returned 500',
      })
    );
    expect(mockPrisma.emailLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: 'failed' }),
    });
  });

  it('handles database logging failure gracefully', async () => {
    mockPrisma.emailLog.create.mockRejectedValueOnce(new Error('DB error'));

    // Should not throw
    await sendCompletionNotification('attempt-1', 'admin@example.com', baseData);

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to create email log',
      expect.objectContaining({ attemptId: 'attempt-1' })
    );
  });
});

// ─── sendCompletionNotification (mock mode) ──────────────────────────────────

describe('sendCompletionNotification (mock mode)', () => {
  it('does not call fetch when mockEmail is true', async () => {
    mockConfig.email.mockEmail = true;

    await sendCompletionNotification('attempt-1', 'admin@example.com', {
      userName: 'Test',
      userEmail: 'test@example.com',
      bankTitle: 'Quiz',
      score: 5,
      maxScore: 10,
      percentage: 50,
      passed: false,
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('Email mock: would send email', expect.any(Object));
  });

  it('does not call fetch when powerAutomateUrl is empty', async () => {
    mockConfig.email.powerAutomateUrl = '';

    await sendCompletionNotification('attempt-1', 'admin@example.com', {
      userName: 'Test',
      userEmail: 'test@example.com',
      bankTitle: 'Quiz',
      score: 5,
      maxScore: 10,
      percentage: 50,
      passed: false,
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalled();
  });

  it('still logs to database in mock mode (as sent)', async () => {
    mockConfig.email.mockEmail = true;

    await sendCompletionNotification('attempt-1', 'admin@example.com', {
      userName: 'Test',
      userEmail: 'test@example.com',
      bankTitle: 'Quiz',
      score: 5,
      maxScore: 10,
      percentage: 50,
      passed: false,
    });

    expect(mockPrisma.emailLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: 'sent',
      }),
    });
  });
});

// ─── sendPasswordResetEmail ──────────────────────────────────────────────────

describe('sendPasswordResetEmail', () => {
  it('sends email with reset URL containing token', async () => {
    const result = await sendPasswordResetEmail('user@example.com', 'reset-token-abc');

    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.to).toBe('user@example.com');
    expect(body.body).toContain('https://quiz.example.com/reset-password?token=reset-token-abc');
  });

  it('includes platform name in subject', async () => {
    await sendPasswordResetEmail('user@example.com', 'token');

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.subject).toContain('Test Platform');
    expect(body.subject).toContain('Password Reset');
  });

  it('includes 1-hour expiry warning', async () => {
    await sendPasswordResetEmail('user@example.com', 'token');

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.body).toContain('1 hour');
  });

  it('returns false on fetch failure', async () => {
    mockFetch.mockRejectedValue(new Error('Timeout'));

    const result = await sendPasswordResetEmail('user@example.com', 'token');

    expect(result).toBe(false);
    expect(logger.error).toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith('Password reset email failed', { email: 'user@example.com' });
  });

  it('returns false on non-200 response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 429 });

    const result = await sendPasswordResetEmail('user@example.com', 'token');

    expect(result).toBe(false);
  });

  it('does not create email log (uses sendEmail, not sendAndLog)', async () => {
    await sendPasswordResetEmail('user@example.com', 'token');

    expect(mockPrisma.emailLog.create).not.toHaveBeenCalled();
  });

  it('returns true in mock mode', async () => {
    mockConfig.email.mockEmail = true;

    const result = await sendPasswordResetEmail('user@example.com', 'token');

    expect(result).toBe(true);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// ─── sendInviteEmail ─────────────────────────────────────────────────────────

describe('sendInviteEmail', () => {
  it('sends email with registration URL containing invite token', async () => {
    await sendInviteEmail('new@example.com', {
      inviteToken: 'invite-token-xyz',
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.to).toBe('new@example.com');
    expect(body.body).toContain('https://quiz.example.com/register?invite=invite-token-xyz');
  });

  it('personalizes greeting when firstName is provided', async () => {
    await sendInviteEmail('new@example.com', {
      firstName: 'Alice',
      inviteToken: 'token',
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.body).toContain('Hello Alice');
  });

  it('uses generic greeting when firstName is not provided', async () => {
    await sendInviteEmail('new@example.com', {
      inviteToken: 'token',
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.body).toContain('Hello,');
    expect(body.body).not.toMatch(/Hello \w+,/);
  });

  it('mentions bank title when provided', async () => {
    await sendInviteEmail('new@example.com', {
      bankTitle: 'Safety Induction',
      inviteToken: 'token',
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.body).toContain('Safety Induction');
  });

  it('omits bank line when bankTitle is not provided', async () => {
    await sendInviteEmail('new@example.com', {
      inviteToken: 'token',
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.body).not.toContain('to take the quiz');
  });

  it('escapes HTML in firstName and bankTitle', async () => {
    await sendInviteEmail('new@example.com', {
      firstName: '<img onerror=alert(1)>',
      bankTitle: 'Quiz & "Test"',
      inviteToken: 'token',
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.body).not.toContain('<img onerror');
    expect(body.body).toContain('&lt;img onerror=alert(1)&gt;');
    expect(body.body).toContain('&amp;');
  });

  it('includes "Invited" in subject', async () => {
    await sendInviteEmail('new@example.com', {
      inviteToken: 'token',
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.subject).toContain('Invited');
    expect(body.subject).toContain('Test Platform');
  });

  it('logs warning on failure', async () => {
    mockFetch.mockRejectedValue(new Error('Network'));

    await sendInviteEmail('new@example.com', { inviteToken: 'token' });

    expect(logger.warn).toHaveBeenCalledWith('Invite email failed', { email: 'new@example.com' });
  });

  it('does not create email log (uses sendEmail, not sendAndLog)', async () => {
    await sendInviteEmail('new@example.com', { inviteToken: 'token' });

    expect(mockPrisma.emailLog.create).not.toHaveBeenCalled();
  });
});

// ─── Fetch configuration ─────────────────────────────────────────────────────

describe('fetch configuration', () => {
  it('passes 15-second timeout signal', async () => {
    await sendPasswordResetEmail('user@example.com', 'token');

    const options = mockFetch.mock.calls[0][1];
    expect(options.signal).toBeDefined();
  });

  it('sends JSON content type', async () => {
    await sendPasswordResetEmail('user@example.com', 'token');

    const options = mockFetch.mock.calls[0][1];
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' });
  });

  it('uses POST method', async () => {
    await sendPasswordResetEmail('user@example.com', 'token');

    const options = mockFetch.mock.calls[0][1];
    expect(options.method).toBe('POST');
  });
});
