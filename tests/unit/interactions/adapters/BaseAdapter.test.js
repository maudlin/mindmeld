// tests/unit/interactions/adapters/BaseAdapter.test.js

describe('BaseAdapter', () => {
  let BaseAdapter;
  let TestAdapter;
  let testAdapter;
  let mockEventBus;

  beforeEach(async () => {
    // Reset modules
    jest.resetModules();

    // Create mock event bus
    mockEventBus = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    };

    // Import the module to test
    const module = await import(
      '../../../../src/js/interactions/adapters/BaseAdapter.js'
    );
    BaseAdapter = module.BaseAdapter;

    // Create test implementation
    TestAdapter = class extends BaseAdapter {
      constructor() {
        super();
        this.name = 'test';
      }

      initializeEventListeners() {
        // Override in test implementation
        this.isListenersInitialized = true;
      }

      destroyEventListeners() {
        // Override in test implementation
        this.isListenersInitialized = false;
      }
    };

    testAdapter = new TestAdapter();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with default state', () => {
      expect(testAdapter.eventBus).toBeNull();
      expect(testAdapter.isInitialized).toBe(false);
      expect(testAdapter.name).toBe('test');
    });

    it('should require name to be defined in subclass', () => {
      class UnnamedAdapter extends BaseAdapter {}
      const unnamedAdapter = new UnnamedAdapter();

      expect(() => unnamedAdapter.getName()).toThrow(
        'Adapter name must be defined',
      );
    });
  });

  describe('Initialization', () => {
    it('should initialize with event bus', async () => {
      await testAdapter.init(mockEventBus);

      expect(testAdapter.eventBus).toBe(mockEventBus);
      expect(testAdapter.isInitialized).toBe(true);
      expect(testAdapter.isListenersInitialized).toBe(true);
    });

    it('should prevent double initialization', async () => {
      await testAdapter.init(mockEventBus);

      await expect(testAdapter.init(mockEventBus)).rejects.toThrow(
        'Adapter is already initialized',
      );
    });

    it('should require event bus parameter', async () => {
      await expect(testAdapter.init(null)).rejects.toThrow(
        'EventBus is required for adapter initialization',
      );
    });

    it('should call lifecycle methods in correct order', async () => {
      const lifecycleCalls = [];

      testAdapter.initializeEventListeners = jest.fn(() => {
        lifecycleCalls.push('initializeEventListeners');
      });

      testAdapter.onInitialized = jest.fn(() => {
        lifecycleCalls.push('onInitialized');
      });

      await testAdapter.init(mockEventBus);

      expect(lifecycleCalls).toEqual([
        'initializeEventListeners',
        'onInitialized',
      ]);
    });
  });

  describe('Event Emission', () => {
    beforeEach(async () => {
      await testAdapter.init(mockEventBus);
    });

    it('should emit events through event bus', () => {
      const eventData = { x: 100, y: 200 };

      testAdapter.emit('test.event', eventData);

      expect(mockEventBus.emit).toHaveBeenCalledWith('test.event', {
        x: 100,
        y: 200,
        _adapter: 'test',
        _timestamp: expect.any(Number),
      });
    });

    it('should prevent emission before initialization', () => {
      const uninitializedAdapter = new TestAdapter();

      expect(() => {
        uninitializedAdapter.emit('test.event', {});
      }).toThrow('Cannot emit events before adapter initialization');
    });

    it('should add adapter metadata to emitted events', () => {
      testAdapter.emit('gesture.detected', { type: 'tap' });

      expect(mockEventBus.emit).toHaveBeenCalledWith('gesture.detected', {
        type: 'tap',
        _adapter: 'test',
        _timestamp: expect.any(Number),
      });
    });
  });

  describe('Cleanup', () => {
    beforeEach(async () => {
      await testAdapter.init(mockEventBus);
    });

    it('should cleanup properly on destroy', async () => {
      await testAdapter.destroy();

      expect(testAdapter.isInitialized).toBe(false);
      expect(testAdapter.eventBus).toBeNull();
      expect(testAdapter.isListenersInitialized).toBe(false);
    });

    it('should call lifecycle methods during destroy', async () => {
      testAdapter.destroyEventListeners = jest.fn();
      testAdapter.onDestroyed = jest.fn();

      await testAdapter.destroy();

      expect(testAdapter.destroyEventListeners).toHaveBeenCalled();
      expect(testAdapter.onDestroyed).toHaveBeenCalled();
    });

    it('should handle destroy before initialization', async () => {
      const uninitializedAdapter = new TestAdapter();

      await expect(uninitializedAdapter.destroy()).resolves.not.toThrow();
      expect(uninitializedAdapter.isInitialized).toBe(false);
    });

    it('should prevent operations after destroy', async () => {
      await testAdapter.destroy();

      expect(() => {
        testAdapter.emit('test.event', {});
      }).toThrow('Cannot emit events before adapter initialization');
    });
  });

  describe('Abstract Method Enforcement', () => {
    it('should require initializeEventListeners implementation', async () => {
      class IncompleteAdapter extends BaseAdapter {
        constructor() {
          super();
          this.name = 'incomplete';
        }
        destroyEventListeners() {}
      }

      const adapter = new IncompleteAdapter();
      await expect(adapter.init(mockEventBus)).rejects.toThrow(
        'initializeEventListeners must be implemented',
      );
    });

    it('should require destroyEventListeners implementation', async () => {
      class IncompleteAdapter extends BaseAdapter {
        constructor() {
          super();
          this.name = 'incomplete';
        }
        initializeEventListeners() {}
      }

      const adapter = new IncompleteAdapter();
      await adapter.init(mockEventBus);
      await expect(adapter.destroy()).rejects.toThrow(
        'destroyEventListeners must be implemented',
      );
    });
  });

  describe('State Management', () => {
    it('should track initialization state correctly', async () => {
      expect(testAdapter.isInitialized).toBe(false);

      await testAdapter.init(mockEventBus);
      expect(testAdapter.isInitialized).toBe(true);

      await testAdapter.destroy();
      expect(testAdapter.isInitialized).toBe(false);
    });

    it('should provide adapter information', () => {
      expect(testAdapter.getName()).toBe('test');
      expect(testAdapter.getState()).toEqual({
        name: 'test',
        isInitialized: false,
        hasEventBus: false,
      });
    });

    it('should update state after initialization', async () => {
      await testAdapter.init(mockEventBus);

      expect(testAdapter.getState()).toEqual({
        name: 'test',
        isInitialized: true,
        hasEventBus: true,
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in lifecycle methods gracefully', async () => {
      testAdapter.initializeEventListeners = jest.fn(() => {
        throw new Error('Listener setup failed');
      });

      await expect(testAdapter.init(mockEventBus)).rejects.toThrow(
        'Failed to initialize test adapter: Listener setup failed',
      );
      expect(testAdapter.isInitialized).toBe(false);
    });

    it('should handle errors during destroy', async () => {
      await testAdapter.init(mockEventBus);

      testAdapter.destroyEventListeners = jest.fn(() => {
        throw new Error('Cleanup failed');
      });

      await expect(testAdapter.destroy()).rejects.toThrow(
        'Failed to destroy test adapter: Cleanup failed',
      );
    });
  });
});
