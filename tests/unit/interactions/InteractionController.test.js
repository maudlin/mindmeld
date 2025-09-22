/**
 * InteractionController - Unit Tests
 *
 * Tests the central orchestrator for all interaction behaviors.
 * Following TDD approach for ToolbarBehavior integration.
 */

import { InteractionController } from '../../../src/js/interactions/InteractionController.js';

// Mock all behavior dependencies
jest.mock('../../../src/js/interactions/behaviors/NoteBehavior.js', () => ({
  NoteBehavior: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('../../../src/js/interactions/behaviors/DragBehavior.js', () => ({
  DragBehavior: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock(
  '../../../src/js/interactions/behaviors/SelectionBoxBehavior.js',
  () => ({
    SelectionBoxBehavior: jest.fn().mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn().mockResolvedValue(undefined),
    })),
  }),
);

jest.mock('../../../src/js/interactions/behaviors/CanvasBehavior.js', () => ({
  CanvasBehavior: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock(
  '../../../src/js/interactions/behaviors/ConnectionBehavior.js',
  () => ({
    ConnectionBehavior: jest.fn().mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn().mockResolvedValue(undefined),
    })),
  }),
);

jest.mock('../../../src/js/interactions/behaviors/ViewportBehavior.js', () => ({
  ViewportBehavior: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('../../../src/js/interactions/behaviors/MenuBehavior.js', () => ({
  MenuBehavior: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('../../../src/js/interactions/behaviors/ToolbarBehavior.js', () => ({
  ToolbarBehavior: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
    cleanup: jest.fn(),
  })),
}));

jest.mock(
  '../../../src/js/features/serverConnection/serverConnectionBehavior.js',
  () => ({
    ServerConnectionBehavior: jest.fn().mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn().mockResolvedValue(undefined),
    })),
  }),
);

jest.mock(
  '../../../src/js/features/mapSelection/mapSelectionBehavior.js',
  () => ({
    MapSelectionBehavior: jest.fn().mockImplementation(() => ({
      initialize: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn().mockResolvedValue(undefined),
    })),
  }),
);

// Mock the viewport adapter import
jest.mock('../../../src/js/features/zoom/viewportAdapter.js', () => ({
  setViewportBehavior: jest.fn(),
}));

describe('InteractionController', () => {
  let interactionController;
  let mockEventBus;

  beforeEach(() => {
    // Create mock event bus
    mockEventBus = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    };

    // Mock console methods
    global.console = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    // Create new InteractionController instance
    interactionController = new InteractionController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should create InteractionController instance', () => {
      expect(interactionController).toBeDefined();
      expect(interactionController.isInitialized).toBe(false);
      expect(interactionController.behaviors).toBeDefined();
      expect(interactionController.behaviors.size).toBe(0);
    });

    test('should initialize with all behaviors including ToolbarBehavior', async () => {
      await interactionController.initialize(mockEventBus);

      expect(interactionController.isInitialized).toBe(true);
      expect(interactionController.behaviors.size).toBe(10); // All behaviors including toolbar

      // Verify ToolbarBehavior is registered
      expect(interactionController.getBehavior('toolbar')).toBeDefined();
    });

    test('should initialize ToolbarBehavior during startup', async () => {
      await interactionController.initialize(mockEventBus);

      const toolbarBehavior = interactionController.getBehavior('toolbar');
      expect(toolbarBehavior).toBeDefined();
      expect(toolbarBehavior.initialize).toHaveBeenCalled();
    });

    test('should not initialize twice', async () => {
      await interactionController.initialize(mockEventBus);
      await interactionController.initialize(mockEventBus);

      expect(interactionController.isInitialized).toBe(true);
      // Should only register behaviors once
      expect(interactionController.behaviors.size).toBe(10);
    });
  });

  describe('Behavior Registration', () => {
    test('should register ToolbarBehavior with correct name', async () => {
      await interactionController.initialize(mockEventBus);

      const registeredBehaviors = Array.from(
        interactionController.behaviors.keys(),
      );
      expect(registeredBehaviors).toContain('toolbar');
    });

    test('should allow getting ToolbarBehavior by name', async () => {
      await interactionController.initialize(mockEventBus);

      const toolbarBehavior = interactionController.getBehavior('toolbar');
      expect(toolbarBehavior).toBeDefined();
      expect(typeof toolbarBehavior.initialize).toBe('function');
    });

    test('should return undefined for non-existent behavior', async () => {
      await interactionController.initialize(mockEventBus);

      const nonExistentBehavior =
        interactionController.getBehavior('nonexistent');
      expect(nonExistentBehavior).toBeUndefined();
    });
  });

  describe('ToolbarBehavior Integration', () => {
    test('should create ToolbarBehavior instance with eventBus', async () => {
      const { ToolbarBehavior } = await import(
        '../../../src/js/interactions/behaviors/ToolbarBehavior.js'
      );

      await interactionController.initialize(mockEventBus);

      expect(ToolbarBehavior).toHaveBeenCalledWith(mockEventBus);
    });

    test('should initialize ToolbarBehavior after registration', async () => {
      await interactionController.initialize(mockEventBus);

      const toolbarBehavior = interactionController.getBehavior('toolbar');
      expect(toolbarBehavior.initialize).toHaveBeenCalled();
    });

    test('should include ToolbarBehavior in state information', async () => {
      await interactionController.initialize(mockEventBus);

      const state = interactionController.getState();
      expect(state.behaviors).toContain('toolbar');
      expect(state.behaviorCount).toBe(10);
    });
  });

  describe('Cleanup and Destruction', () => {
    test('should cleanup ToolbarBehavior during destruction', async () => {
      await interactionController.initialize(mockEventBus);
      const toolbarBehavior = interactionController.getBehavior('toolbar');

      await interactionController.destroy();

      expect(toolbarBehavior.destroy).toHaveBeenCalled();
    });

    test('should clear all behaviors including ToolbarBehavior', async () => {
      await interactionController.initialize(mockEventBus);
      expect(interactionController.behaviors.size).toBe(10);

      await interactionController.destroy();

      expect(interactionController.behaviors.size).toBe(0);
      expect(interactionController.getBehavior('toolbar')).toBeUndefined();
    });

    test('should reset initialization state after cleanup', async () => {
      await interactionController.initialize(mockEventBus);
      expect(interactionController.isInitialized).toBe(true);

      await interactionController.cleanup();

      expect(interactionController.isInitialized).toBe(false);
    });
  });

  describe('Event Coordination', () => {
    test('should set up event listeners for interaction coordination', async () => {
      await interactionController.initialize(mockEventBus);

      expect(mockEventBus.on).toHaveBeenCalledWith(
        'interaction.start',
        expect.any(Function),
      );
      expect(mockEventBus.on).toHaveBeenCalledWith(
        'interaction.end',
        expect.any(Function),
      );
      expect(mockEventBus.on).toHaveBeenCalledWith(
        'interaction.cancel',
        expect.any(Function),
      );
    });

    test('should handle interaction state changes that affect toolbar context', async () => {
      await interactionController.initialize(mockEventBus);

      // Simulate interaction start
      const startHandler = mockEventBus.on.mock.calls.find(
        (call) => call[0] === 'interaction.start',
      )[1];
      startHandler({ type: 'selection', behavior: 'mockBehavior' });

      expect(interactionController.activeInteraction).toBe('selection');
    });
  });
});
