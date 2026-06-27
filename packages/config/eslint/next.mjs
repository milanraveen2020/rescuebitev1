import nextPlugin from "@next/eslint-plugin-next";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import base from "./base.mjs";

/** ESLint flat config for the Next.js (App Router) apps: merchant + admin. */
export default [
  ...base,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "@next/next": nextPlugin,
      react: reactPlugin,
      "react-hooks": reactHooks,
    },
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      ...reactPlugin.configs.flat.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
    },
  },
  {
    // Next.js requires default exports for pages, layouts, route handlers, and config.
    files: [
      "**/app/**/{page,layout,template,loading,error,not-found,route,default}.tsx",
      "**/app/**/{page,layout,template,loading,error,not-found,route,default}.ts",
      "**/*.config.{ts,js,mjs}",
      "**/middleware.ts",
    ],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
];
