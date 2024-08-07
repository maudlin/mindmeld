// tests/sample.spec.js
import { test, expect } from '@playwright/test';

test('Sample test: application loads', async ({ page }) => {
  await page.goto('/');

  // Check if the canvas element is present
  const canvas = await page.locator('#canvas');
  await expect(canvas).toBeVisible();

  // Check if the logo is present
  const logo = await page.locator('#logo');
  await expect(logo).toBeVisible();

  // Check if the help text is present
  const helpText = await page.locator('#help-text');
  await expect(helpText).toBeVisible();
});
