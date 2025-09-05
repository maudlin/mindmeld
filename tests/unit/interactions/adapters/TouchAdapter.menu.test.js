// tests/unit/interactions/adapters/TouchAdapter.menu.test.js

import { TouchAdapter } from '../../../../src/js/interactions/adapters/TouchAdapter.js';

describe('TouchAdapter Menu Integration', () => {
  let touchAdapter;
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

    // Create TouchAdapter instance
    touchAdapter = new TouchAdapter(mockInteractionController);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('Kebab Menu Button Detection', () => {
    beforeEach(async () => {
      await touchAdapter.initialize(mockEventBus);
    });

    test('should detect kebab menu button tap', () => {
      const mockTouch = {
        clientX: 100,
        clientY: 50,
        target: mockKebabButton,
      };

      // Simulate touch tap on kebab button
      touchAdapter.handleTap(mockTouch);

      // Should call MenuBehavior with touch adapter identifier
      expect(mockMenuBehavior.handleMenuButtonAction).toHaveBeenCalledWith(
        'touch',
      );
    });

    test('should handle kebab menu button tap via expandTouchTarget', () => {
      // Create a child element inside the kebab button (like the SVG)
      const mockSvg = document.createElement('svg');
      mockKebabButton.appendChild(mockSvg);

      const mockTouch = {
        clientX: 100,
        clientY: 50,
        target: mockSvg, // Touch hits child element
      };

      // Mock expandTouchTarget to return the kebab button
      jest
        .spyOn(touchAdapter, 'expandTouchTarget')
        .mockReturnValue(mockKebabButton);

      touchAdapter.handleTap(mockTouch);

      expect(mockMenuBehavior.handleMenuButtonAction).toHaveBeenCalledWith(
        'touch',
      );
    });

    test('should not detect kebab menu button during double tap', () => {
      // Set double tap flag
      touchAdapter.isDoubleTapInProgress = true;

      const mockTouch = {
        clientX: 100,
        clientY: 50,
        target: mockKebabButton,
      };

      touchAdapter.handleTap(mockTouch);

      // Should not call menu behavior during double tap
      expect(mockMenuBehavior.handleMenuButtonAction).not.toHaveBeenCalled();
    });
  });

  describe('Kebab Menu Item Detection', () => {
    beforeEach(async () => {
      await touchAdapter.initialize(mockEventBus);
    });

    test('should detect menu item tap', () => {
      const mockTouch = {
        clientX: 100,
        clientY: 50,
        target: mockMenuItem,
      };

      touchAdapter.handleTap(mockTouch);

      expect(mockMenuBehavior.handleMenuAction).toHaveBeenCalledWith(
        'clear-canvas',
        'touch',
      );
    });

    test('should detect menu item tap via expandTouchTarget', () => {
      // Create a child element inside the menu item (like the span)
      const mockSpan = document.createElement('span');
      mockSpan.textContent = 'Clear Canvas';
      mockMenuItem.appendChild(mockSpan);

      const mockTouch = {
        clientX: 100,
        clientY: 50,
        target: mockSpan,
      };

      // Mock expandTouchTarget to return the menu item
      jest
        .spyOn(touchAdapter, 'expandTouchTarget')
        .mockReturnValue(mockMenuItem);

      touchAdapter.handleTap(mockTouch);

      expect(mockMenuBehavior.handleMenuAction).toHaveBeenCalledWith(
        'clear-canvas',
        'touch',
      );
    });

    test('should handle menu item without data-action gracefully', () => {
      const menuItemWithoutAction = document.createElement('div');
      menuItemWithoutAction.className = 'kebab-menu-item';
      mockKebabMenu.appendChild(menuItemWithoutAction);

      const mockTouch = {
        clientX: 100,
        clientY: 50,
        target: menuItemWithoutAction,
      };

      expect(() => {
        touchAdapter.handleTap(mockTouch);
      }).not.toThrow();

      // Should call with undefined action - MenuBehavior should handle gracefully
      expect(mockMenuBehavior.handleMenuAction).toHaveBeenCalledWith(
        undefined,
        'touch',
      );
    });

    test('should handle menu item with different data-action values', () => {
      // Test different action types
      const testCases = [
        { action: 'export-file', expected: 'export-file' },
        { action: 'import-file', expected: 'import-file' },
        { action: 'copy-clipboard', expected: 'copy-clipboard' },
      ];

      testCases.forEach(({ action, expected }) => {
        jest.clearAllMocks();
        mockMenuItem.setAttribute('data-action', action);

        const mockTouch = {
          clientX: 100,
          clientY: 50,
          target: mockMenuItem,
        };

        touchAdapter.handleTap(mockTouch);

        expect(mockMenuBehavior.handleMenuAction).toHaveBeenCalledWith(
          expected,
          'touch',
        );
      });
    });
  });

  describe('Menu Integration with Touch Gestures', () => {
    beforeEach(async () => {
      await touchAdapter.initialize(mockEventBus);
    });

    test('should not interfere with canvas tap handling', () => {
      const mockTouch = {
        clientX: 100,
        clientY: 50,
        target: mockCanvas,
      };

      // Mock expandTouchTarget to return canvas
      jest.spyOn(touchAdapter, 'expandTouchTarget').mockReturnValue(mockCanvas);

      touchAdapter.handleTap(mockTouch);

      // Should not call menu behavior for canvas interactions
      expect(mockMenuBehavior.handleMenuButtonAction).not.toHaveBeenCalled();
      expect(mockMenuBehavior.handleMenuAction).not.toHaveBeenCalled();
    });

    test('should not interfere with note tap handling', () => {
      const mockNote = document.createElement('div');
      mockNote.className = 'note';
      mockCanvas.appendChild(mockNote);

      const mockTouch = {
        clientX: 100,
        clientY: 50,
        target: mockNote,
      };

      // Mock expandTouchTarget to return note
      jest.spyOn(touchAdapter, 'expandTouchTarget').mockReturnValue(mockNote);

      touchAdapter.handleTap(mockTouch);

      // Should not call menu behavior for note interactions
      expect(mockMenuBehavior.handleMenuButtonAction).not.toHaveBeenCalled();
      expect(mockMenuBehavior.handleMenuAction).not.toHaveBeenCalled();
    });

    test('should not interfere with ghost connector tap handling', () => {
      const mockGhostConnector = document.createElement('div');
      mockGhostConnector.className = 'ghost-connector';
      mockCanvas.appendChild(mockGhostConnector);

      const mockTouch = {
        clientX: 100,
        clientY: 50,
        target: mockGhostConnector,
      };

      // Mock expandTouchTarget to return ghost connector
      jest
        .spyOn(touchAdapter, 'expandTouchTarget')
        .mockReturnValue(mockGhostConnector);

      touchAdapter.handleTap(mockTouch);

      // Should not call menu behavior for ghost connector interactions
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

      const adapterWithoutMenu = new TouchAdapter(mockControllerWithoutMenu);
      await adapterWithoutMenu.initialize(mockEventBus);

      const mockTouch = {
        clientX: 100,
        clientY: 50,
        target: mockKebabButton,
      };

      // Should not throw error when MenuBehavior is not available
      expect(() => {
        adapterWithoutMenu.handleTap(mockTouch);
      }).not.toThrow();
    });

    test('should log warning when MenuBehavior is not available', async () => {
      console.warn = jest.fn();

      const mockControllerWithoutMenu = {
        getBehavior: jest.fn(() => null),
        behaviors: new Map(),
        isInitialized: true,
      };

      const adapterWithoutMenu = new TouchAdapter(mockControllerWithoutMenu);
      await adapterWithoutMenu.initialize(mockEventBus);

      const mockTouch = {
        clientX: 100,
        clientY: 50,
        target: mockKebabButton,
      };

      adapterWithoutMenu.handleTap(mockTouch);

      expect(console.warn).toHaveBeenCalledWith(
        'TouchAdapter: MenuBehavior not available for kebab menu interaction',
      );
    });
  });

  describe('Touch Target Expansion', () => {
    beforeEach(async () => {
      await touchAdapter.initialize(mockEventBus);
    });

    test('should detect kebab button through touch target expansion', () => {
      // Create a small child element that might be hard to tap directly
      const mockIcon = document.createElement('path');
      const mockSvg = document.createElement('svg');
      mockSvg.appendChild(mockIcon);
      mockKebabButton.appendChild(mockSvg);

      const mockTouch = {
        clientX: 100,
        clientY: 50,
        target: mockIcon, // Touch hits the small path element
      };

      // The expandTouchTarget should find the kebab button parent
      touchAdapter.handleTap(mockTouch);

      expect(mockMenuBehavior.handleMenuButtonAction).toHaveBeenCalledWith(
        'touch',
      );
    });

    test('should detect menu item through touch target expansion', () => {
      // Create nested structure like real menu items
      const mockSpan = document.createElement('span');
      mockSpan.textContent = 'Clear Canvas';
      mockMenuItem.appendChild(mockSpan);

      const mockTouch = {
        clientX: 100,
        clientY: 50,
        target: mockSpan, // Touch hits the span inside menu item
      };

      touchAdapter.handleTap(mockTouch);

      expect(mockMenuBehavior.handleMenuAction).toHaveBeenCalledWith(
        'clear-canvas',
        'touch',
      );
    });
  });

  describe('Event Delegation Priority', () => {
    beforeEach(async () => {
      await touchAdapter.initialize(mockEventBus);
    });

    test('should handle kebab button taps before other handlers', () => {
      // Test that menu button detection happens early in handleTap
      const spy = jest.spyOn(touchAdapter, 'handleTap');

      const mockTouch = {
        clientX: 100,
        clientY: 50,
        target: mockKebabButton,
      };

      touchAdapter.handleTap(mockTouch);

      expect(spy).toHaveBeenCalled();
      expect(mockMenuBehavior.handleMenuButtonAction).toHaveBeenCalledWith(
        'touch',
      );
    });

    test('should handle menu item taps with proper action extraction', () => {
      // Test data-action attribute extraction for different actions
      mockMenuItem.setAttribute('data-action', 'paste-clipboard');

      const mockTouch = {
        clientX: 100,
        clientY: 50,
        target: mockMenuItem,
      };

      touchAdapter.handleTap(mockTouch);

      expect(mockMenuBehavior.handleMenuAction).toHaveBeenCalledWith(
        'paste-clipboard',
        'touch',
      );
    });
  });
});
