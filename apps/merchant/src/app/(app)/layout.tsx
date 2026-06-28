import type { ReactNode } from 'react';
import { ToastProvider } from '@rescuebite/ui/web';
import { AppShell } from '@/features/shell/AppShell';
import { SessionProvider } from '@/features/shell/SessionContext';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <SessionProvider>
        <AppShell>{children}</AppShell>
      </SessionProvider>
    </ToastProvider>
  );
}
