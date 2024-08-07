// eslint.config.mjs
import js from '@eslint/js';
import prettier from 'eslint-plugin-prettier';

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
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        // Node.js globals
        process: 'readonly',
        // Add any other globals you're using
      },
    },
    env: {
      browser: true,
      node: true,
      es2022: true,
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
    ignores: ['**/node_modules/**', '**/dist/**'],
  },
];
