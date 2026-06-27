import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import globals from "globals";

/**
 * Shared base ESLint flat config for all RescueBite TypeScript code.
 * Enforces the project's "no any, no silent catches" standards.
 */
export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/build/**", "**/.next/**", "**/.expo/**", "**/coverage/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node },
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      // No `any` — anywhere. This is a hard project rule.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/no-unsafe-argument": "error",

      // Named exports only — default exports are disallowed (framework files opt out below).
      "no-restricted-syntax": [
        "error",
        {
          selector: "ExportDefaultDeclaration",
          message:
            "Use named exports. Default exports are only allowed in framework entry files (pages, layouts, configs).",
        },
      ],

      // No silent catches.
      "no-empty": ["error", { allowEmptyCatch: false }],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",

      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      eqeqeq: ["error", "always"],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    // ESM config files (eslint.config.mjs, *.config.mjs) aren't part of any
    // tsconfig — disable type-aware linting; they're tooling, not app source.
    files: ["**/*.mjs"],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: { sourceType: "module", globals: { ...globals.node } },
  },
  {
    // CommonJS config files (metro.config.js, babel.config.js, *.cjs).
    files: ["**/*.{js,cjs}"],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: { sourceType: "commonjs", globals: { ...globals.node } },
  },
  {
    // Separate block so this merges with (rather than replaces) the rule set
    // turned off by disableTypeChecked above.
    files: ["**/*.{js,cjs}"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  prettier,
);
