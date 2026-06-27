import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import base from "./base.mjs";

/** ESLint flat config for the Expo / React Native customer app. */
export default [
  ...base,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooks,
    },
    languageOptions: {
      globals: { ...globals.browser },
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...reactPlugin.configs.flat.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
    },
  },
  {
    // Expo Router uses file-based routing with default exports for screens.
    files: ["**/app/**/*.{ts,tsx}", "**/*.config.{ts,js,mjs}", "**/babel.config.js"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
];
