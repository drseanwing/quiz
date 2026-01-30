/**
 * @file        Question API service
 * @description API functions for question operations
 */

import api from '@/services/api';
import type {
  IQuestion,
  IApiResponse,
  IPaginationMeta,
} from '@/types';

interface IQuestionListResponse {
  questions: IQuestion[];
  meta: IPaginationMeta;
}

interface IQuestionListParams {
  page?: number;
  pageSize?: number;
}

export async function listQuestions(
  bankId: string,
  params: IQuestionListParams = {}
): Promise<IQuestionListResponse> {
  const searchParams = new URLSearchParams();
  if (params.page !== undefined) searchParams.set('page', String(params.page));
  if (params.pageSize !== undefined) searchParams.set('pageSize', String(params.pageSize));

  const query = searchParams.toString();
  const body = (await api.get(
    `/question-banks/${bankId}/questions${query ? `?${query}` : ''}`
  )) as unknown as IApiResponse<IQuestionListResponse>;
  return body.data;
}

export async function getQuestion(id: string): Promise<IQuestion> {
  const body = (await api.get(`/questions/${id}`)) as unknown as IApiResponse<IQuestion>;
  return body.data;
}

export async function createQuestion(
  bankId: string,
  data: Partial<IQuestion>
): Promise<IQuestion> {
  const body = (await api.post(
    `/question-banks/${bankId}/questions`,
    data
  )) as unknown as IApiResponse<IQuestion>;
  return body.data;
}

export async function updateQuestion(
  id: string,
  data: Partial<IQuestion>
): Promise<IQuestion> {
  const body = (await api.patch(`/questions/${id}`, data)) as unknown as IApiResponse<IQuestion>;
  return body.data;
}

export async function deleteQuestion(id: string): Promise<void> {
  await api.delete(`/questions/${id}`);
}

export async function duplicateQuestion(id: string): Promise<IQuestion> {
  const body = (await api.post(
    `/questions/${id}/duplicate`
  )) as unknown as IApiResponse<IQuestion>;
  return body.data;
}

export async function reorderQuestions(
  bankId: string,
  questionIds: string[]
): Promise<void> {
  await api.patch(`/question-banks/${bankId}/questions/reorder`, {
    questionIds,
  });
}
