// tests/unit/interactions/adapters/DesktopAdapter.menu.test.js

import { DesktopAdapter } from '../../../../src/js/interactions/adapters/DesktopAdapter.js';

describe('DesktopAdapter Menu Integration', () => {
  let desktopAdapter;
  let mockInteractionController;
  let mockMenuBehavior;
  let mockEventBus;
  let mockCanvas;
  let mockCanvasContainer;
  let mockKebabButton;
  let mockKebabMenu;
  let mockMenuItem;

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';

    // Create mock canvas elements
    mockCanvasContainer = document.createElement('div');
    mockCanvasContainer.id = 'canvas-container';

    mockCanvas = document.createElement('div');
    mockCanvas.id = 'canvas';
    mockCanvasContainer.appendChild(mockCanvas);

    // Create mock kebab menu elements following HTML structure
    mockKebabButton = document.createElement('div');
    mockKebabButton.className = 'kebab-menu-button';
    mockKebabButton.id = 'kebab-menu-button';
    mockKebabButton.setAttribute('role', 'button');
    mockKebabButton.setAttribute('aria-haspopup', 'true');
    mockKebabButton.setAttribute('aria-expanded', 'false');

    mockKebabMenu = document.createElement('div');
    mockKebabMenu.className = 'kebab-context-menu';
    mockKebabMenu.id = 'kebab-context-menu';
    mockKebabMenu.setAttribute('aria-hidden', 'true');

    mockMenuItem = document.createElement('div');
    mockMenuItem.className = 'kebab-menu-item';
    mockMenuItem.setAttribute('data-action', 'clear-canvas');
    mockMenuItem.setAttribute('role', 'menuitem');
    mockMenuItem.textContent = 'Clear Canvas';

    mockKebabMenu.appendChild(mockMenuItem);

    // Add elements to DOM
    document.body.appendChild(mockCanvasContainer);
    document.body.appendChild(mockKebabButton);
    document.body.appendChild(mockKebabMenu);

    // Create mock EventBus
    mockEventBus = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      once: jest.fn(),
    };

    // Create mock MenuBehavior
    mockMenuBehavior = {
      handleMenuButtonAction: jest.fn(),
      handleMenuAction: jest.fn(),
      initialize: jest.fn().mockResolvedValue(),
      destroy: jest.fn().mockResolvedValue(),
    };

    // Create mock InteractionController with MenuBehavior
    mockInteractionController = {
      getBehavior: jest.fn((name) => {
        if (name === 'menu') return mockMenuBehavior;
        return null;
      }),
      behaviors: new Map([['menu', mockMenuBehavior]]),
      isInitialized: true,
    };

    // Create DesktopAdapter instance
    desktopAdapter = new DesktopAdapter(mockInteractionController);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('Kebab Menu Button Detection', () => {
    beforeEach(async () => {
      await desktopAdapter.initialize(mockEventBus);
    });

    test('should detect kebab menu button click', () => {
      const mockEvent = {
        button: 0, // Left click
        target: mockKebabButton,
        clientX: 100,
        clientY: 50,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      };

      // Simulate pointer down on kebab button
      desktopAdapter.handlePointerDown(mockEvent);

      // Should call detectInteractionStart which handles kebab button
      expect(mockMenuBehavior.handleMenuButtonAction).toHaveBeenCalledWith(
        'desktop',
      );
    });

    test('should not detect kebab menu button on right click', () => {
      const mockEvent = {
        button: 2, // Right click
        target: mockKebabButton,
        clientX: 100,
        clientY: 50,
      };

      desktopAdapter.handlePointerDown(mockEvent);

      expect(mockMenuBehavior.handleMenuButtonAction).not.toHaveBeenCalled();
    });

    test('should detect kebab menu button via keyboard', () => {
      const mockEvent = {
        key: 'Enter',
        target: mockKebabButton,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      };

      desktopAdapter.handleKeyDown(mockEvent);

      expect(mockMenuBehavior.handleMenuButtonAction).toHaveBeenCalledWith(
        'desktop',
      );
    });

    test('should detect kebab menu button via spacebar', () => {
      const mockEvent = {
        key: ' ',
        target: mockKebabButton,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      };

      desktopAdapter.handleKeyDown(mockEvent);

      expect(mockMenuBehavior.handleMenuButtonAction).toHaveBeenCalledWith(
        'desktop',
      );
    });
  });

  describe('Kebab Menu Item Detection', () => {
    beforeEach(async () => {
      await desktopAdapter.initialize(mockEventBus);
    });

    test('should detect menu item click', () => {
      const mockEvent = {
        button: 0, // Left click
        target: mockMenuItem,
        clientX: 100,
        clientY: 50,
      };

      desktopAdapter.handlePointerDown(mockEvent);

      expect(mockMenuBehavior.handleMenuAction).toHaveBeenCalledWith(
        'clear-canvas',
        'desktop',
      );
    });

    test('should detect menu item via keyboard Enter', () => {
      const mockEvent = {
        key: 'Enter',
        target: mockMenuItem,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      };

      desktopAdapter.handleKeyDown(mockEvent);

      expect(mockMenuBehavior.handleMenuAction).toHaveBeenCalledWith(
        'clear-canvas',
        'desktop',
      );
    });

    test('should detect menu item via spacebar', () => {
      const mockEvent = {
        key: ' ',
        target: mockMenuItem,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      };

      desktopAdapter.handleKeyDown(mockEvent);

      expect(mockMenuBehavior.handleMenuAction).toHaveBeenCalledWith(
        'clear-canvas',
        'desktop',
      );
    });

    test('should handle menu item without data-action gracefully', () => {
      const menuItemWithoutAction = document.createElement('div');
      menuItemWithoutAction.className = 'kebab-menu-item';
      mockKebabMenu.appendChild(menuItemWithoutAction);

      const mockEvent = {
        button: 0,
        target: menuItemWithoutAction,
        clientX: 100,
        clientY: 50,
      };

      expect(() => {
        desktopAdapter.handlePointerDown(mockEvent);
      }).not.toThrow();

      // Should call with undefined action - MenuBehavior should handle gracefully
      expect(mockMenuBehavior.handleMenuAction).toHaveBeenCalledWith(
        undefined,
        'desktop',
      );
    });
  });

  describe('Menu Integration with Existing Interactions', () => {
    beforeEach(async () => {
      await desktopAdapter.initialize(mockEventBus);
    });

    test('should not interfere with canvas interactions', () => {
      const mockEvent = {
        button: 0,
        target: mockCanvas,
        clientX: 100,
        clientY: 50,
      };

      desktopAdapter.handlePointerDown(mockEvent);

      // Should not call menu behavior for canvas interactions
      expect(mockMenuBehavior.handleMenuButtonAction).not.toHaveBeenCalled();
      expect(mockMenuBehavior.handleMenuAction).not.toHaveBeenCalled();
    });

    test('should not interfere with note interactions', () => {
      const mockNote = document.createElement('div');
      mockNote.className = 'note';
      mockCanvas.appendChild(mockNote);

      const mockEvent = {
        button: 0,
        target: mockNote,
        clientX: 100,
        clientY: 50,
      };

      desktopAdapter.handlePointerDown(mockEvent);

      // Should not call menu behavior for note interactions
      expect(mockMenuBehavior.handleMenuButtonAction).not.toHaveBeenCalled();
      expect(mockMenuBehavior.handleMenuAction).not.toHaveBeenCalled();
    });
  });

  describe('MenuBehavior Availability', () => {
    test('should handle missing MenuBehavior gracefully', async () => {
      // Create adapter without MenuBehavior
      const mockControllerWithoutMenu = {
        getBehavior: jest.fn(() => null),
        behaviors: new Map(),
        isInitialized: true,
      };

      const adapterWithoutMenu = new DesktopAdapter(mockControllerWithoutMenu);
      await adapterWithoutMenu.initialize(mockEventBus);

      const mockEvent = {
        button: 0,
        target: mockKebabButton,
        clientX: 100,
        clientY: 50,
      };

      // Should not throw error when MenuBehavior is not available
      expect(() => {
        adapterWithoutMenu.handlePointerDown(mockEvent);
      }).not.toThrow();
    });

    test('should log warning when MenuBehavior is not available', async () => {
      console.warn = jest.fn();

      const mockControllerWithoutMenu = {
        getBehavior: jest.fn(() => null),
        behaviors: new Map(),
        isInitialized: true,
      };

      const adapterWithoutMenu = new DesktopAdapter(mockControllerWithoutMenu);
      await adapterWithoutMenu.initialize(mockEventBus);

      const mockEvent = {
        button: 0,
        target: mockKebabButton,
        clientX: 100,
        clientY: 50,
      };

      adapterWithoutMenu.handlePointerDown(mockEvent);

      expect(console.warn).toHaveBeenCalledWith(
        'DesktopAdapter: MenuBehavior not available for kebab menu interaction',
      );
    });
  });

  describe('Event Delegation Priority', () => {
    beforeEach(async () => {
      await desktopAdapter.initialize(mockEventBus);
    });

    test('should handle kebab button clicks before other handlers', () => {
      // Test that menu button detection happens early in detectInteractionStart
      const spy = jest.spyOn(desktopAdapter, 'detectInteractionStart');

      const mockEvent = {
        button: 0,
        target: mockKebabButton,
        clientX: 100,
        clientY: 50,
      };

      desktopAdapter.handlePointerDown(mockEvent);

      expect(spy).toHaveBeenCalled();
      expect(mockMenuBehavior.handleMenuButtonAction).toHaveBeenCalledWith(
        'desktop',
      );
    });

    test('should handle menu item clicks with proper action extraction', () => {
      // Test data-action attribute extraction
      mockMenuItem.setAttribute('data-action', 'export-file');

      const mockEvent = {
        button: 0,
        target: mockMenuItem,
        clientX: 100,
        clientY: 50,
      };

      desktopAdapter.handlePointerDown(mockEvent);

      expect(mockMenuBehavior.handleMenuAction).toHaveBeenCalledWith(
        'export-file',
        'desktop',
      );
    });
  });
});
