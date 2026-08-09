'use client';

import { useEffect } from 'react';

/** Registers the service worker once the page has loaded (production + dev). */
export function PwaRegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    // In development a caching service worker serves stale bundles and hides code
    // changes. Unregister any existing worker and drop its caches so dev always
    // reflects the latest source; only register the SW in production builds.
    if (process.env.NODE_ENV !== 'production') {
      void (async () => {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
        if (typeof caches !== 'undefined') {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      })();
      return;
    }

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch((err: unknown) => {
        // Registration failing is non-fatal; the app still works online.
        console.warn('SW registration failed', err);
      });
    };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);
  return null;
}
