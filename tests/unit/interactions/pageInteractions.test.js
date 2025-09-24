// tests/unit/interactions/pageInteractions.test.js

import {
  initializePageInteractions,
  resetPageInteractions,
} from '../../../src/js/interactions/pageInteractions.js';

describe('PageInteractions Menu Integration', () => {
  let mockInteractionController;
  let mockMenuBehavior;
  let mockServerConnectionBehavior;
  let mockKebabButton;
  let mockKebabMenu;
  let mockMenuItem;

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';

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
    document.body.appendChild(mockKebabButton);
    document.body.appendChild(mockKebabMenu);

    // Create mock MenuBehavior
    mockMenuBehavior = {
      handleMenuButtonAction: jest.fn(),
      handleMenuAction: jest.fn(),
      initialize: jest.fn().mockResolvedValue(),
      destroy: jest.fn().mockResolvedValue(),
    };

    // Create mock ServerConnectionBehavior
    mockServerConnectionBehavior = {
      initialize: jest.fn().mockResolvedValue(),
      destroy: jest.fn().mockResolvedValue(),
    };

    // Create mock InteractionController with both behaviors
    mockInteractionController = {
      getBehavior: jest.fn((name) => {
        if (name === 'menu') return mockMenuBehavior;
        if (name === 'serverConnection') return mockServerConnectionBehavior;
        return null;
      }),
    };

    // Mock getBoundingClientRect for positioning
    mockKebabButton.getBoundingClientRect = jest.fn().mockReturnValue({
      bottom: 100,
      top: 50,
      left: 200,
      right: 250,
    });

    mockKebabMenu.getBoundingClientRect = jest.fn().mockReturnValue({
      width: 150,
      height: 200,
    });
  });

  afterEach(() => {
    resetPageInteractions();
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with MenuBehavior and UI elements', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      initializePageInteractions(mockInteractionController);

      expect(mockInteractionController.getBehavior).toHaveBeenCalledWith(
        'menu',
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] INFO: PageInteractions: Initialized with MenuBehavior, ServerConnectionBehavior, and UI elements/),
      );

      consoleSpy.mockRestore();
    });

    test('should handle missing MenuBehavior gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const mockControllerWithoutMenu = {
        getBehavior: jest.fn(() => null),
      };

      initializePageInteractions(mockControllerWithoutMenu);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] WARN: MenuBehavior not available/),
      );

      consoleSpy.mockRestore();
    });

    test('should handle missing UI elements gracefully', () => {
      document.body.innerHTML = ''; // Remove UI elements
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      initializePageInteractions(mockInteractionController);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] WARN: Menu elements not found/),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Menu Button Click Integration', () => {
    beforeEach(() => {
      initializePageInteractions(mockInteractionController);
    });

    test('should call MenuBehavior when button is clicked', () => {
      // Simulate click event
      const clickEvent = new MouseEvent('click', { bubbles: true });
      mockKebabButton.dispatchEvent(clickEvent);

      expect(mockMenuBehavior.handleMenuButtonAction).toHaveBeenCalledWith(
        'page',
      );
    });

    test('should add open class to menu when clicked', () => {
      expect(mockKebabMenu.classList.contains('open')).toBe(false);

      const clickEvent = new MouseEvent('click', { bubbles: true });
      mockKebabButton.dispatchEvent(clickEvent);

      expect(mockKebabMenu.classList.contains('open')).toBe(true);
    });

    test('should set proper aria attributes when menu opens', () => {
      const clickEvent = new MouseEvent('click', { bubbles: true });
      mockKebabButton.dispatchEvent(clickEvent);

      expect(mockKebabButton.getAttribute('aria-expanded')).toBe('true');
      expect(mockKebabMenu.getAttribute('aria-hidden')).toBe('false');
    });

    test('should toggle menu open/closed on multiple clicks', () => {
      const clickEvent = new MouseEvent('click', { bubbles: true });

      // First click opens
      mockKebabButton.dispatchEvent(clickEvent);
      expect(mockKebabMenu.classList.contains('open')).toBe(true);

      // Second click closes
      mockKebabButton.dispatchEvent(clickEvent);
      expect(mockKebabMenu.classList.contains('open')).toBe(false);
      expect(mockKebabButton.getAttribute('aria-expanded')).toBe('false');
    });
  });

  describe('Menu Item Click Integration', () => {
    beforeEach(() => {
      initializePageInteractions(mockInteractionController);
      // Open menu first
      const clickEvent = new MouseEvent('click', { bubbles: true });
      mockKebabButton.dispatchEvent(clickEvent);
    });

    test('should call MenuBehavior with action when item clicked', () => {
      const clickEvent = new MouseEvent('click', { bubbles: true });
      mockMenuItem.dispatchEvent(clickEvent);

      expect(mockMenuBehavior.handleMenuAction).toHaveBeenCalledWith(
        'clear-canvas',
        'page',
      );
    });

    test('should close menu after item click', () => {
      expect(mockKebabMenu.classList.contains('open')).toBe(true);

      const clickEvent = new MouseEvent('click', { bubbles: true });
      mockMenuItem.dispatchEvent(clickEvent);

      expect(mockKebabMenu.classList.contains('open')).toBe(false);
    });

    test('should handle item without data-action', () => {
      const itemWithoutAction = document.createElement('div');
      itemWithoutAction.className = 'kebab-menu-item';
      mockKebabMenu.appendChild(itemWithoutAction);

      const clickEvent = new MouseEvent('click', { bubbles: true });
      itemWithoutAction.dispatchEvent(clickEvent);

      expect(mockMenuBehavior.handleMenuAction).toHaveBeenCalledWith(
        null,
        'page',
      );
    });
  });

  describe('Keyboard Integration', () => {
    beforeEach(() => {
      initializePageInteractions(mockInteractionController);
    });

    test('should handle Enter key on menu button', () => {
      const keyEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
      });
      mockKebabButton.dispatchEvent(keyEvent);

      expect(mockMenuBehavior.handleMenuButtonAction).toHaveBeenCalledWith(
        'keyboard',
      );
      expect(mockKebabMenu.classList.contains('open')).toBe(true);
    });

    test('should handle spacebar on menu button', () => {
      const keyEvent = new KeyboardEvent('keydown', {
        key: ' ',
        bubbles: true,
      });
      mockKebabButton.dispatchEvent(keyEvent);

      expect(mockMenuBehavior.handleMenuButtonAction).toHaveBeenCalledWith(
        'keyboard',
      );
      expect(mockKebabMenu.classList.contains('open')).toBe(true);
    });

    test('should close menu on Escape key', () => {
      // Open menu first
      const clickEvent = new MouseEvent('click', { bubbles: true });
      mockKebabButton.dispatchEvent(clickEvent);
      expect(mockKebabMenu.classList.contains('open')).toBe(true);

      // Press Escape
      const escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
      });
      document.dispatchEvent(escapeEvent);

      expect(mockKebabMenu.classList.contains('open')).toBe(false);
    });
  });

  describe('Click-away Behavior', () => {
    beforeEach(() => {
      initializePageInteractions(mockInteractionController);
      // Open menu first
      const clickEvent = new MouseEvent('click', { bubbles: true });
      mockKebabButton.dispatchEvent(clickEvent);
    });

    test('should close menu when clicking outside', () => {
      const outsideElement = document.createElement('div');
      document.body.appendChild(outsideElement);

      const clickEvent = new MouseEvent('click', { bubbles: true });
      outsideElement.dispatchEvent(clickEvent);

      expect(mockKebabMenu.classList.contains('open')).toBe(false);
    });

    test('should not close when clicking textarea with note-content class', () => {
      const textarea = document.createElement('textarea');
      textarea.className = 'note-content';
      document.body.appendChild(textarea);

      const clickEvent = new MouseEvent('click', { bubbles: true });
      textarea.dispatchEvent(clickEvent);

      expect(mockKebabMenu.classList.contains('open')).toBe(true);
    });
  });

  describe('Menu Positioning', () => {
    beforeEach(() => {
      initializePageInteractions(mockInteractionController);
    });

    test('should position menu for desktop (> 720px)', () => {
      // Set desktop width
      Object.defineProperty(window, 'innerWidth', {
        value: 1024,
        configurable: true,
      });
      Object.defineProperty(window, 'innerHeight', {
        value: 768,
        configurable: true,
      });

      const clickEvent = new MouseEvent('click', { bubbles: true });
      mockKebabButton.dispatchEvent(clickEvent);

      // Should use absolute positioning on desktop
      expect(mockKebabMenu.style.position).toBe('absolute');
    });

    test('should position menu for mobile (<= 720px)', () => {
      // Set mobile width
      Object.defineProperty(window, 'innerWidth', {
        value: 375,
        configurable: true,
      });
      Object.defineProperty(window, 'innerHeight', {
        value: 667,
        configurable: true,
      });

      const clickEvent = new MouseEvent('click', { bubbles: true });
      mockKebabButton.dispatchEvent(clickEvent);

      // Should use fixed positioning with full width on mobile
      expect(mockKebabMenu.style.position).toBe('fixed');
      expect(mockKebabMenu.style.width).toBe('100%');
      expect(mockKebabMenu.style.bottom).toBe('0px');
    });
  });

  describe('Event Handler Attachment', () => {
    test('should attach event handlers without errors', () => {
      expect(() => {
        initializePageInteractions(mockInteractionController);
      }).not.toThrow();
    });

    test('should verify MenuBehavior integration', () => {
      initializePageInteractions(mockInteractionController);

      expect(mockInteractionController.getBehavior).toHaveBeenCalledWith(
        'menu',
      );

      // Verify the behavior reference is used correctly
      const clickEvent = new MouseEvent('click', { bubbles: true });
      mockKebabButton.dispatchEvent(clickEvent);

      expect(mockMenuBehavior.handleMenuButtonAction).toHaveBeenCalledWith(
        'page',
      );
    });
  });

  describe('DOM Element Requirements', () => {
    test('should find required DOM elements', () => {
      expect(document.getElementById('kebab-menu-button')).toBe(
        mockKebabButton,
      );
      expect(document.getElementById('kebab-context-menu')).toBe(mockKebabMenu);
    });

    test('should handle missing DOM elements gracefully', () => {
      document.body.innerHTML = ''; // Remove all elements

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      expect(() => {
        initializePageInteractions(mockInteractionController);
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'PageInteractions: Menu elements not found',
      );

      consoleSpy.mockRestore();
    });
  });
});
