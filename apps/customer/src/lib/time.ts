import { useEffect, useState } from 'react';

/** Human countdown to a target time, e.g. "in 2h 14m" / "Pickup open" / "Window closed". */
export function useCountdown(targetIso: string): string {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const diffMs = new Date(targetIso).getTime() - now;
  if (diffMs <= 0) return 'now';
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `in ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `in ${hours}h ${minutes % 60}m`;
  return `in ${Math.floor(hours / 24)}d`;
}

export function pickupWindowState(
  startIso: string,
  endIso: string,
): 'upcoming' | 'open' | 'closed' {
  const now = Date.now();
  if (now < new Date(startIso).getTime()) return 'upcoming';
  if (now > new Date(endIso).getTime()) return 'closed';
  return 'open';
}
