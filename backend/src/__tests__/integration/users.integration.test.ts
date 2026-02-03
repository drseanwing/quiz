/**
 * @file        Users Integration Tests
 * @description Integration tests for user management endpoints
 */

import request from 'supertest';
import { UserRole } from '@prisma/client';
import { generateAccessToken } from '@/utils/jwt';
import { hashPassword } from '@/utils/password';

// Mock Prisma at module level
jest.mock('@/config/database', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({}),
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

// Test UUIDs for consistency
const TEST_USER_ID = '10000000-0000-0000-0000-000000000001';
const TEST_USER_2_ID = '10000000-0000-0000-0000-000000000002';
const TEST_ADMIN_ID = '30000000-0000-0000-0000-000000000001';
const TEST_EDITOR_ID = '20000000-0000-0000-0000-000000000001';
const OTHER_USER_ID = '10000000-0000-0000-0000-000000000999';

// Helper to create mock user
function createMockUser(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_USER_ID,
    email: 'test@example.com',
    firstName: 'John',
    surname: 'Doe',
    role: UserRole.USER,
    isActive: true,
    passwordHash: 'hashed-password',
    idNumber: null,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('GET /api/users/me', () => {
  it('should return current user profile when authenticated', async () => {
    const user = createMockUser();
    const accessToken = generateAccessToken(user);

    mockPrisma.user.findUnique.mockResolvedValue(user);

    const response = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.email).toBe('test@example.com');
    expect(response.body.data.firstName).toBe('John');
    expect(response.body.data.passwordHash).toBeUndefined();
  });

  it('should reject unauthenticated request', async () => {
    const response = await request(app)
      .get('/api/users/me');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should reject request with invalid token', async () => {
    const response = await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Bearer invalid-token');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});

describe('PATCH /api/users/me', () => {
  it('should update current user profile', async () => {
    const user = createMockUser();
    const accessToken = generateAccessToken(user);

    mockPrisma.user.findUnique.mockResolvedValue(user);
    mockPrisma.user.update.mockResolvedValue({
      ...user,
      firstName: 'Jane',
      surname: 'Smith',
    });

    const response = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        firstName: 'Jane',
        surname: 'Smith',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.firstName).toBe('Jane');
    expect(response.body.data.surname).toBe('Smith');
  });

  it('should reject unauthenticated profile update', async () => {
    const response = await request(app)
      .patch('/api/users/me')
      .send({
        firstName: 'Jane',
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should reject invalid profile data', async () => {
    const user = createMockUser();
    const accessToken = generateAccessToken(user);

    mockPrisma.user.findUnique.mockResolvedValue(user);

    const response = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        firstName: '',
        surname: '',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should allow updating idNumber to null', async () => {
    const user = createMockUser({ idNumber: '12345' });
    const accessToken = generateAccessToken(user);

    mockPrisma.user.findUnique.mockResolvedValue(user);
    mockPrisma.user.update.mockResolvedValue({
      ...user,
      idNumber: null,
    });

    const response = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        idNumber: null,
      });

    expect(response.status).toBe(200);
    expect(response.body.data.idNumber).toBeNull();
  });
});

describe('GET /api/users (Admin)', () => {
  it('should list users for admin', async () => {
    const admin = createMockUser({ id: TEST_ADMIN_ID, role: UserRole.ADMIN });
    const accessToken = generateAccessToken(admin);

    const users = [
      createMockUser({ id: TEST_USER_ID }),
      createMockUser({ id: TEST_USER_2_ID, email: 'user2@example.com' }),
    ];

    mockPrisma.user.findUnique.mockResolvedValue(admin);
    mockPrisma.user.findMany.mockResolvedValue(users);
    mockPrisma.user.count.mockResolvedValue(2);

    const response = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.meta.totalCount).toBe(2);
  });

  it('should reject non-admin user listing', async () => {
    const user = createMockUser({ role: UserRole.USER });
    const accessToken = generateAccessToken(user);

    mockPrisma.user.findUnique.mockResolvedValue(user);

    const response = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it('should apply search filter', async () => {
    const admin = createMockUser({ id: TEST_ADMIN_ID, role: UserRole.ADMIN });
    const accessToken = generateAccessToken(admin);

    mockPrisma.user.findUnique.mockResolvedValue(admin);
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.user.count.mockResolvedValue(0);

    const response = await request(app)
      .get('/api/users?search=john')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(mockPrisma.user.findMany).toHaveBeenCalled();
  });

  it('should apply role filter', async () => {
    const admin = createMockUser({ id: TEST_ADMIN_ID, role: UserRole.ADMIN });
    const accessToken = generateAccessToken(admin);

    mockPrisma.user.findUnique.mockResolvedValue(admin);
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.user.count.mockResolvedValue(0);

    const response = await request(app)
      .get('/api/users?role=EDITOR')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(mockPrisma.user.findMany).toHaveBeenCalled();
  });

  it('should apply pagination', async () => {
    const admin = createMockUser({ id: TEST_ADMIN_ID, role: UserRole.ADMIN });
    const accessToken = generateAccessToken(admin);

    mockPrisma.user.findUnique.mockResolvedValue(admin);
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.user.count.mockResolvedValue(50);

    const response = await request(app)
      .get('/api/users?page=2&pageSize=10')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.meta.page).toBe(2);
    expect(response.body.meta.pageSize).toBe(10);
  });
});

describe('POST /api/users (Admin)', () => {
  it('should create user as admin', async () => {
    const admin = createMockUser({ id: TEST_ADMIN_ID, role: UserRole.ADMIN });
    const accessToken = generateAccessToken(admin);

    const newUser = createMockUser({ id: 'new-user', email: 'newuser@example.com' });

    mockPrisma.user.findUnique
      .mockResolvedValueOnce(admin) // Auth check
      .mockResolvedValueOnce(null); // Email availability check
    mockPrisma.user.create.mockResolvedValue(newUser);

    const response = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        email: 'newuser@example.com',
        password: 'StrongP@ss123',
        firstName: 'New',
        surname: 'User',
        role: UserRole.EDITOR,
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.email).toBe('newuser@example.com');
  });

  it('should reject non-admin user creation', async () => {
    const user = createMockUser({ role: UserRole.EDITOR });
    const accessToken = generateAccessToken(user);

    mockPrisma.user.findUnique.mockResolvedValue(user);

    const response = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        email: 'newuser@example.com',
        password: 'StrongP@ss123',
        firstName: 'New',
        surname: 'User',
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it('should reject invalid user data', async () => {
    const admin = createMockUser({ id: TEST_ADMIN_ID, role: UserRole.ADMIN });
    const accessToken = generateAccessToken(admin);

    mockPrisma.user.findUnique.mockResolvedValue(admin);

    const response = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        email: 'invalid-email',
        password: 'weak',
        firstName: '',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should reject duplicate email', async () => {
    const admin = createMockUser({ id: TEST_ADMIN_ID, role: UserRole.ADMIN });
    const accessToken = generateAccessToken(admin);

    mockPrisma.user.findUnique
      .mockResolvedValueOnce(admin)
      .mockResolvedValueOnce(createMockUser({ email: 'existing@example.com' }));

    const response = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        email: 'existing@example.com',
        password: 'StrongP@ss123',
        firstName: 'New',
        surname: 'User',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});

describe('PATCH /api/users/:id (Admin)', () => {
  it('should update user as admin', async () => {
    const admin = createMockUser({ id: TEST_ADMIN_ID, role: UserRole.ADMIN });
    const accessToken = generateAccessToken(admin);

    const targetUser = createMockUser({ id: TEST_USER_2_ID });

    mockPrisma.user.findUnique
      .mockResolvedValueOnce(admin) // Auth check
      .mockResolvedValueOnce(targetUser); // Get target user
    mockPrisma.user.update.mockResolvedValue({
      ...targetUser,
      role: UserRole.EDITOR,
    });

    const response = await request(app)
      .patch('/api/users/' + TEST_USER_2_ID)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        role: UserRole.EDITOR,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.role).toBe(UserRole.EDITOR);
  });

  it('should prevent admin from deactivating themselves', async () => {
    const admin = createMockUser({ id: TEST_ADMIN_ID, role: UserRole.ADMIN });
    const accessToken = generateAccessToken(admin);

    mockPrisma.user.findUnique.mockResolvedValue(admin);

    const response = await request(app)
      .patch('/api/users/' + TEST_ADMIN_ID)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        isActive: false,
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain('Cannot deactivate your own account');
  });

  it('should prevent admin from changing their own role', async () => {
    const admin = createMockUser({ id: TEST_ADMIN_ID, role: UserRole.ADMIN });
    const accessToken = generateAccessToken(admin);

    mockPrisma.user.findUnique.mockResolvedValue(admin);

    const response = await request(app)
      .patch('/api/users/' + TEST_ADMIN_ID)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        role: UserRole.USER,
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toContain('Cannot change your own role');
  });

  it('should reject non-admin user update', async () => {
    const user = createMockUser({ role: UserRole.USER });
    const accessToken = generateAccessToken(user);

    mockPrisma.user.findUnique.mockResolvedValue(user);

    const response = await request(app)
      .patch('/api/users/' + OTHER_USER_ID)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        role: UserRole.ADMIN,
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });
});

describe('PATCH /api/users/me/password', () => {
  it('should change password with valid current password', async () => {
    const currentPassword = 'OldPass123!';
    const hash = await hashPassword(currentPassword);
    const user = createMockUser({ passwordHash: hash });
    const accessToken = generateAccessToken(user);

    mockPrisma.user.findUnique.mockResolvedValue(user);
    mockPrisma.user.update.mockResolvedValue(user);

    const response = await request(app)
      .patch('/api/users/me/password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currentPassword: currentPassword,
        newPassword: 'NewPass123!',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('should reject password change with wrong current password', async () => {
    const hash = await hashPassword('OldPass123!');
    const user = createMockUser({ passwordHash: hash });
    const accessToken = generateAccessToken(user);

    mockPrisma.user.findUnique.mockResolvedValue(user);

    const response = await request(app)
      .patch('/api/users/me/password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currentPassword: 'WrongPass123!',
        newPassword: 'NewPass123!',
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('should reject weak new password', async () => {
    const currentPassword = 'OldPass123!';
    const hash = await hashPassword(currentPassword);
    const user = createMockUser({ passwordHash: hash });
    const accessToken = generateAccessToken(user);

    mockPrisma.user.findUnique.mockResolvedValue(user);

    const response = await request(app)
      .patch('/api/users/me/password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currentPassword: currentPassword,
        newPassword: 'weak',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});
