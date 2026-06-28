import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthResponse, LoginInput, RegisterCustomerInput, User } from '@rescuebite/types';
import { authApi } from '../api/endpoints';
import { session } from '../api/session';
import { clearStoredRefreshToken, getStoredRefreshToken, setStoredRefreshToken } from './storage';

type Status = 'loading' | 'authenticated' | 'guest';

interface AuthContextValue {
  status: Status;
  user: User | null;
  isAuthenticated: boolean;
  signIn: (input: LoginInput) => Promise<void>;
  signUp: (input: RegisterCustomerInput) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<User | null>(null);

  const applySession = useCallback(async (auth: AuthResponse) => {
    session.setAccessToken(auth.accessToken);
    if (auth.refreshToken) {
      session.setRefreshToken(auth.refreshToken);
      await setStoredRefreshToken(auth.refreshToken);
    }
    setUser(auth.user);
    setStatus('authenticated');
  }, []);

  const clear = useCallback(async () => {
    session.setAccessToken(null);
    session.setRefreshToken(null);
    await clearStoredRefreshToken();
    setUser(null);
    setStatus('guest');
  }, []);

  // Let the request layer drop us to guest if a refresh ultimately fails.
  useEffect(() => {
    session.setOnExpire(() => {
      setUser(null);
      setStatus('guest');
    });
    return () => session.setOnExpire(null);
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
      session.setRefreshToken(stored);
      try {
        const auth = await authApi.refresh(stored);
        if (active) await applySession(auth);
      } catch {
        if (active) await clear();
      }
    })();
    return () => {
      active = false;
    };
  }, [applySession, clear]);

  const signIn = useCallback(
    async (input: LoginInput) => applySession(await authApi.login(input)),
    [applySession],
  );
  const signUp = useCallback(
    async (input: RegisterCustomerInput) => applySession(await authApi.registerCustomer(input)),
    [applySession],
  );
  const signOut = useCallback(async () => {
    const token = session.getRefreshToken();
    if (token) await authApi.logout(token).catch(() => undefined);
    await clear();
  }, [clear]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, isAuthenticated: status === 'authenticated', signIn, signUp, signOut }),
    [status, user, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
