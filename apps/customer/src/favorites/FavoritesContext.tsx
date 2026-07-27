import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * Favorites are per-listing, stored locally (optimistic by nature) and
 * persisted with AsyncStorage. When a `/favorites` API lands, this can sync to
 * the server.
 */
const STORAGE_KEY = 'rb_favorite_listings';

interface FavoritesContextValue {
  ready: boolean;
  isFavorite: (listingId: string) => boolean;
  toggle: (listingId: string) => void;
  ids: string[];
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!active) return;
      if (raw) {
        try {
          const parsed: unknown = JSON.parse(raw);
          if (Array.isArray(parsed)) setIds(parsed.filter((x): x is string => typeof x === 'string'));
        } catch {
          // Corrupt value — start fresh.
        }
      }
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const toggle = useCallback((listingId: string) => {
    setIds((prev) => {
      const next = prev.includes(listingId)
        ? prev.filter((id) => id !== listingId)
        : [...prev, listingId];
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo<FavoritesContextValue>(
    () => ({ ready, ids, isFavorite: (id) => ids.includes(id), toggle }),
    [ready, ids, toggle],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within a FavoritesProvider');
  return ctx;
}
