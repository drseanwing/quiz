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
}

export async function listQuestionBanks(
  params: IQuestionBankListParams = {}
): Promise<IQuestionBankListResponse> {
  const searchParams = new URLSearchParams();
  if (params.page !== undefined) searchParams.set('page', String(params.page));
  if (params.pageSize !== undefined) searchParams.set('pageSize', String(params.pageSize));
  if (params.search) searchParams.set('search', params.search);
  if (params.status) searchParams.set('status', params.status);

  const query = searchParams.toString();
  const body = (await api.get(`/question-banks${query ? `?${query}` : ''}`)) as unknown as IApiResponse<IQuestionBankListResponse>;
  return body.data;
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

export async function exportQuestionBank(id: string): Promise<unknown> {
  const body = (await api.get(`/question-banks/${id}/export`)) as unknown as IApiResponse<unknown>;
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
