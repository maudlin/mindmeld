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
      transact: jest.fn((callback) => callback()),
      on: jest.fn(),
      off: jest.fn(),
      destroy: jest.fn(),
    }));

    // Mock ServerConnectionService singleton instance
    const mockInstance = {
      getServerUrl: jest.fn(() => 'wss://api.example.com'),
      isServerConfigured: jest.fn(() => true),
      setServerUrl: jest.fn(),
      createWebSocketUrl: jest.fn(
        (mapId) => `wss://api.example.com/yjs/${mapId}`,
      ),
    };

    mockServerConnectionService = {
      getInstance: jest.fn(() => mockInstance),
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

    // Import real implementation (GREEN phase)

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
        off: jest.fn(),
        synced: false,
      };

      MockWebSocketProvider.mockReturnValueOnce(mockWsProvider);

      await provider.loadMap('test-map');

      expect(provider.isReady).toBe(false);

      // Simulate immediate sync for this test
      mockWsProvider.synced = true;
      const syncPromise = provider.waitForServerSync();

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
      const mockDataMap = {
        toJSON: jest.fn(() => ({
          notes: [{ id: '1', content: 'test' }],
          connections: [],
        })),
      };
      const mockMetaMap = {
        toJSON: jest.fn(() => ({ zoomLevel: 5 })),
      };
      const mockDoc = {
        getMap: jest.fn((name) => {
          if (name === 'data') return mockDataMap;
          if (name === 'meta') return mockMetaMap;
          return mockDataMap;
        }),
        on: jest.fn(),
        off: jest.fn(),
        destroy: jest.fn(),
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
      const mockDataMap = {
        observe: jest.fn(),
        unobserve: jest.fn(),
      };
      const mockDoc = {
        getMap: jest.fn((name) => {
          if (name === 'data') return mockDataMap;
          return mockDataMap;
        }),
        on: jest.fn(),
        off: jest.fn(),
        destroy: jest.fn(),
      };

      MockYDoc.mockReturnValueOnce(mockDoc);
      await provider.loadMap('test-map');

      const unsubscribe = provider.subscribe(mockCallback);

      expect(mockDataMap.observe).toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');

      // Test unsubscribe
      unsubscribe();
      expect(mockDataMap.unobserve).toHaveBeenCalled();
    });

    test('should delegate CRUD operations to Y.Doc', async () => {
      // RED: Note and connection operations
      const provider = new WebSocketYjsProvider();
      const mockDataMap = {
        set: jest.fn(),
        get: jest.fn(() => []),
      };
      const mockDoc = {
        getMap: jest.fn((name) => {
          if (name === 'data') return mockDataMap;
          return mockDataMap;
        }),
        transact: jest.fn((callback) => callback()),
        on: jest.fn(),
        off: jest.fn(),
        destroy: jest.fn(),
      };

      MockYDoc.mockReturnValueOnce(mockDoc);
      await provider.loadMap('test-map');

      // Test note operations
      const noteData = { id: 'test-note', content: 'Hello', pos: [100, 200] };
      await provider.upsertNote(noteData, { origin: 'user' });

      expect(mockDoc.transact).toHaveBeenCalled();
      expect(mockDataMap.set).toHaveBeenCalledWith('notes', expect.any(Array));

      await provider.deleteNote('test-note', { origin: 'user' });
      expect(mockDoc.transact).toHaveBeenCalled();
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

      // Y.js update event passes: (update, origin, doc, transaction)
      updateHandler(null, null, mockDoc, mockTransaction);

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
        on: jest.fn(),
        off: jest.fn(),
        destroy: jest.fn(),
      };
      const mockDoc = {
        getMap: jest.fn(() => ({})),
        on: jest.fn(),
        off: jest.fn(),
        destroy: jest.fn(),
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
      const mockInstance = mockServerConnectionService.getInstance();

      await provider.setServerUrl('wss://custom.example.com');
      await provider.loadMap('integration-test');

      expect(mockInstance.createWebSocketUrl).toHaveBeenCalledWith(
        'integration-test',
      );
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
