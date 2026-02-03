/**
 * @file        Main application entry point
 * @module      Main
 * @description Initializes and starts the Express server
 */

import express from 'express';
import path from 'path';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from './config';
import logger from './config/logger';
import { connectDatabase, disconnectDatabase } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { generalRateLimiter } from './middleware/rateLimiter';
import { authenticate } from './middleware/auth';
import routes from './routes';

const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));
const app = express();

// Development mode warning
if (config.isDevelopment && config.port !== 3000) {
  logger.warn('Running in development mode - ensure this is not a production deployment');
}

// Trust proxy (required behind nginx/Docker for correct req.ip and rate limiting)
app.set('trust proxy', 1);

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for React
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow uploaded images to load cross-origin
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'same-origin' },
  })
);

// CORS configuration
app.use(
  cors({
    origin: config.cors.origin,
    credentials: config.cors.credentials,
  })
);

// Response compression
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Serve uploaded files (requires authentication)
app.use('/uploads', authenticate, express.static(path.resolve(config.upload.dir), { maxAge: '7d', immutable: true }));

// General rate limiting
app.use('/api', generalRateLimiter);

// API Routes
app.use('/api', routes);

// Serve frontend static files (production only)
if (config.nodeEnv === 'production') {
  const frontendDistPath = path.resolve(__dirname, '../frontend/dist');

  // Serve static assets with caching
  app.use(express.static(frontendDistPath, {
    maxAge: '1d',
    immutable: true,
    setHeaders: (res, filepath) => {
      // Cache bust on index.html
      if (filepath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    },
  }));

  // Catch-all handler for SPA and API 404s
  app.use((req, res) => {
    // API routes should return JSON 404
    if (req.path.startsWith('/api')) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'The requested endpoint does not exist',
        },
      });
    }

    // Non-API routes serve the SPA with cache-busting headers
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else {
  // Development mode - API only, return 404 for all routes
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'The requested endpoint does not exist. Frontend should be served separately in development.',
      },
    });
  });
}

// Error handling
app.use(errorHandler);

// Start server
const port = config.port;

async function start() {
  await connectDatabase();

  const server = app.listen(port, () => {
    logger.info(`REdI Quiz Platform API started`, {
      port,
      environment: config.nodeEnv,
      version: pkg.version,
    });
  });

  // Graceful shutdown with timeout
  const SHUTDOWN_TIMEOUT_MS = 10_000;

  function shutdown(signal: string) {
    logger.info(`${signal} signal received: closing HTTP server`);
    server.close(() => {
      logger.info('HTTP server closed');
      disconnectDatabase().then(() => {
        process.exit(0);
      });
    });

    // Force exit if shutdown takes too long
    setTimeout(() => {
      logger.warn('Shutdown timed out, forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS).unref();
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Only auto-start when not running under a test runner
if (process.env.NODE_ENV !== 'test') {
  start().catch((err) => {
    logger.error('Failed to start server', { error: err });
    process.exit(1);
  });
}

export default app;
