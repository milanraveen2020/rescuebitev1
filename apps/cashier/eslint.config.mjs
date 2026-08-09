import next from '@rescuebite/config/eslint/next';

// The service worker in public/ runs in a ServiceWorkerGlobalScope (self, caches)
// and is served as a static asset, not bundled — keep it out of app linting.
export default [...next, { ignores: ['public/**'] }];
