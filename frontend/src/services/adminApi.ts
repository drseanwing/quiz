/**
 * @file        Admin API service
 * @description API functions for admin endpoints
 */

import { api } from './api';
import type { IApiResponse } from '@/types';

// Stats
export interface IPlatformStats {
  totalUsers: number;
  activeUsers: number;
  totalBanks: number;
  activeBanks: number;
  totalAttempts: number;
  completedAttempts: number;
  completionRate: number;
  averageScore: number;
  passRate: number;
}

export async function getStats(): Promise<IPlatformStats> {
  const body = (await api.get('/admin/stats')) as unknown as IApiResponse<IPlatformStats>;
  return body.data;
}

// Completions
export interface ICompletionRow {
  id: string;
  userName: string;
  userEmail: string;
  bankTitle: string;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  status: string;
  completedAt: string | null;
  timeSpent: number;
}

export interface ICompletionFilters {
  bankId?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  passed?: string;
  page?: number;
  pageSize?: number;
}

export async function listCompletions(filters: ICompletionFilters): Promise<{
  data: ICompletionRow[];
  meta: { page: number; pageSize: number; totalCount: number; totalPages: number };
}> {
  const params = new URLSearchParams();
  if (filters.bankId) params.set('bankId', filters.bankId);
  if (filters.userId) params.set('userId', filters.userId);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.passed) params.set('passed', filters.passed);
  params.set('page', String(filters.page || 1));
  params.set('pageSize', String(filters.pageSize || 20));

  const body = (await api.get(`/admin/completions?${params}`)) as unknown as IApiResponse<ICompletionRow[]>;
  return { data: body.data, meta: body.meta ?? { page: 1, pageSize: 20, totalCount: 0, totalPages: 0 } };
}

export async function exportCompletionsCSV(filters: Omit<ICompletionFilters, 'page' | 'pageSize'>): Promise<Blob> {
  const params = new URLSearchParams();
  if (filters.bankId) params.set('bankId', filters.bankId);
  if (filters.userId) params.set('userId', filters.userId);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.passed) params.set('passed', filters.passed);

  const response = await api.get(`/admin/completions/export?${params}`, {
    responseType: 'blob',
  });
  return response as unknown as Blob;
}

// Logs
export interface ILogRow {
  id: string;
  userId: string | null;
  userName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  details: unknown;
  ipAddress: string | null;
  createdAt: string;
}

export interface ILogFilters {
  action?: string;
  entityType?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export async function listLogs(filters: ILogFilters): Promise<{
  data: ILogRow[];
  meta: { page: number; pageSize: number; totalCount: number; totalPages: number };
}> {
  const params = new URLSearchParams();
  if (filters.action) params.set('action', filters.action);
  if (filters.entityType) params.set('entityType', filters.entityType);
  if (filters.userId) params.set('userId', filters.userId);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  params.set('page', String(filters.page || 1));
  params.set('pageSize', String(filters.pageSize || 20));

  const body = (await api.get(`/admin/logs?${params}`)) as unknown as IApiResponse<ILogRow[]>;
  return { data: body.data, meta: body.meta ?? { page: 1, pageSize: 20, totalCount: 0, totalPages: 0 } };
}

// Invite Tokens
export interface IInviteTokenRow {
  id: string;
  token: string;
  email: string;
  firstName: string | null;
  surname: string | null;
  bankTitle: string | null;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}

export interface ICreateInviteRequest {
  email: string;
  firstName?: string;
  surname?: string;
  bankId?: string;
  expiresInDays?: number;
}

export async function createInvite(data: ICreateInviteRequest): Promise<IInviteTokenRow> {
  const body = (await api.post('/admin/invite-tokens', data)) as unknown as IApiResponse<IInviteTokenRow>;
  return body.data;
}

export async function listInvites(page = 1, pageSize = 20): Promise<{
  data: IInviteTokenRow[];
  meta: { page: number; pageSize: number; totalCount: number; totalPages: number };
}> {
  const body = (await api.get(`/admin/invite-tokens?page=${page}&pageSize=${pageSize}`)) as unknown as IApiResponse<IInviteTokenRow[]>;
  return { data: body.data, meta: body.meta ?? { page: 1, pageSize: 20, totalCount: 0, totalPages: 0 } };
}

// Users
export interface IUserRow {
  id: string;
  email: string;
  firstName: string;
  surname: string;
  idNumber: string | null;
  role: 'USER' | 'EDITOR' | 'ADMIN';
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IUserFilters {
  search?: string;
  role?: string;
  isActive?: string;
  page?: number;
  pageSize?: number;
}

export interface ICreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  surname: string;
  idNumber?: string;
  role?: string;
}

export interface IUpdateUserRequest {
  firstName?: string;
  surname?: string;
  idNumber?: string | null;
  role?: string;
  isActive?: boolean;
}

export async function listUsers(filters: IUserFilters): Promise<{
  data: IUserRow[];
  meta: { page: number; pageSize: number; totalCount: number; totalPages: number };
}> {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.role) params.set('role', filters.role);
  if (filters.isActive) params.set('isActive', filters.isActive);
  params.set('page', String(filters.page || 1));
  params.set('pageSize', String(filters.pageSize || 20));

  const body = (await api.get(`/users?${params}`)) as unknown as IApiResponse<IUserRow[]>;
  return { data: body.data, meta: body.meta ?? { page: 1, pageSize: 20, totalCount: 0, totalPages: 0 } };
}

export async function createUser(data: ICreateUserRequest): Promise<IUserRow> {
  const body = (await api.post('/users', data)) as unknown as IApiResponse<IUserRow>;
  return body.data;
}

export async function updateUser(userId: string, data: IUpdateUserRequest): Promise<IUserRow> {
  const body = (await api.patch(`/users/${userId}`, data)) as unknown as IApiResponse<IUserRow>;
  return body.data;
}

export async function deactivateUser(userId: string): Promise<IUserRow> {
  const body = (await api.delete(`/users/${userId}`)) as unknown as IApiResponse<IUserRow>;
  return body.data;
}

export async function adminResetPassword(userId: string, password: string): Promise<{ message: string }> {
  const body = (await api.post(`/users/${userId}/reset-password`, { password })) as unknown as IApiResponse<{ message: string }>;
  return body.data;
}

// Question Banks (admin view - uses the existing question-banks API)
export interface IQuestionBankRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  questionCount: number;
  maxAttempts: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; firstName: string; surname: string; email: string };
  _count: { questions: number; attempts: number };
}

export interface IQuestionBankFilters {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export async function listAllBanks(filters: IQuestionBankFilters): Promise<{
  data: IQuestionBankRow[];
  meta: { page: number; pageSize: number; totalCount: number; totalPages: number };
}> {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  params.set('page', String(filters.page || 1));
  params.set('pageSize', String(filters.pageSize || 20));

  const body = (await api.get(`/question-banks?${params}`)) as unknown as IApiResponse<IQuestionBankRow[]>;
  return { data: body.data, meta: body.meta ?? { page: 1, pageSize: 20, totalCount: 0, totalPages: 0 } };
}

export async function updateBankStatus(bankId: string, status: string): Promise<IQuestionBankRow> {
  const body = (await api.patch(`/question-banks/${bankId}`, { status })) as unknown as IApiResponse<IQuestionBankRow>;
  return body.data;
}

export async function deleteBank(bankId: string): Promise<void> {
  await api.delete(`/question-banks/${bankId}`);
}
