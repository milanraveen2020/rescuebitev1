import { useRef, useState } from 'react';

const GUARD_MS = 600;

/**
 * Guards a navigation action against rapid repeat taps. `locked` becomes
 * true the instant the first tap fires, so callers can pass it to a
 * Pressable's `disabled` prop — this stops the native touch responder from
 * processing further taps at all, not just filtering them in JS. The ref
 * check is a synchronous backstop for the same render frame, before the
 * `disabled` state update has painted.
 */
export function useTapGuard(): { guard: (action: () => void) => void; locked: boolean } {
  const lockedRef = useRef(false);
  const [locked, setLocked] = useState(false);

  const guard = (action: () => void) => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    setLocked(true);
    action();
    setTimeout(() => {
      lockedRef.current = false;
      setLocked(false);
    }, GUARD_MS);
  };

  return { guard, locked };
}
