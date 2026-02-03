/**
 * @file        User Service Tests
 * @description Tests for user management service functions with mocked Prisma
 */

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  firstName: 'John',
  surname: 'Doe',
  idNumber: null,
  role: 'USER',
  isActive: true,
  passwordHash: '$2b$12$dummyhash',
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  refreshToken: {
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
  },
};

jest.mock('@/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
}));

import {
  getCurrentUser,
  updateCurrentUser,
  changePassword,
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deactivateUser,
  adminResetPassword,
} from '@/services/userService';
import { hashPassword } from '@/utils/password';

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── getCurrentUser ──────────────────────────────────────────────────────────

describe('getCurrentUser', () => {
  it('returns user without passwordHash', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    const result = await getCurrentUser('user-1');
    expect(result.id).toBe('user-1');
    expect(result.email).toBe('test@example.com');
    expect((result as Record<string, unknown>).passwordHash).toBeUndefined();
  });

  it('throws NotFoundError for non-existent user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(getCurrentUser('nonexistent')).rejects.toThrow('not found');
  });
});

// ─── updateCurrentUser ───────────────────────────────────────────────────────

describe('updateCurrentUser', () => {
  it('updates user first name and surname', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockPrisma.user.update.mockResolvedValue({
      ...mockUser,
      firstName: 'Jane',
      surname: 'Smith',
    });

    const result = await updateCurrentUser('user-1', {
      firstName: 'Jane',
      surname: 'Smith',
    });

    expect(result.firstName).toBe('Jane');
    expect(result.surname).toBe('Smith');
  });

  it('throws NotFoundError for non-existent user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(
      updateCurrentUser('nonexistent', { firstName: 'Test' })
    ).rejects.toThrow('not found');
  });
});

// ─── changePassword ──────────────────────────────────────────────────────────

describe('changePassword', () => {
  it('changes password when current password is correct', async () => {
    const hash = await hashPassword('OldP@ss123');
    mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: hash });
    mockPrisma.user.update.mockResolvedValue({});

    const result = await changePassword('user-1', {
      currentPassword: 'OldP@ss123',
      newPassword: 'NewP@ss456!',
    });

    expect(result.message).toBe('Password changed successfully');
    expect(mockPrisma.user.update).toHaveBeenCalled();
  });

  it('rejects incorrect current password', async () => {
    const hash = await hashPassword('OldP@ss123');
    mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: hash });

    await expect(
      changePassword('user-1', {
        currentPassword: 'WrongPass1!',
        newPassword: 'NewP@ss456!',
      })
    ).rejects.toThrow('Current password is incorrect');
  });

  it('rejects weak new password', async () => {
    const hash = await hashPassword('OldP@ss123');
    mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: hash });

    await expect(
      changePassword('user-1', {
        currentPassword: 'OldP@ss123',
        newPassword: '123',
      })
    ).rejects.toThrow();
  });

  it('throws NotFoundError for non-existent user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(
      changePassword('nonexistent', {
        currentPassword: 'any',
        newPassword: 'any',
      })
    ).rejects.toThrow('not found');
  });
});

// ─── listUsers ───────────────────────────────────────────────────────────────

describe('listUsers', () => {
  it('returns paginated user list', async () => {
    mockPrisma.user.findMany.mockResolvedValue([mockUser]);
    mockPrisma.user.count.mockResolvedValue(1);

    const result = await listUsers({}, { page: 1, pageSize: 20 });

    expect(result.data).toHaveLength(1);
    expect(result.meta.page).toBe(1);
    expect(result.meta.totalCount).toBe(1);
    expect(result.meta.totalPages).toBe(1);
    expect((result.data[0] as Record<string, unknown>).passwordHash).toBeUndefined();
  });

  it('calculates totalPages correctly', async () => {
    mockPrisma.user.findMany.mockResolvedValue([mockUser]);
    mockPrisma.user.count.mockResolvedValue(45);

    const result = await listUsers({}, { page: 1, pageSize: 20 });

    expect(result.meta.totalPages).toBe(3);
  });
});

// ─── getUserById ─────────────────────────────────────────────────────────────

describe('getUserById', () => {
  it('returns user by ID', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    const result = await getUserById('user-1');
    expect(result.id).toBe('user-1');
  });

  it('throws NotFoundError for non-existent user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(getUserById('nonexistent')).rejects.toThrow('not found');
  });
});

// ─── createUser ──────────────────────────────────────────────────────────────

describe('createUser', () => {
  it('creates user with lowercase email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      ...mockUser,
      email: (data.email as string).toLowerCase(),
      firstName: data.firstName,
      surname: data.surname,
      role: data.role,
    }));

    const result = await createUser({
      email: 'Admin@Example.COM',
      password: 'StrongP@ss123',
      firstName: 'Admin',
      surname: 'User',
      role: 'ADMIN' as const,
    });

    expect(result.email).toBe('admin@example.com');
    expect(result.role).toBe('ADMIN');
  });

  it('rejects duplicate email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);

    await expect(
      createUser({
        email: 'test@example.com',
        password: 'StrongP@ss123',
        firstName: 'Test',
        surname: 'User',
      })
    ).rejects.toThrow('An account with this email already exists');
  });

  it('rejects weak password', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(
      createUser({
        email: 'new@example.com',
        password: '123',
        firstName: 'Test',
        surname: 'User',
      })
    ).rejects.toThrow();
  });
});

// ─── updateUser ──────────────────────────────────────────────────────────────

describe('updateUser', () => {
  it('updates user fields', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockPrisma.user.update.mockResolvedValue({
      ...mockUser,
      role: 'EDITOR',
      isActive: false,
    });

    const result = await updateUser('user-1', {
      role: 'EDITOR' as const,
      isActive: false,
    });

    expect(result.role).toBe('EDITOR');
    expect(result.isActive).toBe(false);
  });

  it('throws NotFoundError for non-existent user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(updateUser('nonexistent', { firstName: 'Test' })).rejects.toThrow('not found');
  });
});

// ─── deactivateUser ──────────────────────────────────────────────────────────

describe('deactivateUser', () => {
  it('deactivates an active user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockPrisma.user.update.mockResolvedValue({ ...mockUser, isActive: false });

    const result = await deactivateUser('user-1');
    expect(result.isActive).toBe(false);
  });

  it('rejects deactivation of already inactive user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, isActive: false });

    await expect(deactivateUser('user-1')).rejects.toThrow('already deactivated');
  });

  it('throws NotFoundError for non-existent user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(deactivateUser('nonexistent')).rejects.toThrow('not found');
  });
});

// ─── adminResetPassword ──────────────────────────────────────────────────────

describe('adminResetPassword', () => {
  it('resets password for existing user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockPrisma.user.update.mockResolvedValue({});

    const result = await adminResetPassword('user-1', 'NewStr0ng!Pass');
    expect(result.message).toBe('Password has been reset successfully');
  });

  it('rejects weak password', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);

    await expect(adminResetPassword('user-1', 'weak')).rejects.toThrow();
  });

  it('throws NotFoundError for non-existent user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(adminResetPassword('nonexistent', 'StrongP@ss123')).rejects.toThrow('not found');
  });
});
