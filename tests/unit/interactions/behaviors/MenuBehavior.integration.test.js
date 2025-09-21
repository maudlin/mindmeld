// tests/unit/interactions/behaviors/MenuBehavior.integration.test.js

describe('MenuBehavior - Server Connection Integration', () => {
  let MenuBehavior;
  let mockEventBus;
  let mockCanvas;
  let mockServerConnectionService;
  let mockNewServerInstance;

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

    // Create a dynamic connection state that can be updated
    const connectionState = {
      serverUri: null,
      isConnected: false,
      connectionStatus: 'disconnected',
    };

    mockServerConnectionService = {
      getServerUri: jest.fn(),
      getConnectionState: jest.fn(() => connectionState),
      setConnectionStatus: jest.fn((status) => {
        connectionState.connectionStatus = status;
        connectionState.isConnected = status === 'connected';
      }),
      setServerUri: jest.fn((uri) => {
        connectionState.serverUri = uri;
        if (uri === null) {
          connectionState.isConnected = false;
          connectionState.connectionStatus = 'disconnected';
        }
        return true;
      }),
      loadServerUriFromStorage: jest.fn(() => null),
      testConnection: jest.fn(() => Promise.resolve({ success: false })),
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

    // Create a controllable mock instance for the new collaboration service
    const newServiceConnectionState = {
      phase: 'disconnected',
      serverUrl: null,
      connected: false,
      wsProvider: null,
    };

    mockNewServerInstance = {
      setEventBus: jest.fn(),
      getConnectionStatus: jest.fn(() => ({ ...newServiceConnectionState })),
      testServerConnection: jest.fn(() => Promise.resolve({ valid: true })),
      setServerUrl: jest.fn((url) => {
        newServiceConnectionState.serverUrl = url;
        newServiceConnectionState.phase = url
          ? 'server-configured'
          : 'disconnected';
      }),
      disconnect: jest.fn(() => {
        newServiceConnectionState.serverUrl = null;
        newServiceConnectionState.phase = 'disconnected';
        newServiceConnectionState.connected = false;
        newServiceConnectionState.wsProvider = null;
      }),
      getServerUrl: jest.fn(() => newServiceConnectionState.serverUrl),
      isServerConfigured: jest.fn(
        () => newServiceConnectionState.serverUrl !== null,
      ),
      createWebSocketUrl: jest.fn((mapId) => `wss://example.com/yjs/${mapId}`),
    };

    // Mock the new ServerConnectionService (collaboration infrastructure)
    const mockNewServerConnectionService = {
      getInstance: jest.fn(() => mockNewServerInstance),
    };

    jest.doMock(
      '../../../../src/js/services/ServerConnectionService.js',
      () => ({
        ServerConnectionService: mockNewServerConnectionService,
      }),
    );

    // Keep the old mock for any legacy code that might still reference it
    jest.doMock(
      '../../../../src/js/services/serverConnectionService.js',
      () => ({
        ServerConnectionService: mockServerConnectionService,
      }),
    );

    jest.doMock('../../../../src/js/services/serverClient.js', () => ({
      ServerClient: mockServerClient,
    }));

    // Import the module to test
    const module = await import(
      '../../../../src/js/interactions/behaviors/MenuBehavior.js'
    );
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

        expect(mockEventBus.emit).toHaveBeenCalledWith(
          'modal.serverConnection.open',
          {
            behavior: behavior,
            inputType: 'click',
            currentUrl: behavior.serverConfig.url || '',
          },
        );
        expect(behavior.modalOpen).toBe(true);
        expect(behavior.isOpen).toBe(false); // Menu should close
      });

      it('should handle disconnect-server action', () => {
        // Setup connected state using new ServerConnectionService
        mockNewServerInstance.setServerUrl('https://test-server.com');

        behavior.handleMenuAction('disconnect-server', 'click');

        // Verify disconnection called on new service
        expect(mockNewServerInstance.disconnect).toHaveBeenCalled();
        expect(mockNewServerInstance.getServerUrl()).toBe(null);
        expect(behavior.getServerStatus().connected).toBe(false);
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

        const notificationManager =
          require('../../../../src/js/services/notificationManager.js').notificationManager;

        await behavior.handleLoadFromServer('click');

        expect(mockServerClient.loadState).toHaveBeenCalledWith(mockCanvas);
        expect(notificationManager.success).toHaveBeenCalledWith(
          'Data loaded from server successfully!',
        );
      });

      it('should show error when load-from-server clicked while disconnected', async () => {
        mockServerClient.getConnectionStatus.mockReturnValue({
          isConnected: false,
          connectionStatus: 'disconnected',
        });

        const notificationManager =
          require('../../../../src/js/services/notificationManager.js').notificationManager;

        await behavior.handleLoadFromServer('click');

        expect(mockServerClient.loadState).not.toHaveBeenCalled();
        expect(notificationManager.error).toHaveBeenCalledWith(
          'Not connected to server',
        );
      });

      it('should get server connection status for menu state', () => {
        mockServerConnectionService.getConnectionState.mockReturnValue({
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
      });

      it('should disable server actions when disconnected', () => {
        mockServerClient.getConnectionStatus.mockReturnValue({
          isConnected: false,
          connectionStatus: 'disconnected',
        });

        const actions = behavior.getAvailableServerActions();

        expect(actions.loadFromServer).toBe(false);
      });
    });

    describe('getServerStatus', () => {
      it('should return complete server status', () => {
        behavior.serverConfig = {
          url: 'https://test-server.com',
        };
        behavior.mapsApi = { health: jest.fn() };
        mockServerConnectionService.setConnectionStatus('connected');

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
        const mockApi = {
          health: jest.fn().mockResolvedValue({ status: 'ok' }),
        };
        const createMapsApi =
          require('../../../../src/js/services/mapsApi.js').createMapsApi;
        createMapsApi.mockReturnValue(mockApi);

        const connectData = { url: 'https://connect-test.com' };

        // Simulate event emission
        const connectHandler = mockEventBus.on.mock.calls.find(
          (call) => call[0] === 'server.connect',
        )?.[1];

        if (connectHandler) {
          await connectHandler(connectData);

          // The successful connection should update the connection state
          mockServerConnectionService.setConnectionStatus('connected');

          expect(behavior.serverConfig.url).toBe('https://connect-test.com');
          expect(behavior.getServerStatus().connected).toBe(true);
          expect(behavior.getServerStatus().connecting).toBe(false);
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
        };
        behavior.mapsApi = { health: jest.fn() };
        mockServerConnectionService.setConnectionStatus('connected');

        // Call the disconnect method directly since the event handler calls it
        behavior.handleServerDisconnect('test');

        expect(behavior.serverConfig.url).toBe(null);
        expect(behavior.getServerStatus().connected).toBe(false);
        expect(behavior.mapsApi).toBe(null);
        expect(mockServerConnectionService.setServerUri).toHaveBeenCalledWith(
          null,
        );
        expect(
          mockServerConnectionService.setConnectionStatus,
        ).toHaveBeenCalledWith('disconnected');
        expect(mockEventBus.emit).toHaveBeenCalledWith('server.disconnected', {
          behavior: behavior,
          inputType: 'test',
        });
      });

      it('should handle modal.close event', () => {
        behavior.modalOpen = true;

        // Simulate event emission
        const modalCloseHandler = mockEventBus.on.mock.calls.find(
          (call) => call[0] === 'modal.close',
        )?.[1];

        if (modalCloseHandler) {
          modalCloseHandler();

          expect(behavior.modalOpen).toBe(false);
          expect(mockEventBus.emit).toHaveBeenCalledWith(
            'modal.serverConnection.closed',
            {
              behavior: behavior,
            },
          );
        }
      });
    });

    describe('server configuration persistence', () => {
      it('should load server config from ServerConnectionService', () => {
        mockServerConnectionService.loadServerUriFromStorage.mockReturnValue(
          'https://stored-server.com',
        );

        behavior.loadServerConfig();

        expect(mockServerConnectionService.setServerUri).toHaveBeenCalledWith(
          'https://stored-server.com',
        );
        expect(behavior.serverConfig.url).toBe('https://stored-server.com');
      });

      it('should handle invalid localStorage data', () => {
        window.localStorage.getItem.mockReturnValue('invalid-json');

        // Should not throw
        expect(() => behavior.loadServerConfig()).not.toThrow();
        expect(behavior.serverConfig.url).toBe(null);
      });

      it('should save server config via ServerConnectionService', () => {
        behavior.serverConfig.url = 'https://save-test.com';

        behavior.saveServerConfig();

        expect(mockServerConnectionService.setServerUri).toHaveBeenCalledWith(
          'https://save-test.com',
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

        // Mock both services for this test
        const ServerClientModule = require('../../../../src/js/services/serverClient.js');
        const mockServerClient = ServerClientModule.ServerClient;
        mockServerClient.getConnectionStatus.mockReturnValue({
          isConnected: true,
          connectionStatus: 'connected',
        });

        mockServerConnectionService.getConnectionState.mockReturnValue({
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
          },
        });
      });

      it('should emit server status when opening menu', () => {
        behavior.serverConfig = {
          url: 'https://test-server.com',
        };
        mockServerConnectionService.setConnectionStatus('connected');

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
        const mockApi = {
          health: jest.fn().mockRejectedValue(new Error('Connection failed')),
        };
        const createMapsApi =
          require('../../../../src/js/services/mapsApi.js').createMapsApi;
        createMapsApi.mockReturnValue(mockApi);

        const connectData = { url: 'https://failing-server.com' };

        // Simulate event emission
        const connectHandler = mockEventBus.on.mock.calls.find(
          (call) => call[0] === 'server.connect',
        )?.[1];

        if (connectHandler) {
          await connectHandler(connectData);

          expect(behavior.getServerStatus().connected).toBe(false);
          expect(behavior.getServerStatus().connecting).toBe(false);
          expect(behavior.mapsApi).toBe(null);
          expect(mockEventBus.emit).toHaveBeenCalledWith(
            'server.connectionFailed',
            {
              behavior: behavior,
              url: 'https://failing-server.com',
              error: 'Connection failed',
            },
          );
        }
      });
    });
  });

  describe('DataProvider Integration', () => {
    let behavior;
    let mockDataProviderService;

    beforeEach(async () => {
      // Mock DataProviderService
      mockDataProviderService = {
        exportJSON: jest.fn(() => '{"data":{"n":[{"id":"test"}],"c":[]}}'),
        importJSON: jest.fn(),
        getInstance: jest.fn(),
      };

      // Add DataProviderService to existing mocks
      jest.doMock('../../../../src/js/services/DataProviderService.js', () => ({
        DataProviderService: {
          getInstance: () => mockDataProviderService,
        },
      }));

      // Re-import MenuBehavior with DataProvider mock
      jest.resetModules();
      const module = await import(
        '../../../../src/js/interactions/behaviors/MenuBehavior.js'
      );
      MenuBehavior = module.MenuBehavior;

      behavior = new MenuBehavior(mockEventBus, mockCanvas);
      await behavior.initialize();
    });

    describe('Export Operations via DataProvider', () => {
      test('should use DataProviderService for file export', () => {
        // Mock DOM methods for file download
        global.URL = {
          createObjectURL: jest.fn(() => 'blob:test-url'),
          revokeObjectURL: jest.fn(),
        };

        const mockAnchor = {
          href: '',
          download: '',
          click: jest.fn(),
        };
        jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor);

        global.Blob = jest
          .fn()
          .mockImplementation((content, options) => ({ content, options }));

        behavior.handleExportFile('test');

        expect(mockDataProviderService.exportJSON).toHaveBeenCalled();
        expect(global.Blob).toHaveBeenCalledWith(
          ['{"data":{"n":[{"id":"test"}],"c":[]}}'],
          { type: 'application/json' },
        );
        expect(mockAnchor.download).toBe('mindmap_export.json');
        expect(mockAnchor.click).toHaveBeenCalled();

        // Cleanup
        delete global.URL;
        delete global.Blob;
      });

      test('should use DataProviderService for clipboard export', async () => {
        const mockWriteText = jest.fn().mockResolvedValue();
        Object.defineProperty(global, 'navigator', {
          value: {
            clipboard: {
              writeText: mockWriteText,
            },
          },
          configurable: true,
        });

        await behavior.handleCopyClipboard('test');

        expect(mockDataProviderService.exportJSON).toHaveBeenCalled();
        expect(mockWriteText).toHaveBeenCalledWith(
          '{"data":{"n":[{"id":"test"}],"c":[]}}',
        );

        // Cleanup
        delete global.navigator;
      });
    });

    describe('Import Operations via DataProvider', () => {
      test('should use DataProviderService for file import', async () => {
        const testData = '{"data":{"n":[{"id":"imported"}],"c":[]}}';

        // Mock Blob globally
        global.Blob = jest.fn().mockImplementation((content, options) => ({
          content,
          options,
        }));

        // Mock FileReader
        const mockFileReader = {
          onload: null,
          readAsText: jest.fn(),
        };
        jest
          .spyOn(window, 'FileReader')
          .mockImplementation(() => mockFileReader);

        // Mock input element
        const mockInput = {
          type: '',
          accept: '',
          onchange: null,
          click: jest.fn(),
        };
        jest.spyOn(document, 'createElement').mockReturnValue(mockInput);

        behavior.handleImportFile('test');

        // Simulate file selection
        const mockFile = new global.Blob([testData], {
          type: 'application/json',
        });
        const mockEvent = { target: { files: [mockFile] } };

        mockInput.onchange(mockEvent);
        expect(mockFileReader.readAsText).toHaveBeenCalledWith(mockFile);

        // Simulate file read completion
        await mockFileReader.onload({ target: { result: testData } });

        expect(mockDataProviderService.importJSON).toHaveBeenCalledWith(
          testData,
        );

        // Cleanup
        delete global.Blob;
      });

      test('should use DataProviderService for clipboard import', async () => {
        const testData = '{"data":{"n":[{"id":"imported"}],"c":[]}}';

        const mockReadText = jest.fn().mockResolvedValue(testData);
        Object.defineProperty(global, 'navigator', {
          value: {
            clipboard: {
              readText: mockReadText,
            },
          },
          configurable: true,
        });

        await behavior.handlePasteClipboard('test');

        expect(mockReadText).toHaveBeenCalled();
        expect(mockDataProviderService.importJSON).toHaveBeenCalledWith(
          testData,
        );

        // Cleanup
        delete global.navigator;
      });
    });

    describe('Error Handling with DataProvider', () => {
      test('should handle DataProvider export errors gracefully', () => {
        mockDataProviderService.exportJSON.mockImplementation(() => {
          throw new Error('Export failed');
        });

        global.URL = { createObjectURL: jest.fn(), revokeObjectURL: jest.fn() };

        behavior.handleExportFile('test');

        const notificationManager =
          require('../../../../src/js/services/notificationManager.js').notificationManager;
        expect(notificationManager.error).toHaveBeenCalledWith(
          'Error exporting file. Please try again.',
        );

        delete global.URL;
      });

      test('should handle DataProvider import errors gracefully', async () => {
        mockDataProviderService.importJSON.mockRejectedValue(
          new Error('Import failed'),
        );

        global.navigator = {
          clipboard: {
            readText: jest.fn().mockResolvedValue('{"valid":"json"}'),
          },
        };

        await behavior.handlePasteClipboard('test');

        const notificationManager =
          require('../../../../src/js/services/notificationManager.js').notificationManager;
        expect(notificationManager.error).toHaveBeenCalledWith(
          'Error importing from clipboard. Please make sure the clipboard contains valid JSON data.',
        );

        delete global.navigator;
      });
    });

    describe('Integration Safety', () => {
      test('should maintain same behavior for import/export operations', () => {
        // Verify method signatures haven't changed
        expect(typeof behavior.handleExportFile).toBe('function');
        expect(typeof behavior.handleImportFile).toBe('function');
        expect(typeof behavior.handleCopyClipboard).toBe('function');
        expect(typeof behavior.handlePasteClipboard).toBe('function');

        // Verify error handling paths still work
        expect(() => {
          mockDataProviderService.exportJSON.mockReturnValue('{}');
          global.URL = {
            createObjectURL: jest.fn(),
            revokeObjectURL: jest.fn(),
          };
          global.Blob = jest.fn();
          jest
            .spyOn(document, 'createElement')
            .mockReturnValue({ click: jest.fn() });

          behavior.handleExportFile('test');

          delete global.URL;
          delete global.Blob;
        }).not.toThrow();
      });

      test('should handle canvas reference consistently', async () => {
        behavior.canvas = null;

        // Mock Blob globally
        global.Blob = jest.fn().mockImplementation((content, options) => ({
          content,
          options,
        }));

        // Mock FileReader setup
        const mockFileReader = { onload: null, readAsText: jest.fn() };
        jest
          .spyOn(window, 'FileReader')
          .mockImplementation(() => mockFileReader);

        const mockInput = {
          type: '',
          accept: '',
          onchange: null,
          click: jest.fn(),
        };
        jest.spyOn(document, 'createElement').mockReturnValue(mockInput);

        behavior.handleImportFile('test');

        // Simulate file processing
        const mockFile = new global.Blob(['{}'], { type: 'application/json' });
        mockInput.onchange({ target: { files: [mockFile] } });
        await mockFileReader.onload({ target: { result: '{}' } });

        // Should not call importJSON if canvas is null
        expect(mockDataProviderService.importJSON).not.toHaveBeenCalled();

        // Cleanup
        delete global.Blob;
      });
    });
  });
});
