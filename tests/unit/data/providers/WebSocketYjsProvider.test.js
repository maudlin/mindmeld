// tests/unit/data/providers/WebSocketYjsProvider.test.js
// TDD Tests for WebSocketYjsProvider - WebSocket-only data provider with Y.js integration

import { jest } from '@jest/globals';

describe('WebSocketYjsProvider TDD', () => {
  let WebSocketYjsProvider;
  let MockWebSocketProvider;
  let MockYDoc;
  let mockServerConnectionService;

  beforeEach(async () => {
    // Reset modules to avoid cached imports
    jest.resetModules();

    // Mock Y.js WebSocket provider
    MockWebSocketProvider = jest
      .fn()
      .mockImplementation((url, roomName, doc) => ({
        url,
        roomName,
        doc,
        connect: jest.fn(),
        disconnect: jest.fn(),
        destroy: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
        synced: false,
        wsconnected: false,
      }));

    // Mock Y.Doc
    MockYDoc = jest.fn().mockImplementation(() => ({
      getMap: jest.fn(() => ({
        set: jest.fn(),
        get: jest.fn(),
        delete: jest.fn(),
        observe: jest.fn(),
        unobserve: jest.fn(),
        toJSON: jest.fn(() => ({})),
      })),
      transact: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      destroy: jest.fn(),
    }));

    // Mock ServerConnectionService
    mockServerConnectionService = {
      getInstance: jest.fn(() => ({
        getServerUrl: jest.fn(() => 'wss://api.example.com'),
        isServerConfigured: jest.fn(() => true),
        createWebSocketUrl: jest.fn(
          (mapId) => `wss://api.example.com/yjs/${mapId}`,
        ),
      })),
    };

    // Mock the imports (providers don't exist yet - TDD RED phase)
    jest.doMock('y-websocket', () => ({
      WebsocketProvider: MockWebSocketProvider,
    }));

    jest.doMock('yjs', () => ({
      Doc: MockYDoc,
    }));

    jest.doMock(
      '../../../../src/js/services/ServerConnectionService.js',
      () => ({
        ServerConnectionService: mockServerConnectionService,
      }),
    );

    jest.doMock(
      '../../../../src/js/data/providers/WebSocketYjsProvider.js',
      () => ({
        WebSocketYjsProvider: class MockWebSocketYjsProvider {
          constructor() {
            this.doc = null;
            this.wsProvider = null;
            this.mapId = null;
            this.isReady = false;
            this.subscribers = [];
          }

          async setServerUrl(url) {
            throw new Error('setServerUrl not implemented');
          }

          async loadMap(mapId) {
            throw new Error('loadMap not implemented');
          }

          waitForServerSync() {
            throw new Error('waitForServerSync not implemented');
          }

          getSnapshot() {
            throw new Error('getSnapshot not implemented');
          }

          subscribe(callback) {
            throw new Error('subscribe not implemented');
          }

          destroy() {
            throw new Error('destroy not implemented');
          }
        },
      }),
    );

    // Import after mocking
    const module = await import(
      '../../../../src/js/data/providers/WebSocketYjsProvider.js'
    );
    WebSocketYjsProvider = module.WebSocketYjsProvider;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('WebSocket-Only Hydration (Phase 1)', () => {
    test('should connect only after map selection', async () => {
      // RED: WebSocket-only hydration - no connection until loadMap()
      const provider = new WebSocketYjsProvider();
      await provider.setServerUrl('wss://api.example.com');

      expect(provider.wsProvider).toBeNull(); // Not connected yet
      expect(provider.doc).toBeNull(); // No Y.Doc yet

      await provider.loadMap('map-123');

      expect(provider.wsProvider).toBeDefined(); // Now connected
      expect(provider.wsProvider.url).toBe('wss://api.example.com/yjs/map-123');
      expect(provider.mapId).toBe('map-123');
      expect(MockWebSocketProvider).toHaveBeenCalledWith(
        'wss://api.example.com/yjs/map-123',
        'map-123',
        expect.any(Object), // Y.Doc instance
      );
    });

    test('should create Y.Doc only during loadMap', async () => {
      // RED: Lazy Y.Doc creation
      const provider = new WebSocketYjsProvider();

      expect(provider.doc).toBeNull();

      await provider.setServerUrl('wss://api.example.com');
      expect(provider.doc).toBeNull(); // Still null after server config

      await provider.loadMap('test-map');
      expect(provider.doc).toBeDefined(); // Created during loadMap
      expect(MockYDoc).toHaveBeenCalledTimes(1);
    });

    test('should wait for server sync before UI interaction', async () => {
      // RED: waitForServerSync requirement
      const provider = new WebSocketYjsProvider();
      const mockWsProvider = {
        on: jest.fn(),
        synced: false,
      };

      MockWebSocketProvider.mockReturnValueOnce(mockWsProvider);

      await provider.loadMap('test-map');
      const syncPromise = provider.waitForServerSync();

      expect(provider.isReady).toBe(false);

      // Simulate server sync event
      const syncCallback = mockWsProvider.on.mock.calls.find(
        (call) => call[0] === 'sync',
      )[1];
      mockWsProvider.synced = true;
      syncCallback();

      await syncPromise;
      expect(provider.isReady).toBe(true);
    });

    test('should handle connection failures gracefully', async () => {
      // RED: WebSocket connection error handling
      const provider = new WebSocketYjsProvider();
      const mockWsProvider = {
        on: jest.fn(),
        wsconnected: false,
      };

      MockWebSocketProvider.mockReturnValueOnce(mockWsProvider);

      await provider.loadMap('test-map');

      // Simulate connection error
      const errorCallback = mockWsProvider.on.mock.calls.find(
        (call) => call[0] === 'connection-error',
      )[1];

      await expect(
        new Promise((resolve, reject) => {
          errorCallback({ message: 'WebSocket connection failed' });
          reject(new Error('WebSocket connection failed'));
        }),
      ).rejects.toThrow('WebSocket connection failed');
    });
  });

  describe('DataProvider Interface Compliance (Phase 1)', () => {
    test('should implement getSnapshot from Y.Doc data', async () => {
      // RED: DataProvider interface compliance
      const provider = new WebSocketYjsProvider();
      const mockDoc = {
        getMap: jest.fn(() => ({
          toJSON: jest.fn(() => ({
            notes: [{ id: '1', content: 'test' }],
            connections: [],
            meta: { zoomLevel: 5 },
          })),
        })),
      };

      MockYDoc.mockReturnValueOnce(mockDoc);
      await provider.loadMap('test-map');

      const snapshot = provider.getSnapshot();

      expect(snapshot).toEqual({
        data: {
          n: [{ id: '1', content: 'test' }],
          c: [],
        },
        meta: { zoomLevel: 5 },
      });
    });

    test('should support subscription to Y.Doc changes', async () => {
      // RED: Subscription system
      const provider = new WebSocketYjsProvider();
      const mockCallback = jest.fn();
      const mockNotesMap = {
        observe: jest.fn(),
        unobserve: jest.fn(),
      };
      const mockDoc = {
        getMap: jest.fn(() => mockNotesMap),
      };

      MockYDoc.mkReturnValueOnce(mockDoc);
      await provider.loadMap('test-map');

      const unsubscribe = provider.subscribe(mockCallback);

      expect(mockNotesMap.observe).toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');

      // Test unsubscribe
      unsubscribe();
      expect(mockNotesMap.unobserve).toHaveBeenCalled();
    });

    test('should delegate CRUD operations to Y.Doc', async () => {
      // RED: Note and connection operations
      const provider = new WebSocketYjsProvider();
      const mockNotesMap = {
        set: jest.fn(),
        delete: jest.fn(),
      };
      const mockDoc = {
        getMap: jest.fn(() => mockNotesMap),
        transact: jest.fn((callback) => callback()),
      };

      MockYDoc.mockReturnValueOnce(mockDoc);
      await provider.loadMap('test-map');

      // Test note operations
      const noteData = { id: 'test-note', content: 'Hello', pos: [100, 200] };
      await provider.upsertNote(noteData, { origin: 'user' });

      expect(mockDoc.transact).toHaveBeenCalled();
      expect(mockNotesMap.set).toHaveBeenCalledWith('test-note', noteData);

      await provider.deleteNote('test-note', { origin: 'user' });
      expect(mockNotesMap.delete).toHaveBeenCalledWith('test-note');
    });
  });

  describe('Origin Marking Integration (Phase 1)', () => {
    test('should mark all server updates with origin=system', async () => {
      // RED: Prevent feedback loops
      const provider = new WebSocketYjsProvider();
      const mockTransaction = { origin: null };
      const mockDoc = {
        getMap: jest.fn(() => ({})),
        on: jest.fn(),
      };

      MockYDoc.mockReturnValueOnce(mockDoc);
      await provider.loadMap('test-map');

      // Get the update handler
      const updateHandler = mockDoc.on.mock.calls.find(
        (call) => call[0] === 'update',
      )[1];

      updateHandler(mockTransaction);

      expect(mockTransaction.origin).toBe('system');
      expect(provider.shouldTriggerUILogic(mockTransaction)).toBe(false);
    });

    test('should allow user updates to trigger UI logic', async () => {
      // RED: User interactions should work
      const provider = new WebSocketYjsProvider();
      await provider.loadMap('test-map');

      const userTransaction = { origin: 'user' };

      expect(provider.shouldTriggerUILogic(userTransaction)).toBe(true);
    });

    test('should prevent event storms in collaborative scenarios', async () => {
      // RED: Multi-user feedback loop prevention
      const provider = new WebSocketYjsProvider();
      const mockCallback = jest.fn();

      await provider.loadMap('test-map');
      provider.subscribe(mockCallback);

      // Simulate server update (should not trigger callback)
      const systemTransaction = { origin: 'system' };
      provider.handleUpdate(systemTransaction);

      expect(mockCallback).not.toHaveBeenCalled();

      // Simulate user update (should trigger callback)
      const userTransaction = { origin: 'user' };
      provider.handleUpdate(userTransaction);

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({ origin: 'user' }),
      );
    });
  });

  describe('Error Handling and Cleanup (Phase 1)', () => {
    test('should handle Y.Doc creation failures', async () => {
      // RED: Robust error handling
      MockYDoc.mockImplementationOnce(() => {
        throw new Error('Y.Doc creation failed');
      });

      const provider = new WebSocketYjsProvider();

      await expect(provider.loadMap('test-map')).rejects.toThrow(
        'Y.Doc creation failed',
      );
    });

    test('should handle WebSocket provider creation failures', async () => {
      // RED: WebSocket error handling
      MockWebSocketProvider.mockImplementationOnce(() => {
        throw new Error('WebSocket provider creation failed');
      });

      const provider = new WebSocketYjsProvider();

      await expect(provider.loadMap('test-map')).rejects.toThrow(
        'WebSocket provider creation failed',
      );
    });

    test('should cleanup resources on destroy', async () => {
      // RED: Memory leak prevention
      const provider = new WebSocketYjsProvider();
      const mockWsProvider = {
        destroy: jest.fn(),
      };
      const mockDoc = {
        destroy: jest.fn(),
        getMap: jest.fn(() => ({})),
      };

      MockWebSocketProvider.mockReturnValueOnce(mockWsProvider);
      MockYDoc.mockReturnValueOnce(mockDoc);

      await provider.loadMap('test-map');
      provider.destroy();

      expect(mockWsProvider.destroy).toHaveBeenCalled();
      expect(mockDoc.destroy).toHaveBeenCalled();
      expect(provider.wsProvider).toBeNull();
      expect(provider.doc).toBeNull();
    });
  });

  describe('Integration Requirements (Phase 1)', () => {
    test('should integrate with ServerConnectionService', async () => {
      // RED: Service integration
      const provider = new WebSocketYjsProvider();

      await provider.setServerUrl('wss://custom.example.com');
      await provider.loadMap('integration-test');

      expect(
        mockServerConnectionService.getInstance().createWebSocketUrl,
      ).toHaveBeenCalledWith('integration-test');
    });

    test('should support feature flag for provider switching', () => {
      // RED: Feature flag compatibility
      const provider = new WebSocketYjsProvider();

      expect(provider.providerType).toBe('websocket-yjs');
      expect(provider.supportsCollaboration).toBe(true);
      expect(provider.requiresServer).toBe(true);
    });

    test('should maintain compatibility with existing DataProvider interface', async () => {
      // RED: Backward compatibility
      const provider = new WebSocketYjsProvider();

      // Verify all DataProvider methods exist
      const expectedMethods = [
        'init',
        'destroy',
        'subscribe',
        'getSnapshot',
        'importJSON',
        'exportJSON',
        'upsertNote',
        'deleteNote',
        'upsertConnection',
        'deleteConnection',
        'setMeta',
        'getMeta',
      ];

      expectedMethods.forEach((methodName) => {
        expect(typeof provider[methodName]).toBe('function');
      });
    });
  });
});
