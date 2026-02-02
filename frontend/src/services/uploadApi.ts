/**
 * @file        Upload API service
 * @description Client for image upload/delete endpoints
 */

import api from '@/services/api';
import type { IApiResponse } from '@/types';

export interface IUploadResult {
  filename: string;
  url: string;
  size: number;
  mimetype: string;
}

/**
 * Upload an image file
 */
export async function uploadImage(file: File): Promise<IUploadResult> {
  const formData = new FormData();
  formData.append('image', file);

  const body = (await api.post('/uploads/images', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })) as unknown as IApiResponse<IUploadResult>;
  return body.data;
}

/**
 * Delete an uploaded image by filename
 */
export async function deleteImage(filename: string): Promise<void> {
  await api.delete(`/uploads/images/${encodeURIComponent(filename)}`);
}
