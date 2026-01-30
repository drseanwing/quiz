/**
 * @file        Application configuration
 * @module      Config
 * @description Central configuration management using environment variables
 */

import dotenv from 'dotenv';

dotenv.config();

/**
 * Validates that required environment variables are set
 */
function validateEnv(): void {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

validateEnv();

/**
 * Application configuration object
 */
export const config = {
  // Application
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  appName: process.env.APP_NAME || 'REdI Quiz Platform',
  appUrl: process.env.APP_URL || 'http://localhost',

  // Database
  database: {
    url: process.env.DATABASE_URL!,
  },

  // Authentication
  jwt: {
    secret: process.env.JWT_SECRET!,
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Password requirements
  password: {
    minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
    requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE === 'true',
    requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE === 'true',
    requireNumber: process.env.PASSWORD_REQUIRE_NUMBER === 'true',
  },

  // Account lockout
  lockout: {
    maxAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
    durationMinutes: parseInt(process.env.LOCKOUT_DURATION_MINUTES || '15', 10),
  },

  // Email
  email: {
    allowedDomain: process.env.ALLOWED_EMAIL_DOMAIN || 'health.qld.gov.au',
    powerAutomateUrl: process.env.POWER_AUTOMATE_EMAIL_URL || '',
    replyTo: process.env.EMAIL_REPLY_TO || 'redi@health.qld.gov.au',
    fromName: process.env.EMAIL_FROM_NAME || 'REdI Quiz Platform',
    mockEmail: process.env.MOCK_EMAIL === 'true',
  },

  // File uploads
  upload: {
    dir: process.env.UPLOAD_DIR || '/app/uploads',
    maxSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10),
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,image/webp')
      .split(',')
      .map((t) => t.trim()),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || '/app/logs',
  },

  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    authMax: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '5', 10),
  },

  // CORS
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost')
      .split(',')
      .map((o) => o.trim()),
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },

  // Development
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  enableDebug: process.env.ENABLE_DEBUG === 'true',
} as const;

export default config;
