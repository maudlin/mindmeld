// playwright.config.js
import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;
const baseURL = process.env.PW_BASE_URL || 'http://localhost:8080';
const serverCmd = process.env.PW_SERVER_CMD || 'npm start'; // override with instrumented serve in coverage runs

export default defineConfig({
  testDir: './tests/e2e',
  // Keep tests independent if using fullyParallel; flip off if any shared state creeps in
  fullyParallel: true,

  // Local: 0 retries; CI: a couple for flake tolerance
  retries: isCI ? 2 : 0,

  // Reporters: human-readable + artifacts
  reporter: isCI
    ? [
        ['list'],
        ['junit', { outputFile: 'reports/playwright-junit.xml' }],
        ['html', { open: 'never', outputFolder: 'reports/playwright-html' }],
      ]
    : [
        ['list'],
        ['html', { open: 'never', outputFolder: 'reports/playwright-html' }],
      ],

  // Keep artifacts contained
  outputDir: 'reports/playwright-artifacts',

  webServer: {
    command: serverCmd,
    url: baseURL,
    reuseExistingServer: true, // fast locally
    timeout: 120_000, // a bit more headroom for CI/instrumented serve
  },

  use: {
    ...devices['Desktop Chrome'],
    headless: true,
    baseURL, // enables page.goto('/') style
    viewport: { width: 1280, height: 720 },
    hasTouch: true,
    actionTimeout: 8_000,
    navigationTimeout: 15_000,
    expect: { timeout: 5_000 },

    // Debugging artifacts
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },

  // Keep a single dev project; define a CI matrix as a second project group
  projects: [
    {
      name: 'dev-chromium',
      testMatch: '**/*.spec.js',
      use: { ...devices['Desktop Chrome'], hasTouch: true },
    },
    ...(isCI
      ? [
          { name: 'ci-chromium', use: { ...devices['Desktop Chrome'] } },
          { name: 'ci-webkit', use: { ...devices['Desktop Safari'] } },
          // Add firefox if you care: { name: 'ci-firefox', use: { ...devices['Desktop Firefox'] } },
        ]
      : []),
  ],

  // Helpful guard in CI: fail build if `.only` is committed
  forbidOnly: isCI,
});
