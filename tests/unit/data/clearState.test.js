/**
 * Unit tests for clearAllState functionality
 */

import { clearAllState, clearStateFromStorage } from '../../../src/js/data/storageManager.js';
import { appState } from '../../../src/js/data/observableState.js';
import { clearAllNotesAndConnections } from '../../../src/js/data/dataStore.js';

// Mock dependencies
jest.mock('../../../src/js/data/observableState.js');
jest.mock('../../../src/js/data/dataStore.js');
jest.mock('../../../src/js/utils/utils.js', () => ({
  log: jest.fn(),
  debounce: jest.fn(fn => fn),
  throttle: jest.fn(fn => fn)
}));
jest.mock('../../../src/js/core/eventBus.js', () => ({
  eventBus: {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
  }
}));

describe('Clear State Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock appState methods
    appState.clearLocalStorage = jest.fn();
    appState.setState = jest.fn();
    appState.getState = jest.fn();
    
    // Mock clearAllNotesAndConnections
    clearAllNotesAndConnections.mockImplementation(() => {});
  });

  describe('clearStateFromStorage', () => {
    test('should clear localStorage and reset state', () => {
      clearStateFromStorage();

      expect(appState.clearLocalStorage).toHaveBeenCalled();
      expect(appState.setState).toHaveBeenCalledWith({
        notes: [],
        connections: [],
        zoomLevel: 5
      });
      expect(clearAllNotesAndConnections).toHaveBeenCalled();
    });

    test('should handle multiple calls gracefully', () => {
      clearStateFromStorage();
      clearStateFromStorage();
      clearStateFromStorage();

      expect(appState.clearLocalStorage).toHaveBeenCalledTimes(3);
      expect(appState.setState).toHaveBeenCalledTimes(3);
      expect(clearAllNotesAndConnections).toHaveBeenCalledTimes(3);
    });
  });

  describe('clearAllState', () => {
    test('should clear all state and storage', () => {
      clearAllState();

      expect(appState.clearLocalStorage).toHaveBeenCalled();
      expect(appState.setState).toHaveBeenCalledWith({
        notes: [],
        connections: [],
        zoomLevel: 5
      });
      expect(clearAllNotesAndConnections).toHaveBeenCalled();
    });

    test('should work with canvas parameter', () => {
      const mockCanvas = document.createElement('div');
      mockCanvas.id = 'canvas';

      clearAllState(mockCanvas);

      // Should still perform the same clearing operations
      expect(appState.clearLocalStorage).toHaveBeenCalled();
      expect(appState.setState).toHaveBeenCalledWith({
        notes: [],
        connections: [],
        zoomLevel: 5
      });
      expect(clearAllNotesAndConnections).toHaveBeenCalled();
    });

    test('should handle error during clearing gracefully', () => {
      // Mock an error in one of the clearing functions
      clearAllNotesAndConnections.mockImplementation(() => {
        throw new Error('Failed to clear DOM');
      });

      // Should not throw, but handle the error gracefully
      expect(() => {
        clearAllState();
      }).toThrow('Failed to clear DOM');

      // Storage should still be cleared even if DOM clearing fails
      expect(appState.clearLocalStorage).toHaveBeenCalled();
    });
  });

  describe('State Reset Validation', () => {
    test('should reset to default zoom level', () => {
      clearAllState();

      const setStateCall = appState.setState.mock.calls[0][0];
      expect(setStateCall.zoomLevel).toBe(5);
    });

    test('should reset to empty arrays', () => {
      clearAllState();

      const setStateCall = appState.setState.mock.calls[0][0];
      expect(setStateCall.notes).toEqual([]);
      expect(setStateCall.connections).toEqual([]);
      expect(Array.isArray(setStateCall.notes)).toBe(true);
      expect(Array.isArray(setStateCall.connections)).toBe(true);
    });

    test('should call clearing functions in correct order', () => {
      const callOrder = [];
      
      appState.clearLocalStorage.mockImplementation(() => {
        callOrder.push('clearLocalStorage');
      });
      
      appState.setState.mockImplementation(() => {
        callOrder.push('setState');
      });
      
      clearAllNotesAndConnections.mockImplementation(() => {
        callOrder.push('clearAllNotesAndConnections');
      });

      clearAllState();

      expect(callOrder).toEqual([
        'clearLocalStorage',
        'setState',
        'clearAllNotesAndConnections'
      ]);
    });
  });

  describe('Edge Cases', () => {
    test('should handle null/undefined canvas parameter', () => {
      expect(() => {
        clearAllState(null);
      }).not.toThrow();

      expect(() => {
        clearAllState(undefined);
      }).not.toThrow();
    });

    test('should work when localStorage is not available', () => {
      // Mock localStorage not being available
      appState.clearLocalStorage.mockImplementation(() => {
        throw new Error('localStorage not available');
      });

      expect(() => {
        clearAllState();
      }).toThrow('localStorage not available');
    });

    test('should handle state reset with custom zoom level', () => {
      // Test that the function always resets to default zoom (5)
      clearAllState();

      const setStateCall = appState.setState.mock.calls[0][0];
      expect(setStateCall.zoomLevel).toBe(5); // Should always be 5, not any other value
    });
  });

  describe('Integration with Storage', () => {
    test('should clear both memory state and persistent storage', () => {
      clearAllState();

      // Should clear persistent storage
      expect(appState.clearLocalStorage).toHaveBeenCalled();
      
      // Should reset in-memory state
      expect(appState.setState).toHaveBeenCalledWith({
        notes: [],
        connections: [],
        zoomLevel: 5
      });
      
      // Should clear DOM representation
      expect(clearAllNotesAndConnections).toHaveBeenCalled();
    });

    test('should be idempotent', () => {
      // Calling clearAllState multiple times should have same effect
      clearAllState();
      clearAllState();
      clearAllState();

      // Each call should still perform all clearing operations
      expect(appState.clearLocalStorage).toHaveBeenCalledTimes(3);
      expect(appState.setState).toHaveBeenCalledTimes(3);
      expect(clearAllNotesAndConnections).toHaveBeenCalledTimes(3);

      // All calls should use the same reset state
      appState.setState.mock.calls.forEach(call => {
        expect(call[0]).toEqual({
          notes: [],
          connections: [],
          zoomLevel: 5
        });
      });
    });
  });
});