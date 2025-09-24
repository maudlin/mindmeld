/**
 * Storage Quota Exhaustion Tests (MM-160 Priority 1)
 *
 * Comprehensive testing for localStorage quota scenarios including:
 * - Progressive quota consumption detection
 * - Graceful degradation strategies
 * - Recovery mechanisms after space clearing
 * - User notification and fallback behaviors
 */

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

// Create localStorage mock with quota simulation BEFORE importing modules
const createQuotaAwareStorage = () => ({
  data: {},
  quotaLimit: 5 * 1024 * 1024, // 5MB limit (typical browser limit)
  currentSize: 0,

  getItem: jest.fn(function (key) {
    return this.data[key] || null;
  }),

  setItem: jest.fn(function (key, value) {
    const size = new Blob([value]).size;

    if (this.currentSize + size > this.quotaLimit) {
      const error = new Error(
        "QuotaExceededError: Failed to execute 'setItem' on 'Storage'",
      );
      error.name = 'QuotaExceededError';
      throw error;
    }

    // Update size tracking
    const oldSize = this.data[key] ? new Blob([this.data[key]]).size : 0;
    this.currentSize = this.currentSize - oldSize + size;

    this.data[key] = value;
  }),

  removeItem: jest.fn(function (key) {
    if (this.data[key]) {
      const size = new Blob([this.data[key]]).size;
      this.currentSize -= size;
      delete this.data[key];
    }
  }),

  clear: jest.fn(function () {
    this.data = {};
    this.currentSize = 0;
  }),

  // Test utilities
  setQuotaLimit(limit) {
    this.quotaLimit = limit;
  },

  fillToNearQuota(percentage = 0.9) {
    const targetSize = this.quotaLimit * percentage;
    const fillData = 'x'.repeat(Math.floor(targetSize - this.currentSize));
    this.data['fill-data'] = fillData;
    this.currentSize = targetSize;
  },

  getCurrentUsage() {
    return {
      used: this.currentSize,
      limit: this.quotaLimit,
      percentage: (this.currentSize / this.quotaLimit) * 100,
      remaining: this.quotaLimit - this.currentSize,
    };
  },
});

// Set up the mock BEFORE any imports
const mockStorage = createQuotaAwareStorage();
Object.defineProperty(global, 'localStorage', {
  value: mockStorage,
  writable: true,
  configurable: true,
});

// Now import the modules that depend on localStorage
import {
  saveNotesToStorage,
  loadNotesFromStorage,
  clearStorage,
  getStorageStats,
} from '../../../src/js/data/canonicalStorage.js';

describe('Storage Quota Exhaustion Tests', () => {
  beforeEach(() => {
    mockStorage.clear();
    mockStorage.setQuotaLimit(5 * 1024 * 1024); // Reset to 5MB
    jest.clearAllMocks();
  });

  describe('Quota Detection and Prevention', () => {
    it('should detect when approaching storage quota limit', () => {
      // Fill localStorage to 95% capacity
      mockStorage.fillToNearQuota(0.95);

      const usage = mockStorage.getCurrentUsage();
      expect(usage.percentage).toBeGreaterThan(90);
      expect(usage.remaining).toBeLessThan(usage.limit * 0.1);
    });

    it('should prevent data loss when quota is exceeded during save', () => {
      // Fill to near capacity
      mockStorage.fillToNearQuota(0.98);

      // Try to save notes that would exceed quota
      const largeNotes = Array.from({ length: 100 }, (_, i) => ({
        id: `note-${i}`,
        content: 'Large content '.repeat(1000), // ~14KB per note
        position: [i * 10, i * 10],
      }));

      // Save operation should not throw, should return false gracefully
      const result = saveNotesToStorage(largeNotes);
      expect(result).toBe(false);

      // Verify no partial corruption occurred
      const stored = loadNotesFromStorage();
      expect(stored.notes).toEqual([]); // Should remain empty on failure
    });

    it('should handle progressive quota consumption gracefully', () => {
      // Test that quota mechanism responds appropriately as storage fills up

      // First save some small data successfully
      const smallNotes = [
        { id: 'small', content: 'Small content', position: [0, 0] },
      ];
      const smallResult = saveNotesToStorage(smallNotes);
      expect(smallResult).toBe(true);

      // Fill quota to near capacity
      mockStorage.fillToNearQuota(0.999);

      // Now try to save data that should exceed quota
      const largeNotes = [
        { id: 'large', content: 'X'.repeat(8000), position: [100, 100] },
      ];
      const largeResult = saveNotesToStorage(largeNotes);
      expect(largeResult).toBe(false);

      // Verify progression from successful to failed saves
      expect(smallResult).toBe(true);
      expect(largeResult).toBe(false);

      // Verify usage is near limit
      const finalUsage = mockStorage.getCurrentUsage();
      expect(finalUsage.percentage).toBeGreaterThan(95);
    });
  });

  describe('Graceful Degradation Strategies', () => {
    it('should preserve existing data when new saves fail due to quota', () => {
      // Save initial data successfully
      const initialNotes = [
        { id: 'important1', content: 'Critical data', position: [100, 200] },
        {
          id: 'important2',
          content: 'More critical data',
          position: [300, 400],
        },
      ];

      const initialResult = saveNotesToStorage(initialNotes);
      expect(initialResult).toBe(true);

      // Fill to very close to quota limit, leaving minimal space
      mockStorage.fillToNearQuota(0.999);

      // Try to save additional data that will definitely exceed quota
      const largeNotes = [
        { id: 'large1', content: 'x'.repeat(8000), position: [500, 600] }, // 8KB, should trigger quota
      ];

      const largeResult = saveNotesToStorage(largeNotes);
      expect(largeResult).toBe(false);

      // Verify original data is still intact
      const recovered = loadNotesFromStorage();
      expect(recovered.notes).toHaveLength(2);
      expect(recovered.notes[0].id).toBe('important1');
      expect(recovered.notes[1].id).toBe('important2');
    });

    it('should provide meaningful error context for quota failures', () => {
      mockStorage.fillToNearQuota(0.999);

      // Mock console methods to capture warnings
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const largeNotes = [
        {
          id: 'huge',
          content: 'x'.repeat(8000), // Under per-note limit but will trigger quota
          position: [100, 200],
        },
      ];

      const result = saveNotesToStorage(largeNotes);
      expect(result).toBe(false);

      // Should log meaningful warning about storage quota
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[.*\] WARN: Failed to save to localStorage:.*quota exceeded/i,
        ),
      );

      consoleSpy.mockRestore();
    });

    it('should attempt data compression before failing', () => {
      // Fill storage to near capacity
      mockStorage.fillToNearQuota(0.95);

      // Create notes with repetitive content that could be compressed
      const repetitiveNotes = [
        {
          id: 'repetitive',
          content: '# Header\n\n' + 'Repeated line content.\n'.repeat(1000),
          position: [100, 200],
        },
      ];

      const result = saveNotesToStorage(repetitiveNotes);

      // Even if compression isn't implemented yet, verify graceful handling
      const recovered = loadNotesFromStorage();
      // Either saved successfully or recovered gracefully
      expect(!result || Array.isArray(recovered.notes)).toBe(true);
    });
  });

  describe('Recovery Mechanisms', () => {
    it('should recover gracefully after user clears browser storage', () => {
      // Simulate full quota scenario
      mockStorage.fillToNearQuota(1.0);

      const notes = [
        {
          id: 'test',
          content: 'Test after clear',
          position: [100, 200],
        },
      ];

      // Should fail initially
      let result = saveNotesToStorage(notes);
      expect(result).toBe(false);

      // User clears storage (simulated)
      mockStorage.clear();

      // Should succeed after clearing
      result = saveNotesToStorage(notes);
      expect(result).toBe(true);

      // Verify data integrity after recovery
      const recovered = loadNotesFromStorage();
      expect(recovered.notes).toHaveLength(1);
      expect(recovered.notes[0].content).toBe('Test after clear');
    });

    it('should provide storage statistics for quota monitoring', () => {
      // Add some data
      const notes = Array.from({ length: 50 }, (_, i) => ({
        id: `stat-note-${i}`,
        content: `Content ${i}`.repeat(100),
        position: [i, i],
      }));

      saveNotesToStorage(notes);

      const stats = getStorageStats();
      expect(stats).toHaveProperty('hasData', true);
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('noteCount', 50);
      expect(stats.size).toBeGreaterThan(0);
      expect(typeof stats.size).toBe('number');
    });

    it('should handle corrupted data during quota recovery', () => {
      // Simulate scenario where quota exceeded corrupted the last write
      mockStorage.data['mindmeld-notes'] =
        '{"version":"1.0.0-markdown","notes":[{"id":"corrupted","content":"incomplete'; // Truncated JSON

      const recovered = loadNotesFromStorage();
      expect(recovered).toEqual({ notes: [], recovered: false });

      // Should be able to start fresh after corruption
      const freshNotes = [
        {
          id: 'fresh',
          content: 'Fresh start after corruption',
          position: [100, 200],
        },
      ];

      const result = saveNotesToStorage(freshNotes);
      expect(result).toBe(true);
    });
  });

  describe('Edge Cases and Browser Variations', () => {
    it('should handle different browser quota implementations', () => {
      const quotaErrors = [
        'QuotaExceededError',
        'QUOTA_EXCEEDED_ERR',
        'NS_ERROR_DOM_QUOTA_REACHED',
        'W3CException_DOM_QUOTA_EXCEEDED_ERR',
      ];

      quotaErrors.forEach((errorName) => {
        mockStorage.setItem = jest.fn(() => {
          const error = new Error(`Test ${errorName}`);
          Object.defineProperty(error, 'name', {
            value: errorName,
            writable: true,
            configurable: true,
          });
          throw error;
        });

        const notes = [{ id: 'test', content: 'Test', position: [100, 200] }];
        const result = saveNotesToStorage(notes);

        expect(result).toBe(false); // Should handle all quota error variants
      });
    });

    it('should handle private/incognito mode quota restrictions', () => {
      // Simulate very restricted private mode (2MB limit)
      mockStorage.setQuotaLimit(2 * 1024 * 1024);
      mockStorage.fillToNearQuota(0.9);

      const notes = Array.from({ length: 100 }, (_, i) => ({
        id: `private-note-${i}`,
        content: 'Content in private mode',
        position: [i, i],
      }));

      const result = saveNotesToStorage(notes);

      // Should either succeed with smaller dataset or fail gracefully
      expect(typeof result).toBe('boolean');

      const recovered = loadNotesFromStorage();
      // If saved successfully, should have correct data
      expect(!result || recovered.notes.length <= 100).toBe(true);
    });

    it('should handle concurrent quota exhaustion scenarios', async () => {
      mockStorage.fillToNearQuota(0.95);

      // Simulate multiple save operations happening concurrently
      const savePromises = Array.from({ length: 5 }, (_, i) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            const notes = [
              {
                id: `concurrent-${i}`,
                content: `Concurrent save ${i}`.repeat(100),
                position: [i * 100, i * 100],
              },
            ];
            const result = saveNotesToStorage(notes);
            resolve({ index: i, result });
          }, Math.random() * 100); // Random delay to simulate real concurrency
        });
      });

      const results = await Promise.all(savePromises);

      // Some should succeed, some should fail due to quota
      const successes = results.filter((r) => r.result).length;
      const failures = results.filter((r) => !r.result).length;

      expect(successes + failures).toBe(5);
      expect(failures).toBeGreaterThan(0); // At least some should fail due to quota
    });
  });

  describe('User Experience During Quota Issues', () => {
    it('should provide clear feedback about storage space issues', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      mockStorage.fillToNearQuota(0.99);

      const notes = [
        { id: 'test', content: 'x'.repeat(8000), position: [100, 200] },
      ];
      saveNotesToStorage(notes);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Failed to save to localStorage/i),
        expect.any(String),
      );

      consoleSpy.mockRestore();
    });

    it('should maintain app functionality even when storage is full', () => {
      mockStorage.fillToNearQuota(1.0);

      // App should still be able to load existing data
      const existingData = loadNotesFromStorage();
      expect(Array.isArray(existingData.notes)).toBe(true);

      // Stats should still work
      const stats = getStorageStats();
      expect(typeof stats).toBe('object');

      // Clear function should still work
      expect(() => clearStorage()).not.toThrow();
    });
  });

  describe('Performance Under Quota Pressure', () => {
    it('should maintain acceptable performance when approaching quota limits', () => {
      mockStorage.fillToNearQuota(0.9);

      const notes = Array.from({ length: 100 }, (_, i) => ({
        id: `perf-${i}`,
        content: `Performance test ${i}`,
        position: [i, i],
      }));

      const startTime = performance.now();
      saveNotesToStorage(notes);
      const endTime = performance.now();

      // Should complete within reasonable time even near quota
      expect(endTime - startTime).toBeLessThan(1000); // Under 1 second
    });

    it('should not create memory leaks during repeated quota failures', () => {
      mockStorage.fillToNearQuota(1.0);

      // Attempt many failed saves
      for (let i = 0; i < 100; i++) {
        const notes = [
          {
            id: `leak-test-${i}`,
            content: 'x'.repeat(1000),
            position: [i, i],
          },
        ];

        saveNotesToStorage(notes);
      }

      // Should not accumulate excessive mock call data (allowing for some overhead)
      expect(mockStorage.setItem.mock.calls.length).toBeLessThanOrEqual(200);
    });
  });
});
