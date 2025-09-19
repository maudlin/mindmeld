// tests/unit/services/mapSafetyService.test.js

describe('MapSafetyService', () => {
  let MapSafetyService;
  let mockServerClient;
  let mockNotificationManager;
  let mockEventBus;

  beforeEach(async () => {
    // Reset modules
    jest.resetModules();

    // Create comprehensive mocks
    mockServerClient = {
      autoSaveEnabled: true,
      currentMapId: 'test-map-123',
      currentMapName: 'Test Map Name',
      currentETag: 'test-etag',
      lastSaveTime: Date.now() - 5000, // 5 seconds ago
      lastEditTime: Date.now() - 2000, // 2 seconds ago (more recent = unsaved)
      saveState: jest.fn().mockResolvedValue(true),
      forceSave: jest.fn().mockResolvedValue(true),
      getConnectionStatus: jest.fn().mockReturnValue({
        isConnected: true,
        status: 'connected',
      }),
      getCurrentMapName: jest.fn().mockReturnValue('Test Map Name'),
    };

    // Note: getCurrentMapName is now a static method on ServerClient, not MenuBehavior

    mockNotificationManager = {
      confirm: jest.fn().mockResolvedValue(true),
    };

    mockEventBus = {
      emit: jest.fn(),
      on: jest.fn(),
    };

    // Mock dependencies
    jest.doMock('../../../src/js/services/serverClient.js', () => ({
      ServerClient: mockServerClient,
    }));

    // MenuBehavior no longer needed - getCurrentMapName moved to ServerClient

    jest.doMock('../../../src/js/services/notificationManager.js', () => ({
      notificationManager: mockNotificationManager,
    }));

    jest.doMock('../../../src/js/core/eventBus.js', () => ({
      eventBus: mockEventBus,
    }));

    jest.doMock('../../../src/js/utils/utils.js', () => ({
      log: jest.fn(),
    }));

    // Import the service under test
    const module = await import('../../../src/js/services/mapSafetyService.js');
    MapSafetyService = module.MapSafetyService;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('hasUnsavedChanges()', () => {
    it('should return true when lastEditTime is more recent than lastSaveTime', () => {
      const lastEditTime = Date.now();
      const lastSaveTime = Date.now() - 5000;

      const result = MapSafetyService.hasUnsavedChanges(
        lastEditTime,
        lastSaveTime,
      );

      expect(result).toBe(true);
    });

    it('should return false when lastSaveTime is more recent than lastEditTime', () => {
      const lastEditTime = Date.now() - 5000;
      const lastSaveTime = Date.now();

      const result = MapSafetyService.hasUnsavedChanges(
        lastEditTime,
        lastSaveTime,
      );

      expect(result).toBe(false);
    });

    it('should return false when timestamps are equal', () => {
      const now = Date.now();

      const result = MapSafetyService.hasUnsavedChanges(now, now);

      expect(result).toBe(false);
    });

    it('should return false when timestamps are not set', () => {
      const result = MapSafetyService.hasUnsavedChanges(null, null);

      expect(result).toBe(false);
    });
  });

  describe('getCurrentMapContext()', () => {
    it('should return complete map context when connected', () => {
      const contextData = {
        mapId: 'test-map-123',
        mapName: 'Test Map Name',
        lastEditTime: Date.now(),
        lastSaveTime: Date.now() - 5000,
        isConnected: true,
      };

      const result = MapSafetyService.getCurrentMapContext(contextData);

      expect(result).toEqual({
        mapId: 'test-map-123',
        mapName: 'Test Map Name',
        hasUnsavedChanges: true, // EditTime more recent than SaveTime
        isConnected: true,
      });
    });

    it('should return "Untitled Map" when no map name available', () => {
      const contextData = {
        mapId: 'test-map-123',
        mapName: null,
        lastEditTime: Date.now(),
        lastSaveTime: Date.now(),
        isConnected: true,
      };

      const result = MapSafetyService.getCurrentMapContext(contextData);

      expect(result.mapName).toBe('Untitled Map');
    });

    it('should handle disconnected state', () => {
      const contextData = {
        mapId: 'test-map-123',
        mapName: 'Test Map Name',
        lastEditTime: Date.now(),
        lastSaveTime: Date.now(),
        isConnected: false,
      };

      const result = MapSafetyService.getCurrentMapContext(contextData);

      expect(result.isConnected).toBe(false);
    });

    it('should handle null mapId', () => {
      const contextData = {
        mapId: null,
        mapName: 'Test Map Name',
        lastEditTime: Date.now(),
        lastSaveTime: Date.now(),
        isConnected: true,
      };

      const result = MapSafetyService.getCurrentMapContext(contextData);

      expect(result.mapId).toBe(null);
    });
  });

  describe('ensureCurrentMapSaved()', () => {
    it('should call forceSave when auto-save enabled and has unsaved changes', async () => {
      const mockForceSave = jest.fn().mockResolvedValue(true);
      const lastEditTime = Date.now();
      const lastSaveTime = Date.now() - 5000;

      const result = await MapSafetyService.ensureCurrentMapSaved(
        mockForceSave,
        true, // autoSaveEnabled
        lastEditTime,
        lastSaveTime,
      );

      expect(mockForceSave).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return true when no unsaved changes exist', async () => {
      const mockForceSave = jest.fn();
      const lastEditTime = Date.now() - 5000;
      const lastSaveTime = Date.now();

      const result = await MapSafetyService.ensureCurrentMapSaved(
        mockForceSave,
        true, // autoSaveEnabled
        lastEditTime,
        lastSaveTime,
      );

      expect(mockForceSave).not.toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return true when auto-save is disabled', async () => {
      const mockForceSave = jest.fn();
      const lastEditTime = Date.now();
      const lastSaveTime = Date.now() - 5000;

      const result = await MapSafetyService.ensureCurrentMapSaved(
        mockForceSave,
        false, // autoSaveEnabled
        lastEditTime,
        lastSaveTime,
      );

      expect(mockForceSave).not.toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle forceSave failure gracefully', async () => {
      const mockForceSave = jest.fn().mockResolvedValue(false);
      const lastEditTime = Date.now();
      const lastSaveTime = Date.now() - 5000;

      const result = await MapSafetyService.ensureCurrentMapSaved(
        mockForceSave,
        true, // autoSaveEnabled
        lastEditTime,
        lastSaveTime,
      );

      expect(result).toBe(false);
    });

    it('should handle forceSave rejection gracefully', async () => {
      const mockForceSave = jest
        .fn()
        .mockRejectedValue(new Error('Save failed'));
      const lastEditTime = Date.now();
      const lastSaveTime = Date.now() - 5000;

      const result = await MapSafetyService.ensureCurrentMapSaved(
        mockForceSave,
        true, // autoSaveEnabled
        lastEditTime,
        lastSaveTime,
      );

      expect(result).toBe(false);
    });
  });

  describe('confirmMapOperation()', () => {
    it('should show correct message for new-map operation', async () => {
      const contextData = {
        mapId: 'test-map-123',
        mapName: 'Test Map Name',
        lastEditTime: Date.now(),
        lastSaveTime: Date.now(),
        isConnected: true,
      };

      await MapSafetyService.confirmMapOperation(
        'new-map',
        contextData,
        'New Project Map',
      );

      expect(mockNotificationManager.confirm).toHaveBeenCalledWith(
        'Create new map "New Project Map"? Current work will be saved as "Test Map Name".',
      );
    });

    it('should show correct message for load-map operation', async () => {
      const contextData = {
        mapId: 'test-map-123',
        mapName: 'Test Map Name',
        lastEditTime: Date.now(),
        lastSaveTime: Date.now(),
        isConnected: true,
      };

      await MapSafetyService.confirmMapOperation(
        'load-map',
        contextData,
        'Existing Map',
      );

      expect(mockNotificationManager.confirm).toHaveBeenCalledWith(
        'Load "Existing Map"? Current map "Test Map Name" will be saved first.',
      );
    });

    it('should show correct message for clear-canvas operation', async () => {
      const contextData = {
        mapId: 'test-map-123',
        mapName: 'Test Map Name',
        lastEditTime: Date.now(),
        lastSaveTime: Date.now(),
        isConnected: true,
      };

      await MapSafetyService.confirmMapOperation('clear-canvas', contextData);

      expect(mockNotificationManager.confirm).toHaveBeenCalledWith(
        'Clear all content from "Test Map Name"? This cannot be undone.',
      );
    });

    it('should return confirmation result', async () => {
      mockNotificationManager.confirm.mockResolvedValue(false);

      const contextData = {
        mapId: 'test-map-123',
        mapName: 'Test Map Name',
        lastEditTime: Date.now(),
        lastSaveTime: Date.now(),
        isConnected: true,
      };

      const result = await MapSafetyService.confirmMapOperation(
        'new-map',
        contextData,
        'Test',
      );

      expect(result).toBe(false);
    });

    it('should handle unknown operation gracefully', async () => {
      const contextData = {
        mapId: 'test-map-123',
        mapName: 'Test Map Name',
        lastEditTime: Date.now(),
        lastSaveTime: Date.now(),
        isConnected: true,
      };

      await MapSafetyService.confirmMapOperation(
        'unknown-operation',
        contextData,
      );

      expect(mockNotificationManager.confirm).toHaveBeenCalledWith(
        'Perform unknown-operation? Current map "Test Map Name" may be affected.',
      );
    });

    it('should handle null newMapName for load-map', async () => {
      const contextData = {
        mapId: 'test-map-123',
        mapName: 'Test Map Name',
        lastEditTime: Date.now(),
        lastSaveTime: Date.now(),
        isConnected: true,
      };

      await MapSafetyService.confirmMapOperation('load-map', contextData, null);

      expect(mockNotificationManager.confirm).toHaveBeenCalledWith(
        'Load "Unknown Map"? Current map "Test Map Name" will be saved first.',
      );
    });

    it('should use "Untitled Map" when current map has no name', async () => {
      const contextData = {
        mapId: 'test-map-123',
        mapName: null, // No map name
        lastEditTime: Date.now(),
        lastSaveTime: Date.now(),
        isConnected: true,
      };

      await MapSafetyService.confirmMapOperation('clear-canvas', contextData);

      expect(mockNotificationManager.confirm).toHaveBeenCalledWith(
        'Clear all content from "Untitled Map"? This cannot be undone.',
      );
    });
  });

  describe('initialization and event handling', () => {
    it('should set up event listeners for change tracking', () => {
      MapSafetyService.initialize();

      expect(mockEventBus.on).toHaveBeenCalledWith(
        'note.created',
        expect.any(Function),
      );
      expect(mockEventBus.on).toHaveBeenCalledWith(
        'note.updated',
        expect.any(Function),
      );
      expect(mockEventBus.on).toHaveBeenCalledWith(
        'note.deleted',
        expect.any(Function),
      );
      expect(mockEventBus.on).toHaveBeenCalledWith(
        'connection.created',
        expect.any(Function),
      );
      expect(mockEventBus.on).toHaveBeenCalledWith(
        'connection.updated',
        expect.any(Function),
      );
      expect(mockEventBus.on).toHaveBeenCalledWith(
        'connection.deleted',
        expect.any(Function),
      );
    });

    it('should emit timestamp event when content changes', () => {
      MapSafetyService.initialize();

      // Get the event handler for note.created
      const noteCreatedHandler = mockEventBus.on.mock.calls.find(
        (call) => call[0] === 'note.created',
      )[1];

      const beforeTime = Date.now();
      noteCreatedHandler();
      const afterTime = Date.now();

      // Verify that the service emitted a map.edit.timestamp event
      expect(mockEventBus.emit).toHaveBeenCalledWith('map.edit.timestamp', {
        timestamp: expect.any(Number),
      });

      // Verify the timestamp is within reasonable bounds
      const emitCall = mockEventBus.emit.mock.calls.find(
        (call) => call[0] === 'map.edit.timestamp',
      );
      const timestamp = emitCall[1].timestamp;
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should not initialize multiple times', () => {
      MapSafetyService.initialize();
      MapSafetyService.initialize();

      // Should only set up listeners once
      const noteCreatedCalls = mockEventBus.on.mock.calls.filter(
        (call) => call[0] === 'note.created',
      );
      expect(noteCreatedCalls).toHaveLength(1);
    });
  });
});
