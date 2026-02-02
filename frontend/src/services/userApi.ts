/**
 * @file        User API service
 * @description API calls for user profile management
 */

import api from './api';
import type { IUser, IApiResponse } from '@/types';

export interface IUpdateProfileRequest {
  firstName?: string;
  surname?: string;
  idNumber?: string;
}

export interface IChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * Get current user profile
 */
export async function getCurrentUser(): Promise<IUser> {
  const response = await api.get('/users/me') as unknown as IApiResponse<IUser>;
  return response.data;
}

/**
 * Update current user profile (first name, surname, ID number)
 */
export async function updateProfile(data: IUpdateProfileRequest): Promise<IUser> {
  const response = await api.patch('/users/me', data) as unknown as IApiResponse<IUser>;
  return response.data;
}

/**
 * Change password
 */
export async function changePassword(data: IChangePasswordRequest): Promise<void> {
  await api.patch('/users/me/password', data);
}
