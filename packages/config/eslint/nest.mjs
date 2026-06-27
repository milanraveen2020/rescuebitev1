import globals from "globals";
import base from "./base.mjs";

/** ESLint flat config for the NestJS API. */
export default [
  ...base,
  {
    files: ["**/*.ts"],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      // NestJS relies heavily on decorators and DI metadata.
      "@typescript-eslint/no-extraneous-class": "off",
      "@typescript-eslint/interface-name-prefix": "off",
      // Decorator-heavy DI classes use default exports for some Nest CLI scaffolds; keep named.
    },
  },
  {
    files: ["**/*.spec.ts", "**/*.e2e-spec.ts", "**/test/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      // Referencing a mocked method (e.g. `expect(obj.method)`) is idiomatic in tests.
      "@typescript-eslint/unbound-method": "off",
      "@typescript-eslint/consistent-type-imports": "off",
    },
  },
];
