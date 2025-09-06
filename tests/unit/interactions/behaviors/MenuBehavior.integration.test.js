// tests/unit/interactions/behaviors/MenuBehavior.integration.test.js

describe('MenuBehavior - Server Connection Integration', () => {
  let MenuBehavior;
  let mockEventBus;
  let mockCanvas;
  let mockServerConnectionService;

  beforeEach(async () => {
    // Reset modules
    jest.resetModules();

    // Create mock objects
    mockEventBus = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    };

    mockCanvas = {
      id: 'test-canvas',
    };

    mockServerConnectionService = {
      getServerUri: jest.fn(),
      getConnectionState: jest.fn(),
      setConnectionStatus: jest.fn(),
    };

    // Mock ServerClient for Phase 2 tests
    const mockServerClient = {
      saveState: jest.fn(),
      loadState: jest.fn(),
      getConnectionStatus: jest.fn(),
    };

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });

    // Mock dependencies before importing
    jest.doMock('../../../../src/js/core/eventBus.js', () => ({
      eventBus: mockEventBus,
    }));

    jest.doMock('../../../../src/js/services/mapsApi.js', () => ({
      createMapsApi: jest.fn(),
    }));

    jest.doMock('../../../../src/js/data/dataStore.js', () => ({
      exportToJSON: jest.fn(() => '{}'),
      importFromJSON: jest.fn(),
    }));

    jest.doMock('../../../../src/js/data/storageManager.js', () => ({
      clearAllState: jest.fn(),
    }));

    jest.doMock('../../../../src/js/services/notificationManager.js', () => ({
      notificationManager: {
        success: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        confirm: jest.fn(),
      },
    }));

    jest.doMock('../../../../src/js/services/serverConnectionService.js', () => ({
      ServerConnectionService: mockServerConnectionService,
    }));

    jest.doMock('../../../../src/js/services/serverClient.js', () => ({
      ServerClient: mockServerClient,
    }));

    // Import the module to test
    const module = await import('../../../../src/js/interactions/behaviors/MenuBehavior.js');
    MenuBehavior = module.MenuBehavior;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Server Connection Menu Integration', () => {
    let behavior;

    beforeEach(async () => {
      behavior = new MenuBehavior(mockEventBus, mockCanvas);
      await behavior.initialize();
    });

    describe('handleMenuAction - server connection', () => {
      it('should handle connect-server action', () => {
        behavior.handleMenuAction('connect-server', 'click');

        expect(mockEventBus.emit).toHaveBeenCalledWith('modal.serverConnection.open', {
          behavior: behavior,
          inputType: 'click',
          currentUrl: behavior.serverConfig.url || '',
        });
        expect(behavior.modalOpen).toBe(true);
        expect(behavior.isOpen).toBe(false); // Menu should close
      });

      it('should handle disconnect-server action', () => {
        // Setup connected state
        behavior.serverConfig.url = 'https://test-server.com';
        behavior.serverConfig.connected = true;

        behavior.handleMenuAction('disconnect-server', 'click');

        expect(behavior.serverConfig.url).toBe(null);
        expect(behavior.serverConfig.connected).toBe(false);
        expect(mockEventBus.emit).toHaveBeenCalledWith('server.disconnected', {
          behavior: behavior,
          inputType: 'click',
        });
        expect(behavior.isOpen).toBe(false); // Menu should close
      });

      it('should close menu after server actions', () => {
        behavior.isOpen = true;

        behavior.handleMenuAction('connect-server', 'touch');

        expect(behavior.isOpen).toBe(false);
      });
    });

    describe('handleMenuAction - server save/load (MM-106)', () => {
      let mockServerClient;

      beforeEach(() => {
        // Get the mocked ServerClient from the already established mock
        const ServerClientModule = require('../../../../src/js/services/serverClient.js');
        mockServerClient = ServerClientModule.ServerClient;
      });

      it('should handle load-from-server action when connected', async () => {
        mockServerClient.getConnectionStatus.mockReturnValue({
          isConnected: true,
          connectionStatus: 'connected',
        });
        mockServerClient.loadState.mockResolvedValue(true);

        const notificationManager = require('../../../../src/js/services/notificationManager.js').notificationManager;

        await behavior.handleLoadFromServer('click');

        expect(mockServerClient.loadState).toHaveBeenCalledWith(mockCanvas);
        expect(notificationManager.success).toHaveBeenCalledWith('Data loaded from server successfully!');
      });

      it('should show error when load-from-server clicked while disconnected', async () => {
        mockServerClient.getConnectionStatus.mockReturnValue({
          isConnected: false,
          connectionStatus: 'disconnected',
        });

        const notificationManager = require('../../../../src/js/services/notificationManager.js').notificationManager;

        await behavior.handleLoadFromServer('click');

        expect(mockServerClient.loadState).not.toHaveBeenCalled();
        expect(notificationManager.error).toHaveBeenCalledWith('Not connected to server');
      });

      it('should handle save-to-server action when connected', async () => {
        mockServerClient.getConnectionStatus.mockReturnValue({
          isConnected: true,
          connectionStatus: 'connected',
        });
        mockServerClient.saveState.mockResolvedValue(true);

        const notificationManager = require('../../../../src/js/services/notificationManager.js').notificationManager;

        await behavior.handleSaveToServer('click');

        expect(mockServerClient.saveState).toHaveBeenCalled();
        expect(notificationManager.success).toHaveBeenCalledWith('Data saved to server successfully!');
      });

      it('should get server connection status for menu state', () => {
        mockServerClient.getConnectionStatus.mockReturnValue({
          isConnected: true,
          connectionStatus: 'connected',
        });

        const status = behavior.getServerConnectionStatus();

        expect(status).toEqual({
          isConnected: true,
          connectionStatus: 'connected',
        });
      });

      it('should determine available server actions based on connection', () => {
        mockServerClient.getConnectionStatus.mockReturnValue({
          isConnected: true,
          connectionStatus: 'connected',
        });

        const actions = behavior.getAvailableServerActions();

        expect(actions.loadFromServer).toBe(true);
        expect(actions.saveToServer).toBe(true);
      });

      it('should disable server actions when disconnected', () => {
        mockServerClient.getConnectionStatus.mockReturnValue({
          isConnected: false,
          connectionStatus: 'disconnected',
        });

        const actions = behavior.getAvailableServerActions();

        expect(actions.loadFromServer).toBe(false);
        expect(actions.saveToServer).toBe(false);
      });
    });

    describe('getServerStatus', () => {
      it('should return complete server status', () => {
        behavior.serverConfig = {
          url: 'https://test-server.com',
          connected: true,
          connecting: false,
        };
        behavior.mapsApi = { health: jest.fn() };

        const status = behavior.getServerStatus();

        expect(status).toEqual({
          url: 'https://test-server.com',
          connected: true,
          connecting: false,
          hasApi: true,
        });
      });

      it('should handle null mapsApi', () => {
        behavior.serverConfig = {
          url: null,
          connected: false,
          connecting: false,
        };
        behavior.mapsApi = null;

        const status = behavior.getServerStatus();

        expect(status).toEqual({
          url: null,
          connected: false,
          connecting: false,
          hasApi: false,
        });
      });
    });

    describe('event handling', () => {
      it('should handle server.connect event', async () => {
        const mockApi = { health: jest.fn().mockResolvedValue({ status: 'ok' }) };
        const createMapsApi = require('../../../../src/js/services/mapsApi.js').createMapsApi;
        createMapsApi.mockReturnValue(mockApi);

        const connectData = { url: 'https://connect-test.com' };

        // Simulate event emission
        const connectHandler = mockEventBus.on.mock.calls.find(
          call => call[0] === 'server.connect'
        )?.[1];
        
        if (connectHandler) {
          await connectHandler(connectData);

          expect(behavior.serverConfig.url).toBe('https://connect-test.com');
          expect(behavior.serverConfig.connected).toBe(true);
          expect(behavior.serverConfig.connecting).toBe(false);
          expect(behavior.mapsApi).toBe(mockApi);
          expect(mockEventBus.emit).toHaveBeenCalledWith('server.connected', {
            behavior: behavior,
            url: 'https://connect-test.com',
            status: 'connected',
          });
        }
      });

      it('should handle server.disconnect event', () => {
        // Setup connected state
        behavior.serverConfig = {
          url: 'https://test-server.com',
          connected: true,
          connecting: false,
        };
        behavior.mapsApi = { health: jest.fn() };

        // Call the disconnect method directly since the event handler calls it
        behavior.handleServerDisconnect('test');

        expect(behavior.serverConfig.url).toBe(null);
        expect(behavior.serverConfig.connected).toBe(false);
        expect(behavior.mapsApi).toBe(null);
        expect(window.localStorage.removeItem).toHaveBeenCalledWith('mindmeld-server-config');
        expect(mockEventBus.emit).toHaveBeenCalledWith('server.disconnected', {
          behavior: behavior,
          inputType: 'test',
        });
      });

      it('should handle modal.close event', () => {
        behavior.modalOpen = true;

        // Simulate event emission
        const modalCloseHandler = mockEventBus.on.mock.calls.find(
          call => call[0] === 'modal.close'
        )?.[1];
        
        if (modalCloseHandler) {
          modalCloseHandler();

          expect(behavior.modalOpen).toBe(false);
          expect(mockEventBus.emit).toHaveBeenCalledWith('modal.serverConnection.closed', {
            behavior: behavior,
          });
        }
      });
    });

    describe('server configuration persistence', () => {
      it('should load server config from localStorage', () => {
        const config = { url: 'https://stored-server.com' };
        window.localStorage.getItem.mockReturnValue(JSON.stringify(config));

        behavior.loadServerConfig();

        expect(behavior.serverConfig.url).toBe('https://stored-server.com');
      });

      it('should handle invalid localStorage data', () => {
        window.localStorage.getItem.mockReturnValue('invalid-json');

        // Should not throw
        expect(() => behavior.loadServerConfig()).not.toThrow();
        expect(behavior.serverConfig.url).toBe(null);
      });

      it('should save server config to localStorage', () => {
        behavior.serverConfig.url = 'https://save-test.com';

        behavior.saveServerConfig();

        expect(window.localStorage.setItem).toHaveBeenCalledWith(
          'mindmeld-server-config',
          JSON.stringify({ url: 'https://save-test.com' })
        );
      });
    });

    describe('menu state integration', () => {
      it('should include server status in menu state', () => {
        behavior.serverConfig = {
          url: 'https://test-server.com',
          connected: true,
          connecting: false,
        };
        behavior.isOpen = true;
        behavior.modalOpen = false;

        const ServerClientModule = require('../../../../src/js/services/serverClient.js');
        const mockServerClient = ServerClientModule.ServerClient;
        mockServerClient.getConnectionStatus.mockReturnValue({
          isConnected: true,
          connectionStatus: 'connected',
        });

        const menuState = behavior.getMenuState();

        expect(menuState).toEqual({
          isOpen: true,
          modalOpen: false,
          serverStatus: {
            url: 'https://test-server.com',
            connected: true,
            connecting: false,
            hasApi: false,
          },
          serverConnection: {
            isConnected: true,
            connectionStatus: 'connected',
          },
          availableActions: {
            loadFromServer: true,
            saveToServer: true,
          },
        });
      });

      it('should emit server status when opening menu', () => {
        behavior.serverConfig = {
          url: 'https://test-server.com',
          connected: true,
          connecting: false,
        };

        behavior.openMenu('click');

        expect(mockEventBus.emit).toHaveBeenCalledWith('menu.opened', {
          behavior: behavior,
          inputType: 'click',
          serverConfig: {
            url: 'https://test-server.com',
            connected: true,
            connecting: false,
            hasApi: false,
          },
        });
      });
    });

    describe('error handling', () => {
      it('should handle server connection failure', async () => {
        const mockApi = { health: jest.fn().mockRejectedValue(new Error('Connection failed')) };
        const createMapsApi = require('../../../../src/js/services/mapsApi.js').createMapsApi;
        createMapsApi.mockReturnValue(mockApi);

        const connectData = { url: 'https://failing-server.com' };

        // Simulate event emission
        const connectHandler = mockEventBus.on.mock.calls.find(
          call => call[0] === 'server.connect'
        )?.[1];
        
        if (connectHandler) {
          await connectHandler(connectData);

          expect(behavior.serverConfig.connected).toBe(false);
          expect(behavior.serverConfig.connecting).toBe(false);
          expect(behavior.mapsApi).toBe(null);
          expect(mockEventBus.emit).toHaveBeenCalledWith('server.connectionFailed', {
            behavior: behavior,
            url: 'https://failing-server.com',
            error: 'Connection failed',
          });
        }
      });
    });
  });
});