// eslint.config.mjs
import js from '@eslint/js';
import prettier from 'eslint-plugin-prettier';
import globals from 'globals';
import jestPlugin from 'eslint-plugin-jest';
import playwrightPlugin from 'eslint-plugin-playwright';

export default [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    plugins: {
      prettier: prettier,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'prettier/prettier': [
        'error',
        {
          semi: true,
          endOfLine: 'auto',
        },
      ],
    },
  },
  {
    files: ['**/*.test.js', '**/*.spec.js'],
    plugins: {
      jest: jestPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
    rules: {
      ...jestPlugin.configs.recommended.rules,
    },
  },
  {
    files: ['**/e2e/**/*.js', '**/e2e/**/*.ts'],
    plugins: {
      playwright: playwrightPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      ...playwrightPlugin.configs.recommended.rules,
    },
  },
  {
    ignores: ['**/node_modules/**', '**/dist/**'],
  },
];
