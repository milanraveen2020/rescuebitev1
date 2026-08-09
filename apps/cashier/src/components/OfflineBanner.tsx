'use client';

import { WifiOff } from 'lucide-react';
import { useOnline } from '@/lib/useOnline';

/** Persistent, screen-reader-announced banner shown whenever the device is offline. */
export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 bg-warning-600 px-4 py-2 text-center text-sm font-semibold text-white"
    >
      <WifiOff className="h-4 w-4" aria-hidden />
      You’re offline — QR validation and handovers are paused until you reconnect.
    </div>
  );
}
