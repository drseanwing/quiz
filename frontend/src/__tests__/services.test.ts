/**
 * @file        Frontend API service tests
 * @description Tests for questionBankApi, quizApi, questionApi, and adminApi
 */

// Mock the api module (both default and named export)
const mockApi = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/services/api', () => ({
  default: mockApi,
  api: mockApi,
}));

import * as questionBankApi from '@/services/questionBankApi';
import * as quizApi from '@/services/quizApi';
import * as questionApi from '@/services/questionApi';
import * as adminApi from '@/services/adminApi';

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── questionBankApi ────────────────────────────────────────────────────────

describe('questionBankApi', () => {
  describe('listQuestionBanks', () => {
    it('calls GET /question-banks with no params by default', async () => {
      mockApi.get.mockResolvedValue({ data: [], meta: { page: 1, pageSize: 20, totalCount: 0, totalPages: 0 } });

      const result = await questionBankApi.listQuestionBanks();

      expect(mockApi.get).toHaveBeenCalledWith('/question-banks');
      expect(result).toEqual({ banks: [], meta: { page: 1, pageSize: 20, totalCount: 0, totalPages: 0 } });
    });

    it('builds query string from params', async () => {
      mockApi.get.mockResolvedValue({ data: [], meta: { page: 1, pageSize: 20, totalCount: 0, totalPages: 0 } });

      await questionBankApi.listQuestionBanks({ page: 2, pageSize: 10, search: 'cardio', status: 'ACTIVE' as any });

      const url = mockApi.get.mock.calls[0]![0] as string;
      expect(url).toContain('page=2');
      expect(url).toContain('pageSize=10');
      expect(url).toContain('search=cardio');
      expect(url).toContain('status=ACTIVE');
    });

    it('omits undefined params from query string', async () => {
      mockApi.get.mockResolvedValue({ data: [], meta: { page: 1, pageSize: 20, totalCount: 0, totalPages: 0 } });

      await questionBankApi.listQuestionBanks({ page: 1 });

      const url = mockApi.get.mock.calls[0]![0] as string;
      expect(url).toContain('page=1');
      expect(url).not.toContain('search');
      expect(url).not.toContain('status');
    });
  });

  describe('getQuestionBank', () => {
    it('calls GET /question-banks/:id and returns data', async () => {
      const bank = { id: 'b1', title: 'Test Bank' };
      mockApi.get.mockResolvedValue({ data: bank });

      const result = await questionBankApi.getQuestionBank('b1');

      expect(mockApi.get).toHaveBeenCalledWith('/question-banks/b1');
      expect(result).toEqual(bank);
    });
  });

  describe('createQuestionBank', () => {
    it('calls POST /question-banks with data', async () => {
      const created = { id: 'b2', title: 'New Bank' };
      mockApi.post.mockResolvedValue({ data: created });

      const result = await questionBankApi.createQuestionBank({ title: 'New Bank' } as any);

      expect(mockApi.post).toHaveBeenCalledWith('/question-banks', { title: 'New Bank' });
      expect(result).toEqual(created);
    });
  });

  describe('updateQuestionBank', () => {
    it('calls PATCH /question-banks/:id with data', async () => {
      const updated = { id: 'b1', title: 'Updated' };
      mockApi.patch.mockResolvedValue({ data: updated });

      const result = await questionBankApi.updateQuestionBank('b1', { title: 'Updated' } as any);

      expect(mockApi.patch).toHaveBeenCalledWith('/question-banks/b1', { title: 'Updated' });
      expect(result).toEqual(updated);
    });
  });

  describe('deleteQuestionBank', () => {
    it('calls DELETE /question-banks/:id', async () => {
      mockApi.delete.mockResolvedValue({});

      await questionBankApi.deleteQuestionBank('b1');

      expect(mockApi.delete).toHaveBeenCalledWith('/question-banks/b1');
    });
  });

  describe('duplicateQuestionBank', () => {
    it('calls POST /question-banks/:id/duplicate', async () => {
      const dup = { id: 'b3', title: 'Copy of Bank' };
      mockApi.post.mockResolvedValue({ data: dup });

      const result = await questionBankApi.duplicateQuestionBank('b1');

      expect(mockApi.post).toHaveBeenCalledWith('/question-banks/b1/duplicate');
      expect(result).toEqual(dup);
    });
  });

  describe('exportQuestionBank', () => {
    it('calls GET /question-banks/:id/export', async () => {
      const exportData = { title: 'Bank', questions: [] };
      mockApi.get.mockResolvedValue({ data: exportData });

      const result = await questionBankApi.exportQuestionBank('b1');

      expect(mockApi.get).toHaveBeenCalledWith('/question-banks/b1/export');
      expect(result).toEqual(exportData);
    });
  });

  describe('importQuestionBank', () => {
    it('calls POST /question-banks/import with data', async () => {
      const importResult = { id: 'b4', title: 'Imported', questionCount: 10 };
      mockApi.post.mockResolvedValue({ data: importResult });

      const payload = { title: 'Imported', questions: [] };
      const result = await questionBankApi.importQuestionBank(payload);

      expect(mockApi.post).toHaveBeenCalledWith('/question-banks/import', payload);
      expect(result).toEqual(importResult);
    });
  });
});

// ─── quizApi ────────────────────────────────────────────────────────────────

describe('quizApi', () => {
  describe('startQuiz', () => {
    it('calls POST /quizzes/:bankId/start', async () => {
      const startResult = { attemptId: 'a1', questions: [], timeLimit: 30 };
      mockApi.post.mockResolvedValue({ data: startResult });

      const result = await quizApi.startQuiz('b1');

      expect(mockApi.post).toHaveBeenCalledWith('/quizzes/b1/start');
      expect(result).toEqual(startResult);
    });
  });

  describe('getAttempt', () => {
    it('calls GET /attempts/:id', async () => {
      const attempt = { id: 'a1', status: 'IN_PROGRESS', questions: [] };
      mockApi.get.mockResolvedValue({ data: attempt });

      const result = await quizApi.getAttempt('a1');

      expect(mockApi.get).toHaveBeenCalledWith('/attempts/a1');
      expect(result).toEqual(attempt);
    });
  });

  describe('saveProgress', () => {
    it('calls PATCH /attempts/:id with responses and timeSpent', async () => {
      const saveResult = { saved: true };
      mockApi.patch.mockResolvedValue({ data: saveResult });

      const responses = { q1: { optionId: 'opt1' } };
      const result = await quizApi.saveProgress('a1', responses, 120);

      expect(mockApi.patch).toHaveBeenCalledWith('/attempts/a1', {
        responses,
        timeSpent: 120,
      });
      expect(result).toEqual(saveResult);
    });
  });

  describe('submitAttempt', () => {
    it('calls POST /attempts/:id/submit', async () => {
      const results = { score: 8, maxScore: 10, percentage: 80, passed: true };
      mockApi.post.mockResolvedValue({ data: results });

      const result = await quizApi.submitAttempt('a1');

      expect(mockApi.post).toHaveBeenCalledWith('/attempts/a1/submit');
      expect(result).toEqual(results);
    });
  });

  describe('getResults', () => {
    it('calls GET /attempts/:id/results', async () => {
      const results = { score: 8, maxScore: 10, percentage: 80 };
      mockApi.get.mockResolvedValue({ data: results });

      const result = await quizApi.getResults('a1');

      expect(mockApi.get).toHaveBeenCalledWith('/attempts/a1/results');
      expect(result).toEqual(results);
    });
  });

  describe('listMyAttempts', () => {
    it('calls GET /attempts/mine with no params', async () => {
      const attempts = [{ id: 'a1', status: 'COMPLETED' }];
      mockApi.get.mockResolvedValue({ data: attempts });

      const result = await quizApi.listMyAttempts();

      expect(mockApi.get).toHaveBeenCalledWith('/attempts/mine');
      expect(result).toEqual(attempts);
    });

    it('includes bankId when provided', async () => {
      mockApi.get.mockResolvedValue({ data: [] });

      await quizApi.listMyAttempts('b1');

      expect(mockApi.get).toHaveBeenCalledWith('/attempts/mine?bankId=b1');
    });
  });
});

// ─── questionApi ────────────────────────────────────────────────────────────

describe('questionApi', () => {
  describe('listQuestions', () => {
    it('calls GET /question-banks/:bankId/questions and returns array', async () => {
      const questions = [{ id: 'q1', type: 'MULTIPLE_CHOICE_SINGLE' }, { id: 'q2', type: 'TRUE_FALSE' }];
      mockApi.get.mockResolvedValue({ data: questions });

      const result = await questionApi.listQuestions('b1');

      expect(mockApi.get).toHaveBeenCalledWith('/question-banks/b1/questions');
      expect(result).toEqual(questions);
    });
  });

  describe('getQuestion', () => {
    it('calls GET /questions/:id', async () => {
      const question = { id: 'q1', type: 'MULTIPLE_CHOICE_SINGLE' };
      mockApi.get.mockResolvedValue({ data: question });

      const result = await questionApi.getQuestion('q1');

      expect(mockApi.get).toHaveBeenCalledWith('/questions/q1');
      expect(result).toEqual(question);
    });
  });

  describe('createQuestion', () => {
    it('calls POST /question-banks/:bankId/questions', async () => {
      const question = { id: 'q2', type: 'TRUE_FALSE' };
      mockApi.post.mockResolvedValue({ data: question });

      const data = { type: 'TRUE_FALSE', prompt: 'Is this true?' };
      const result = await questionApi.createQuestion('b1', data as any);

      expect(mockApi.post).toHaveBeenCalledWith('/question-banks/b1/questions', data);
      expect(result).toEqual(question);
    });
  });

  describe('updateQuestion', () => {
    it('calls PATCH /questions/:id', async () => {
      const updated = { id: 'q1', prompt: 'Updated prompt' };
      mockApi.patch.mockResolvedValue({ data: updated });

      const result = await questionApi.updateQuestion('q1', { prompt: 'Updated prompt' } as any);

      expect(mockApi.patch).toHaveBeenCalledWith('/questions/q1', { prompt: 'Updated prompt' });
      expect(result).toEqual(updated);
    });
  });

  describe('deleteQuestion', () => {
    it('calls DELETE /questions/:id', async () => {
      mockApi.delete.mockResolvedValue({});

      await questionApi.deleteQuestion('q1');

      expect(mockApi.delete).toHaveBeenCalledWith('/questions/q1');
    });
  });

  describe('duplicateQuestion', () => {
    it('calls POST /questions/:id/duplicate', async () => {
      const dup = { id: 'q3', type: 'TRUE_FALSE' };
      mockApi.post.mockResolvedValue({ data: dup });

      const result = await questionApi.duplicateQuestion('q1');

      expect(mockApi.post).toHaveBeenCalledWith('/questions/q1/duplicate');
      expect(result).toEqual(dup);
    });
  });

  describe('reorderQuestions', () => {
    it('calls PATCH /question-banks/:bankId/questions/reorder', async () => {
      mockApi.patch.mockResolvedValue({});

      await questionApi.reorderQuestions('b1', ['q2', 'q1', 'q3']);

      expect(mockApi.patch).toHaveBeenCalledWith('/question-banks/b1/questions/reorder', {
        questionIds: ['q2', 'q1', 'q3'],
      });
    });
  });
});

// ─── adminApi ───────────────────────────────────────────────────────────────

describe('adminApi', () => {
  describe('getStats', () => {
    it('calls GET /admin/stats', async () => {
      const stats = { totalUsers: 50, activeUsers: 40, totalBanks: 10 };
      mockApi.get.mockResolvedValue({ data: stats });

      const result = await adminApi.getStats();

      expect(mockApi.get).toHaveBeenCalledWith('/admin/stats');
      expect(result).toEqual(stats);
    });
  });

  describe('listCompletions', () => {
    it('builds query params and returns data + meta', async () => {
      const completions = [{ id: 'c1', userName: 'Test' }];
      const meta = { page: 1, pageSize: 20, totalCount: 1, totalPages: 1 };
      mockApi.get.mockResolvedValue({ data: completions, meta });

      const result = await adminApi.listCompletions({ bankId: 'b1', passed: 'true', page: 1, pageSize: 20 });

      const url = mockApi.get.mock.calls[0]![0] as string;
      expect(url).toContain('/admin/completions');
      expect(url).toContain('bankId=b1');
      expect(url).toContain('passed=true');
      expect(result.data).toEqual(completions);
      expect(result.meta).toEqual(meta);
    });

    it('provides default meta when API omits it', async () => {
      mockApi.get.mockResolvedValue({ data: [] });

      const result = await adminApi.listCompletions({});

      expect(result.meta).toEqual({ page: 1, pageSize: 20, totalCount: 0, totalPages: 0 });
    });

    it('includes date range filters', async () => {
      mockApi.get.mockResolvedValue({ data: [], meta: {} });

      await adminApi.listCompletions({ dateFrom: '2026-01-01', dateTo: '2026-01-31' });

      const url = mockApi.get.mock.calls[0]![0] as string;
      expect(url).toContain('dateFrom=2026-01-01');
      expect(url).toContain('dateTo=2026-01-31');
    });
  });

  describe('exportCompletionsCSV', () => {
    it('calls GET /admin/completions/export with responseType blob', async () => {
      const blob = new Blob(['csv-data'], { type: 'text/csv' });
      mockApi.get.mockResolvedValue(blob);

      const result = await adminApi.exportCompletionsCSV({});

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining('/admin/completions/export'),
        { responseType: 'blob' }
      );
      expect(result).toBe(blob);
    });
  });

  describe('listLogs', () => {
    it('builds query params and returns data + meta', async () => {
      const logs = [{ id: 'l1', action: 'LOGIN' }];
      const meta = { page: 1, pageSize: 20, totalCount: 1, totalPages: 1 };
      mockApi.get.mockResolvedValue({ data: logs, meta });

      const result = await adminApi.listLogs({ action: 'LOGIN', entityType: 'USER' });

      const url = mockApi.get.mock.calls[0]![0] as string;
      expect(url).toContain('/admin/logs');
      expect(url).toContain('action=LOGIN');
      expect(url).toContain('entityType=USER');
      expect(result.data).toEqual(logs);
    });

    it('provides default meta when API omits it', async () => {
      mockApi.get.mockResolvedValue({ data: [] });

      const result = await adminApi.listLogs({});

      expect(result.meta).toEqual({ page: 1, pageSize: 20, totalCount: 0, totalPages: 0 });
    });
  });

  describe('createInvite', () => {
    it('calls POST /admin/invite-tokens with data', async () => {
      const invite = { id: 'i1', token: 'tok', email: 'a@b.com' };
      mockApi.post.mockResolvedValue({ data: invite });

      const result = await adminApi.createInvite({ email: 'a@b.com', firstName: 'Test' });

      expect(mockApi.post).toHaveBeenCalledWith('/admin/invite-tokens', {
        email: 'a@b.com',
        firstName: 'Test',
      });
      expect(result).toEqual(invite);
    });
  });

  describe('listInvites', () => {
    it('calls GET /admin/invite-tokens with pagination', async () => {
      const invites = [{ id: 'i1', email: 'a@b.com' }];
      const meta = { page: 2, pageSize: 10, totalCount: 15, totalPages: 2 };
      mockApi.get.mockResolvedValue({ data: invites, meta });

      const result = await adminApi.listInvites(2, 10);

      expect(mockApi.get).toHaveBeenCalledWith('/admin/invite-tokens?page=2&pageSize=10');
      expect(result.data).toEqual(invites);
      expect(result.meta).toEqual(meta);
    });

    it('uses default pagination', async () => {
      mockApi.get.mockResolvedValue({ data: [] });

      await adminApi.listInvites();

      expect(mockApi.get).toHaveBeenCalledWith('/admin/invite-tokens?page=1&pageSize=20');
    });
  });

  describe('listUsers', () => {
    it('builds query params from filters', async () => {
      const users = [{ id: 'u1', email: 'a@b.com' }];
      mockApi.get.mockResolvedValue({ data: users, meta: { page: 1, pageSize: 20, totalCount: 1, totalPages: 1 } });

      const result = await adminApi.listUsers({ search: 'john', role: 'ADMIN', isActive: 'true' });

      const url = mockApi.get.mock.calls[0]![0] as string;
      expect(url).toContain('/users');
      expect(url).toContain('search=john');
      expect(url).toContain('role=ADMIN');
      expect(url).toContain('isActive=true');
      expect(result.data).toEqual(users);
    });
  });

  describe('createUser', () => {
    it('calls POST /users with data', async () => {
      const user = { id: 'u2', email: 'new@b.com' };
      mockApi.post.mockResolvedValue({ data: user });

      const data = { email: 'new@b.com', password: 'Pass1234!', firstName: 'New', surname: 'User' };
      const result = await adminApi.createUser(data);

      expect(mockApi.post).toHaveBeenCalledWith('/users', data);
      expect(result).toEqual(user);
    });
  });

  describe('updateUser', () => {
    it('calls PATCH /users/:id with data', async () => {
      const updated = { id: 'u1', role: 'EDITOR' };
      mockApi.patch.mockResolvedValue({ data: updated });

      const result = await adminApi.updateUser('u1', { role: 'EDITOR' });

      expect(mockApi.patch).toHaveBeenCalledWith('/users/u1', { role: 'EDITOR' });
      expect(result).toEqual(updated);
    });
  });

  describe('deactivateUser', () => {
    it('calls DELETE /users/:id', async () => {
      const deactivated = { id: 'u1', isActive: false };
      mockApi.delete.mockResolvedValue({ data: deactivated });

      const result = await adminApi.deactivateUser('u1');

      expect(mockApi.delete).toHaveBeenCalledWith('/users/u1');
      expect(result).toEqual(deactivated);
    });
  });

  describe('adminResetPassword', () => {
    it('calls POST /users/:id/reset-password', async () => {
      mockApi.post.mockResolvedValue({ data: { message: 'Password reset successfully' } });

      const result = await adminApi.adminResetPassword('u1', 'NewPass123!');

      expect(mockApi.post).toHaveBeenCalledWith('/users/u1/reset-password', { password: 'NewPass123!' });
      expect(result).toEqual({ message: 'Password reset successfully' });
    });
  });

  describe('listAllBanks', () => {
    it('builds query params from filters', async () => {
      const banks = [{ id: 'b1', title: 'Bank 1' }];
      mockApi.get.mockResolvedValue({ data: banks, meta: { page: 1, pageSize: 20, totalCount: 1, totalPages: 1 } });

      const result = await adminApi.listAllBanks({ search: 'cardio', status: 'ACTIVE' });

      const url = mockApi.get.mock.calls[0]![0] as string;
      expect(url).toContain('/question-banks');
      expect(url).toContain('search=cardio');
      expect(url).toContain('status=ACTIVE');
      expect(result.data).toEqual(banks);
    });
  });

  describe('updateBankStatus', () => {
    it('calls PATCH /question-banks/:id with status', async () => {
      const updated = { id: 'b1', status: 'ACTIVE' };
      mockApi.patch.mockResolvedValue({ data: updated });

      const result = await adminApi.updateBankStatus('b1', 'ACTIVE');

      expect(mockApi.patch).toHaveBeenCalledWith('/question-banks/b1', { status: 'ACTIVE' });
      expect(result).toEqual(updated);
    });
  });

  describe('deleteBank', () => {
    it('calls DELETE /question-banks/:id', async () => {
      mockApi.delete.mockResolvedValue({});

      await adminApi.deleteBank('b1');

      expect(mockApi.delete).toHaveBeenCalledWith('/question-banks/b1');
    });
  });
});
