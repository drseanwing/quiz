/**
 * @file        Question Bank API service
 * @description API functions for question bank operations
 */

import api from '@/services/api';
import type {
  IQuestionBank,
  IApiResponse,
  IPaginationMeta,
  QuestionBankStatus,
} from '@/types';

interface IQuestionBankListResponse {
  banks: IQuestionBank[];
  meta: IPaginationMeta;
}

interface IQuestionBankListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: QuestionBankStatus;
  sortBy?: 'title' | 'createdAt' | 'updatedAt' | 'status' | 'questionCount';
  sortOrder?: 'asc' | 'desc';
}

export async function listQuestionBanks(
  params: IQuestionBankListParams = {}
): Promise<IQuestionBankListResponse> {
  const searchParams = new URLSearchParams();
  if (params.page !== undefined) searchParams.set('page', String(params.page));
  if (params.pageSize !== undefined) searchParams.set('pageSize', String(params.pageSize));
  if (params.search) searchParams.set('search', params.search);
  if (params.status) searchParams.set('status', params.status);
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

  const query = searchParams.toString();
  const body = (await api.get(`/question-banks${query ? `?${query}` : ''}`)) as unknown as IApiResponse<IQuestionBank[]>;
  return { banks: body.data, meta: body.meta! };
}

export async function getQuestionBank(id: string): Promise<IQuestionBank> {
  const body = (await api.get(`/question-banks/${id}`)) as unknown as IApiResponse<IQuestionBank>;
  return body.data;
}

export async function createQuestionBank(
  data: Partial<IQuestionBank>
): Promise<IQuestionBank> {
  const body = (await api.post('/question-banks', data)) as unknown as IApiResponse<IQuestionBank>;
  return body.data;
}

export async function updateQuestionBank(
  id: string,
  data: Partial<IQuestionBank>
): Promise<IQuestionBank> {
  const body = (await api.patch(`/question-banks/${id}`, data)) as unknown as IApiResponse<IQuestionBank>;
  return body.data;
}

export async function deleteQuestionBank(id: string): Promise<void> {
  await api.delete(`/question-banks/${id}`);
}

export async function duplicateQuestionBank(id: string): Promise<IQuestionBank> {
  const body = (await api.post(`/question-banks/${id}/duplicate`)) as unknown as IApiResponse<IQuestionBank>;
  return body.data;
}

export interface IExportedQuestion {
  type: string;
  prompt: string;
  promptImage: string | null;
  options: unknown;
  correctAnswer: unknown;
  feedback: string;
  feedbackImage: string | null;
  referenceLink: string | null;
  order: number;
}

export interface IExportedQuestionBank {
  version: string;
  exportedAt: string;
  bank: {
    title: string;
    description: string | null;
    timeLimit: number;
    randomQuestions: boolean;
    randomAnswers: boolean;
    passingScore: number;
    feedbackTiming: string;
    questionCount: number;
    maxAttempts: number;
  };
  questions: IExportedQuestion[];
}

export async function exportQuestionBank(id: string): Promise<IExportedQuestionBank> {
  const body = (await api.get(`/question-banks/${id}/export`)) as unknown as IApiResponse<IExportedQuestionBank>;
  return body.data;
}

interface IImportResult {
  id: string;
  title: string;
  questionCount: number;
}

export async function importQuestionBank(data: unknown): Promise<IImportResult> {
  const body = (await api.post('/question-banks/import', data)) as unknown as IApiResponse<IImportResult>;
  return body.data;
}
