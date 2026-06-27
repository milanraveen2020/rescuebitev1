import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthResponse, LoginInput, RegisterCustomerInput, User } from '@rescuebite/types';
import { ApiError, authApi } from '../api/client';
import {
  clearStoredRefreshToken,
  getStoredRefreshToken,
  setStoredRefreshToken,
} from './storage';

type Status = 'loading' | 'authenticated' | 'guest';

interface AuthContextValue {
  status: Status;
  user: User | null;
  isAuthenticated: boolean;
  signIn: (input: LoginInput) => Promise<void>;
  signUp: (input: RegisterCustomerInput) => Promise<void>;
  signOut: () => Promise<void>;
  /**
   * Run an authenticated API call with the current access token. If it returns
   * an `unauthenticated` error, transparently refresh once and retry.
   */
  withAuth: <T>(fn: (accessToken: string) => Promise<T>) => Promise<T>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<User | null>(null);
  // Access token is held in memory only; the refresh token lives in secure store.
  const accessToken = useRef<string | null>(null);
  const refreshToken = useRef<string | null>(null);

  const applySession = useCallback(async (session: AuthResponse) => {
    accessToken.current = session.accessToken;
    if (session.refreshToken) {
      refreshToken.current = session.refreshToken;
      await setStoredRefreshToken(session.refreshToken);
    }
    setUser(session.user);
    setStatus('authenticated');
  }, []);

  const clearSession = useCallback(async () => {
    accessToken.current = null;
    refreshToken.current = null;
    await clearStoredRefreshToken();
    setUser(null);
    setStatus('guest');
  }, []);

  // Restore a session on launch from the stored refresh token.
  useEffect(() => {
    let active = true;
    void (async () => {
      const stored = await getStoredRefreshToken();
      if (!stored) {
        if (active) setStatus('guest');
        return;
      }
      try {
        const session = await authApi.refresh(stored);
        if (active) await applySession(session);
      } catch {
        if (active) await clearSession();
      }
    })();
    return () => {
      active = false;
    };
  }, [applySession, clearSession]);

  const signIn = useCallback(
    async (input: LoginInput) => {
      await applySession(await authApi.login(input));
    },
    [applySession],
  );

  const signUp = useCallback(
    async (input: RegisterCustomerInput) => {
      await applySession(await authApi.registerCustomer(input));
    },
    [applySession],
  );

  const signOut = useCallback(async () => {
    const stored = refreshToken.current;
    if (stored) {
      // Best-effort revoke; clear local state regardless of the result.
      await authApi.logout(stored).catch(() => undefined);
    }
    await clearSession();
  }, [clearSession]);

  const withAuth = useCallback(
    async <T,>(fn: (accessToken: string) => Promise<T>): Promise<T> => {
      if (!accessToken.current) throw new ApiError('unauthenticated', 'Please sign in.');
      try {
        return await fn(accessToken.current);
      } catch (error) {
        if (!(error instanceof ApiError) || error.code !== 'unauthenticated') throw error;
        const stored = refreshToken.current;
        if (!stored) {
          await clearSession();
          throw error;
        }
        const session = await authApi.refresh(stored).catch(async (refreshError) => {
          await clearSession();
          throw refreshError;
        });
        await applySession(session);
        return fn(session.accessToken);
      }
    },
    [applySession, clearSession],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isAuthenticated: status === 'authenticated',
      signIn,
      signUp,
      signOut,
      withAuth,
    }),
    [status, user, signIn, signUp, signOut, withAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
