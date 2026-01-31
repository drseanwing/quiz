/**
 * Jest setup file
 * Runs before each test suite
 */

import path from 'path';
import os from 'os';

// Set test environment variables before any module imports
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only';
process.env.LOG_DIR = path.join(os.tmpdir(), 'redi-quiz-test-logs');
process.env.LOG_LEVEL = 'silent';
