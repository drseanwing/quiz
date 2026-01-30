/**
 * @file        Quiz API service
 * @description API functions for quiz attempt operations
 */

import api from '@/services/api';
import type {
  IApiResponse,
  IStartQuizResult,
  IAttemptState,
  ISaveProgressResult,
  IQuizResults,
  IAttemptSummary,
  IQuestionBank,
} from '@/types';

export async function startQuiz(bankId: string): Promise<IStartQuizResult> {
  const body = (await api.post(`/quizzes/${bankId}/start`)) as unknown as IApiResponse<IStartQuizResult>;
  return body.data;
}

export async function getAttempt(attemptId: string): Promise<IAttemptState> {
  const body = (await api.get(`/attempts/${attemptId}`)) as unknown as IApiResponse<IAttemptState>;
  return body.data;
}

export async function saveProgress(
  attemptId: string,
  responses: Record<string, unknown>,
  timeSpent: number
): Promise<ISaveProgressResult> {
  const body = (await api.patch(`/attempts/${attemptId}`, {
    responses,
    timeSpent,
  })) as unknown as IApiResponse<ISaveProgressResult>;
  return body.data;
}

export async function submitAttempt(attemptId: string): Promise<IQuizResults> {
  const body = (await api.post(`/attempts/${attemptId}/submit`)) as unknown as IApiResponse<IQuizResults>;
  return body.data;
}

export async function getResults(attemptId: string): Promise<IQuizResults> {
  const body = (await api.get(`/attempts/${attemptId}/results`)) as unknown as IApiResponse<IQuizResults>;
  return body.data;
}

export async function listMyAttempts(bankId?: string): Promise<IAttemptSummary[]> {
  const query = bankId ? `?bankId=${bankId}` : '';
  const body = (await api.get(`/attempts/mine${query}`)) as unknown as IApiResponse<IAttemptSummary[]>;
  return body.data;
}

export async function listAvailableQuizzes(): Promise<IQuestionBank[]> {
  const body = (await api.get('/question-banks?pageSize=100')) as unknown as IApiResponse<{ data: IQuestionBank[] }>;
  // The list endpoint wraps in {data, meta} format
  const result = body.data as unknown as IQuestionBank[];
  return Array.isArray(result) ? result : [];
}
