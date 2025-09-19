// tests/unit/services/connectionService.test.js

describe('ConnectionService', () => {
  let ConnectionService;
  let mockConnectionManager;
  let mockConstants;

  beforeEach(async () => {
    // Reset modules
    jest.resetModules();

    // Create mock connection manager
    mockConnectionManager = {
      setConnectionUpdateCallback: jest.fn(),
      createConnection: jest.fn(),
      updateConnections: jest.fn(),
      initializeSVGContainer: jest.fn(),
    };

    // Create mock constants
    mockConstants = {
      CONNECTION_TYPES: {
        NONE: 'none',
        SOLID: 'solid',
        DASHED: 'dashed',
        DOTTED: 'dotted',
      },
    };

    // Mock dependencies before importing
    jest.doMock('../../../src/js/core/constants.js', () => mockConstants);

    // Import the module to test
    const module = await import(
      '../../../src/js/services/connectionService.js'
    );
    ConnectionService = module.ConnectionService;

    // Reset static properties
    ConnectionService.connectionManager = null;
    ConnectionService.dataStoreUpdateCallback = null;
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset static properties
    ConnectionService.connectionManager = null;
    ConnectionService.dataStoreUpdateCallback = null;
  });

  describe('setConnectionManager', () => {
    it('should set the connection manager', () => {
      ConnectionService.setConnectionManager(mockConnectionManager);

      expect(ConnectionService.connectionManager).toBe(mockConnectionManager);
    });

    it('should wire up existing callback when manager is set', () => {
      const mockCallback = jest.fn();
      ConnectionService.dataStoreUpdateCallback = mockCallback;

      ConnectionService.setConnectionManager(mockConnectionManager);

      expect(
        mockConnectionManager.setConnectionUpdateCallback,
      ).toHaveBeenCalledWith(mockCallback);
    });

    it('should not wire up callback when manager is null', () => {
      const mockCallback = jest.fn();
      ConnectionService.dataStoreUpdateCallback = mockCallback;

      ConnectionService.setConnectionManager(null);

      expect(ConnectionService.connectionManager).toBe(null);
    });
  });

  describe('setDataStoreUpdateCallback', () => {
    it('should set the callback', () => {
      const mockCallback = jest.fn();

      ConnectionService.setDataStoreUpdateCallback(mockCallback);

      expect(ConnectionService.dataStoreUpdateCallback).toBe(mockCallback);
    });

    it('should wire up callback when manager exists', () => {
      ConnectionService.connectionManager = mockConnectionManager;
      const mockCallback = jest.fn();

      ConnectionService.setDataStoreUpdateCallback(mockCallback);

      expect(
        mockConnectionManager.setConnectionUpdateCallback,
      ).toHaveBeenCalledWith(mockCallback);
    });

    it('should not wire up callback when manager is null', () => {
      ConnectionService.connectionManager = null;
      const mockCallback = jest.fn();

      ConnectionService.setDataStoreUpdateCallback(mockCallback);

      expect(ConnectionService.dataStoreUpdateCallback).toBe(mockCallback);
    });
  });

  describe('createConnection', () => {
    it('should delegate to connection manager when available', () => {
      ConnectionService.connectionManager = mockConnectionManager;

      ConnectionService.createConnection('note1', 'note2', 'solid');

      expect(mockConnectionManager.createConnection).toHaveBeenCalledWith(
        'note1',
        'note2',
        'solid',
      );
    });

    it('should handle null connection manager gracefully', () => {
      ConnectionService.connectionManager = null;

      expect(() => {
        ConnectionService.createConnection('note1', 'note2', 'solid');
      }).not.toThrow();

      expect(mockConnectionManager.createConnection).not.toHaveBeenCalled();
    });

    it('should pass through all connection parameters', () => {
      ConnectionService.connectionManager = mockConnectionManager;

      ConnectionService.createConnection('from-id', 'to-id', 'dashed');

      expect(mockConnectionManager.createConnection).toHaveBeenCalledWith(
        'from-id',
        'to-id',
        'dashed',
      );
    });
  });

  describe('updateConnections', () => {
    it('should delegate to connection manager when available', () => {
      ConnectionService.connectionManager = mockConnectionManager;

      ConnectionService.updateConnections();

      expect(mockConnectionManager.updateConnections).toHaveBeenCalledWith();
    });

    it('should handle null connection manager gracefully', () => {
      ConnectionService.connectionManager = null;

      expect(() => {
        ConnectionService.updateConnections();
      }).not.toThrow();

      expect(mockConnectionManager.updateConnections).not.toHaveBeenCalled();
    });
  });

  describe('initializeConnectionDrawing', () => {
    it('should delegate to connection manager and return result', () => {
      const mockCanvas = document.createElement('div');
      const mockResult = document.createElement('svg');
      mockConnectionManager.initializeSVGContainer.mockReturnValue(mockResult);
      ConnectionService.connectionManager = mockConnectionManager;

      const result = ConnectionService.initializeConnectionDrawing(mockCanvas);

      expect(mockConnectionManager.initializeSVGContainer).toHaveBeenCalledWith(
        mockCanvas,
      );
      expect(result).toBe(mockResult);
    });

    it('should return null when connection manager is not available', () => {
      const mockCanvas = document.createElement('div');
      ConnectionService.connectionManager = null;

      const result = ConnectionService.initializeConnectionDrawing(mockCanvas);

      expect(result).toBe(null);
      expect(
        mockConnectionManager.initializeSVGContainer,
      ).not.toHaveBeenCalled();
    });
  });

  describe('getConnectionTypes', () => {
    it('should return connection types from constants', () => {
      const result = ConnectionService.getConnectionTypes();

      expect(result).toEqual(mockConstants.CONNECTION_TYPES);
    });

    it('should return the same object consistently', () => {
      const result1 = ConnectionService.getConnectionTypes();
      const result2 = ConnectionService.getConnectionTypes();

      expect(result1).toBe(result2);
    });
  });

  describe('integration - manager and callback wiring', () => {
    it('should wire up callback when both manager and callback are set in any order', () => {
      const mockCallback = jest.fn();

      // Set callback first, then manager
      ConnectionService.setDataStoreUpdateCallback(mockCallback);
      ConnectionService.setConnectionManager(mockConnectionManager);

      expect(
        mockConnectionManager.setConnectionUpdateCallback,
      ).toHaveBeenCalledWith(mockCallback);

      // Reset and try opposite order
      jest.clearAllMocks();
      ConnectionService.connectionManager = null;
      ConnectionService.dataStoreUpdateCallback = null;

      // Set manager first, then callback
      ConnectionService.setConnectionManager(mockConnectionManager);
      ConnectionService.setDataStoreUpdateCallback(mockCallback);

      expect(
        mockConnectionManager.setConnectionUpdateCallback,
      ).toHaveBeenCalledWith(mockCallback);
    });

    it('should handle multiple manager/callback updates', () => {
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();
      const mockManager2 = {
        setConnectionUpdateCallback: jest.fn(),
      };

      // Initial setup
      ConnectionService.setConnectionManager(mockConnectionManager);
      ConnectionService.setDataStoreUpdateCallback(mockCallback1);

      // Update callback
      ConnectionService.setDataStoreUpdateCallback(mockCallback2);

      expect(
        mockConnectionManager.setConnectionUpdateCallback,
      ).toHaveBeenCalledWith(mockCallback2);

      // Update manager
      ConnectionService.setConnectionManager(mockManager2);

      expect(mockManager2.setConnectionUpdateCallback).toHaveBeenCalledWith(
        mockCallback2,
      );
    });
  });
});
