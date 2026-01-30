/**
 * @file        useAuth hook
 * @description Convenience hook for accessing authentication context
 */

import { useContext } from 'react';
import { AuthContext, type IAuthContext } from '@/context/AuthContext';

/**
 * Access authentication state and actions.
 * Must be used inside an AuthProvider.
 *
 * @returns Authentication context value
 * @throws Error if used outside AuthProvider
 */
export function useAuth(): IAuthContext {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
