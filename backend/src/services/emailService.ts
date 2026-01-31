/**
 * @file        Email Service
 * @module      Services/Email
 * @description Email sending via Power Automate webhook with logging
 */

import { config } from '@/config';
import prisma from '@/config/database';
import logger from '@/config/logger';

interface IEmailPayload {
  recipient: string;
  subject: string;
  htmlBody: string;
}

/**
 * Escape HTML special characters to prevent XSS in email templates
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Send an email via Power Automate webhook (or mock in dev)
 */
async function sendEmail(payload: IEmailPayload): Promise<boolean> {
  if (config.email.mockEmail || !config.email.powerAutomateUrl) {
    logger.info('Email mock: would send email', {
      to: payload.recipient,
      subject: payload.subject,
    });
    return true;
  }

  try {
    const response = await fetch(config.email.powerAutomateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: payload.recipient,
        subject: payload.subject,
        body: payload.htmlBody,
        replyTo: config.email.replyTo,
        fromName: config.email.fromName,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      throw new Error(`Power Automate returned ${response.status}`);
    }

    return true;
  } catch (error) {
    logger.error('Failed to send email', {
      to: payload.recipient,
      subject: payload.subject,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Send email and log the result
 */
async function sendAndLog(
  attemptId: string,
  payload: IEmailPayload
): Promise<void> {
  const success = await sendEmail(payload);

  try {
    await prisma.emailLog.create({
      data: {
        attemptId,
        recipient: payload.recipient,
        subject: payload.subject,
        status: success ? 'sent' : 'failed',
        error: success ? null : 'Send failed',
      },
    });
  } catch (logError) {
    logger.error('Failed to create email log', {
      attemptId,
      error: logError instanceof Error ? logError.message : 'Unknown error',
    });
  }
}

// ---------------------------------------------------------------------------
// Email templates
// ---------------------------------------------------------------------------

/**
 * Send quiz completion notification to the quiz owner
 */
export async function sendCompletionNotification(
  attemptId: string,
  notificationEmail: string,
  data: {
    userName: string;
    bankTitle: string;
    score: number;
    maxScore: number;
    percentage: number;
    passed: boolean;
  }
): Promise<void> {
  const passStatus = data.passed ? 'PASSED' : 'NOT PASSED';
  const statusColor = data.passed ? '#2B9E9E' : '#E55B64';

  await sendAndLog(attemptId, {
    recipient: notificationEmail,
    subject: `Quiz Completion: ${data.userName} - ${data.bankTitle} (${passStatus})`,
    htmlBody: `
      <div style="font-family: Montserrat, Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1B3A5F; color: white; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 20px;">${config.email.fromName}</h1>
        </div>
        <div style="padding: 24px; border: 1px solid #e5e7eb;">
          <h2 style="color: #1B3A5F; margin-top: 0;">Quiz Completion Notification</h2>
          <p><strong>${escapeHtml(data.userName)}</strong> has completed <strong>${escapeHtml(data.bankTitle)}</strong>.</p>
          <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Result:</strong> <span style="color: ${statusColor}; font-weight: 700;">${passStatus}</span></p>
            <p style="margin: 0 0 8px 0;"><strong>Score:</strong> ${data.score.toFixed(1)} / ${data.maxScore} (${Math.round(data.percentage)}%)</p>
          </div>
        </div>
        <div style="padding: 12px 24px; background: #f9fafb; font-size: 12px; color: #6b7280; text-align: center;">
          This is an automated notification from ${config.email.fromName}.
        </div>
      </div>
    `,
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string
): Promise<boolean> {
  const resetUrl = `${config.appUrl}/reset-password?token=${resetToken}`;

  const success = await sendEmail({
    recipient: email,
    subject: `${config.email.fromName} - Password Reset`,
    htmlBody: `
      <div style="font-family: Montserrat, Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1B3A5F; color: white; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 20px;">${config.email.fromName}</h1>
        </div>
        <div style="padding: 24px; border: 1px solid #e5e7eb;">
          <h2 style="color: #1B3A5F; margin-top: 0;">Password Reset</h2>
          <p>You requested a password reset. Click the link below to set a new password:</p>
          <p style="text-align: center; margin: 24px 0;">
            <a href="${resetUrl}" style="background: #2B9E9E; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
              Reset Password
            </a>
          </p>
          <p style="font-size: 14px; color: #6b7280;">This link will expire in 1 hour. If you did not request this, please ignore this email.</p>
        </div>
      </div>
    `,
  });

  if (!success) {
    logger.warn('Password reset email failed', { email });
  }

  return success;
}

/**
 * Send invite email
 */
export async function sendInviteEmail(
  email: string,
  data: {
    firstName?: string | undefined;
    bankTitle?: string | undefined;
    inviteToken: string;
  }
): Promise<void> {
  const registerUrl = `${config.appUrl}/register?invite=${data.inviteToken}`;
  const greeting = data.firstName ? `Hello ${escapeHtml(data.firstName)}` : 'Hello';
  const bankLine = data.bankTitle ? ` to take the quiz <strong>${escapeHtml(data.bankTitle)}</strong>` : '';

  const success = await sendEmail({
    recipient: email,
    subject: `${config.email.fromName} - You've Been Invited`,
    htmlBody: `
      <div style="font-family: Montserrat, Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1B3A5F; color: white; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 20px;">${config.email.fromName}</h1>
        </div>
        <div style="padding: 24px; border: 1px solid #e5e7eb;">
          <h2 style="color: #1B3A5F; margin-top: 0;">You're Invited!</h2>
          <p>${greeting},</p>
          <p>You have been invited to join ${config.email.fromName}${bankLine}.</p>
          <p style="text-align: center; margin: 24px 0;">
            <a href="${registerUrl}" style="background: #2B9E9E; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
              Register Now
            </a>
          </p>
        </div>
      </div>
    `,
  });

  if (!success) {
    logger.warn('Invite email failed', { email });
  }
}
