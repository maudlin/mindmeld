// tests/storageManager.spec.js
import { test, expect } from '@playwright/test';
import * as storageManager from '../src/js/data/storageManager.js';

test.describe('storageManager', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the browser environment
    await page.evaluate(() => {
      window.localStorage = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      };
    });
  });

  test('should initialize and cleanup state management', async ({ page }) => {
    await page.evaluate(() => {
      const {
        initializeStateManagement,
        cleanupStateManagement,
      } = require('../src/js/data/storageManager.js');
      initializeStateManagement();
      // Check that event listeners are set up
      expect(window.addEventListener).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function),
      );

      cleanupStateManagement();
      // Check that event listeners are removed
      expect(window.removeEventListener).toHaveBeenCalledWith(
        'beforeunload',
        expect.any(Function),
      );
    });
  });

  test('should manually save state', async ({ page }) => {
    await page.evaluate(() => {
      const { manualSave } = require('../src/js/data/storageManager.js');
      manualSave();
      expect(window.localStorage.setItem).toHaveBeenCalled();
    });
  });

  // Add more tests as needed
});
