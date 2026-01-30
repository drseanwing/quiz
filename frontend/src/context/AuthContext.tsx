/**
 * @file        Auth Context
 * @description Authentication state management with token persistence
 */

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import api, { setTokens, clearTokens, getAccessToken } from '@/services/api';
import type {
  IUser,
  ILoginRequest,
  IRegisterRequest,
  IAuthResponse,
} from '@/types';

// ─── Context shape ──────────────────────────────────────────────────────────

export interface IAuthContext {
  user: IUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (data: ILoginRequest) => Promise<void>;
  register: (data: IRegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const AuthContext = createContext<IAuthContext | null>(null);

// ─── Provider ───────────────────────────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<IUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Restore session on mount
  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    api
      .get('/users/me')
      .then((response: unknown) => {
        const res = response as { data: IUser };
        setUser(res.data);
      })
      .catch(() => {
        clearTokens();
        setUser(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Listen for forced logout from token refresh failure
  useEffect(() => {
    function handleForceLogout() {
      setUser(null);
    }
    window.addEventListener('auth:logout', handleForceLogout);
    return () => window.removeEventListener('auth:logout', handleForceLogout);
  }, []);

  const login = useCallback(async (data: ILoginRequest) => {
    setError(null);
    setIsLoading(true);
    try {
      const response = (await api.post('/auth/login', data)) as {
        data: IAuthResponse;
      };
      const { user: loggedInUser, tokens } = response.data;
      setTokens(tokens.accessToken, tokens.refreshToken);
      setUser(loggedInUser);
    } catch (err: unknown) {
      const message = extractErrorMessage(err);
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (data: IRegisterRequest) => {
    setError(null);
    setIsLoading(true);
    try {
      const response = (await api.post('/auth/register', data)) as {
        data: IAuthResponse;
      };
      const { user: registeredUser, tokens } = response.data;
      setTokens(tokens.accessToken, tokens.refreshToken);
      setUser(registeredUser);
    } catch (err: unknown) {
      const message = extractErrorMessage(err);
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Logout should succeed even if the API call fails
    } finally {
      clearTokens();
      setUser(null);
      setError(null);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<IAuthContext>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      error,
      login,
      register,
      logout,
      clearError,
    }),
    [user, isLoading, error, login, register, logout, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractErrorMessage(err: unknown): string {
  if (
    typeof err === 'object' &&
    err !== null &&
    'response' in err
  ) {
    const axiosErr = err as {
      response?: { data?: { error?: { message?: string } } };
    };
    return (
      axiosErr.response?.data?.error?.message || 'An unexpected error occurred'
    );
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'An unexpected error occurred';
}
