/**
 * @file        Upload configuration
 * @module      Config/Upload
 * @description Multer configuration for file uploads
 */

import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import sharp from 'sharp';
import { config } from '@/config';
import { ValidationError } from '@/middleware/errorHandler';
import logger from '@/config/logger';

const uploadDir = config.upload.dir;

// Ensure upload directory exists
function ensureUploadDir(): void {
  try {
    const imagesDir = path.join(uploadDir, 'images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }
  } catch (err) {
    // Non-fatal in test environments; log warning
    if (process.env.NODE_ENV !== 'test') {
      console.error('Failed to create upload directory:', err);
    }
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

/**
 * Magic byte signatures for allowed image types
 */
const MAGIC_BYTES: Record<string, { bytes: number[]; offset?: number }[]> = {
  'image/jpeg': [{ bytes: [0xFF, 0xD8, 0xFF] }],
  'image/png': [{ bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] }],
  'image/gif': [{ bytes: [0x47, 0x49, 0x46, 0x38] }],
  'image/webp': [{ bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, { bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 }],
};

/**
 * Validate uploaded file's magic bytes match its claimed MIME type.
 * Deletes the file and throws ValidationError if mismatch detected.
 */
export async function validateMagicBytes(filePath: string, claimedMime: string): Promise<void> {
  const signatures = MAGIC_BYTES[claimedMime];
  if (!signatures) {
    // SVG and other text-based types have no magic bytes; skip validation
    return;
  }

  const maxOffset = Math.max(...signatures.map(s => (s.offset ?? 0) + s.bytes.length));
  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(maxOffset);
    fs.readSync(fd, buf, 0, maxOffset, 0);

    for (const sig of signatures) {
      const offset = sig.offset ?? 0;
      const match = sig.bytes.every((b, i) => buf[offset + i] === b);
      if (!match) {
        // Clean up the invalid file
        fs.closeSync(fd);
        fs.unlinkSync(filePath);
        logger.warn('Upload rejected: magic bytes mismatch', { claimedMime, filePath });
        throw new ValidationError(
          'File content does not match its declared type. Please upload a valid image file.'
        );
      }
    }
  } finally {
    try { fs.closeSync(fd); } catch { /* already closed */ }
  }
}

/**
 * Optimize uploaded image using sharp
 * - Resize if larger than max dimensions
 * - Compress to reduce file size
 * - Convert to optimal format
 */
export async function optimizeImage(filePath: string, mimetype: string): Promise<void> {
  const MAX_WIDTH = 2048;
  const MAX_HEIGHT = 2048;
  const JPEG_QUALITY = 85;
  const PNG_QUALITY = 85;
  const WEBP_QUALITY = 85;

  try {
    const image = sharp(filePath);
    const metadata = await image.metadata();

    // Skip optimization if image is already small
    if (!metadata.width || !metadata.height) {
      logger.warn('Could not read image dimensions, skipping optimization', { filePath });
      return;
    }

    const needsResize = metadata.width > MAX_WIDTH || metadata.height > MAX_HEIGHT;

    // Determine output format and quality
    let pipeline = image;

    if (needsResize) {
      pipeline = pipeline.resize(MAX_WIDTH, MAX_HEIGHT, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Apply format-specific compression
    if (mimetype === 'image/jpeg') {
      pipeline = pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true });
    } else if (mimetype === 'image/png') {
      pipeline = pipeline.png({ quality: PNG_QUALITY, compressionLevel: 9 });
    } else if (mimetype === 'image/webp') {
      pipeline = pipeline.webp({ quality: WEBP_QUALITY });
    } else if (mimetype === 'image/gif') {
      // GIF optimization is limited; sharp doesn't support animated GIFs well
      // Just resize if needed
      if (needsResize) {
        pipeline = pipeline.png({ quality: PNG_QUALITY });
      } else {
        return; // Skip optimization for GIFs
      }
    }

    // Write optimized image to temporary file
    const tempPath = `${filePath}.tmp`;
    await pipeline.toFile(tempPath);

    // Replace original with optimized version
    fs.renameSync(tempPath, filePath);

    logger.info('Image optimized', {
      filePath,
      originalSize: metadata.size,
      originalDimensions: `${metadata.width}x${metadata.height}`,
    });
  } catch (error) {
    logger.error('Image optimization failed', { filePath, error });
    // Don't throw - allow upload to proceed with unoptimized image
  }
}

export { uploadDir };
