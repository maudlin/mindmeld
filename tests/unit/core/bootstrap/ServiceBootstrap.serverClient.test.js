// tests/unit/core/bootstrap/ServiceBootstrap.serverClient.test.js

describe('ServiceBootstrap - ServerClient Integration', () => {
  let ServiceBootstrap;
  let mockEventBus;
  let mockServerConnectionService;

  beforeEach(async () => {
    // Reset modules
    jest.resetModules();

    // Create mocks
    mockEventBus = {
      on: jest.fn(),
      emit: jest.fn(),
      off: jest.fn(),
    };

    mockServerConnectionService = {
      getConnectionState: jest.fn(() => ({
        serverUri: null,
        isConnected: false,
        connectionStatus: 'disconnected',
      })),
    };

    // Mock dependencies
    jest.doMock('../../../../src/js/core/eventBus.js', () => ({
      eventBus: mockEventBus,
    }));

    jest.doMock('../../../../src/js/services/serverConnectionService.js', () => ({
      ServerConnectionService: mockServerConnectionService,
    }));

    jest.doMock('../../../../src/js/data/dataStore.js', () => ({
      exportToJSON: jest.fn(() => '{"data":{"n":[],"c":[]}}'),
      updateConnectionInDataStore: jest.fn(),
    }));

    jest.doMock('../../../../src/js/utils/utils.js', () => ({
      log: jest.fn(),
      debounce: jest.fn((fn, delay) => {
        const debouncedFn = fn;
        debouncedFn._delay = delay;
        return debouncedFn;
      }),
    }));

    // Mock other services to prevent initialization errors
    jest.doMock('../../../../src/js/services/notificationManager.js', () => ({
      notificationManager: { initialize: jest.fn() },
    }));

    jest.doMock('../../../../src/js/services/noteEventService.js', () => ({
      NoteEventService: { initialize: jest.fn() },
    }));

    jest.doMock('../../../../src/js/services/connectionService.js', () => ({
      ConnectionService: { setConnectionManager: jest.fn(), setDataStoreUpdateCallback: jest.fn() },
    }));

    jest.doMock('../../../../src/js/features/connection/connectionManager.js', () => ({
      connectionManager: {},
    }));

    jest.doMock('../../../../src/js/features/colorPicker/colorPickerEvents.js', () => ({
      ColorPickerEvents: { initialize: jest.fn() },
    }));

    jest.doMock('../../../../src/js/features/note/noteColorApplication.js', () => ({
      NoteColorApplication: { initialize: jest.fn() },
    }));

    jest.doMock('../../../../src/js/services/zoomStateService.js', () => ({
      ZoomStateService: { initialize: jest.fn() },
    }));

    jest.doMock('../../../../src/js/services/canvasStateService.js', () => ({
      CanvasStateService: { initialize: jest.fn() },
    }));

    // Import the ServiceBootstrap module
    const module = await import('../../../../src/js/core/bootstrap/ServiceBootstrap.js');
    ServiceBootstrap = module.ServiceBootstrap;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ServerClient Initialization', () => {
    it('should initialize ServerClient during bootstrap', async () => {
      // Create a spy to track ServerClient.initialize() calls
      const mockServerClientInitialize = jest.fn();
      
      // Reset modules first
      jest.resetModules();
      
      // Mock all ServiceBootstrap dependencies
      jest.doMock('../../../../src/js/services/connectionService.js', () => ({
        ConnectionService: { 
          setConnectionManager: jest.fn(), 
          setDataStoreUpdateCallback: jest.fn() 
        },
      }));
      
      jest.doMock('../../../../src/js/services/noteEventService.js', () => ({
        NoteEventService: { initialize: jest.fn() },
      }));
      
      jest.doMock('../../../../src/js/features/connection/connectionManager.js', () => ({
        connectionManager: {},
      }));
      
      jest.doMock('../../../../src/js/data/dataStore.js', () => ({
        updateConnectionInDataStore: jest.fn(),
      }));
      
      jest.doMock('../../../../src/js/features/colorPicker/colorPickerEvents.js', () => ({
        ColorPickerEvents: { initialize: jest.fn() },
      }));
      
      jest.doMock('../../../../src/js/features/note/noteColorApplication.js', () => ({
        NoteColorApplication: { initialize: jest.fn() },
      }));
      
      jest.doMock('../../../../src/js/services/notificationManager.js', () => ({
        notificationManager: { initialize: jest.fn() },
      }));
      
      jest.doMock('../../../../src/js/services/zoomStateService.js', () => ({
        ZoomStateService: { initialize: jest.fn() },
      }));
      
      jest.doMock('../../../../src/js/services/canvasStateService.js', () => ({
        CanvasStateService: { initialize: jest.fn() },
      }));
      
      jest.doMock('../../../../src/js/utils/utils.js', () => ({
        log: jest.fn(),
      }));
      
      jest.doMock('../../../../src/js/core/bootstrap/BaseBootstrap.js', () => ({
        BaseBootstrap: class {
          constructor(name) {
            this.name = name;
          }
          async cleanup() {}
        },
      }));
      
      // Mock ServerClient with our spy
      jest.doMock('../../../../src/js/services/serverClient.js', () => ({
        ServerClient: {
          initialize: mockServerClientInitialize,
        },
      }));
      
      // Re-import ServiceBootstrap with all mocked dependencies
      const module = await import('../../../../src/js/core/bootstrap/ServiceBootstrap.js');
      const ServiceBootstrapWithMock = module.ServiceBootstrap;
      
      const bootstrap = new ServiceBootstrapWithMock();
      
      await bootstrap.initialize();

      // Verify that ServerClient.initialize() was called
      expect(mockServerClientInitialize).toHaveBeenCalledTimes(1);
    });


    it('should handle ServerClient initialization errors gracefully', async () => {
      // Mock ServerClient to throw during initialization
      jest.doMock('../../../../src/js/services/serverClient.js', () => ({
        ServerClient: {
          initialize: jest.fn(() => {
            throw new Error('ServerClient initialization failed');
          }),
        },
      }));

      // Re-import ServiceBootstrap with the failing ServerClient
      const module = await import('../../../../src/js/core/bootstrap/ServiceBootstrap.js');
      const ServiceBootstrapWithError = module.ServiceBootstrap;

      const bootstrap = new ServiceBootstrapWithError();
      
      // Should not throw - should handle error gracefully
      const result = await bootstrap.initialize();

      // Should still indicate server services as "ready" (continuing without them)
      expect(result.serverServicesReady).toBe(true);
    });
  });
});