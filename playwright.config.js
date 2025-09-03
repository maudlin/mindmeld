// playwright.config.js
// Optimized for local development with focused test suite
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true, // Fast parallel execution for focused test suite
  retries: 0, // Tests are now reliable, minimal retries needed
  reporter: 'list',

  webServer: {
    command: 'npm start',
    url: 'http://localhost:8080',
    reuseExistingServer: true, // Faster for local development
    timeout: 60000, // 1 minute is sufficient
  },

  use: {
    ...devices['Desktop Chrome'],
    headless: true,
    viewport: { width: 1280, height: 720 },
    hasTouch: true,

    // Optimized timeouts for focused test suite
    actionTimeout: 8000,
    navigationTimeout: 15000,

    // Minimal debugging artifacts
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  // Single project for streamlined local development
  projects: [
    {
      name: 'dev',
      testMatch: '**/*.spec.js',
      use: { ...devices['Desktop Chrome'], hasTouch: true },
    },
  ],
});
