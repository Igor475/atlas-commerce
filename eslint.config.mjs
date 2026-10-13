import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

const applicationTypeScriptFiles = [
  "apps/api/**/*.ts",
  "apps/storefront/**/*.ts",
  "apps/storefront/**/*.tsx",
  "apps/admin/**/*.ts",
  "apps/admin/**/*.tsx",
  "packages/contracts/**/*.ts",
];

const nextFiles = ["apps/storefront/**/*.{ts,tsx}", "apps/admin/**/*.{ts,tsx}"];

const onlyFiles = (configs, files) =>
  configs.map((config) => ({ ...config, files }));

export default defineConfig([
  globalIgnores([
    "**/.next/**",
    "**/dist/**",
    "**/coverage/**",
    "**/node_modules/**",
    "apps/api/src/infrastructure/persistence/generated/**",
    "docs/**",
  ]),
  {
    files: ["**/*.{js,mjs,cjs}"],
    ...js.configs.recommended,
    languageOptions: {
      globals: globals.node,
    },
  },
  ...onlyFiles(tseslint.configs.recommended, applicationTypeScriptFiles),
  {
    files: nextFiles,
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@atlas/api", "@atlas/api/*", "**/apps/api/**"],
              message: "Frontends não podem importar a implementação da API.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["apps/api/**/*.ts", "packages/contracts/**/*.ts"],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  eslintConfigPrettier,
]);
