/**
 * @file        Admin component tests
 * @description Tests for AdminPage, AdminDashboard, CompletionsTab, LogsTab, UsersTab
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock dialog methods not implemented in jsdom
HTMLDialogElement.prototype.showModal = HTMLDialogElement.prototype.showModal || vi.fn();
HTMLDialogElement.prototype.close = HTMLDialogElement.prototype.close || vi.fn();

// ─── Mock adminApi ──────────────────────────────────────────────────────────

const mockAdminApi = vi.hoisted(() => ({
  getStats: vi.fn(),
  listCompletions: vi.fn(),
  exportCompletionsCSV: vi.fn(),
  listLogs: vi.fn(),
  listUsers: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  adminResetPassword: vi.fn(),
  listInvites: vi.fn(),
  createInvite: vi.fn(),
  listAllBanks: vi.fn(),
  updateBankStatus: vi.fn(),
  deleteBank: vi.fn(),
}));

vi.mock('@/services/adminApi', () => mockAdminApi);

const mockAuth = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  error: null as string | null,
  clearError: vi.fn(),
  isLoading: false,
  isAuthenticated: true,
  isRestoring: false,
  user: { id: 'admin-1', email: 'admin@health.qld.gov.au', firstName: 'Admin', surname: 'User', role: 'ADMIN' },
  logout: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mockAuth }));
vi.mock('@/services/api', () => ({ default: { get: vi.fn(), post: vi.fn() }, api: { get: vi.fn(), post: vi.fn() } }));

import { AdminPage } from '@/pages/admin/AdminPage';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { CompletionsTab } from '@/pages/admin/CompletionsTab';
import { LogsTab } from '@/pages/admin/LogsTab';
import { UsersTab } from '@/pages/admin/UsersTab';

// ─── Helpers ────────────────────────────────────────────────────────────────

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function renderWithQuery(ui: React.ReactElement) {
  const qc = createQueryClient();
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const defaultMeta = { page: 1, pageSize: 20, totalCount: 1, totalPages: 1 };

// ─── Mock data ──────────────────────────────────────────────────────────────

const mockStats = {
  totalUsers: 150,
  activeUsers: 120,
  totalBanks: 25,
  activeBanks: 18,
  totalAttempts: 500,
  completedAttempts: 420,
  completionRate: 84,
  averageScore: 72,
  passRate: 68,
};

const mockCompletions = [
  {
    id: 'c1',
    userName: 'John Doe',
    userEmail: 'john@health.qld.gov.au',
    bankTitle: 'Safety Quiz',
    score: 8,
    maxScore: 10,
    percentage: 80,
    passed: true,
    status: 'COMPLETED',
    completedAt: '2025-01-15T10:00:00Z',
    timeSpent: 300,
  },
];

const mockLogs = [
  {
    id: 'l1',
    userId: 'u1',
    userName: 'John Doe',
    action: 'LOGIN_SUCCESS',
    entityType: 'user',
    entityId: 'u1-abcdefgh',
    details: { browser: 'Chrome' },
    ipAddress: '192.168.1.1',
    createdAt: '2025-01-15T10:00:00Z',
  },
];

const mockUsers = [
  {
    id: 'u1',
    email: 'john@health.qld.gov.au',
    firstName: 'John',
    surname: 'Doe',
    idNumber: null,
    role: 'USER' as const,
    isActive: true,
    lastLoginAt: '2025-01-14T10:00:00Z',
    createdAt: '2024-06-01T00:00:00Z',
  },
  {
    id: 'u2',
    email: 'jane@health.qld.gov.au',
    firstName: 'Jane',
    surname: 'Smith',
    idNumber: 'ID123',
    role: 'ADMIN' as const,
    isActive: false,
    lastLoginAt: null,
    createdAt: '2024-06-02T00:00:00Z',
  },
];

// ─── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.user = { id: 'admin-1', email: 'admin@health.qld.gov.au', firstName: 'Admin', surname: 'User', role: 'ADMIN' };
});

// ─── AdminPage ──────────────────────────────────────────────────────────────

describe('AdminPage', () => {
  beforeEach(() => {
    // Mock all queries that child components will trigger
    mockAdminApi.getStats.mockResolvedValue(mockStats);
    mockAdminApi.listUsers.mockResolvedValue({ data: [], meta: defaultMeta });
    mockAdminApi.listCompletions.mockResolvedValue({ data: [], meta: defaultMeta });
    mockAdminApi.listLogs.mockResolvedValue({ data: [], meta: defaultMeta });
    mockAdminApi.listInvites.mockResolvedValue({ data: [], meta: defaultMeta });
    mockAdminApi.listAllBanks.mockResolvedValue({ data: [], meta: defaultMeta });
  });

  it('renders the Administration heading', () => {
    renderWithQuery(<AdminPage />);
    expect(screen.getByRole('heading', { name: 'Administration' })).toBeInTheDocument();
  });

  it('renders all 6 tabs', () => {
    renderWithQuery(<AdminPage />);
    expect(screen.getByRole('tab', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Users' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Question Banks' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Completions' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Audit Logs' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Invitations' })).toBeInTheDocument();
  });

  it('has tablist with correct aria-label', () => {
    renderWithQuery(<AdminPage />);
    expect(screen.getByRole('tablist')).toHaveAttribute('aria-label', 'Admin sections');
  });

  it('Dashboard tab is selected by default', () => {
    renderWithQuery(<AdminPage />);
    expect(screen.getByRole('tab', { name: 'Dashboard' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Users' })).toHaveAttribute('aria-selected', 'false');
  });

  it('switches to Users tab on click', async () => {
    renderWithQuery(<AdminPage />);
    await userEvent.setup({ delay: null }).click(screen.getByRole('tab', { name: 'Users' }));
    expect(screen.getByRole('tab', { name: 'Users' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Dashboard' })).toHaveAttribute('aria-selected', 'false');
  });

  it('renders tabpanel with correct aria attributes', () => {
    renderWithQuery(<AdminPage />);
    const panel = screen.getByRole('tabpanel');
    expect(panel).toHaveAttribute('aria-labelledby', 'tab-dashboard');
    expect(panel).toHaveAttribute('id', 'tabpanel-dashboard');
  });
});

// ─── AdminDashboard ─────────────────────────────────────────────────────────

describe('AdminDashboard', () => {
  it('shows spinner while loading', () => {
    mockAdminApi.getStats.mockReturnValue(new Promise(() => {})); // never resolves
    renderWithQuery(<AdminDashboard />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows error alert on failure', async () => {
    mockAdminApi.getStats.mockRejectedValue(new Error('Network error'));
    renderWithQuery(<AdminDashboard />);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Network error');
    });
  });

  it('shows stat cards with correct data', async () => {
    mockAdminApi.getStats.mockResolvedValue(mockStats);
    renderWithQuery(<AdminDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Total Users')).toBeInTheDocument();
    });
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('120 active')).toBeInTheDocument();
    expect(screen.getByText('Question Banks')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('18 active')).toBeInTheDocument();
    expect(screen.getByText('Total Attempts')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText('420 completed')).toBeInTheDocument();
    expect(screen.getByText('Completion Rate')).toBeInTheDocument();
    expect(screen.getByText('84%')).toBeInTheDocument();
    expect(screen.getByText('Average Score')).toBeInTheDocument();
    expect(screen.getByText('72%')).toBeInTheDocument();
    expect(screen.getByText('Pass Rate')).toBeInTheDocument();
    expect(screen.getByText('68%')).toBeInTheDocument();
  });

  it('shows hidden heading for accessibility', async () => {
    mockAdminApi.getStats.mockResolvedValue(mockStats);
    renderWithQuery(<AdminDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Platform Statistics')).toBeInTheDocument();
    });
  });
});

// ─── CompletionsTab ─────────────────────────────────────────────────────────

describe('CompletionsTab', () => {
  it('shows spinner while loading', () => {
    mockAdminApi.listCompletions.mockReturnValue(new Promise(() => {}));
    renderWithQuery(<CompletionsTab />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows error on fetch failure', async () => {
    mockAdminApi.listCompletions.mockRejectedValue(new Error('Server error'));
    renderWithQuery(<CompletionsTab />);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Server error');
    });
  });

  it('renders completions table with data', async () => {
    mockAdminApi.listCompletions.mockResolvedValue({ data: mockCompletions, meta: defaultMeta });
    renderWithQuery(<CompletionsTab />);
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    expect(screen.getByText('john@health.qld.gov.au')).toBeInTheDocument();
    expect(screen.getByText('Safety Quiz')).toBeInTheDocument();
    expect(screen.getByText('8.0/10')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('Pass')).toBeInTheDocument();
  });

  it('shows empty message when no completions', async () => {
    mockAdminApi.listCompletions.mockResolvedValue({ data: [], meta: defaultMeta });
    renderWithQuery(<CompletionsTab />);
    await waitFor(() => {
      expect(screen.getByText('No completions found')).toBeInTheDocument();
    });
  });

  it('renders filter controls', () => {
    mockAdminApi.listCompletions.mockReturnValue(new Promise(() => {}));
    renderWithQuery(<CompletionsTab />);
    expect(screen.getByLabelText('From')).toBeInTheDocument();
    expect(screen.getByLabelText('To')).toBeInTheDocument();
    expect(screen.getByLabelText('Result')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Filter' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeInTheDocument();
  });

  it('has correct table aria-label', async () => {
    mockAdminApi.listCompletions.mockResolvedValue({ data: mockCompletions, meta: defaultMeta });
    renderWithQuery(<CompletionsTab />);
    await waitFor(() => {
      expect(screen.getByRole('table', { name: 'Quiz completions' })).toBeInTheDocument();
    });
  });
});

// ─── LogsTab ────────────────────────────────────────────────────────────────

describe('LogsTab', () => {
  it('shows spinner while loading', () => {
    mockAdminApi.listLogs.mockReturnValue(new Promise(() => {}));
    renderWithQuery(<LogsTab />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows error on fetch failure', async () => {
    mockAdminApi.listLogs.mockRejectedValue(new Error('Timeout'));
    renderWithQuery(<LogsTab />);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Timeout');
    });
  });

  it('renders log entries', async () => {
    mockAdminApi.listLogs.mockResolvedValue({ data: mockLogs, meta: defaultMeta });
    renderWithQuery(<LogsTab />);
    await waitFor(() => {
      expect(screen.getByText('LOGIN_SUCCESS')).toBeInTheDocument();
    });
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.1')).toBeInTheDocument();
  });

  it('shows empty message when no logs', async () => {
    mockAdminApi.listLogs.mockResolvedValue({ data: [], meta: defaultMeta });
    renderWithQuery(<LogsTab />);
    await waitFor(() => {
      expect(screen.getByText('No logs found')).toBeInTheDocument();
    });
  });

  it('renders filter inputs', () => {
    mockAdminApi.listLogs.mockReturnValue(new Promise(() => {}));
    renderWithQuery(<LogsTab />);
    expect(screen.getByLabelText('Action')).toBeInTheDocument();
    expect(screen.getByLabelText('Entity Type')).toBeInTheDocument();
  });

  it('shows details button for logs with details', async () => {
    mockAdminApi.listLogs.mockResolvedValue({ data: mockLogs, meta: defaultMeta });
    renderWithQuery(<LogsTab />);
    await waitFor(() => {
      expect(screen.getByLabelText('View details for LOGIN_SUCCESS event')).toBeInTheDocument();
    });
  });

  it('has correct table aria-label', async () => {
    mockAdminApi.listLogs.mockResolvedValue({ data: mockLogs, meta: defaultMeta });
    renderWithQuery(<LogsTab />);
    await waitFor(() => {
      expect(screen.getByRole('table', { name: 'Audit logs' })).toBeInTheDocument();
    });
  });
});

// ─── UsersTab ───────────────────────────────────────────────────────────────

describe('UsersTab', () => {
  it('shows spinner while loading', () => {
    mockAdminApi.listUsers.mockReturnValue(new Promise(() => {}));
    renderWithQuery(<UsersTab />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows error on fetch failure', async () => {
    mockAdminApi.listUsers.mockRejectedValue(new Error('Unauthorized'));
    renderWithQuery(<UsersTab />);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Unauthorized');
    });
  });

  it('renders users table with data', async () => {
    mockAdminApi.listUsers.mockResolvedValue({ data: mockUsers, meta: { ...defaultMeta, totalCount: 2 } });
    renderWithQuery(<UsersTab />);
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    expect(screen.getByText('john@health.qld.gov.au')).toBeInTheDocument();
    // "USER" appears in both role filter option and table cell; query within the table
    const table = screen.getByRole('table', { name: 'Users' });
    expect(within(table).getByText('USER')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('jane@health.qld.gov.au')).toBeInTheDocument();
    expect(within(table).getByText('ADMIN')).toBeInTheDocument();
  });

  it('shows Active/Inactive status badges', async () => {
    mockAdminApi.listUsers.mockResolvedValue({ data: mockUsers, meta: defaultMeta });
    renderWithQuery(<UsersTab />);
    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument();
    });
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('shows Never for users with no login', async () => {
    mockAdminApi.listUsers.mockResolvedValue({ data: mockUsers, meta: defaultMeta });
    renderWithQuery(<UsersTab />);
    await waitFor(() => {
      expect(screen.getByText('Never')).toBeInTheDocument();
    });
  });

  it('shows empty message when no users', async () => {
    mockAdminApi.listUsers.mockResolvedValue({ data: [], meta: defaultMeta });
    renderWithQuery(<UsersTab />);
    await waitFor(() => {
      expect(screen.getByText('No users found')).toBeInTheDocument();
    });
  });

  it('renders filter controls', () => {
    mockAdminApi.listUsers.mockReturnValue(new Promise(() => {}));
    renderWithQuery(<UsersTab />);
    expect(screen.getByLabelText('Search users')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by role')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by status')).toBeInTheDocument();
  });

  it('renders Create User button', () => {
    mockAdminApi.listUsers.mockReturnValue(new Promise(() => {}));
    renderWithQuery(<UsersTab />);
    expect(screen.getByRole('button', { name: 'Create User' })).toBeInTheDocument();
  });

  it('renders edit and reset buttons per user', async () => {
    mockAdminApi.listUsers.mockResolvedValue({ data: mockUsers, meta: defaultMeta });
    renderWithQuery(<UsersTab />);
    await waitFor(() => {
      expect(screen.getByLabelText('Edit John Doe')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Reset password for John Doe')).toBeInTheDocument();
    expect(screen.getByLabelText('Edit Jane Smith')).toBeInTheDocument();
    expect(screen.getByLabelText('Reset password for Jane Smith')).toBeInTheDocument();
  });

  it('has correct table aria-label', async () => {
    mockAdminApi.listUsers.mockResolvedValue({ data: mockUsers, meta: defaultMeta });
    renderWithQuery(<UsersTab />);
    await waitFor(() => {
      expect(screen.getByRole('table', { name: 'Users' })).toBeInTheDocument();
    });
  });

  it('shows pagination when multiple pages', async () => {
    mockAdminApi.listUsers.mockResolvedValue({ data: mockUsers, meta: { page: 1, pageSize: 20, totalCount: 50, totalPages: 3 } });
    renderWithQuery(<UsersTab />);
    await waitFor(() => {
      expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Prev' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).not.toBeDisabled();
  });
});
