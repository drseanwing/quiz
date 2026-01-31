/**
 * @file        LoginForm tests
 * @description Tests for LoginForm component
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const mockAuth = vi.hoisted(() => ({
  login: vi.fn().mockResolvedValue(undefined),
  register: vi.fn(),
  error: null as string | null,
  clearError: vi.fn(),
  isLoading: false,
  isAuthenticated: false,
  isRestoring: false,
  user: null,
  logout: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mockAuth }));
vi.mock('@/services/api', () => ({ default: { get: vi.fn(), post: vi.fn() }, api: { get: vi.fn(), post: vi.fn() } }));

import { LoginForm } from '@/components/auth/LoginForm';

beforeEach(() => { vi.clearAllMocks(); mockAuth.error = null; });

describe('LoginForm', () => {
  it('renders fields, button, and forgot link', () => {
    render(<MemoryRouter><LoginForm /></MemoryRouter>);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByText(/forgot your password/i)).toBeInTheDocument();
  });

  it('validates empty submit', async () => {
    render(<MemoryRouter><LoginForm /></MemoryRouter>);
    const u = userEvent.setup({ delay: null });
    await u.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText(/valid email address is required/i)).toBeInTheDocument();
    });
  });

  it('calls login on valid submit', async () => {
    render(<MemoryRouter><LoginForm /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pass' } });
    const u = userEvent.setup({ delay: null });
    await u.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(mockAuth.login).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pass' });
    });
  });

  it('displays auth error', () => {
    mockAuth.error = 'Invalid credentials';
    render(<MemoryRouter><LoginForm /></MemoryRouter>);
    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
  });
});
