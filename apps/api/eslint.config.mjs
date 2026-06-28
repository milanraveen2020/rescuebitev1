import nest from '@rescuebite/config/eslint/nest';

export default [
  // Prisma scripts (seed) run via ts-node and aren't part of the build tsconfig.
  { ignores: ['prisma/**', 'dist/**'] },
  ...nest,
  {
    // HTTP e2e tests assert against untyped supertest response bodies; the
    // no-unsafe-* rules add noise here without value.
    files: ['**/*.e2e.spec.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },
];
