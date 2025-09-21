// tests/e2e/yjs-browser-diagnostics.spec.js
// Browser compatibility test for Yjs imports - Phase 1.1 Diagnostic

import { test, expect } from '@playwright/test';

test.describe('YjsProvider Browser Import Diagnostics', () => {
  test('should diagnose Yjs import issues in browser environment', async ({
    page,
  }) => {
    // Navigate to our test page
    await page.goto('http://localhost:8080/test-yjs-browser.html');

    // Wait for all tests to complete
    await page.waitForTimeout(2000);

    // Capture console output
    const logs = [];
    page.on('console', (msg) => {
      logs.push(`${msg.type()}: ${msg.text()}`);
    });

    // Wait a bit more to capture any async logs
    await page.waitForTimeout(1000);

    // Get the results from the page
    const results = await page.textContent('#results');
    console.log('Browser test results:', results);

    // Check for specific error patterns
    const hasYjsImportError = results.includes('❌ Direct Yjs import failed');
    const hasWebSocketImportError = results.includes(
      '❌ y-websocket import failed',
    );
    const hasYjsProviderImportError = results.includes(
      '❌ YjsProvider test failed',
    );

    console.log('Import diagnostics:', {
      hasYjsImportError,
      hasWebSocketImportError,
      hasYjsProviderImportError,
      allLogs: logs,
    });

    // Report findings - these are soft assertions for diagnostic purposes
    expect.soft(hasYjsImportError).toBe(false);
    expect.soft(hasWebSocketImportError).toBe(false);
    expect.soft(hasYjsProviderImportError).toBe(false);

    // Log diagnostic information
    if (
      hasYjsImportError ||
      hasWebSocketImportError ||
      hasYjsProviderImportError
    ) {
      console.log(
        '❌ DIAGNOSTIC: Import failures detected in browser environment',
      );
      console.log('Next steps: Configure build system for proper Yjs bundling');
    } else {
      console.log('✅ DIAGNOSTIC: All imports working in browser environment');
      console.log('Next steps: Re-enable YjsProvider in DataProviderService');
    }
  });

  test('should test direct module import in browser console', async ({
    page,
  }) => {
    await page.goto('http://localhost:8080');
    await page.waitForLoadState('domcontentloaded');

    // Test imports directly in the browser console
    const yjsImportResult = await page.evaluate(async () => {
      try {
        const Y = await import('yjs');
        return {
          success: true,
          message: 'Yjs import successful',
          exports: Object.keys(Y).slice(0, 5),
        };
      } catch (error) {
        return {
          success: false,
          message: 'Yjs import failed',
          error: error.message,
          stack: error.stack,
        };
      }
    });

    console.log('Direct Yjs import test:', yjsImportResult);

    const websocketImportResult = await page.evaluate(async () => {
      try {
        const ws = await import('y-websocket');
        return {
          success: true,
          message: 'y-websocket import successful',
          exports: Object.keys(ws),
        };
      } catch (error) {
        return {
          success: false,
          message: 'y-websocket import failed',
          error: error.message,
        };
      }
    });

    console.log('Direct y-websocket import test:', websocketImportResult);

    const yjsProviderImportResult = await page.evaluate(async () => {
      try {
        const module = await import('/js/data/providers/YjsProvider.js');
        const provider = new module.YjsProvider();

        // Test basic functionality
        const cleanup = provider.init(null, { onReady: () => {} });
        const snapshot = provider.getSnapshot();
        provider.destroy();

        return {
          success: true,
          message: 'YjsProvider import and basic test successful',
          snapshot,
        };
      } catch (error) {
        return {
          success: false,
          message: 'YjsProvider import/test failed',
          error: error.message,
          stack: error.stack,
        };
      }
    });

    console.log('Direct YjsProvider import test:', yjsProviderImportResult);

    // Determine root cause
    if (!yjsImportResult.success) {
      console.log('🔍 ROOT CAUSE: Base Yjs library import fails in browser');
      console.log(
        '🔧 SOLUTION: Need to configure module resolution for browser environment',
      );
    } else if (!websocketImportResult.success) {
      console.log('🔍 ROOT CAUSE: y-websocket import fails in browser');
      console.log('🔧 SOLUTION: Need to configure WebSocket provider bundling');
    } else if (!yjsProviderImportResult.success) {
      console.log('🔍 ROOT CAUSE: YjsProvider implementation has issues');
      console.log('🔧 SOLUTION: Debug YjsProvider implementation');
    } else {
      console.log('✅ ALL IMPORTS WORKING: Ready to re-enable YjsProvider');
    }

    // For now, expect this test to reveal the issue
    // We'll update this once we fix the imports
    expect.soft(yjsImportResult.success).toBe(true);
  });
});
