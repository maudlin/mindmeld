/** @type {import('jest').Config} */
const config = {
  clearMocks: true,
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests/unit'],
  testPathIgnorePatterns: ['/tests/e2e/'],

  // Use babel-jest to transform ES modules
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
};

export default config;
