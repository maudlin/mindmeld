// playwright.config.js
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: !process.env.CI, // Reduce parallelism in CI for stability
  retries: process.env.CI ? 1 : 0, // Retry flaky tests once in CI
  reporter: process.env.CI ? 'github' : 'list',

  webServer: {
    command: 'npm start',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI, // Always fresh server in CI
    timeout: process.env.CI ? 180000 : 120000, // 3 minutes in CI, 2 minutes locally
  },

  use: {
    ...devices['Desktop Chrome'],

    // CI-optimized settings
    headless: true,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,

    // Capture evidence of failures in CI
    video: process.env.CI ? 'retain-on-failure' : 'off',
    screenshot: process.env.CI ? 'only-on-failure' : 'off',

    // Increased timeouts for CI environment
    actionTimeout: process.env.CI ? 15000 : 5000,
    navigationTimeout: process.env.CI ? 30000 : 10000,

    // CI-specific browser launch options
    launchOptions: process.env.CI
      ? {
          args: [
            '--no-sandbox',
            '--disable-dev-shm-usage', // Overcome limited resource problems
            '--disable-gpu',
            '--disable-web-security',
            '--disable-background-timer-throttling', // Prevent timing issues
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
          ],
        }
      : {},
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
