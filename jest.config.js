/** @type {import('jest').Config} */
const config = {
  clearMocks: true,
  testEnvironment: 'jsdom',
  // Specify which directories Jest should look for tests in
  roots: ['<rootDir>/tests/unit'],

  // Ignore E2E tests
  testPathIgnorePatterns: ['/tests/e2e/'],
};

export default config;
