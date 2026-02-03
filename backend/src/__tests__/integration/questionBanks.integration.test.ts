/**
 * @file        Question Banks Integration Tests
 * @description Integration tests for question bank CRUD endpoints
 */

import request from 'supertest';
import { UserRole, QuestionBankStatus, FeedbackTiming } from '@prisma/client';
import { generateAccessToken } from '@/utils/jwt';

// Mock Prisma at module level
jest.mock('@/config/database', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
    questionBank: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  },
}));

// Mock rate limiter
jest.mock('@/middleware/rateLimiter', () => ({
  generalRateLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  authRateLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  passwordResetRateLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  uploadRateLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// Import app after mocks are set up
import app from '@/index';

// Get reference to mocked prisma
const mockPrisma = jest.mocked(require('@/config/database').default);

beforeEach(() => {
  jest.clearAllMocks();
});

// Helper to create mock user
function createMockUser(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_USER_ID,
    email: 'test@example.com',
    firstName: 'John',
    surname: 'Doe',
    role: UserRole.USER,
    isActive: true,
    ...overrides,
  };
}

// Test UUIDs for consistency
const TEST_BANK_ID = '00000000-0000-0000-0000-000000000001';
const TEST_BANK_ID_2 = '00000000-0000-0000-0000-000000000002';
const TEST_USER_ID = '10000000-0000-0000-0000-000000000001';
const TEST_EDITOR_ID = '20000000-0000-0000-0000-000000000001';
const TEST_ADMIN_ID = '30000000-0000-0000-0000-000000000001';

// Helper to create mock question bank
function createMockBank(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_BANK_ID,
    title: 'Test Bank',
    description: 'A test bank',
    status: QuestionBankStatus.OPEN,
    timeLimit: 30,
    randomQuestions: true,
    randomAnswers: true,
    passingScore: 80,
    feedbackTiming: FeedbackTiming.END,
    notificationEmail: null,
    questionCount: 10,
    maxAttempts: 0,
    createdById: TEST_EDITOR_ID,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: { id: TEST_EDITOR_ID, firstName: 'Test', surname: 'Editor', email: 'editor@test.com' },
    _count: { questions: 5, attempts: 0 },
    ...overrides,
  };
}

describe('GET /api/question-banks', () => {
  it('should list question banks for authenticated user', async () => {
    const user = createMockUser();
    const accessToken = generateAccessToken(user);

    const banks = [
      createMockBank({ id: TEST_BANK_ID, status: QuestionBankStatus.OPEN }),
      createMockBank({ id: TEST_BANK_ID_2, title: 'Bank 2', status: QuestionBankStatus.PUBLIC }),
    ];

    mockPrisma.user.findUnique.mockResolvedValue(user);
    mockPrisma.questionBank.findMany.mockResolvedValue(banks);
    mockPrisma.questionBank.count.mockResolvedValue(2);

    const response = await request(app)
      .get('/api/question-banks')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.meta.totalCount).toBe(2);
  });

  it('should reject unauthenticated request', async () => {
    const response = await request(app)
      .get('/api/question-banks');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should apply search filter', async () => {
    const user = createMockUser();
    const accessToken = generateAccessToken(user);

    mockPrisma.user.findUnique.mockResolvedValue(user);
    mockPrisma.questionBank.findMany.mockResolvedValue([]);
    mockPrisma.questionBank.count.mockResolvedValue(0);

    const response = await request(app)
      .get('/api/question-banks?search=cardiology')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(mockPrisma.questionBank.findMany).toHaveBeenCalled();
  });

  it('should apply status filter', async () => {
    const user = createMockUser();
    const accessToken = generateAccessToken(user);

    mockPrisma.user.findUnique.mockResolvedValue(user);
    mockPrisma.questionBank.findMany.mockResolvedValue([]);
    mockPrisma.questionBank.count.mockResolvedValue(0);

    const response = await request(app)
      .get('/api/question-banks?status=OPEN')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(mockPrisma.questionBank.findMany).toHaveBeenCalled();
  });

  it('should apply pagination', async () => {
    const user = createMockUser();
    const accessToken = generateAccessToken(user);

    mockPrisma.user.findUnique.mockResolvedValue(user);
    mockPrisma.questionBank.findMany.mockResolvedValue([]);
    mockPrisma.questionBank.count.mockResolvedValue(50);

    const response = await request(app)
      .get('/api/question-banks?page=2&pageSize=10')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.meta.page).toBe(2);
    expect(response.body.meta.pageSize).toBe(10);
  });

  it('should show only OPEN/PUBLIC banks for regular users', async () => {
    const user = createMockUser({ role: UserRole.USER });
    const accessToken = generateAccessToken(user);

    const openBank = createMockBank({ id: TEST_BANK_ID, status: QuestionBankStatus.OPEN });

    mockPrisma.user.findUnique.mockResolvedValue(user);
    mockPrisma.questionBank.findMany.mockResolvedValue([openBank]);
    mockPrisma.questionBank.count.mockResolvedValue(1);

    const response = await request(app)
      .get('/api/question-banks')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(mockPrisma.questionBank.findMany).toHaveBeenCalled();
  });
});

describe('GET /api/question-banks/:id', () => {
  it('should get single question bank', async () => {
    const user = createMockUser();
    const accessToken = generateAccessToken(user);
    const bank = createMockBank({ status: QuestionBankStatus.OPEN });

    mockPrisma.user.findUnique.mockResolvedValue(user);
    mockPrisma.questionBank.findUnique.mockResolvedValue(bank);

    const response = await request(app)
      .get(`/api/question-banks/${TEST_BANK_ID}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe(TEST_BANK_ID);
    expect(response.body.data.title).toBe('Test Bank');
  });

  it('should return 404 for non-existent bank', async () => {
    const user = createMockUser();
    const accessToken = generateAccessToken(user);

    mockPrisma.user.findUnique.mockResolvedValue(user);
    mockPrisma.questionBank.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .get('/api/question-banks/99999999-9999-9999-9999-999999999999')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  it('should deny access to DRAFT bank for non-owner user', async () => {
    const user = createMockUser({ id: TEST_USER_ID, role: UserRole.USER });
    const accessToken = generateAccessToken(user);
    const OTHER_EDITOR_ID = '40000000-0000-0000-0000-000000000001';
    const draftBank = createMockBank({
      status: QuestionBankStatus.DRAFT,
      createdById: OTHER_EDITOR_ID
    });

    mockPrisma.user.findUnique.mockResolvedValue(user);
    mockPrisma.questionBank.findUnique.mockResolvedValue(draftBank);

    const response = await request(app)
      .get('/api/question-banks/' + TEST_BANK_ID)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  it('should allow editor to access own DRAFT bank', async () => {
    const editor = createMockUser({ id: TEST_EDITOR_ID, role: UserRole.EDITOR });
    const accessToken = generateAccessToken(editor);
    const draftBank = createMockBank({
      status: QuestionBankStatus.DRAFT,
      createdById: TEST_EDITOR_ID
    });

    mockPrisma.user.findUnique.mockResolvedValue(editor);
    mockPrisma.questionBank.findUnique.mockResolvedValue(draftBank);

    const response = await request(app)
      .get('/api/question-banks/' + TEST_BANK_ID)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should allow admin to access any bank', async () => {
    const admin = createMockUser({ id: TEST_ADMIN_ID, role: UserRole.ADMIN });
    const accessToken = generateAccessToken(admin);
    const OTHER_EDITOR_ID = '40000000-0000-0000-0000-000000000001';
    const draftBank = createMockBank({
      status: QuestionBankStatus.DRAFT,
      createdById: OTHER_EDITOR_ID
    });

    mockPrisma.user.findUnique.mockResolvedValue(admin);
    mockPrisma.questionBank.findUnique.mockResolvedValue(draftBank);

    const response = await request(app)
      .get('/api/question-banks/' + TEST_BANK_ID)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});

describe('POST /api/question-banks', () => {
  it('should create question bank as editor', async () => {
    const editor = createMockUser({ id: TEST_EDITOR_ID, role: UserRole.EDITOR });
    const accessToken = generateAccessToken(editor);
    const NEW_BANK_ID = '50000000-0000-0000-0000-000000000001';
    const newBank = createMockBank({
      id: NEW_BANK_ID,
      title: 'New Bank',
      createdById: TEST_EDITOR_ID,
      status: QuestionBankStatus.DRAFT,
    });

    mockPrisma.user.findUnique.mockResolvedValue(editor);
    mockPrisma.questionBank.create.mockResolvedValue(newBank);

    const response = await request(app)
      .post('/api/question-banks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'New Bank',
        description: 'A new test bank',
        status: QuestionBankStatus.DRAFT,
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.title).toBe('New Bank');
  });

  it('should reject bank creation by regular user', async () => {
    const user = createMockUser({ role: UserRole.USER });
    const accessToken = generateAccessToken(user);

    mockPrisma.user.findUnique.mockResolvedValue(user);

    const response = await request(app)
      .post('/api/question-banks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'New Bank',
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it('should reject invalid bank data', async () => {
    const editor = createMockUser({ role: UserRole.EDITOR });
    const accessToken = generateAccessToken(editor);

    mockPrisma.user.findUnique.mockResolvedValue(editor);

    const response = await request(app)
      .post('/api/question-banks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: '', // Empty title
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should create bank with default values', async () => {
    const editor = createMockUser({ id: TEST_EDITOR_ID, role: UserRole.EDITOR });
    const accessToken = generateAccessToken(editor);
    const newBank = createMockBank({
      title: 'Minimal Bank',
      createdById: TEST_EDITOR_ID,
      status: QuestionBankStatus.DRAFT,
    });

    mockPrisma.user.findUnique.mockResolvedValue(editor);
    mockPrisma.questionBank.create.mockResolvedValue(newBank);

    const response = await request(app)
      .post('/api/question-banks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Minimal Bank',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });

  it('should allow admin to create bank', async () => {
    const admin = createMockUser({ id: TEST_ADMIN_ID, role: UserRole.ADMIN });
    const accessToken = generateAccessToken(admin);
    const newBank = createMockBank({ createdById: TEST_ADMIN_ID });

    mockPrisma.user.findUnique.mockResolvedValue(admin);
    mockPrisma.questionBank.create.mockResolvedValue(newBank);

    const response = await request(app)
      .post('/api/question-banks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Admin Bank',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });
});

describe('PATCH /api/question-banks/:id', () => {
  it('should update own bank as editor', async () => {
    const editor = createMockUser({ id: TEST_EDITOR_ID, role: UserRole.EDITOR });
    const accessToken = generateAccessToken(editor);
    const bank = createMockBank({ createdById: TEST_EDITOR_ID });

    mockPrisma.user.findUnique.mockResolvedValue(editor);
    mockPrisma.questionBank.findUnique.mockResolvedValue(bank);
    mockPrisma.questionBank.update.mockResolvedValue({
      ...bank,
      title: 'Updated Title',
    });

    const response = await request(app)
      .patch('/api/question-banks/' + TEST_BANK_ID)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Updated Title',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.title).toBe('Updated Title');
  });

  it('should reject update of other editors bank', async () => {
    const editor = createMockUser({ id: TEST_EDITOR_ID, role: UserRole.EDITOR });
    const accessToken = generateAccessToken(editor);
    const bank = createMockBank({ createdById: '40000000-0000-0000-0000-000000000001' });

    mockPrisma.user.findUnique.mockResolvedValue(editor);
    mockPrisma.questionBank.findUnique.mockResolvedValue(bank);

    const response = await request(app)
      .patch('/api/question-banks/' + TEST_BANK_ID)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Hacked Title',
      });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  it('should allow admin to update any bank', async () => {
    const admin = createMockUser({ id: TEST_ADMIN_ID, role: UserRole.ADMIN });
    const accessToken = generateAccessToken(admin);
    const bank = createMockBank({ createdById: '40000000-0000-0000-0000-000000000001' });

    mockPrisma.user.findUnique.mockResolvedValue(admin);
    mockPrisma.questionBank.findUnique.mockResolvedValue(bank);
    mockPrisma.questionBank.update.mockResolvedValue({
      ...bank,
      title: 'Admin Updated',
    });

    const response = await request(app)
      .patch('/api/question-banks/' + TEST_BANK_ID)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Admin Updated',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should reject update by regular user', async () => {
    const user = createMockUser({ role: UserRole.USER });
    const accessToken = generateAccessToken(user);

    mockPrisma.user.findUnique.mockResolvedValue(user);

    const response = await request(app)
      .patch('/api/question-banks/' + TEST_BANK_ID)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Attempted Update',
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it('should return 404 for non-existent bank', async () => {
    const editor = createMockUser({ role: UserRole.EDITOR });
    const accessToken = generateAccessToken(editor);

    mockPrisma.user.findUnique.mockResolvedValue(editor);
    mockPrisma.questionBank.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .patch('/api/question-banks/99999999-9999-9999-9999-999999999999')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Updated',
      });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });
});

describe('DELETE /api/question-banks/:id', () => {
  it('should delete own bank with no attempts', async () => {
    const editor = createMockUser({ id: TEST_EDITOR_ID, role: UserRole.EDITOR });
    const accessToken = generateAccessToken(editor);
    const bank = createMockBank({
      createdById: TEST_EDITOR_ID,
      _count: { attempts: 0, questions: 5 },
    });

    mockPrisma.user.findUnique.mockResolvedValue(editor);
    mockPrisma.questionBank.findUnique.mockResolvedValue(bank);
    mockPrisma.questionBank.delete.mockResolvedValue(bank);

    const response = await request(app)
      .delete('/api/question-banks/' + TEST_BANK_ID)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockPrisma.questionBank.delete).toHaveBeenCalled();
  });

  it('should reject deletion of bank with attempts', async () => {
    const editor = createMockUser({ id: TEST_EDITOR_ID, role: UserRole.EDITOR });
    const accessToken = generateAccessToken(editor);
    const bank = createMockBank({
      createdById: TEST_EDITOR_ID,
      _count: { attempts: 5, questions: 5 },
    });

    mockPrisma.user.findUnique.mockResolvedValue(editor);
    mockPrisma.questionBank.findUnique.mockResolvedValue(bank);

    const response = await request(app)
      .delete('/api/question-banks/' + TEST_BANK_ID)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain('attempts');
  });

  it('should reject deletion of other editors bank', async () => {
    const editor = createMockUser({ id: TEST_EDITOR_ID, role: UserRole.EDITOR });
    const accessToken = generateAccessToken(editor);
    const bank = createMockBank({
      createdById: '40000000-0000-0000-0000-000000000001',
      _count: { attempts: 0, questions: 5 },
    });

    mockPrisma.user.findUnique.mockResolvedValue(editor);
    mockPrisma.questionBank.findUnique.mockResolvedValue(bank);

    const response = await request(app)
      .delete('/api/question-banks/' + TEST_BANK_ID)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  it('should allow admin to delete any bank', async () => {
    const admin = createMockUser({ id: TEST_ADMIN_ID, role: UserRole.ADMIN });
    const accessToken = generateAccessToken(admin);
    const bank = createMockBank({
      createdById: '40000000-0000-0000-0000-000000000001',
      _count: { attempts: 0, questions: 5 },
    });

    mockPrisma.user.findUnique.mockResolvedValue(admin);
    mockPrisma.questionBank.findUnique.mockResolvedValue(bank);
    mockPrisma.questionBank.delete.mockResolvedValue(bank);

    const response = await request(app)
      .delete('/api/question-banks/' + TEST_BANK_ID)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should reject deletion by regular user', async () => {
    const user = createMockUser({ role: UserRole.USER });
    const accessToken = generateAccessToken(user);

    mockPrisma.user.findUnique.mockResolvedValue(user);

    const response = await request(app)
      .delete('/api/question-banks/' + TEST_BANK_ID)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });
});
