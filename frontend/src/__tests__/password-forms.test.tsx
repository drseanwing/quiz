/**
 * @file        Password form tests
 * @description Tests for ForgotPasswordForm and ResetPasswordForm
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockApi = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/services/api', () => ({ default: mockApi, api: mockApi }));

import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

beforeEach(() => vi.clearAllMocks());

describe('ForgotPasswordForm', () => {
  it('renders and submits', async () => {
    mockApi.post.mockResolvedValue({});
    render(<MemoryRouter><ForgotPasswordForm /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } });
    fireEvent.submit(screen.getByRole('button', { name: /send reset link/i }).closest('form')!);
    await waitFor(() => {
      expect(screen.getByText(/if an account exists/i)).toBeInTheDocument();
    });
  });

  it('shows success on error (prevents enumeration)', async () => {
    mockApi.post.mockRejectedValue(new Error('fail'));
    render(<MemoryRouter><ForgotPasswordForm /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } });
    fireEvent.submit(screen.getByRole('button', { name: /send reset link/i }).closest('form')!);
    await waitFor(() => {
      expect(screen.getByText(/if an account exists/i)).toBeInTheDocument();
    });
  });
});

describe('ResetPasswordForm', () => {
  it('renders fields', () => {
    render(<MemoryRouter><ResetPasswordForm token="tok" /></MemoryRouter>);
    expect(document.getElementById('input-new-password')).toBeInTheDocument();
    expect(document.getElementById('input-confirm-new-password')).toBeInTheDocument();
  });

  it('submits and shows success', async () => {
    mockApi.post.mockResolvedValue({});
    const { container } = render(<MemoryRouter><ResetPasswordForm token="tok" /></MemoryRouter>);
    fireEvent.change(container.querySelector('#input-new-password')!, { target: { value: 'NewPass123!' } });
    fireEvent.change(container.querySelector('#input-confirm-new-password')!, { target: { value: 'NewPass123!' } });
    fireEvent.submit(container.querySelector('form')!);
    await waitFor(() => {
      expect(screen.getByText(/password has been reset successfully/i)).toBeInTheDocument();
    });
  });

  it('shows API error', async () => {
    mockApi.post.mockRejectedValue({ response: { data: { error: { message: 'Token expired' } } } });
    const { container } = render(<MemoryRouter><ResetPasswordForm token="bad" /></MemoryRouter>);
    fireEvent.change(container.querySelector('#input-new-password')!, { target: { value: 'NewPass123!' } });
    fireEvent.change(container.querySelector('#input-confirm-new-password')!, { target: { value: 'NewPass123!' } });
    fireEvent.submit(container.querySelector('form')!);
    await waitFor(() => {
      expect(screen.getByText('Token expired')).toBeInTheDocument();
    });
  });
});
