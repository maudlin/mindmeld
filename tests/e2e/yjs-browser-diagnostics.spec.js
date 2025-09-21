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

    // Check for zero external dependencies behavior (direct imports should fail)
    const hasExpectedYjsFailure = results.includes(
      '✅ Expected: Direct Yjs import fails',
    );
    const hasExpectedWebSocketFailure = results.includes(
      '✅ Expected: Direct y-websocket import fails',
    );
    const hasYjsCompatSuccess = results.includes(
      '✅ YjsCompat layer import successful',
    );
    const hasWebSocketCompatSuccess = results.includes(
      '✅ WebSocket compatibility layer import successful',
    );
    const hasYjsProviderSuccess = results.includes(
      '✅ YjsProvider import successful',
    );
    const hasYjsProviderImportError = results.includes(
      '❌ YjsProvider test failed',
    );

    console.log('Zero External Dependencies Diagnostics:', {
      hasExpectedYjsFailure,
      hasExpectedWebSocketFailure,
      hasYjsCompatSuccess,
      hasWebSocketCompatSuccess,
      hasYjsProviderSuccess,
      hasYjsProviderImportError,
      allLogs: logs,
    });

    // Expect zero external dependencies architecture to work correctly
    expect.soft(hasExpectedYjsFailure).toBe(true);
    expect.soft(hasExpectedWebSocketFailure).toBe(true);
    expect.soft(hasYjsCompatSuccess).toBe(true);
    expect.soft(hasWebSocketCompatSuccess).toBe(true);
    expect.soft(hasYjsProviderSuccess).toBe(true);
    expect.soft(hasYjsProviderImportError).toBe(false);

    // Log diagnostic information
    if (
      !hasExpectedYjsFailure ||
      !hasExpectedWebSocketFailure ||
      !hasYjsCompatSuccess ||
      !hasWebSocketCompatSuccess ||
      hasYjsProviderImportError
    ) {
      console.log(
        '❌ DIAGNOSTIC: Zero external dependencies architecture not working correctly',
      );
      console.log('Next steps: Check YjsCompat layer implementation');
    } else {
      console.log(
        '✅ DIAGNOSTIC: Zero external dependencies architecture working correctly',
      );
      console.log(
        'YjsProvider successfully uses compatibility layer instead of external dependencies',
      );
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

    // Analyze zero external dependencies behavior
    if (
      !yjsImportResult.success &&
      !websocketImportResult.success &&
      yjsProviderImportResult.success
    ) {
      console.log(
        '✅ EXPECTED BEHAVIOR: Zero external dependencies architecture working correctly',
      );
      console.log(
        '🔧 Direct imports fail (expected), YjsProvider works via compatibility layer',
      );
    } else if (yjsImportResult.success || websocketImportResult.success) {
      console.log(
        '❌ UNEXPECTED: Direct imports should fail with zero dependencies approach',
      );
      console.log('🔧 SOLUTION: Check module resolution configuration');
    } else if (!yjsProviderImportResult.success) {
      console.log('🔍 ROOT CAUSE: YjsProvider implementation has issues');
      console.log('🔧 SOLUTION: Debug YjsProvider implementation');
    } else {
      console.log('✅ Zero external dependencies working correctly');
    }

    // Expect zero external dependencies behavior: direct imports fail, YjsProvider works
    expect.soft(yjsImportResult.success).toBe(false); // Direct import should fail
    expect.soft(websocketImportResult.success).toBe(false); // Direct import should fail
    expect.soft(yjsProviderImportResult.success).toBe(true); // YjsProvider should work
  });
});
