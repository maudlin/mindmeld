import js from '@eslint/js';
import prettier from 'eslint-plugin-prettier/recommended';

export default [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    ...prettier,
    rules: {
      'prettier/prettier': 'error',
      'no-unused-vars': 'warn',
      'no-console': 'warn',
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    env: {
      browser: true,
      es2022: true,
    },
  },
];
