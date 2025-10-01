/**
 * Unit tests for PersistenceService - Clean architecture state persistence
 */

import {
  PersistenceService,
  persistenceService,
} from '../../../src/js/services/PersistenceService.js';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
});

// Mock logger
jest.mock('../../../src/js/services/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('PersistenceService', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PersistenceService();
  });

  describe('Construction', () => {
    test('should create with default state', () => {
      const state = service.getState();

      expect(state).toEqual({
        notes: [],
        connections: [],
        zoomLevel: 5,
        canvasType: 'Standard Canvas',
        colorState: {
          currentColor: 'yellow',
          notes: {},
        },
        metadata: {
          title: 'Untitled Map',
        },
      });
      expect(service.isInitialized).toBe(false);
    });
  });

  describe('initialize()', () => {
    test('should initialize with default state when no storage exists', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const loaded = service.initialize();

      expect(loaded).toBe(false);
      expect(service.isInitialized).toBe(true);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('mindmeld_state');
    });

    test('should load existing state from storage', () => {
      const storedState = {
        notes: [{ id: '1', content: 'Test', left: '100px', top: '200px' }],
        connections: [],
        zoomLevel: 3,
        canvasType: 'Standard Canvas',
        colorState: { currentColor: 'blue', notes: {} },
      };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedState));

      const loaded = service.initialize();

      expect(loaded).toBe(true);
      expect(service.isInitialized).toBe(true);

      const state = service.getState();
      expect(state.notes).toHaveLength(1);
      expect(state.zoomLevel).toBe(3);
      expect(state.colorState.currentColor).toBe('blue');
    });

    test('should handle corrupted storage gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json');

      const loaded = service.initialize();

      expect(loaded).toBe(false);
      expect(service.isInitialized).toBe(true);
    });

    test('should not reinitialize if already initialized', () => {
      service.initialize();
      const firstCall = mockLocalStorage.getItem.mock.calls.length;

      service.initialize();

      expect(mockLocalStorage.getItem).toHaveBeenCalledTimes(firstCall); // No additional calls
    });
  });

  describe('setState()', () => {
    beforeEach(() => {
      service.initialize();
    });

    test('should update state and save by default', () => {
      const newState = {
        notes: [{ id: '1', content: 'New note' }],
        zoomLevel: 7,
      };

      service.setState(newState);

      const state = service.getState();
      expect(state.notes).toEqual(newState.notes);
      expect(state.zoomLevel).toBe(7);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    test('should not save when silent option is true', () => {
      const newState = { zoomLevel: 10 };

      service.setState(newState, { silent: true });

      expect(service.getState().zoomLevel).toBe(10);
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('clear()', () => {
    beforeEach(() => {
      service.initialize();
      // Set some state first
      service.setState({
        notes: [{ id: '1', content: 'Test' }],
        zoomLevel: 8,
      });
    });

    test('should reset to default state', () => {
      service.clear();

      const state = service.getState();
      expect(state.notes).toEqual([]);
      expect(state.connections).toEqual([]);
      expect(state.zoomLevel).toBe(5);
      expect(state.colorState).toEqual({
        currentColor: 'yellow',
        notes: {},
      });
    });

    test('should remove from localStorage', () => {
      service.clear();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
        'mindmeld_state',
      );
    });

    test('should return true on successful clear', () => {
      const result = service.clear();

      expect(result).toBe(true);
    });

    test('should handle localStorage errors gracefully', () => {
      mockLocalStorage.removeItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const result = service.clear();

      expect(result).toBe(false);
    });
  });

  describe('hasPersistedState()', () => {
    test('should return true when storage has data', () => {
      mockLocalStorage.getItem.mockReturnValue('{"notes":[]}');

      expect(service.hasPersistedState()).toBe(true);
    });

    test('should return false when storage is empty', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      expect(service.hasPersistedState()).toBe(false);
    });
  });

  describe('autosave', () => {
    beforeEach(() => {
      service.initialize();
    });

    test('should save immediately by default', () => {
      service.setState({ zoomLevel: 6 });

      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    test('should not save when autosave is disabled', () => {
      service.disableAutosave();
      service.setState({ zoomLevel: 6 });

      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    test('should resume saving when autosave is re-enabled', () => {
      service.disableAutosave();
      service.setState({ zoomLevel: 6 });
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();

      service.enableAutosave();
      service.setState({ zoomLevel: 7 });

      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('singleton instance', () => {
    test('should export a singleton instance', () => {
      expect(persistenceService).toBeInstanceOf(PersistenceService);
    });

    test('should maintain state across singleton access', () => {
      persistenceService.initialize();
      persistenceService.setState({ zoomLevel: 9 });

      expect(persistenceService.getState().zoomLevel).toBe(9);
    });
  });

  describe('getStats()', () => {
    test('should return storage statistics', () => {
      mockLocalStorage.getItem.mockReturnValue('{"test": "data"}');
      service.initialize();

      const stats = service.getStats();

      expect(stats).toHaveProperty('hasStorage');
      expect(stats).toHaveProperty('storageSize');
      expect(stats).toHaveProperty('memoryNoteCount');
      expect(stats).toHaveProperty('autosaveEnabled');
      expect(stats).toHaveProperty('isInitialized');
    });
  });

  describe('note and connection specific methods', () => {
    beforeEach(() => {
      service.initialize();
    });

    test('setNotes() should update notes array', () => {
      const notes = [
        { id: '1', content: 'Note 1' },
        { id: '2', content: 'Note 2' },
      ];

      service.setNotes(notes);

      expect(service.getState().notes).toEqual(notes);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    test('setConnections() should update connections array', () => {
      const connections = [{ from: '1', to: '2', type: 'bi' }];

      service.setConnections(connections);

      expect(service.getState().connections).toEqual(connections);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    test('setColorState() should update color state', () => {
      const colorState = {
        currentColor: 'blue',
        notes: { 1: { colorScheme: 'blue' } },
      };

      service.setColorState(colorState);

      expect(service.getState().colorState).toEqual(colorState);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });
  });
});
