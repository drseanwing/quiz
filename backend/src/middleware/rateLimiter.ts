/**
 * @file        Rate Limiter Middleware
 * @module      Middleware/RateLimiter
 * @description Rate limiting configuration for API endpoints
 */

import rateLimit from 'express-rate-limit';
import { config } from '@/config';
import logger from '@/config/logger';

/**
 * General API rate limiter
 * Applies to all API endpoints
 * Default: 100 requests per minute per IP
 */
export const generalRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });

    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
      },
    });
  },
});

/**
 * Authentication endpoints rate limiter
 * More restrictive for security-sensitive endpoints
 * Default: 5 requests per minute per IP
 */
export const authRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.authMax,
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.headers['user-agent'],
    });

    res.status(429).json({
      success: false,
      error: {
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts, please try again later',
      },
    });
  },
});

/**
 * File upload rate limiter
 * Moderate restriction for upload endpoints
 * Default: 10 requests per minute per IP
 */
export const uploadRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: 10,
  message: {
    success: false,
    error: {
      code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
      message: 'Too many upload requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Upload rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });

    res.status(429).json({
      success: false,
      error: {
        code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
        message: 'Too many upload requests, please try again later',
      },
    });
  },
});

/**
 * Password reset rate limiter
 * Very restrictive for password reset to prevent abuse
 * 3 requests per hour per IP
 */
export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: {
    success: false,
    error: {
      code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
      message: 'Too many password reset requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Password reset rate limit exceeded', {
      ip: req.ip,
      email: req.body.email,
    });

    res.status(429).json({
      success: false,
      error: {
        code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
        message: 'Too many password reset requests, please try again later',
      },
    });
  },
});
