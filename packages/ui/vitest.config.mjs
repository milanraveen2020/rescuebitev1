import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Component tests for the web primitives (jsdom). Native primitives need a
// React Native renderer and are covered by app-level tests.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/web/**/*.test.tsx', 'src/**/*.test.ts'],
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
  },
});
