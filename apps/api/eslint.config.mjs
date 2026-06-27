import nest from "@rescuebite/config/eslint/nest";

export default [
  // Prisma scripts (seed) run via ts-node and aren't part of the build tsconfig.
  { ignores: ["prisma/**", "dist/**"] },
  ...nest,
];
