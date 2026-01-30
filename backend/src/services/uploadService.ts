/**
 * @file        Upload service
 * @module      Services/Upload
 * @description Image upload and management service
 */

import path from 'path';
import fs from 'fs/promises';
import { uploadDir } from '@/config/upload';
import { NotFoundError } from '@/middleware/errorHandler';
import logger from '@/config/logger';

/**
 * Get the public URL path for an uploaded image
 */
export function getImageUrl(filename: string): string {
  const sanitized = path.basename(filename);
  return `/uploads/images/${sanitized}`;
}

/**
 * Get the filesystem path for an uploaded image
 */
function getImagePath(filename: string): string {
  // Prevent path traversal
  const sanitized = path.basename(filename);
  return path.join(uploadDir, 'images', sanitized);
}

/**
 * Delete an uploaded image from the filesystem
 */
export async function deleteImage(filename: string): Promise<void> {
  const filePath = getImagePath(filename);

  try {
    await fs.access(filePath);
    await fs.unlink(filePath);
    logger.info('Image deleted', { filename });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new NotFoundError('Image');
    }
    throw err;
  }
}

/**
 * Check if an image file exists
 */
export async function imageExists(filename: string): Promise<boolean> {
  const filePath = getImagePath(filename);
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
