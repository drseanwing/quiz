/**
 * @file        RegisterForm tests
 * @description Tests for RegisterForm component
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const mockAuth = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn().mockResolvedValue(undefined),
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

import { RegisterForm } from '@/components/auth/RegisterForm';

/** Fill input by its generated ID (from Input component: input-{label}) */
function fillById(container: HTMLElement, id: string, value: string) {
  const el = container.querySelector(`#${id}`) as HTMLInputElement;
  fireEvent.change(el, { target: { value } });
}

beforeEach(() => { vi.clearAllMocks(); mockAuth.error = null; });

describe('RegisterForm', () => {
  it('renders all fields', () => {
    render(<MemoryRouter><RegisterForm /></MemoryRouter>);
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/surname/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    // Password fields identified by ID since label text includes asterisk
    expect(document.getElementById('input-password')).toBeInTheDocument();
    expect(document.getElementById('input-confirm-password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('validates email domain', async () => {
    const { container } = render(<MemoryRouter><RegisterForm /></MemoryRouter>);
    fillById(container, 'input-first-name', 'J');
    fillById(container, 'input-surname', 'D');
    fillById(container, 'input-email', 'j@gmail.com');
    fillById(container, 'input-password', 'Password1!');
    fillById(container, 'input-confirm-password', 'Password1!');
    const u = userEvent.setup({ delay: null });
    await u.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => {
      expect(screen.getByText(/@health\.qld\.gov\.au domain/i)).toBeInTheDocument();
    });
  });

  it('validates password mismatch', async () => {
    const { container } = render(<MemoryRouter><RegisterForm /></MemoryRouter>);
    fillById(container, 'input-first-name', 'J');
    fillById(container, 'input-surname', 'D');
    fillById(container, 'input-email', 'j@health.qld.gov.au');
    fillById(container, 'input-password', 'Password1!');
    fillById(container, 'input-confirm-password', 'Different!');
    const u = userEvent.setup({ delay: null });
    await u.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('calls register on valid submit', async () => {
    const { container } = render(<MemoryRouter><RegisterForm /></MemoryRouter>);
    fillById(container, 'input-first-name', 'John');
    fillById(container, 'input-surname', 'Doe');
    fillById(container, 'input-email', 'john@health.qld.gov.au');
    fillById(container, 'input-password', 'Password1!');
    fillById(container, 'input-confirm-password', 'Password1!');
    const u = userEvent.setup({ delay: null });
    await u.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => {
      expect(mockAuth.register).toHaveBeenCalledWith(expect.objectContaining({
        email: 'john@health.qld.gov.au',
        firstName: 'John',
        surname: 'Doe',
      }));
    });
  });

  it('displays auth error from context', () => {
    mockAuth.error = 'Email already registered';
    render(<MemoryRouter><RegisterForm /></MemoryRouter>);
    expect(screen.getByText('Email already registered')).toBeInTheDocument();
  });
});
