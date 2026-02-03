/**
 * @file        Orphan Cleanup Service
 * @module      Services/OrphanCleanup
 * @description Service for identifying and cleaning up orphaned upload files
 */

import path from 'path';
import fs from 'fs/promises';
import { uploadDir } from '@/config/upload';
import prisma from '@/config/database';
import logger from '@/config/logger';

export interface OrphanFile {
  filename: string;
  path: string;
  size: number;
  uploadedAt?: Date;
  uploadedBy?: string;
}

export interface CleanupResult {
  orphansFound: OrphanFile[];
  filesDeleted: string[];
  errors: Array<{ filename: string; error: string }>;
  totalSize: number;
}

/**
 * Get all filenames from the uploads/images directory
 */
async function getFilesystemFiles(): Promise<Map<string, { size: number; path: string }>> {
  const imagesDir = path.join(uploadDir, 'images');
  const files = new Map<string, { size: number; path: string }>();

  try {
    const entries = await fs.readdir(imagesDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile()) {
        const filePath = path.join(imagesDir, entry.name);
        const stats = await fs.stat(filePath);
        files.set(entry.name, { size: stats.size, path: filePath });
      }
    }
  } catch (err) {
    logger.error('Error reading uploads directory', { error: err });
    throw err;
  }

  return files;
}

/**
 * Get all filenames referenced in the database
 * Checks: question.promptImage, question.feedbackImage, and uploads table
 */
async function getReferencedFiles(): Promise<Set<string>> {
  const referenced = new Set<string>();

  // Get files from question images
  const questions = await prisma.question.findMany({
    select: {
      promptImage: true,
      feedbackImage: true,
    },
  });

  for (const question of questions) {
    if (question.promptImage) {
      // Extract filename from URL path like "/uploads/images/filename.jpg"
      const filename = path.basename(question.promptImage);
      referenced.add(filename);
    }
    if (question.feedbackImage) {
      const filename = path.basename(question.feedbackImage);
      referenced.add(filename);
    }
  }

  // Get files from uploads table that are not soft-deleted
  const uploads = await prisma.upload.findMany({
    where: {
      deletedAt: null,
    },
    select: {
      filename: true,
    },
  });

  for (const upload of uploads) {
    referenced.add(upload.filename);
  }

  logger.info('Referenced files collected', { count: referenced.size });
  return referenced;
}

/**
 * Get metadata for orphaned files from uploads table
 */
async function getOrphanMetadata(filenames: string[]): Promise<Map<string, { uploadedAt: Date; uploadedBy: string }>> {
  const metadata = new Map<string, { uploadedAt: Date; uploadedBy: string }>();

  if (filenames.length === 0) return metadata;

  const uploads = await prisma.upload.findMany({
    where: {
      filename: { in: filenames },
    },
    select: {
      filename: true,
      uploadedAt: true,
      uploadedBy: {
        select: {
          email: true,
        },
      },
    },
  });

  for (const upload of uploads) {
    metadata.set(upload.filename, {
      uploadedAt: upload.uploadedAt,
      uploadedBy: upload.uploadedBy.email,
    });
  }

  return metadata;
}

/**
 * Identify orphaned files (files on filesystem not referenced in database)
 * @param dryRun If true, only identify orphans without deleting
 */
export async function findOrphanedFiles(): Promise<OrphanFile[]> {
  logger.info('Starting orphan file scan');

  const filesystemFiles = await getFilesystemFiles();
  const referencedFiles = await getReferencedFiles();

  // Find orphans: files on disk but not referenced
  const orphanFilenames: string[] = [];
  for (const [filename] of filesystemFiles) {
    if (!referencedFiles.has(filename)) {
      orphanFilenames.push(filename);
    }
  }

  // Get metadata for orphans
  const metadata = await getOrphanMetadata(orphanFilenames);

  // Build orphan list with metadata
  const orphans: OrphanFile[] = [];
  for (const filename of orphanFilenames) {
    const fileInfo = filesystemFiles.get(filename)!;
    const meta = metadata.get(filename);

    orphans.push({
      filename,
      path: fileInfo.path,
      size: fileInfo.size,
      ...(meta?.uploadedAt !== undefined && { uploadedAt: meta.uploadedAt }),
      ...(meta?.uploadedBy !== undefined && { uploadedBy: meta.uploadedBy }),
    });
  }

  logger.info('Orphan scan complete', {
    totalFiles: filesystemFiles.size,
    referencedFiles: referencedFiles.size,
    orphansFound: orphans.length,
  });

  return orphans;
}

/**
 * Clean up orphaned files
 * @param dryRun If true, only identify orphans without deleting
 */
export async function cleanupOrphanedFiles(dryRun = true): Promise<CleanupResult> {
  const orphans = await findOrphanedFiles();

  const result: CleanupResult = {
    orphansFound: orphans,
    filesDeleted: [],
    errors: [],
    totalSize: orphans.reduce((sum, file) => sum + file.size, 0),
  };

  if (dryRun) {
    logger.info('Dry run complete - no files deleted', { orphansFound: orphans.length });
    return result;
  }

  // Delete orphaned files
  for (const orphan of orphans) {
    try {
      await fs.unlink(orphan.path);
      result.filesDeleted.push(orphan.filename);

      // Mark as deleted in database if tracked
      await prisma.upload.updateMany({
        where: { filename: orphan.filename },
        data: { deletedAt: new Date() },
      });

      logger.info('Orphaned file deleted', { filename: orphan.filename, size: orphan.size });
    } catch (err) {
      const error = err as Error;
      result.errors.push({
        filename: orphan.filename,
        error: error.message,
      });
      logger.error('Error deleting orphaned file', {
        filename: orphan.filename,
        error: error.message,
      });
    }
  }

  logger.info('Orphan cleanup complete', {
    orphansFound: orphans.length,
    filesDeleted: result.filesDeleted.length,
    errors: result.errors.length,
  });

  return result;
}
