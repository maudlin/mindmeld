// tests/minimal-non-browser.spec.js
import { test, expect } from '@playwright/test';

test('Minimal non-browser test', async () => {
  console.log('Starting minimal non-browser test');
  expect(1 + 1).toBe(2);
  console.log('Test completed successfully');
});
