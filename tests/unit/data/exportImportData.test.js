/**
 * Unit tests for export/import data transformation functions
 */

import { exportToJSON, importFromJSON, getCurrentState } from '../../../src/js/data/dataStore.js';
import { appState } from '../../../src/js/data/observableState.js';

// Mock dependencies
jest.mock('../../../src/js/data/observableState.js');
jest.mock('../../../src/js/services/noteService.js');
jest.mock('../../../src/js/utils/utils.js', () => ({
  log: jest.fn(),
  debounce: jest.fn(fn => fn),
  throttle: jest.fn(fn => fn),
  truncateNoteContent: jest.fn(content => content.substring(0, 100))
}));
jest.mock('../../../src/js/core/eventBus.js', () => ({
  eventBus: {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
  }
}));

describe('Export/Import Data Transformation', () => {
  let mockCanvas;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock canvas
    mockCanvas = document.createElement('div');
    mockCanvas.id = 'canvas';
    document.body.appendChild(mockCanvas);
    
    // Mock appState
    appState.getState = jest.fn();
    appState.setState = jest.fn();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('exportToJSON', () => {
    test('should export empty canvas correctly', () => {
      // Mock empty state
      appState.getState.mockReturnValue({
        notes: [],
        connections: [],
        zoomLevel: 5
      });

      const result = exportToJSON();
      const parsed = JSON.parse(result);

      expect(parsed).toEqual({
        data: {
          n: [],
          c: []
        }
      });
    });

    test('should export notes with correct format', () => {
      // Mock state with notes
      appState.getState.mockReturnValue({
        notes: [
          { id: '1', left: 100, top: 200, content: 'First note' },
          { id: '2', left: 300, top: 400, content: 'Second note' }
        ],
        connections: [],
        zoomLevel: 5
      });

      const result = exportToJSON();
      const parsed = JSON.parse(result);

      expect(parsed.data.n).toHaveLength(2);
      expect(parsed.data.n[0]).toEqual({
        i: '1',
        p: [100, 200],
        c: 'First note'
      });
      expect(parsed.data.n[1]).toEqual({
        i: '2',
        p: [300, 400],
        c: 'Second note'
      });
    });

    test('should export connections with correct format', () => {
      // Mock state with connections
      appState.getState.mockReturnValue({
        notes: [
          { id: '1', left: 100, top: 200, content: 'Note 1' },
          { id: '2', left: 300, top: 400, content: 'Note 2' }
        ],
        connections: [
          { startId: '1', endId: '2', type: 1 }
        ],
        zoomLevel: 5
      });

      const result = exportToJSON();
      const parsed = JSON.parse(result);

      expect(parsed.data.c).toHaveLength(1);
      expect(parsed.data.c[0]).toEqual(['1', '2', 1]);
    });

    test('should handle notes with long content', () => {
      const longContent = 'A'.repeat(200);
      
      appState.getState.mockReturnValue({
        notes: [
          { id: '1', left: 100, top: 200, content: longContent }
        ],
        connections: [],
        zoomLevel: 5
      });

      const result = exportToJSON();
      const parsed = JSON.parse(result);

      // Content should be truncated to 100 characters
      expect(parsed.data.n[0].c).toHaveLength(100);
    });

    test('should handle complex data structure', () => {
      appState.getState.mockReturnValue({
        notes: [
          { id: '1', left: 100, top: 200, content: 'Start' },
          { id: '2', left: 300, top: 400, content: 'Middle' },
          { id: '3', left: 500, top: 600, content: 'End' }
        ],
        connections: [
          { startId: '1', endId: '2', type: 1 },
          { startId: '2', endId: '3', type: 2 },
          { startId: '1', endId: '3', type: 3 }
        ],
        zoomLevel: 5
      });

      const result = exportToJSON();
      const parsed = JSON.parse(result);

      expect(parsed.data.n).toHaveLength(3);
      expect(parsed.data.c).toHaveLength(3);
      expect(parsed.data.c).toContain(['1', '2', 1]);
      expect(parsed.data.c).toContain(['2', '3', 2]);
      expect(parsed.data.c).toContain(['1', '3', 3]);
    });
  });

  describe('importFromJSON', () => {
    test('should import valid JSON correctly', () => {
      const testData = JSON.stringify({
        data: {
          n: [
            { i: '1', p: [100, 200], c: 'Imported note 1' },
            { i: '2', p: [300, 400], c: 'Imported note 2' }
          ],
          c: [['1', '2', 1]]
        }
      });

      // Mock clearAllNotesAndConnections and updateNotesAndConnections
      const mockClearAll = jest.fn();
      const mockUpdateAll = jest.fn();
      
      // We'll need to mock these functions as they're imported in dataStore.js
      // For now, we test that importFromJSON doesn't throw
      expect(() => {
        importFromJSON(testData, mockCanvas);
      }).not.toThrow();
    });

    test('should handle empty import data', () => {
      const testData = JSON.stringify({
        data: {
          n: [],
          c: []
        }
      });

      expect(() => {
        importFromJSON(testData, mockCanvas);
      }).not.toThrow();
    });

    test('should throw error for invalid JSON', () => {
      const invalidJson = 'not valid json';

      expect(() => {
        importFromJSON(invalidJson, mockCanvas);
      }).toThrow();
    });

    test('should throw error for missing data structure', () => {
      const invalidData = JSON.stringify({
        // Missing 'data' property
        notes: [],
        connections: []
      });

      expect(() => {
        importFromJSON(invalidData, mockCanvas);
      }).toThrow();
    });

    test('should handle malformed note data gracefully', () => {
      const malformedData = JSON.stringify({
        data: {
          n: [
            { i: '1', p: [100], c: 'Note with missing y coordinate' }, // Missing y in position
            { i: '2', p: [300, 400] }, // Missing content
            { p: [500, 600], c: 'Note without ID' } // Missing ID
          ],
          c: []
        }
      });

      // Should not throw, but may handle gracefully
      expect(() => {
        importFromJSON(malformedData, mockCanvas);
      }).not.toThrow();
    });

    test('should handle malformed connection data gracefully', () => {
      const malformedData = JSON.stringify({
        data: {
          n: [
            { i: '1', p: [100, 200], c: 'Note 1' },
            { i: '2', p: [300, 400], c: 'Note 2' }
          ],
          c: [
            ['1'], // Missing end ID and type
            ['1', '2'], // Missing type
            ['1', '2', 'invalid'], // Invalid type
            [1, 2, 1] // Numeric IDs instead of strings
          ]
        }
      });

      expect(() => {
        importFromJSON(malformedData, mockCanvas);
      }).not.toThrow();
    });
  });

  describe('Data Integrity', () => {
    test('should maintain data integrity through export/import cycle', () => {
      const originalState = {
        notes: [
          { id: '1', left: 150, top: 250, content: 'Test note 1' },
          { id: '2', left: 350, top: 450, content: 'Test note 2' }
        ],
        connections: [
          { startId: '1', endId: '2', type: 1 }
        ],
        zoomLevel: 5
      };

      // Mock the state for export
      appState.getState.mockReturnValue(originalState);

      // Export the data
      const exportedJson = exportToJSON();

      // Verify export format
      const exportedData = JSON.parse(exportedJson);
      expect(exportedData.data.n[0]).toEqual({
        i: '1',
        p: [150, 250],
        c: 'Test note 1'
      });
      expect(exportedData.data.c[0]).toEqual(['1', '2', 1]);

      // Test import (basic structure validation)
      expect(() => {
        importFromJSON(exportedJson, mockCanvas);
      }).not.toThrow();
    });

    test('should handle edge case positions', () => {
      const edgeCaseState = {
        notes: [
          { id: '1', left: 0, top: 0, content: 'Origin note' },
          { id: '2', left: -100, top: -200, content: 'Negative position' },
          { id: '3', left: 9999, top: 9999, content: 'Large position' }
        ],
        connections: [],
        zoomLevel: 5
      };

      appState.getState.mockReturnValue(edgeCaseState);

      const result = exportToJSON();
      const parsed = JSON.parse(result);

      expect(parsed.data.n[0].p).toEqual([0, 0]);
      expect(parsed.data.n[1].p).toEqual([-100, -200]);
      expect(parsed.data.n[2].p).toEqual([9999, 9999]);
    });

    test('should handle all connection types', () => {
      const connectionTypesState = {
        notes: [
          { id: '1', left: 100, top: 200, content: 'Note 1' },
          { id: '2', left: 300, top: 400, content: 'Note 2' },
          { id: '3', left: 500, top: 600, content: 'Note 3' },
          { id: '4', left: 700, top: 800, content: 'Note 4' }
        ],
        connections: [
          { startId: '1', endId: '2', type: 0 }, // Non-directional
          { startId: '2', endId: '3', type: 1 }, // From-to
          { startId: '3', endId: '4', type: 2 }, // To-from
          { startId: '4', endId: '1', type: 3 }  // Bidirectional
        ],
        zoomLevel: 5
      };

      appState.getState.mockReturnValue(connectionTypesState);

      const result = exportToJSON();
      const parsed = JSON.parse(result);

      expect(parsed.data.c).toContain(['1', '2', 0]);
      expect(parsed.data.c).toContain(['2', '3', 1]);
      expect(parsed.data.c).toContain(['3', '4', 2]);
      expect(parsed.data.c).toContain(['4', '1', 3]);
    });
  });
});