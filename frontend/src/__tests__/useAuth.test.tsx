/**
 * @file        useAuth hook tests
 * @description Tests for useAuth and AuthProvider
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { useAuth } from '@/hooks/useAuth';

// Mock the api module
vi.mock('@/services/api', () => {
  let accessToken: string | null = null;
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
    },
    setTokens: vi.fn((at: string) => { accessToken = at; }),
    clearTokens: vi.fn(() => { accessToken = null; }),
    getAccessToken: vi.fn(() => accessToken),
  };
});

import api, { getAccessToken, clearTokens, setTokens } from '@/services/api';

const mockedApi = api as { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> };
const mockedGetAccessToken = getAccessToken as ReturnType<typeof vi.fn>;

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedGetAccessToken.mockReturnValue(null);
});

describe('useAuth', () => {
  it('throws when used outside AuthProvider', () => {
    // Suppress React error boundary console output
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within an AuthProvider');
    spy.mockRestore();
  });

  it('starts with unauthenticated state when no token', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isRestoring).toBe(false));

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('restores session from stored token', async () => {
    mockedGetAccessToken.mockReturnValue('stored-token');
    mockedApi.get.mockResolvedValue({
      data: { id: 'u1', email: 'test@test.com', firstName: 'Test', surname: 'User', role: 'USER' },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isRestoring).toBe(true);

    await waitFor(() => expect(result.current.isRestoring).toBe(false));

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(
      expect.objectContaining({ email: 'test@test.com' })
    );
  });

  it('clears token when session restore fails', async () => {
    mockedGetAccessToken.mockReturnValue('bad-token');
    mockedApi.get.mockRejectedValue(new Error('unauthorized'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isRestoring).toBe(false));

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(clearTokens).toHaveBeenCalled();
  });

  it('login sets user and tokens on success', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isRestoring).toBe(false));

    mockedApi.post.mockResolvedValue({
      data: {
        user: { id: 'u1', email: 'a@b.com', firstName: 'A', surname: 'B', role: 'USER' },
        tokens: { accessToken: 'at', refreshToken: 'rt' },
      },
    });

    await act(async () => {
      await result.current.login({ email: 'a@b.com', password: 'pass' });
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe('a@b.com');
    expect(setTokens).toHaveBeenCalledWith('at', 'rt');
    expect(result.current.error).toBeNull();
  });

  it('login sets error on failure', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isRestoring).toBe(false));

    mockedApi.post.mockRejectedValue({
      response: { data: { error: { message: 'Invalid credentials' } } },
    });

    await act(async () => {
      await result.current.login({ email: 'a@b.com', password: 'wrong' });
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.error).toBe('Invalid credentials');
  });

  it('logout clears user and tokens', async () => {
    mockedGetAccessToken.mockReturnValue('token');
    mockedApi.get.mockResolvedValue({
      data: { id: 'u1', email: 'a@b.com', firstName: 'A', surname: 'B', role: 'USER' },
    });
    mockedApi.post.mockResolvedValue({});

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(clearTokens).toHaveBeenCalled();
  });

  it('logout succeeds even if API call fails', async () => {
    mockedGetAccessToken.mockReturnValue('token');
    mockedApi.get.mockResolvedValue({
      data: { id: 'u1', email: 'a@b.com', firstName: 'A', surname: 'B', role: 'USER' },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    mockedApi.post.mockRejectedValue(new Error('Network error'));

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(clearTokens).toHaveBeenCalled();
  });

  it('clearError resets error to null', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isRestoring).toBe(false));

    mockedApi.post.mockRejectedValue(new Error('fail'));

    await act(async () => {
      await result.current.login({ email: 'a@b.com', password: 'x' });
    });

    expect(result.current.error).toBeTruthy();

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('register sets user and tokens on success', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isRestoring).toBe(false));

    mockedApi.post.mockResolvedValue({
      data: {
        user: { id: 'u2', email: 'new@b.com', firstName: 'New', surname: 'User', role: 'USER' },
        tokens: { accessToken: 'at2', refreshToken: 'rt2' },
      },
    });

    await act(async () => {
      await result.current.register({
        email: 'new@b.com', password: 'Pass1234!', firstName: 'New', surname: 'User',
      });
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe('new@b.com');
    expect(setTokens).toHaveBeenCalledWith('at2', 'rt2');
  });
});
