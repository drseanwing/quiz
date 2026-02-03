/**
 * @file        Upload service
 * @module      Services/Upload
 * @description Image upload and management service
 */

import path from 'path';
import fs from 'fs/promises';
import { uploadDir } from '@/config/upload';
import { NotFoundError, ForbiddenError } from '@/middleware/errorHandler';
import logger from '@/config/logger';
import prisma from '@/config/database';

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
 * Record an uploaded file in the database
 */
export async function recordUpload(data: {
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  uploadedById: string;
  associatedEntity?: string;
}): Promise<void> {
  await prisma.upload.create({
    data: {
      filename: data.filename,
      originalName: data.originalName,
      mimetype: data.mimetype,
      size: data.size,
      uploadedById: data.uploadedById,
      associatedEntity: data.associatedEntity,
    },
  });
  logger.info('Upload recorded in database', { filename: data.filename, uploadedById: data.uploadedById });
}

/**
 * Delete an uploaded image from the filesystem and mark as deleted in database
 */
export async function deleteImage(
  filename: string,
  userId: string,
  userRole: string
): Promise<void> {
  const filePath = getImagePath(filename);

  // Check ownership if not admin
  if (userRole !== 'ADMIN') {
    const upload = await prisma.upload.findUnique({
      where: { filename },
    });

    if (!upload) {
      throw new NotFoundError('Image');
    }

    if (upload.uploadedById !== userId) {
      throw new ForbiddenError('You do not have permission to delete this file');
    }
  }

  try {
    await fs.access(filePath);
    await fs.unlink(filePath);

    // Mark as deleted in database (soft delete)
    await prisma.upload.update({
      where: { filename },
      data: { deletedAt: new Date() },
    });

    logger.info('Image deleted', { filename, userId });
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
