'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Listing } from '@rescuebite/types';
import { ApiRequestError } from '@/lib/api-session';
import { useAuth } from '@/lib/auth';
import { findLiveSession, listListings, pastSessions } from './api';

/** Keeps the live session in step with the server (quantity sold elsewhere, expiry). */
const POLL_MS = 20000;

type Phase = 'loading' | 'ready' | 'error';

interface SessionValue {
  /** The live session (an open listing), or null when nothing is on sale. */
  session: Listing | null;
  /** Finished sessions, newest first. */
  past: Listing[];
  phase: Phase;
  error: string | null;
  refresh: () => Promise<void>;
}

const SessionCtx = createContext<SessionValue | null>(null);

export function useSession(): SessionValue {
  const ctx = useContext(SessionCtx);
  if (!ctx) throw new Error('useSession must be used within <SessionProvider>.');
  return ctx;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const { store } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    if (!store) return;
    try {
      setListings(await listListings());
      setError(null);
      setPhase('ready');
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'Could not load sessions.');
      setPhase((p) => (p === 'loading' ? 'error' : p));
    }
  }, [store]);

  useEffect(() => {
    if (!store) return;
    void load();
    const id = setInterval(() => {
      setNow(Date.now());
      void load();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [store, load]);

  const session = useMemo(() => findLiveSession(listings, now), [listings, now]);

  const value: SessionValue = {
    session,
    past: useMemo(() => pastSessions(listings, now), [listings, now]),
    phase,
    error,
    refresh: load,
  };

  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}
