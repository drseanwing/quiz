/**
 * @file        Upload Routes
 * @module      Routes/Uploads
 * @description Image upload endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireEditor } from '@/middleware/auth';
import { uploadRateLimiter } from '@/middleware/rateLimiter';
import { imageUpload } from '@/config/upload';
import { getImageUrl, deleteImage } from '@/services/uploadService';
import { ValidationError } from '@/middleware/errorHandler';
import logger from '@/config/logger';

const router = Router();

/**
 * POST /api/uploads/images
 * Upload a single image
 *
 * Requires EDITOR or ADMIN role
 *
 * @returns {201} Image uploaded with URL
 * @returns {400} Invalid file type or size
 * @returns {403} Insufficient permissions
 */
router.post(
  '/images',
  authenticate,
  requireEditor,
  uploadRateLimiter,
  (req: Request, res: Response, next: NextFunction) => {
    imageUpload.single('image')(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new ValidationError('File exceeds maximum allowed size'));
        }
        return next(err);
      }
      next();
    });
  },
  (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new ValidationError('No image file provided');
      }

      const url = getImageUrl(req.file.filename);

      logger.info('Image uploaded', {
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
        userId: req.user!.userId,
      });

      res.status(201).json({
        success: true,
        data: {
          filename: req.file.filename,
          url,
          size: req.file.size,
          mimetype: req.file.mimetype,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/uploads/images/:filename
 * Delete an uploaded image
 *
 * Requires EDITOR or ADMIN role
 *
 * @returns {200} Image deleted
 * @returns {404} Image not found
 * @returns {403} Insufficient permissions
 */
router.delete(
  '/images/:filename',
  authenticate,
  requireEditor,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filename = req.params.filename as string;

      await deleteImage(filename);

      logger.info('Image deleted via API', {
        filename,
        userId: req.user!.userId,
      });

      res.json({
        success: true,
        data: {
          message: 'Image deleted successfully',
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
