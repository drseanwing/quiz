/**
 * @file        Main application entry point
 * @module      Main
 * @description Initializes and starts the Express server
 */

import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import logger from './config/logger';
import { errorHandler } from './middleware/errorHandler';
import { generalRateLimiter } from './middleware/rateLimiter';
import routes from './routes';

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: config.cors.origin,
    credentials: config.cors.credentials,
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Serve uploaded files
app.use('/uploads', express.static(path.resolve(config.upload.dir)));

// General rate limiting
app.use('/api', generalRateLimiter);

// Routes
app.use('/api', routes);

// 404 handler for undefined routes
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested endpoint does not exist',
    },
  });
});

// Error handling
app.use(errorHandler);

// Start server
const port = config.port;
app.listen(port, () => {
  logger.info(`REdI Quiz Platform API started`, {
    port,
    environment: config.nodeEnv,
    version: '1.0.0',
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

export default app;
