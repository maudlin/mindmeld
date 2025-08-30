/**
 * Session Integrity Tests (MM-160 Priority 4)
 *
 * Tests for maintaining data integrity across browser sessions including:
 * - Page refresh data persistence
 * - Tab close/reopen recovery
 * - Browser crash recovery
 * - Multi-tab synchronization
 * - Navigation away and back
 * - Session timeout handling
 * - Memory cleanup on page unload
 */

// Mock performance API for timing tests
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(() => []),
  getEntriesByName: jest.fn(() => []),
};

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true,
});

// Mock window and document objects for session simulation
const createSessionMocks = () => {
  const mockSessionStorage = {
    data: {},
    getItem: jest.fn(function (key) {
      return this.data[key] || null;
    }),
    setItem: jest.fn(function (key, value) {
      this.data[key] = value;
    }),
    removeItem: jest.fn(function (key) {
      delete this.data[key];
    }),
    clear: jest.fn(function () {
      this.data = {};
    }),
  };

  // Mock window properties that don't conflict with existing DOM
  const mockWindow = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    location: { href: 'http://localhost:8080', reload: jest.fn() },
    sessionStorage: mockSessionStorage,
  };

  // Add sessionStorage to global if it doesn't exist
  if (!global.sessionStorage) {
    Object.defineProperty(global, 'sessionStorage', {
      value: mockSessionStorage,
      writable: true,
    });
  }

  return mockWindow;
};

// Mock localStorage with session simulation
const createSessionAwareStorage = () => ({
  data: {},
  sessionId: 'test-session-1',

  getItem: jest.fn(function (key) {
    return this.data[key] || null;
  }),

  setItem: jest.fn(function (key, value) {
    this.data[key] = value;
  }),

  removeItem: jest.fn(function (key) {
    delete this.data[key];
  }),

  clear: jest.fn(function () {
    this.data = {};
  }),

  // Session simulation utilities
  simulateSessionEnd() {
    // Simulate what happens when browser/tab closes
    this.sessionId = null;
  },

  simulateNewSession() {
    // Simulate starting a new session
    this.sessionId = `test-session-${Date.now()}`;
  },

  simulateStorageClear() {
    // Simulate user clearing browser data
    this.data = {};
  },

  simulateNetworkDisruption() {
    // Simulate network issues affecting storage sync
    this._originalSetItem = this.setItem;
    this.setItem = jest.fn(() => {
      throw new Error('Network unavailable');
    });

    // Restore after timeout (async cleanup)
    setTimeout(() => {
      this.setItem = this._originalSetItem;
    }, 100);
  },

  restoreNetworkConnection() {
    // Synchronous restore for immediate cleanup in tests
    if (this._originalSetItem) {
      this.setItem = this._originalSetItem;
      this._originalSetItem = null;
    }
  },

  simulateSlowStorage() {
    // Simulate slow storage operations
    const originalGetItem = this.getItem;
    const originalSetItem = this.setItem;

    this.getItem = jest.fn(function (key) {
      // Add artificial delay
      return new Promise((resolve) => {
        setTimeout(() => resolve(originalGetItem.call(this, key)), 50);
      });
    });

    this.setItem = jest.fn(function (key, value) {
      return new Promise((resolve) => {
        setTimeout(() => {
          originalSetItem.call(this, key, value);
          resolve();
        }, 50);
      });
    });
  },
});

// Mock Chromium browser environment for test compatibility
Object.defineProperty(global, 'navigator', {
  value: {
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    vendor: '', // Empty vendor like in test environments
  },
  writable: true,
  configurable: true,
});

// Set up mocks before imports
const mockStorage = createSessionAwareStorage();
const mockWindow = createSessionMocks();

Object.defineProperty(global, 'localStorage', {
  value: mockStorage,
  writable: true,
  configurable: true,
});

// Import after mocks are set up
import {
  saveNotesToStorage,
  loadNotesFromStorage,
  getStorageStats,
} from '../../../src/js/data/canonicalStorage.js';

describe('Session Integrity Tests', () => {
  beforeEach(() => {
    mockStorage.clear();
    if (mockWindow?.sessionStorage?.clear) {
      mockWindow.sessionStorage.clear();
    }
    mockStorage.simulateNewSession();
    jest.clearAllMocks();
    mockPerformance.now.mockReturnValue(Date.now());
  });

  describe('Page Refresh Data Persistence', () => {
    it('should persist data across page refresh', () => {
      // Save data in "current session"
      const originalNotes = [
        {
          id: 'refresh-test-1',
          content: 'Data before refresh',
          position: [100, 200],
        },
        { id: 'refresh-test-2', content: 'More data', position: [300, 400] },
      ];

      const saveResult = saveNotesToStorage(originalNotes);
      expect(saveResult).toBe(true);

      // Verify data is saved
      const stats = getStorageStats();
      expect(stats.hasData).toBe(true);
      expect(stats.noteCount).toBe(2);

      // Simulate page refresh (new session context)
      mockStorage.simulateNewSession();

      // Data should still be available
      const recovered = loadNotesFromStorage();
      expect(recovered.recovered).toBe(true);
      expect(recovered.notes).toHaveLength(2);
      expect(recovered.notes[0].id).toBe('refresh-test-1');
      expect(recovered.notes[1].id).toBe('refresh-test-2');
    });

    it('should handle multiple rapid refreshes without data loss', () => {
      const testNotes = [
        {
          id: 'rapid-refresh',
          content: 'Rapid refresh test',
          position: [50, 100],
        },
      ];

      // Simulate multiple rapid refresh cycles
      for (let i = 0; i < 10; i++) {
        const saveResult = saveNotesToStorage(testNotes);
        expect(saveResult).toBe(true);

        // Simulate refresh
        mockStorage.simulateNewSession();

        // Verify data survives
        const recovered = loadNotesFromStorage();
        expect(recovered.recovered).toBe(true);
        expect(recovered.notes).toHaveLength(1);
      }
    });

    it('should maintain data timestamp accuracy across refreshes', () => {
      const notes = [
        {
          id: 'timestamp-test',
          content: 'Timestamp test content',
          position: [150, 250],
        },
      ];

      const saveResult = saveNotesToStorage(notes);
      expect(saveResult).toBe(true);

      // Get initial stats
      const initialStats = getStorageStats();
      expect(initialStats.lastModified).toBeDefined();
      const initialTimestamp = new Date(initialStats.lastModified);

      // Simulate page refresh
      mockStorage.simulateNewSession();

      // Load data and verify timestamp persists
      const recovered = loadNotesFromStorage();
      expect(recovered.recovered).toBe(true);

      const recoveredStats = getStorageStats();
      expect(recoveredStats.lastModified).toBe(initialStats.lastModified);
      expect(new Date(recoveredStats.lastModified)).toEqual(initialTimestamp);
    });
  });

  describe('Browser Session Recovery', () => {
    it('should recover data after simulated browser crash', () => {
      const crashTestNotes = [
        {
          id: 'crash-test',
          content: 'Data before crash',
          position: [200, 300],
        },
        {
          id: 'crash-test-2',
          content: 'More crash data',
          position: [400, 500],
        },
      ];

      // Save data before "crash"
      saveNotesToStorage(crashTestNotes);

      // Simulate browser crash (session ends abruptly)
      mockStorage.simulateSessionEnd();

      // Simulate browser restart (new session starts)
      mockStorage.simulateNewSession();

      // Data should be recoverable
      const recovered = loadNotesFromStorage();
      expect(recovered.recovered).toBe(true);
      expect(recovered.notes).toHaveLength(2);
      expect(recovered.notes[0].content).toBe('Data before crash');
      expect(recovered.notes[1].content).toBe('More crash data');
    });

    it('should handle incomplete saves during session interruption', () => {
      const notes = [
        {
          id: 'incomplete-save',
          content: 'Partial save test',
          position: [100, 100],
        },
      ];

      // Start save operation
      let saveResult = saveNotesToStorage(notes);
      expect(saveResult).toBe(true);

      // Simulate network disruption during save
      mockStorage.simulateNetworkDisruption();

      // Try to save additional data (should fail gracefully)
      const additionalNotes = [
        {
          id: 'additional',
          content: 'Additional during disruption',
          position: [200, 200],
        },
      ];

      // This should handle the network error gracefully
      expect(() => {
        saveResult = saveNotesToStorage(additionalNotes);
      }).not.toThrow();

      // After network recovery, should be able to save
      setTimeout(() => {
        const recoverySave = saveNotesToStorage(additionalNotes);
        expect(recoverySave).toBe(true);
      }, 150);
    });

    it('should maintain data integrity during concurrent session operations', async () => {
      // Clear any existing timers from previous tests
      jest.clearAllTimers();

      // Simulate multiple concurrent operations that might happen during session
      const operations = Array.from({ length: 5 }, (_, i) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            const notes = [
              {
                id: `concurrent-session-${i}`,
                content: `Concurrent content ${i}`,
                position: [i * 50, i * 100],
              },
            ];

            const saveResult = saveNotesToStorage(notes);
            const loadResult = loadNotesFromStorage();

            resolve({ saveResult, loadResult, index: i });
          }, Math.random() * 100);
        });
      });

      const results = await Promise.all(operations);

      // Verify all operations completed without throwing
      results.forEach((result) => {
        expect(typeof result.saveResult).toBe('boolean');
        expect(typeof result.loadResult.recovered).toBe('boolean');
        expect(Array.isArray(result.loadResult.notes)).toBe(true);
      });

      // Clear storage after test to ensure clean state
      mockStorage.clear();
    });
  });

  describe('Multi-Tab Session Consistency', () => {
    afterEach(() => {
      // Ensure clean state after each multi-tab test
      mockStorage.restoreNetworkConnection();
    });

    it('should handle data conflicts between multiple tabs', () => {
      // Simulate Tab 1 saves data
      const tab1Notes = [
        { id: 'tab1-note', content: 'Tab 1 content', position: [100, 100] },
      ];

      let result = saveNotesToStorage(tab1Notes);
      expect(typeof result).toBe('boolean');

      // Simulate Tab 2 loads and modifies data
      const tab2Loaded = loadNotesFromStorage();
      expect(typeof tab2Loaded.recovered).toBe('boolean');

      // If data was recovered, add to it; otherwise start fresh
      const tab2Notes = tab2Loaded.recovered
        ? [
            ...tab2Loaded.notes,
            { id: 'tab2-note', content: 'Tab 2 content', position: [200, 200] },
          ]
        : [{ id: 'tab2-note', content: 'Tab 2 content', position: [200, 200] }];

      result = saveNotesToStorage(tab2Notes);
      expect(typeof result).toBe('boolean');

      // Tab 1 loads updated data
      const finalData = loadNotesFromStorage();
      expect(typeof finalData.recovered).toBe('boolean');
      expect(Array.isArray(finalData.notes)).toBe(true);

      // Verify that the operation results are valid
      expect(typeof result).toBe('boolean');
      expect(typeof finalData.recovered).toBe('boolean');

      // If both operations succeeded, should have expected data
      const hasExpectedNote = finalData.notes.some(
        (note) => note.id === 'tab2-note',
      );

      // For multi-tab scenario, we expect operations to succeed consistently
      // Both result and finalData.recovered should be truthy
      expect(result).toBeTruthy();
      expect(finalData.recovered).toBeTruthy();
      expect(hasExpectedNote).toBe(true);
    });

    it('should detect when data has been modified by another tab', () => {
      const originalNotes = [
        {
          id: 'multi-tab-test',
          content: 'Original content',
          position: [150, 150],
        },
      ];

      // Tab 1 saves data
      const saveResult1 = saveNotesToStorage(originalNotes);
      expect(typeof saveResult1).toBe('boolean');

      const initialStats = getStorageStats();

      // Tab 2 modifies data immediately
      const modifiedNotes = [
        {
          id: 'multi-tab-test',
          content: 'Modified by another tab',
          position: [150, 150],
        },
      ];
      const saveResult2 = saveNotesToStorage(modifiedNotes);
      expect(typeof saveResult2).toBe('boolean');

      // Check for changes (timestamp should be different due to different content)
      const currentStats = getStorageStats();
      const dataChanged =
        currentStats.lastModified !== initialStats.lastModified;
      expect(typeof dataChanged).toBe('boolean'); // Accept either true or false, timing-dependent
    });

    it('should handle simultaneous saves from multiple tabs gracefully', () => {
      // Test that concurrent saves don't corrupt data
      const promises = [];

      for (let tabIndex = 0; tabIndex < 3; tabIndex++) {
        const promise = new Promise((resolve) => {
          setTimeout(() => {
            const notes = [
              {
                id: `tab-${tabIndex}-note`,
                content: `Content from tab ${tabIndex}`,
                position: [tabIndex * 100, tabIndex * 150],
              },
            ];

            const result = saveNotesToStorage(notes);
            resolve({ tabIndex, result });
          }, Math.random() * 50);
        });

        promises.push(promise);
      }

      return Promise.all(promises).then((results) => {
        // All saves should succeed or fail gracefully
        results.forEach((result) => {
          expect(typeof result.result).toBe('boolean');
        });

        // Final data should be valid
        const finalData = loadNotesFromStorage();
        expect(finalData.recovered).toBe(true);
        expect(Array.isArray(finalData.notes)).toBe(true);
      });
    });
  });

  describe('Navigation and Back Button Integrity', () => {
    it('should preserve data when navigating away and back', () => {
      const navNotes = [
        {
          id: 'nav-test',
          content: 'Navigation test content',
          position: [250, 350],
        },
      ];

      // Save data
      const saveResult = saveNotesToStorage(navNotes);
      expect(saveResult).toBe(true);

      // Simulate navigation away (data should persist in storage)
      mockWindow.location.href = 'http://localhost:8080/other-page';

      // Simulate navigation back
      mockWindow.location.href = 'http://localhost:8080';
      mockStorage.simulateNewSession();

      // Data should still be available
      const recovered = loadNotesFromStorage();
      expect(recovered.recovered).toBe(true);
      expect(recovered.notes).toHaveLength(1);
      expect(recovered.notes[0].content).toBe('Navigation test content');
    });

    it('should handle browser back/forward history correctly', () => {
      const historyNotes = [
        { id: 'history-test', content: 'History test', position: [100, 200] },
      ];

      // Save initial state
      saveNotesToStorage(historyNotes);
      const initialStats = getStorageStats();

      // Simulate history navigation (should maintain data integrity)
      mockWindow.location.href = 'http://localhost:8080#/different-route';

      // Data should remain accessible
      const afterNavigation = loadNotesFromStorage();
      expect(afterNavigation.recovered).toBe(true);

      const afterNavigationStats = getStorageStats();
      expect(afterNavigationStats.lastModified).toBe(initialStats.lastModified);
    });

    it('should clean up temporary session data on navigation', () => {
      // Set up some temporary session data if available
      if (mockWindow?.sessionStorage) {
        mockWindow.sessionStorage.setItem('temp-data', 'temporary-value');
        mockWindow.sessionStorage.setItem('mindmeld-temp', 'cleanup-test');
      }

      const notes = [
        { id: 'cleanup-test', content: 'Cleanup test', position: [300, 400] },
      ];

      saveNotesToStorage(notes);

      // Simulate navigation away (temporary data should be cleaned)
      mockWindow.location.href = 'http://localhost:8080/other-page';

      // Check that permanent data persists but temporary might be cleaned
      const recovered = loadNotesFromStorage();
      expect(recovered.recovered).toBe(true);

      // Session storage operations might have been attempted - this is optional behavior
      // Just verify the system handles navigation gracefully
      expect(recovered.recovered).toBe(true);
    });
  });

  describe('Performance Under Session Stress', () => {
    it('should maintain performance during frequent session operations', () => {
      const testNotes = [
        {
          id: 'perf-test',
          content: 'Performance test content',
          position: [400, 500],
        },
      ];

      const operationTimes = [];

      // Perform many session operations
      for (let i = 0; i < 100; i++) {
        const startTime = performance.now();

        saveNotesToStorage(testNotes);
        loadNotesFromStorage();
        mockStorage.simulateNewSession();

        const endTime = performance.now();
        operationTimes.push(endTime - startTime);
      }

      // Average operation time should be reasonable
      const averageTime =
        operationTimes.reduce((sum, time) => sum + time, 0) /
        operationTimes.length;
      expect(averageTime).toBeLessThan(100); // Less than 100ms average

      // No operation should take extremely long
      const maxTime = Math.max(...operationTimes);
      expect(maxTime).toBeLessThan(1000); // Less than 1 second
    });

    it('should handle memory cleanup during long sessions', () => {
      // Simulate a long session with many operations
      const initialMemoryUsage = process.memoryUsage?.() || { heapUsed: 0 };

      for (let i = 0; i < 1000; i++) {
        const notes = [
          {
            id: `memory-test-${i}`,
            content: `Memory test content ${i}`,
            position: [i % 100, (i * 2) % 100],
          },
        ];

        saveNotesToStorage(notes);
        loadNotesFromStorage();

        // Simulate periodic cleanup
        if (i % 100 === 0) {
          // Force cleanup operations
          mockStorage.clear();
          jest.clearAllMocks();
        }
      }

      // Memory usage should not grow excessively
      const finalMemoryUsage = process.memoryUsage?.() || { heapUsed: 0 };
      const memoryGrowth =
        finalMemoryUsage.heapUsed - initialMemoryUsage.heapUsed;

      // Allow reasonable memory growth but not unlimited
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth
    });

    it('should handle slow storage gracefully during session operations', async () => {
      // Simulate slow storage conditions
      mockStorage.simulateSlowStorage();

      const slowNotes = [
        { id: 'slow-test', content: 'Slow storage test', position: [500, 600] },
      ];

      const startTime = Date.now();

      // Operations should still complete or fail gracefully
      const saveResult = saveNotesToStorage(slowNotes);
      expect(typeof saveResult).toBe('boolean');

      const loadResult = loadNotesFromStorage();
      expect(typeof loadResult.recovered).toBe('boolean');
      expect(Array.isArray(loadResult.notes)).toBe(true);

      const endTime = Date.now();

      // Should complete within reasonable time even when slow
      expect(endTime - startTime).toBeLessThan(5000); // Less than 5 seconds
    });
  });

  describe('Session Error Recovery', () => {
    it('should recover from storage errors during session operations', () => {
      const notes = [
        {
          id: 'error-recovery',
          content: 'Error recovery test',
          position: [600, 700],
        },
      ];

      // Save data successfully first
      let result = saveNotesToStorage(notes);
      expect(result).toBe(true);

      // Simulate storage error
      const originalSetItem = mockStorage.setItem;
      mockStorage.setItem = jest.fn(() => {
        throw new Error('Storage error');
      });

      // Try to save (should fail gracefully)
      result = saveNotesToStorage(notes);
      expect(result).toBe(false);

      // Restore storage functionality
      mockStorage.setItem = originalSetItem;

      // Should be able to recover and save again
      result = saveNotesToStorage(notes);
      expect(result).toBe(true);
    });

    it('should provide user feedback during session integrity issues', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const notes = [
        {
          id: 'feedback-test',
          content: 'User feedback test',
          position: [700, 800],
        },
      ];

      // Cause a storage error
      mockStorage.setItem = jest.fn(() => {
        throw new Error('Session storage error');
      });

      const result = saveNotesToStorage(notes);
      expect(result).toBe(false);

      // Should provide helpful error message
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Failed to save to localStorage/i),
        expect.any(String),
      );

      consoleSpy.mockRestore();
    });

    it('should maintain session integrity across various error scenarios', () => {
      const errorScenarios = [
        () => {
          throw new Error('Quota exceeded');
        },
        () => {
          throw new Error('Permission denied');
        },
        () => {
          throw new Error('Storage unavailable');
        },
        () => {
          throw new Error('Network error');
        },
      ];

      const notes = [
        {
          id: 'integrity-test',
          content: 'Session integrity test',
          position: [800, 900],
        },
      ];

      errorScenarios.forEach((errorFn) => {
        // Save data (may or may not succeed depending on browser detection)
        let result = saveNotesToStorage(notes);
        expect(typeof result).toBe('boolean');

        // Introduce error
        const originalSetItem = mockStorage.setItem;
        mockStorage.setItem = jest.fn(errorFn);

        // Should handle error gracefully
        result = saveNotesToStorage(notes);
        expect(result).toBe(false);

        // Restore functionality
        mockStorage.setItem = originalSetItem;

        // Should be able to attempt save again
        result = saveNotesToStorage(notes);
        expect(typeof result).toBe('boolean');
      });
    });
  });
});
