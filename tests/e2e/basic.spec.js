// tests/basic.spec.js
import { test, expect } from '@playwright/test';

test.describe('MindMeld Basic Functionality', () => {
  test('Page loads successfully', async ({ page }) => {
    console.log('Starting page load test');

    const steps = [
      async () => {
        console.log('Navigating to application...');
        const response = await page.goto('http://localhost:8080', {
          timeout: 10000,
        });
        console.log(`Navigation complete. Status: ${response.status()}`);
        expect(response.ok()).toBeTruthy();
      },
      async () => {
        console.log('Checking for canvas element');
        const canvas = page.locator('#canvas');
        await expect(canvas).toBeVisible({ timeout: 5000 });
        console.log('Canvas element is visible');
      },
      async () => {
        console.log('Checking for logo');
        const logo = page.locator('#logo');
        await expect(logo).toBeVisible({ timeout: 5000 });
        console.log('Logo is visible');
      },
      async () => {
        console.log('Checking for watermark');
        const watermark = page.locator('#watermark');
        await expect(watermark).toBeVisible({ timeout: 5000 });
        console.log('Watermark is visible');
      },
    ];

    for (const [index, step] of steps.entries()) {
      try {
        await step();
      } catch (error) {
        console.error(`Error at step ${index + 1}:`, error);
        throw error;
      }
    }

    console.log('Test completed successfully');
  });
});
