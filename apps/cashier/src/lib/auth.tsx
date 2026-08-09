'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Store, User } from '@rescuebite/types';
import {
  ApiRequestError,
  login as apiLogin,
  logout as apiLogout,
  refreshSession,
  setAccessToken,
} from './api-session';
import { getStore } from '@/features/orders/api';

const COOKIE = 'mb_staff';

export class LoginError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LoginError';
  }
}

interface AuthValue {
  staff: User | null;
  store: Store | null;
  ready: boolean;
  signIn: (email: string, password: string, remember: boolean) => Promise<User>;
  signOut: () => Promise<void>;
  /** Replaces the cached user, e.g. after a forced password change clears the flag. */
  setStaff: (user: User) => void;
}

const AuthCtx = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>.');
  return ctx;
}

/** Marker cookie so middleware can keep signed-out staff out of the app shell. */
function setCookie(remember: boolean): void {
  const maxAge = remember ? `; max-age=${60 * 60 * 24 * 30}` : '';
  document.cookie = `${COOKIE}=1; path=/; samesite=lax${maxAge}`;
}

function clearCookie(): void {
  document.cookie = `${COOKIE}=; path=/; max-age=0`;
}

/** Only merchant accounts may run a counter session. */
const STAFF_ROLES = new Set(['MERCHANT_OWNER', 'MERCHANT_STAFF']);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<User | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [ready, setReady] = useState(false);

  // Restore the session from the refresh cookie on load.
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const session = await refreshSession();
        if (!active) return;
        setAccessToken(session.accessToken);
        const s = await getStore();
        if (!active) return;
        setStaff(session.user);
        setStore(s);
      } catch {
        // No valid session — the user simply signs in again.
        if (active) {
          setAccessToken(null);
          clearCookie();
        }
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(
    async (email: string, password: string, remember: boolean): Promise<User> => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new LoginError('You appear to be offline. Reconnect to sign in.');
      }
      let session;
      try {
        session = await apiLogin(email.trim(), password);
      } catch (e) {
        throw new LoginError(
          e instanceof ApiRequestError ? e.message : 'Could not sign in. Please try again.',
        );
      }
      if (!STAFF_ROLES.has(session.user.role)) {
        throw new LoginError('This account can’t run a counter session.');
      }
      setAccessToken(session.accessToken);

      let s: Store;
      try {
        s = await getStore();
      } catch {
        setAccessToken(null);
        throw new LoginError('Signed in, but your store could not be loaded.');
      }

      setCookie(remember);
      setStaff(session.user);
      setStore(s);
      return session.user;
    },
    [],
  );

  const signOut = useCallback(async (): Promise<void> => {
    await apiLogout();
    setAccessToken(null);
    clearCookie();
    setStaff(null);
    setStore(null);
  }, []);

  return (
    <AuthCtx.Provider value={{ staff, store, ready, signIn, signOut, setStaff }}>
      {children}
    </AuthCtx.Provider>
  );
}
