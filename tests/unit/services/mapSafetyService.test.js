// tests/unit/services/mapSafetyService.test.js

describe('MapSafetyService', () => {
  let MapSafetyService;
  let mockServerClient;
  let mockMenuBehavior;
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
      mockServerClient.lastEditTime = Date.now();
      mockServerClient.lastSaveTime = Date.now() - 5000;

      const result = MapSafetyService.hasUnsavedChanges();

      expect(result).toBe(true);
    });

    it('should return false when lastSaveTime is more recent than lastEditTime', () => {
      mockServerClient.lastEditTime = Date.now() - 5000;
      mockServerClient.lastSaveTime = Date.now();

      const result = MapSafetyService.hasUnsavedChanges();

      expect(result).toBe(false);
    });

    it('should return false when timestamps are equal', () => {
      const now = Date.now();
      mockServerClient.lastEditTime = now;
      mockServerClient.lastSaveTime = now;

      const result = MapSafetyService.hasUnsavedChanges();

      expect(result).toBe(false);
    });

    it('should return false when timestamps are not set', () => {
      mockServerClient.lastEditTime = null;
      mockServerClient.lastSaveTime = null;

      const result = MapSafetyService.hasUnsavedChanges();

      expect(result).toBe(false);
    });
  });

  describe('getCurrentMapContext()', () => {
    it('should return complete map context when connected', () => {
      const result = MapSafetyService.getCurrentMapContext();

      expect(result).toEqual({
        mapId: 'test-map-123',
        mapName: 'Test Map Name',
        hasUnsavedChanges: true, // Based on mock timestamps
        isConnected: true,
      });
    });

    it('should return "Untitled Map" when no map name available', () => {
      mockMenuBehavior.getCurrentMapName.mockReturnValue(null);

      const result = MapSafetyService.getCurrentMapContext();

      expect(result.mapName).toBe('Untitled Map');
    });

    it('should handle disconnected state', () => {
      mockServerClient.getConnectionStatus.mockReturnValue({
        isConnected: false,
        status: 'disconnected',
      });

      const result = MapSafetyService.getCurrentMapContext();

      expect(result.isConnected).toBe(false);
    });

    it('should handle null mapId', () => {
      mockServerClient.currentMapId = null;

      const result = MapSafetyService.getCurrentMapContext();

      expect(result.mapId).toBe(null);
    });
  });

  describe('ensureCurrentMapSaved()', () => {
    it('should call forceSave when auto-save enabled and has unsaved changes', async () => {
      mockServerClient.autoSaveEnabled = true;
      mockServerClient.lastEditTime = Date.now();
      mockServerClient.lastSaveTime = Date.now() - 5000;

      const result = await MapSafetyService.ensureCurrentMapSaved();

      expect(mockServerClient.forceSave).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return true when no unsaved changes exist', async () => {
      mockServerClient.autoSaveEnabled = true;
      mockServerClient.lastEditTime = Date.now() - 5000;
      mockServerClient.lastSaveTime = Date.now();

      const result = await MapSafetyService.ensureCurrentMapSaved();

      expect(mockServerClient.forceSave).not.toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return true when auto-save is disabled', async () => {
      mockServerClient.autoSaveEnabled = false;
      mockServerClient.lastEditTime = Date.now();
      mockServerClient.lastSaveTime = Date.now() - 5000;

      const result = await MapSafetyService.ensureCurrentMapSaved();

      expect(mockServerClient.forceSave).not.toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle forceSave failure gracefully', async () => {
      mockServerClient.autoSaveEnabled = true;
      mockServerClient.lastEditTime = Date.now();
      mockServerClient.lastSaveTime = Date.now() - 5000;
      mockServerClient.forceSave.mockResolvedValue(false);

      const result = await MapSafetyService.ensureCurrentMapSaved();

      expect(result).toBe(false);
    });

    it('should handle forceSave rejection gracefully', async () => {
      mockServerClient.autoSaveEnabled = true;
      mockServerClient.lastEditTime = Date.now();
      mockServerClient.lastSaveTime = Date.now() - 5000;
      mockServerClient.forceSave.mockRejectedValue(new Error('Save failed'));

      const result = await MapSafetyService.ensureCurrentMapSaved();

      expect(result).toBe(false);
    });
  });

  describe('confirmMapOperation()', () => {
    it('should show correct message for new-map operation', async () => {
      await MapSafetyService.confirmMapOperation('new-map', 'New Project Map');

      expect(mockNotificationManager.confirm).toHaveBeenCalledWith(
        'Create new map "New Project Map"? Current work will be saved as "Test Map Name".',
      );
    });

    it('should show correct message for load-map operation', async () => {
      await MapSafetyService.confirmMapOperation('load-map', 'Existing Map');

      expect(mockNotificationManager.confirm).toHaveBeenCalledWith(
        'Load "Existing Map"? Current map "Test Map Name" will be saved first.',
      );
    });

    it('should show correct message for clear-canvas operation', async () => {
      await MapSafetyService.confirmMapOperation('clear-canvas');

      expect(mockNotificationManager.confirm).toHaveBeenCalledWith(
        'Clear all content from "Test Map Name"? This cannot be undone.',
      );
    });

    it('should return confirmation result', async () => {
      mockNotificationManager.confirm.mockResolvedValue(false);

      const result = await MapSafetyService.confirmMapOperation(
        'new-map',
        'Test',
      );

      expect(result).toBe(false);
    });

    it('should handle unknown operation gracefully', async () => {
      await MapSafetyService.confirmMapOperation('unknown-operation');

      expect(mockNotificationManager.confirm).toHaveBeenCalledWith(
        'Perform unknown-operation? Current map "Test Map Name" may be affected.',
      );
    });

    it('should handle null newMapName for load-map', async () => {
      await MapSafetyService.confirmMapOperation('load-map', null);

      expect(mockNotificationManager.confirm).toHaveBeenCalledWith(
        'Load "Unknown Map"? Current map "Test Map Name" will be saved first.',
      );
    });

    it('should use "Untitled Map" when current map has no name', async () => {
      mockMenuBehavior.getCurrentMapName.mockReturnValue(null);

      await MapSafetyService.confirmMapOperation('clear-canvas');

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

    it('should update lastEditTime when content changes', () => {
      MapSafetyService.initialize();

      // Get the event handler for note.created
      const noteCreatedHandler = mockEventBus.on.mock.calls.find(
        (call) => call[0] === 'note.created',
      )[1];

      const beforeTime = Date.now();
      noteCreatedHandler();
      const afterTime = Date.now();

      expect(mockServerClient.lastEditTime).toBeGreaterThanOrEqual(beforeTime);
      expect(mockServerClient.lastEditTime).toBeLessThanOrEqual(afterTime);
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
