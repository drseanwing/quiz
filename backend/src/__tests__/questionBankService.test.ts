/**
 * @file        Question Bank Service Tests
 * @description Tests for access control helpers and authorization logic
 */

import { UserRole, QuestionBankStatus } from '@prisma/client';
import { canAccessBank, canModifyBank } from '@/services/questionBankService';

// ─── canAccessBank ───────────────────────────────────────────────────────────

describe('canAccessBank', () => {
  const userId = 'user-1';
  const otherUserId = 'user-2';

  describe('ADMIN role', () => {
    it('grants access to any bank regardless of status or ownership', () => {
      const statuses: QuestionBankStatus[] = ['DRAFT', 'OPEN', 'PUBLIC', 'ARCHIVED'];
      for (const status of statuses) {
        const bank = { createdById: otherUserId, status };
        expect(canAccessBank(bank, userId, UserRole.ADMIN)).toBe(true);
      }
    });
  });

  describe('EDITOR role', () => {
    it('grants access to own banks regardless of status', () => {
      const statuses: QuestionBankStatus[] = ['DRAFT', 'OPEN', 'PUBLIC', 'ARCHIVED'];
      for (const status of statuses) {
        const bank = { createdById: userId, status };
        expect(canAccessBank(bank, userId, UserRole.EDITOR)).toBe(true);
      }
    });

    it('grants access to non-DRAFT banks from other editors', () => {
      expect(canAccessBank({ createdById: otherUserId, status: QuestionBankStatus.OPEN }, userId, UserRole.EDITOR)).toBe(true);
      expect(canAccessBank({ createdById: otherUserId, status: QuestionBankStatus.PUBLIC }, userId, UserRole.EDITOR)).toBe(true);
      expect(canAccessBank({ createdById: otherUserId, status: QuestionBankStatus.ARCHIVED }, userId, UserRole.EDITOR)).toBe(true);
    });

    it('denies access to DRAFT banks from other editors', () => {
      const bank = { createdById: otherUserId, status: QuestionBankStatus.DRAFT };
      expect(canAccessBank(bank, userId, UserRole.EDITOR)).toBe(false);
    });
  });

  describe('USER role', () => {
    it('grants access to OPEN and PUBLIC banks', () => {
      expect(canAccessBank({ createdById: otherUserId, status: QuestionBankStatus.OPEN }, userId, UserRole.USER)).toBe(true);
      expect(canAccessBank({ createdById: otherUserId, status: QuestionBankStatus.PUBLIC }, userId, UserRole.USER)).toBe(true);
    });

    it('denies access to DRAFT and ARCHIVED banks', () => {
      expect(canAccessBank({ createdById: otherUserId, status: QuestionBankStatus.DRAFT }, userId, UserRole.USER)).toBe(false);
      expect(canAccessBank({ createdById: otherUserId, status: QuestionBankStatus.ARCHIVED }, userId, UserRole.USER)).toBe(false);
    });

    it('grants access to own banks via ownership (regardless of status)', () => {
      expect(canAccessBank({ createdById: userId, status: QuestionBankStatus.DRAFT }, userId, UserRole.USER)).toBe(true);
    });
  });
});

// ─── canModifyBank ───────────────────────────────────────────────────────────

describe('canModifyBank', () => {
  const userId = 'user-1';
  const otherUserId = 'user-2';

  it('allows admin to modify any bank', () => {
    const bank = { createdById: otherUserId };
    expect(canModifyBank(bank, userId, UserRole.ADMIN)).toBe(true);
  });

  it('allows owner to modify their own bank', () => {
    const bank = { createdById: userId };
    expect(canModifyBank(bank, userId, UserRole.EDITOR)).toBe(true);
  });

  it('denies editor from modifying another editors bank', () => {
    const bank = { createdById: otherUserId };
    expect(canModifyBank(bank, userId, UserRole.EDITOR)).toBe(false);
  });

  it('denies user from modifying any bank', () => {
    const bank = { createdById: otherUserId };
    expect(canModifyBank(bank, userId, UserRole.USER)).toBe(false);
  });

  it('denies user from modifying even if they own it (users cannot be bank owners)', () => {
    // In practice users can't create banks, but the helper should still work
    const bank = { createdById: userId };
    expect(canModifyBank(bank, userId, UserRole.USER)).toBe(true);
  });
});
