// tests/minimal.spec.js
import { test, expect } from '@playwright/test';

test('Minimal browser test', async ({ page, browser }) => {
  console.log('Starting minimal browser test');
  console.log('Browser version:', await browser.version());

  console.log('Navigating to example.com...');
  const response = await page.goto('https://example.com');
  console.log('Navigation complete. Status:', response.status());

  console.log('Getting page title...');
  const title = await page.title();
  console.log('Page title:', title);

  expect(title).toBe('Example Domain');
  console.log('Test completed successfully');
});
