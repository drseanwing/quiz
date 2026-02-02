/**
 * @file        Query Key Factory
 * @description Centralized TanStack Query key definitions to prevent cache invalidation bugs
 */

export const queryKeys = {
  // Quiz-taking
  availableQuizzes: ['available-quizzes'] as const,
  myAttempts: ['my-attempts'] as const,
  quizAttempt: (attemptId: string) => ['quiz-attempt', attemptId] as const,
  quizResults: (attemptId: string) => ['quiz-results', attemptId] as const,

  // Question banks (editor)
  questionBanks: (filters?: Record<string, unknown>) =>
    filters ? ['questionBanks', filters] as const : ['questionBanks'] as const,
  questionBank: (id: string) => ['questionBank', id] as const,
  questions: (bankId: string) => ['questions', bankId] as const,

  // Admin
  adminStats: ['admin-stats'] as const,
  adminUsers: (page?: number, filters?: Record<string, unknown>) =>
    page !== undefined ? ['admin-users', page, filters] as const : ['admin-users'] as const,
  adminBanks: (page?: number, filters?: Record<string, unknown>) =>
    page !== undefined ? ['admin-banks', page, filters] as const : ['admin-banks'] as const,
  adminCompletions: (page?: number, filters?: Record<string, unknown>) =>
    page !== undefined ? ['admin-completions', page, filters] as const : ['admin-completions'] as const,
  adminInvites: (page?: number) =>
    page !== undefined ? ['admin-invites', page] as const : ['admin-invites'] as const,
  adminLogs: (page?: number, filters?: Record<string, unknown>) =>
    page !== undefined ? ['admin-logs', page, filters] as const : ['admin-logs'] as const,
} as const;
