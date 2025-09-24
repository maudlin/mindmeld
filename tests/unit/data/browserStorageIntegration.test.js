/**
 * Browser Storage Integration Tests
 *
 * Tests how browser compatibility affects data storage operations specifically.
 * These tests focus on the integration between browser detection and storage.
 */

import {
  saveNotesToStorage,
  loadNotesFromStorage,
} from '../../../src/js/data/canonicalStorage.js';

// Simple browser environment mocks for storage integration testing
const mockBrowserEnvironment = (config) => {
  // Mock navigator
  Object.defineProperty(global, 'navigator', {
    value: {
      userAgent: config.userAgent,
      vendor: config.vendor || '',
    },
    writable: true,
    configurable: true,
  });

  // Mock localStorage with browser-specific behavior
  const localStorage = {
    data: {},
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  };

  // Configure localStorage behavior based on browser config
  if (config.storageDisabled) {
    localStorage.setItem.mockImplementation(() => {
      throw new Error('localStorage is not supported');
    });
    localStorage.getItem.mockImplementation(() => {
      throw new Error('localStorage is not supported');
    });
  } else if (config.privateMode) {
    localStorage.setItem.mockImplementation((key, value) => {
      if (value.length > (config.quotaLimit || 1024)) {
        throw new Error('localStorage is disabled in private mode');
      }
      localStorage.data[key] = value;
    });
    localStorage.getItem.mockImplementation(
      (key) => localStorage.data[key] || null,
    );
  } else {
    // Normal behavior
    localStorage.setItem.mockImplementation((key, value) => {
      if (config.quotaLimit && value.length > config.quotaLimit) {
        const error = new Error('QuotaExceededError: Storage quota exceeded');
        error.name = 'QuotaExceededError';
        throw error;
      }
      localStorage.data[key] = value;
    });
    localStorage.getItem.mockImplementation(
      (key) => localStorage.data[key] || null,
    );
    localStorage.removeItem.mockImplementation((key) => {
      delete localStorage.data[key];
    });
    localStorage.clear.mockImplementation(() => {
      localStorage.data = {};
    });
  }

  Object.defineProperty(global, 'localStorage', {
    value: localStorage,
    writable: true,
    configurable: true,
  });

  return localStorage;
};

describe('Browser Storage Integration', () => {
  afterEach(() => {
    // Clean up mocks
    delete global.navigator;
    delete global.localStorage;
    jest.clearAllMocks();
  });

  describe('Supported Browsers', () => {
    it('should save and load normally in Chrome', () => {
      mockBrowserEnvironment({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        vendor: 'Google Inc.',
        storageDisabled: false,
      });

      const testNotes = [
        { id: 'test1', content: 'Chrome test content', position: [100, 200] },
      ];

      const saveResult = saveNotesToStorage(testNotes);
      expect(saveResult).toBe(true);

      const loadResult = loadNotesFromStorage();
      expect(loadResult.recovered).toBe(true);
      expect(loadResult.notes).toHaveLength(1);
      expect(loadResult.notes[0].content).toBe('Chrome test content');
    });

    it('should save and load normally in Safari', () => {
      mockBrowserEnvironment({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        vendor: 'Apple Computer, Inc.',
        storageDisabled: false,
      });

      const testNotes = [
        { id: 'test1', content: 'Safari test content', position: [100, 200] },
      ];

      const saveResult = saveNotesToStorage(testNotes);
      expect(saveResult).toBe(true);

      const loadResult = loadNotesFromStorage();
      expect(loadResult.recovered).toBe(true);
      expect(loadResult.notes).toHaveLength(1);
      expect(loadResult.notes[0].content).toBe('Safari test content');
    });
  });

  describe('Private/Incognito Mode Handling', () => {
    it('should handle Safari private mode limitations', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      mockBrowserEnvironment({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        vendor: 'Apple Computer, Inc.',
        privateMode: true,
        quotaLimit: 500, // Very small limit for private mode
      });

      // Small content should work
      const smallNotes = [{ id: 'small', content: 'Small', position: [0, 0] }];
      const smallResult = saveNotesToStorage(smallNotes);
      expect(smallResult).toBe(true);

      // Large content should fail
      const largeNotes = [
        { id: 'large', content: 'X'.repeat(1000), position: [100, 100] },
      ];
      const largeResult = saveNotesToStorage(largeNotes);
      expect(largeResult).toBe(false);

      // Should provide helpful error message with structured logging format
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] WARN: Failed to save to localStorage.*Safari Private Browsing mode/i),
      );

      consoleSpy.mockRestore();
    });

    it('should handle Chrome incognito mode quota limits', () => {
      mockBrowserEnvironment({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        vendor: 'Google Inc.',
        quotaLimit: 1000, // Simulate reduced quota
      });

      // Normal content should work
      const normalNotes = [
        { id: 'normal', content: 'Normal content', position: [0, 0] },
      ];
      const normalResult = saveNotesToStorage(normalNotes);
      expect(normalResult).toBe(true);

      // Content exceeding quota should fail gracefully
      const largeNotes = [
        { id: 'large', content: 'X'.repeat(2000), position: [100, 100] },
      ];
      const largeResult = saveNotesToStorage(largeNotes);
      expect(largeResult).toBe(false);
    });

    it('should handle Edge incognito mode quota limits', () => {
      mockBrowserEnvironment({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        vendor: '', // Empty vendor for Edge
        quotaLimit: 1000, // Simulate reduced quota
      });

      // Normal content should work
      const normalNotes = [
        { id: 'normal', content: 'Normal Edge content', position: [0, 0] },
      ];
      const normalResult = saveNotesToStorage(normalNotes);
      expect(normalResult).toBe(true);

      // Content exceeding quota should fail gracefully
      const largeNotes = [
        { id: 'large', content: 'X'.repeat(2000), position: [100, 100] },
      ];
      const largeResult = saveNotesToStorage(largeNotes);
      expect(largeResult).toBe(false);
    });
  });

  describe('Unsupported Browsers', () => {
    it('should fail gracefully in Firefox with helpful message', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      mockBrowserEnvironment({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/119.0',
        storageDisabled: true, // Simulating our decision to not support Firefox yet
      });

      const testNotes = [
        { id: 'test', content: 'Firefox test', position: [0, 0] },
      ];

      const saveResult = saveNotesToStorage(testNotes);
      expect(saveResult).toBe(false);

      const loadResult = loadNotesFromStorage();
      expect(loadResult.notes).toEqual([]);
      expect(loadResult.recovered).toBe(false);

      // Should provide helpful error message with structured logging format
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] WARN: Failed to save to localStorage.*Firefox is not yet fully supported/i),
      );

      consoleSpy.mockRestore();
    });

    it('should work normally in Edge (Chromium-based)', () => {
      mockBrowserEnvironment({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        vendor: '', // Edge has empty vendor like test environments
        storageDisabled: false, // Edge is now supported
      });

      const testNotes = [
        { id: 'test', content: 'Edge test', position: [0, 0] },
      ];

      const saveResult = saveNotesToStorage(testNotes);
      expect(saveResult).toBe(true);

      const loadResult = loadNotesFromStorage();
      expect(loadResult.recovered).toBe(true);
      expect(loadResult.notes).toHaveLength(1);
      expect(loadResult.notes[0].content).toBe('Edge test');
    });
  });

  describe('Error Recovery and Data Integrity', () => {
    it('should preserve existing data when new saves fail due to browser limitations', () => {
      const mockStorage = mockBrowserEnvironment({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        vendor: 'Apple Computer, Inc.',
        privateMode: false,
      });

      // Save some initial data successfully
      const initialNotes = [
        { id: 'existing', content: 'Existing content', position: [0, 0] },
      ];
      const initialResult = saveNotesToStorage(initialNotes);
      expect(initialResult).toBe(true);

      // Now simulate private mode kicking in (user switched to private)
      mockStorage.setItem.mockImplementation((key, value) => {
        if (value.length > 100) {
          // Simulate very restrictive private mode
          throw new Error('localStorage is disabled in private mode');
        }
        mockStorage.data[key] = value;
      });

      // Try to save additional data that would fail
      const largeNotes = [
        { id: 'large', content: 'X'.repeat(200), position: [100, 100] },
      ];
      const largeResult = saveNotesToStorage(largeNotes);
      expect(largeResult).toBe(false);

      // Original data should still be recoverable
      mockStorage.getItem.mockImplementation(
        (key) => mockStorage.data[key] || null,
      );
      const recovered = loadNotesFromStorage();
      expect(recovered.notes).toHaveLength(1);
      expect(recovered.notes[0].content).toBe('Existing content');
    });

    it('should maintain data format consistency across browser differences', () => {
      const testNotes = [
        {
          id: 'format-test',
          content: '# Header\n**Bold** text',
          position: [100, 200],
        },
      ];

      // Test Chrome
      mockBrowserEnvironment({
        userAgent: 'Chrome/120.0.0.0',
        vendor: 'Google Inc.',
      });
      saveNotesToStorage(testNotes);
      const chromeData = JSON.parse(localStorage.data['mindmeld-notes']);

      // Test Safari
      mockBrowserEnvironment({
        userAgent: 'Safari/605.1.15',
        vendor: 'Apple Computer, Inc.',
      });
      saveNotesToStorage(testNotes);
      const safariData = JSON.parse(localStorage.data['mindmeld-notes']);

      // Data structure should be identical
      expect(chromeData.version).toBe(safariData.version);
      expect(chromeData.notes).toEqual(safariData.notes);
      expect(chromeData.notes[0].content).toBe('# Header\n**Bold** text');
    });
  });

  describe('Storage Performance Across Browsers', () => {
    it('should maintain acceptable performance in supported browsers', () => {
      const browsers = [
        {
          userAgent: 'Chrome/120.0.0.0',
          vendor: 'Google Inc.',
          name: 'Chrome',
        },
        {
          userAgent: 'Safari/605.1.15',
          vendor: 'Apple Computer, Inc.',
          name: 'Safari',
        },
      ];

      browsers.forEach(({ userAgent, vendor, name }) => {
        mockBrowserEnvironment({ userAgent, vendor });

        const manyNotes = Array.from({ length: 50 }, (_, i) => ({
          id: `${name.toLowerCase()}-perf-${i}`,
          content: `${name} performance test ${i}`,
          position: [i * 10, i * 10],
        }));

        const startTime = performance.now();
        const result = saveNotesToStorage(manyNotes);
        const endTime = performance.now();

        expect(result).toBe(true);
        expect(endTime - startTime).toBeLessThan(1000); // Under 1 second
      });
    });
  });

  describe('Browser-Specific Error Messages', () => {
    it('should provide browser-specific error messages for storage failures', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Test different browser error scenarios
      const scenarios = [
        {
          browser: {
            userAgent: 'Firefox/119.0',
            storageDisabled: true,
          },
          expectedMessage: /Firefox is not yet fully supported/i,
          description: 'Firefox unsupported',
        },
        {
          browser: {
            userAgent: 'Safari/605.1.15',
            vendor: 'Apple Computer, Inc.',
            privateMode: true,
            quotaLimit: 100,
          },
          expectedMessage: /Safari Private Browsing mode/i,
          description: 'Safari private mode',
        },
      ];

      scenarios.forEach(({ browser, expectedMessage }) => {
        consoleSpy.mockClear();
        mockBrowserEnvironment(browser);

        const testNotes = [
          { id: 'test', content: 'X'.repeat(200), position: [0, 0] },
        ];

        const result = saveNotesToStorage(testNotes);
        expect(result).toBe(false);

        const calls = consoleSpy.mock.calls;
        const hasExpectedMessage = calls.some((call) =>
          call.some(
            (arg) => typeof arg === 'string' && expectedMessage.test(arg),
          ),
        );
        expect(hasExpectedMessage).toBe(true);
      });

      consoleSpy.mockRestore();
    });
  });
});
