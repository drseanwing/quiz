/**
 * @file        Admin API service
 * @description API functions for admin endpoints
 */

import { api } from './api';

interface IApiResponse<T> {
  success: boolean;
  data: T;
  meta?: { page: number; pageSize: number; totalCount: number; totalPages: number };
}

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
  return { data: body.data, meta: body.meta! };
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
  return { data: body.data, meta: body.meta! };
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
  return { data: body.data, meta: body.meta! };
}
