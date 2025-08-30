/**
 * Data Corruption Recovery Tests (MM-160 Priority 3)
 *
 * Comprehensive testing for data corruption scenarios and recovery mechanisms:
 * - Malformed JSON detection and recovery
 * - Partial write corruption handling
 * - Schema version mismatch recovery
 * - Invalid data type recovery
 * - Backup and rollback mechanisms
 * - Progressive corruption detection
 */

// Mock localStorage with corruption simulation capabilities
const createCorruptibleStorage = () => ({
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

  // Test utilities for corruption simulation
  corruptData(key, corruptionType) {
    const originalData = this.data[key];
    if (!originalData) return;

    switch (corruptionType) {
      case 'truncated-json':
        // Simulate incomplete write - cut off JSON mid-way
        this.data[key] = originalData.substring(0, originalData.length * 0.7);
        break;

      case 'invalid-json':
        // Corrupt JSON structure
        this.data[key] = originalData.replace(/"/g, "'").replace(/,/g, ';');
        break;

      case 'wrong-type':
        // Store wrong data type
        this.data[key] = 'not-json-at-all';
        break;

      case 'malformed-structure':
        // Valid JSON but wrong structure
        this.data[key] = '{"wrong": "structure", "completely": "different"}';
        break;

      case 'binary-data':
        // Simulate binary corruption
        this.data[key] = '\x00\x01\x02invalid\xff\xfe';
        break;

      case 'empty':
        this.data[key] = '';
        break;

      case 'null-bytes':
        // Inject null bytes
        this.data[key] = originalData.replace(/content/g, 'content\x00\x00');
        break;

      case 'unicode-corruption':
        // Invalid Unicode sequences
        this.data[key] = originalData + '\uFFFE\uFFFF';
        break;
    }
  },

  simulatePartialWrite(key, data, percentage = 0.5) {
    // Simulate incomplete write during storage operation
    const partialData = data.substring(0, Math.floor(data.length * percentage));
    this.data[key] = partialData;
  },

  createBackup(key) {
    if (this.data[key]) {
      this.data[`${key}-backup`] = this.data[key];
    }
  },

  restoreBackup(key) {
    const backupKey = `${key}-backup`;
    if (this.data[backupKey]) {
      this.data[key] = this.data[backupKey];
      delete this.data[backupKey];
    }
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

// Set up mock before imports
const mockStorage = createCorruptibleStorage();
Object.defineProperty(global, 'localStorage', {
  value: mockStorage,
  writable: true,
  configurable: true,
});

// Import after setting up mocks
import {
  saveNotesToStorage,
  loadNotesFromStorage,
  clearStorage,
  getStorageStats,
  validateAndCleanNotes,
  processNotesForStorage,
} from '../../../src/js/data/canonicalStorage.js';

describe('Data Corruption Recovery Tests', () => {
  beforeEach(() => {
    mockStorage.clear();
    jest.clearAllMocks();
  });

  describe('JSON Corruption Detection and Recovery', () => {
    it('should detect and recover from truncated JSON data', () => {
      // Save valid data first
      const validNotes = [
        { id: 'note1', content: 'Valid content', position: [100, 200] },
        { id: 'note2', content: 'More content', position: [300, 400] },
      ];

      const saveResult = saveNotesToStorage(validNotes);
      expect(saveResult).toBe(true);

      // Corrupt the stored data by truncation
      mockStorage.corruptData('mindmeld-notes', 'truncated-json');

      // Should handle corruption gracefully
      const recovered = loadNotesFromStorage();
      expect(recovered.recovered).toBe(false);
      expect(recovered.notes).toEqual([]);
    });

    it('should handle malformed JSON syntax errors', () => {
      // Save valid data
      const validNotes = [
        { id: 'syntax-test', content: 'Test content', position: [50, 50] },
      ];

      saveNotesToStorage(validNotes);

      // Introduce JSON syntax errors
      mockStorage.corruptData('mindmeld-notes', 'invalid-json');

      const recovered = loadNotesFromStorage();
      expect(recovered.recovered).toBe(false);
      expect(recovered.notes).toEqual([]);
    });

    it('should handle binary data corruption', () => {
      const validNotes = [
        { id: 'binary-test', content: 'Clean content', position: [75, 125] },
      ];

      saveNotesToStorage(validNotes);
      mockStorage.corruptData('mindmeld-notes', 'binary-data');

      const recovered = loadNotesFromStorage();
      expect(recovered.recovered).toBe(false);
      expect(recovered.notes).toEqual([]);
    });

    it('should handle empty or null storage corruption', () => {
      const validNotes = [
        {
          id: 'empty-test',
          content: 'Content before corruption',
          position: [200, 300],
        },
      ];

      saveNotesToStorage(validNotes);
      mockStorage.corruptData('mindmeld-notes', 'empty');

      const recovered = loadNotesFromStorage();
      expect(recovered.recovered).toBe(false);
      expect(recovered.notes).toEqual([]);
    });
  });

  describe('Data Structure Corruption Recovery', () => {
    it('should handle corrupted data structure with valid JSON', () => {
      const validNotes = [
        {
          id: 'structure-test',
          content: 'Valid structure',
          position: [150, 250],
        },
      ];

      saveNotesToStorage(validNotes);
      mockStorage.corruptData('mindmeld-notes', 'malformed-structure');

      const recovered = loadNotesFromStorage();
      expect(recovered.recovered).toBe(false);
      expect(recovered.notes).toEqual([]);
    });

    it('should clean and recover partially corrupted note data', () => {
      // Manually create corrupted but partially valid data
      const partiallyCorrupted = {
        version: '1.0.0-markdown',
        notes: [
          { id: 'valid', content: 'Good content', position: [100, 100] },
          {
            id: 'corrupted1',
            content: 'Bad content',
            position: 'invalid-position',
          }, // Bad position
          { invalid: 'structure' }, // Missing required fields
          { id: 'corrupted2', position: [200, 200] }, // Missing content
          { id: 'valid2', content: 'Another good one', position: [300, 300] },
        ],
      };

      mockStorage.setItem('mindmeld-notes', JSON.stringify(partiallyCorrupted));

      const recovered = loadNotesFromStorage();
      expect(recovered.recovered).toBe(true);
      expect(recovered.notes).toHaveLength(3); // Valid notes recovered, corrupted2 gets empty content
      expect(recovered.notes[0].id).toBe('valid');
      expect(recovered.notes[1].id).toBe('corrupted2'); // Has ID and position, content becomes ''
      expect(recovered.notes[1].content).toBe(''); // Missing content becomes empty string
      expect(recovered.notes[2].id).toBe('valid2');
    });

    it('should handle null and undefined values in note fields', () => {
      const corruptedData = {
        version: '1.0.0-markdown',
        notes: [
          { id: 'null-content', content: null, position: [100, 100] },
          { id: 'undefined-content', content: undefined, position: [200, 200] },
          { id: 'valid', content: 'Good content', position: [300, 300] },
        ],
      };

      mockStorage.setItem('mindmeld-notes', JSON.stringify(corruptedData));

      const recovered = loadNotesFromStorage();
      expect(recovered.recovered).toBe(true);
      expect(recovered.notes).toHaveLength(3); // All should be recovered
      expect(recovered.notes[0].content).toBe(''); // null converted to empty string
      expect(recovered.notes[1].content).toBe(''); // undefined converted to empty string
      expect(recovered.notes[2].content).toBe('Good content');
    });
  });

  describe('Progressive Corruption Detection', () => {
    it('should detect when storage becomes progressively corrupted', () => {
      // Start with valid data
      const initialNotes = [
        { id: 'initial', content: 'Initial content', position: [100, 100] },
      ];

      let result = saveNotesToStorage(initialNotes);
      expect(result).toBe(true);

      // Add more data successfully
      const moreNotes = [
        ...initialNotes,
        {
          id: 'additional',
          content: 'Additional content',
          position: [200, 200],
        },
      ];

      result = saveNotesToStorage(moreNotes);
      expect(result).toBe(true);

      // Simulate corruption happening
      mockStorage.corruptData('mindmeld-notes', 'truncated-json');

      // Should detect corruption and start fresh
      const newNotes = [
        { id: 'fresh-start', content: 'Starting over', position: [50, 50] },
      ];

      result = saveNotesToStorage(newNotes);
      expect(result).toBe(true);

      const recovered = loadNotesFromStorage();
      expect(recovered.recovered).toBe(true);
      expect(recovered.notes).toHaveLength(1);
      expect(recovered.notes[0].id).toBe('fresh-start');
    });

    it('should maintain data integrity checks during multiple operations', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Perform multiple save/load cycles with progressive corruption
      for (let i = 0; i < 5; i++) {
        const notes = [
          {
            id: `test-${i}`,
            content: `Content ${i}`,
            position: [i * 10, i * 20],
          },
        ];

        const saveResult = saveNotesToStorage(notes);
        expect(saveResult).toBe(true);

        const loadResult = loadNotesFromStorage();
        expect(loadResult.recovered).toBe(true);

        // Introduce corruption on iteration 3
        if (i === 2) {
          mockStorage.corruptData('mindmeld-notes', 'unicode-corruption');
        }
      }

      consoleSpy.mockRestore();
    });
  });

  describe('Recovery Mechanisms and Fallbacks', () => {
    it('should provide clear error information for debugging corruption', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const validNotes = [
        { id: 'debug-test', content: 'Debug content', position: [100, 200] },
      ];

      saveNotesToStorage(validNotes);
      mockStorage.corruptData('mindmeld-notes', 'invalid-json');

      loadNotesFromStorage();

      // Should log meaningful error information
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Failed to load from localStorage/i),
        expect.any(String),
      );

      consoleSpy.mockRestore();
    });

    it('should maintain system stability after multiple corruption events', () => {
      // Test multiple corruption types in sequence
      const corruptionTypes = [
        'truncated-json',
        'invalid-json',
        'wrong-type',
        'malformed-structure',
        'binary-data',
      ];

      corruptionTypes.forEach((corruptionType, index) => {
        const notes = [
          {
            id: `stability-${index}`,
            content: `Stable content ${index}`,
            position: [index * 50, index * 100],
          },
        ];

        // Save valid data
        let result = saveNotesToStorage(notes);
        expect(result).toBe(true);

        // Corrupt it
        mockStorage.corruptData('mindmeld-notes', corruptionType);

        // Should handle gracefully
        const recovered = loadNotesFromStorage();
        expect(recovered.recovered).toBe(false);
        expect(recovered.notes).toEqual([]);

        // Should be able to start fresh
        result = saveNotesToStorage(notes);
        expect(result).toBe(true);

        const finalCheck = loadNotesFromStorage();
        expect(finalCheck.recovered).toBe(true);
        expect(finalCheck.notes).toHaveLength(1);
      });
    });

    it('should handle corrupted data without memory leaks', () => {
      // Create many corruption scenarios to test memory handling
      for (let i = 0; i < 100; i++) {
        const notes = [
          { id: `memory-test-${i}`, content: `Content ${i}`, position: [i, i] },
        ];

        saveNotesToStorage(notes);

        // Randomly corrupt data
        const corruptionTypes = [
          'truncated-json',
          'invalid-json',
          'binary-data',
        ];
        const randomCorruption = corruptionTypes[i % corruptionTypes.length];
        mockStorage.corruptData('mindmeld-notes', randomCorruption);

        // Load and handle corruption
        loadNotesFromStorage();

        // Clear and start fresh
        clearStorage();
      }

      // Should not accumulate excessive function calls or data
      expect(mockStorage.getItem.mock.calls.length).toBeLessThan(500);
      expect(mockStorage.setItem.mock.calls.length).toBeLessThan(300);
    });
  });

  describe('Data Validation and Sanitization', () => {
    it('should validate and clean corrupted note arrays', () => {
      const mixedNotes = [
        { id: 'good1', content: 'Valid content', position: [100, 100] },
        null, // Invalid entry
        undefined, // Invalid entry
        { id: 'bad-position', content: 'Content', position: 'not-array' },
        { content: 'Missing ID', position: [200, 200] }, // No ID
        { id: 'good2', content: 'Another valid', position: [300, 300] },
        'not-an-object', // Invalid type
        {
          id: 'bad-content',
          content: ['array', 'content'],
          position: [400, 400],
        },
      ];

      const cleaned = validateAndCleanNotes(mixedNotes);
      expect(cleaned).toHaveLength(3); // Only valid notes
      expect(cleaned[0].id).toBe('good1');
      expect(cleaned[1].id).toBe('good2');
      expect(cleaned[2].id).toBe('bad-content');
      expect(cleaned[2].content).toBe('array,content'); // Array converted to string
    });

    it('should handle extreme corruption scenarios', () => {
      const extremeCorruption = [
        { id: '', content: '', position: [0, 0] }, // Empty ID - will be rejected
        { id: 'test', content: '\x00\x01\x02\xFF', position: [100, 100] }, // Binary content
        {
          id: 'unicode',
          content: '\uFFFE\uFFFF\uD800\uDC00',
          position: [200, 200],
        }, // Unicode issues
        { id: 'large', content: 'x'.repeat(50000), position: [300, 300] }, // Exceeds limit
      ];

      const processed = processNotesForStorage(extremeCorruption);
      expect(processed).toHaveLength(3); // Empty ID note is filtered out
      expect(processed[0].id).toBe('test');
      expect(processed[1].id).toBe('unicode');
      expect(processed[2].id).toBe('large');
      expect(processed[2].content.length).toBeLessThanOrEqual(10000); // Size limited
    });

    it('should maintain data integrity during concurrent corruption scenarios', async () => {
      // Simulate concurrent operations with corruption
      const operations = Array.from({ length: 10 }, (_, i) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            const notes = [
              {
                id: `concurrent-${i}`,
                content: `Content ${i}`,
                position: [i, i],
              },
            ];

            const saveResult = saveNotesToStorage(notes);

            // Randomly introduce corruption
            if (Math.random() > 0.5) {
              mockStorage.corruptData('mindmeld-notes', 'truncated-json');
            }

            const loadResult = loadNotesFromStorage();
            resolve({ saveResult, loadResult, index: i });
          }, Math.random() * 100);
        });
      });

      const results = await Promise.all(operations);

      // Verify all operations completed without throwing
      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(typeof result.saveResult).toBe('boolean');
        expect(typeof result.loadResult.recovered).toBe('boolean');
        expect(Array.isArray(result.loadResult.notes)).toBe(true);
      });
    });
  });

  describe('Storage Statistics and Monitoring', () => {
    it('should provide corruption detection in storage statistics', () => {
      // Create valid data
      const notes = [
        {
          id: 'stats-test',
          content: 'Statistics content',
          position: [100, 200],
        },
      ];

      saveNotesToStorage(notes);

      // Get baseline stats
      let stats = getStorageStats();
      expect(stats.hasData).toBe(true);
      expect(stats.noteCount).toBe(1);
      expect(stats.error).toBeUndefined();

      // Corrupt the data
      mockStorage.corruptData('mindmeld-notes', 'invalid-json');

      // Stats should detect corruption
      stats = getStorageStats();
      expect(stats.hasData).toBe(false);
      expect(stats.noteCount).toBe(0);
      expect(stats.error).toBeDefined();
    });

    it('should track recovery attempts and success rates', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Multiple recovery scenarios
      for (let i = 0; i < 5; i++) {
        const notes = [
          {
            id: `recovery-${i}`,
            content: `Recovery test ${i}`,
            position: [i * 10, i * 20],
          },
        ];

        saveNotesToStorage(notes);
        mockStorage.corruptData('mindmeld-notes', 'truncated-json');
        loadNotesFromStorage(); // This should log recovery attempt
      }

      // Should have logged multiple recovery attempts
      expect(consoleSpy.mock.calls.length).toBeGreaterThan(0);

      consoleSpy.mockRestore();
    });
  });
});
