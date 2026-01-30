/**
 * @file        Upload configuration
 * @module      Config/Upload
 * @description Multer configuration for file uploads
 */

import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { config } from '@/config';
import { ValidationError } from '@/middleware/errorHandler';

const uploadDir = config.upload.dir;

// Ensure upload directory exists
function ensureUploadDir(): void {
  const imagesDir = path.join(uploadDir, 'images');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
}

ensureUploadDir();

/**
 * Sanitize filename to prevent path traversal and special characters
 */
function sanitizeFilename(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  return `${timestamp}-${random}${ext}`;
}

/**
 * Multer storage configuration
 */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(uploadDir, 'images'));
  },
  filename: (_req, file, cb) => {
    cb(null, sanitizeFilename(file.originalname));
  },
});

/**
 * File filter for allowed image types
 */
function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void {
  if (config.upload.allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ValidationError(
        `File type '${file.mimetype}' is not allowed. Accepted types: ${config.upload.allowedTypes.join(', ')}`
      )
    );
  }
}

/**
 * Configured multer instance for image uploads
 */
export const imageUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxSize,
    files: 1,
  },
});

export { uploadDir };
