'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Bell, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ToastKind = 'success' | 'error' | 'info' | 'order';

interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
}

interface ToastValue {
  show: (t: Omit<Toast, 'id'>) => void;
}

const ToastCtx = createContext<ToastValue | null>(null);

export function useToast(): ToastValue {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>.');
  return ctx;
}

const STYLES: Record<ToastKind, { icon: typeof Info; ring: string; iconColor: string }> = {
  success: { icon: CheckCircle2, ring: 'ring-success-500/30', iconColor: 'text-success-600' },
  error: { icon: XCircle, ring: 'ring-danger-500/30', iconColor: 'text-danger-600' },
  info: { icon: Info, ring: 'ring-info-500/30', iconColor: 'text-info-600' },
  order: { icon: Bell, ring: 'ring-brand-500/40', iconColor: 'text-brand-700' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((list) => [...list.slice(-2), { ...t, id }]);
      const timer = setTimeout(() => dismiss(id), t.kind === 'order' ? 6000 : 4200);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((timer) => clearTimeout(timer));
      map.clear();
    };
  }, []);

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-2 p-3"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((t) => {
          const style = STYLES[t.kind];
          const Icon = style.icon;
          return (
            <div
              key={t.id}
              role={t.kind === 'error' ? 'alert' : 'status'}
              aria-live={t.kind === 'error' ? 'assertive' : 'polite'}
              className={cn(
                'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-black/5 bg-surface-card p-3 shadow-card-lg ring-1 animate-slide-up',
                style.ring,
              )}
            >
              <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', style.iconColor)} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-neutral-900">{t.title}</p>
                {t.description ? (
                  <p className="mt-0.5 text-sm text-neutral-600">{t.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="tap -m-1 rounded-md p-1 text-neutral-400 hover:text-neutral-700"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}
