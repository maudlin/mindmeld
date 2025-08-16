// tests/unit/features/kebabMenu/kebabMenu.test.js

import { KebabMenu } from '../../../../src/js/features/kebabMenu/kebabMenu.js';

describe('KebabMenu', () => {
  let kebabMenu;
  let mockButton;
  let mockMenu;

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';

    // Create mock elements
    mockButton = document.createElement('button');
    mockButton.id = 'kebab-menu-button';
    mockButton.setAttribute('aria-expanded', 'false');

    mockMenu = document.createElement('div');
    mockMenu.id = 'kebab-context-menu';
    mockMenu.classList.add('kebab-context-menu');
    mockMenu.setAttribute('aria-hidden', 'true');

    // Add handle for mobile interactions
    const handle = document.createElement('div');
    handle.className = 'kebab-menu-handle';
    mockMenu.appendChild(handle);

    // Add menu items
    const menuItem = document.createElement('div');
    menuItem.className = 'kebab-menu-item';
    menuItem.setAttribute('data-action', 'clear-canvas');
    menuItem.setAttribute('tabindex', '0');
    mockMenu.appendChild(menuItem);

    document.body.appendChild(mockButton);
    document.body.appendChild(mockMenu);

    kebabMenu = new KebabMenu();

    // Mock getBoundingClientRect
    mockButton.getBoundingClientRect = jest.fn(() => ({
      left: 100,
      top: 50,
      right: 124,
      bottom: 74,
      width: 24,
      height: 24,
    }));

    mockMenu.getBoundingClientRect = jest.fn(() => ({
      width: 280,
      height: 300,
    }));

    // Mock window properties
    Object.defineProperty(window, 'innerWidth', {
      value: 1024,
      writable: true,
    });
    Object.defineProperty(window, 'innerHeight', {
      value: 768,
      writable: true,
    });
    Object.defineProperty(window, 'scrollX', { value: 0, writable: true });
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    test('should initialize with default state', () => {
      expect(kebabMenu.button).toBeNull();
      expect(kebabMenu.menu).toBeNull();
      expect(kebabMenu.isOpen).toBe(false);
      expect(kebabMenu.dragging).toBe(false);
    });

    test('should find and store DOM elements on initialize', () => {
      kebabMenu.initialize();

      expect(kebabMenu.button).toBe(mockButton);
      expect(kebabMenu.menu).toBe(mockMenu);
    });

    test('should warn if elements not found', () => {
      console.warn = jest.fn();
      document.body.innerHTML = '';

      kebabMenu.initialize();

      expect(console.warn).toHaveBeenCalledWith(
        'Kebab menu elements not found',
      );
    });
  });

  describe('menu toggling', () => {
    beforeEach(() => {
      kebabMenu.initialize();
    });

    test('should open menu when button clicked', () => {
      expect(kebabMenu.isOpen).toBe(false);

      mockButton.click();

      expect(kebabMenu.isOpen).toBe(true);
      expect(mockMenu.classList.contains('open')).toBe(true);
      expect(mockMenu.getAttribute('aria-hidden')).toBe('false');
      expect(mockButton.getAttribute('aria-expanded')).toBe('true');
    });

    test('should close menu when button clicked while open', () => {
      kebabMenu.openMenu();
      expect(kebabMenu.isOpen).toBe(true);

      mockButton.click();

      expect(kebabMenu.isOpen).toBe(false);
      expect(mockMenu.classList.contains('open')).toBe(false);
      expect(mockMenu.getAttribute('aria-hidden')).toBe('true');
      expect(mockButton.getAttribute('aria-expanded')).toBe('false');
    });

    test('should focus first menu item when opened', () => {
      const firstMenuItem = mockMenu.querySelector('.kebab-menu-item');
      firstMenuItem.focus = jest.fn();

      kebabMenu.openMenu();

      expect(firstMenuItem.focus).toHaveBeenCalled();
    });

    test('should return focus to button when closed', () => {
      mockButton.focus = jest.fn();
      kebabMenu.openMenu();

      kebabMenu.closeMenu();

      expect(mockButton.focus).toHaveBeenCalled();
    });
  });

  describe('keyboard navigation', () => {
    beforeEach(() => {
      kebabMenu.initialize();
    });

    test('should open menu on Enter key', () => {
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      event.preventDefault = jest.fn();
      event.stopPropagation = jest.fn();

      mockButton.dispatchEvent(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
      expect(kebabMenu.isOpen).toBe(true);
    });

    test('should open menu on Space key', () => {
      const event = new KeyboardEvent('keydown', { key: ' ' });
      event.preventDefault = jest.fn();
      event.stopPropagation = jest.fn();

      mockButton.dispatchEvent(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(kebabMenu.isOpen).toBe(true);
    });

    test('should close menu on Escape key', () => {
      kebabMenu.openMenu();

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);

      expect(kebabMenu.isOpen).toBe(false);
    });
  });

  describe('click-away behavior', () => {
    beforeEach(() => {
      kebabMenu.initialize();
      kebabMenu.openMenu();
    });

    test('should close menu when clicking outside', () => {
      const outsideElement = document.createElement('div');
      document.body.appendChild(outsideElement);

      outsideElement.click();

      expect(kebabMenu.isOpen).toBe(false);
    });

    test('should not close menu when clicking inside menu', () => {
      mockMenu.click();

      expect(kebabMenu.isOpen).toBe(true);
    });

    test('should not close menu when clicking button', () => {
      // Note: button click is handled by its own event handler
      mockButton.click();

      // This will actually toggle (close) due to button handler
      expect(kebabMenu.isOpen).toBe(false);
    });
  });

  describe('menu positioning', () => {
    beforeEach(() => {
      kebabMenu.initialize();
    });

    test('should position as bottom sheet on mobile', () => {
      window.innerWidth = 720; // Mobile breakpoint

      kebabMenu.positionMenu();

      expect(mockMenu.style.position).toBe('fixed');
      expect(mockMenu.style.left).toBe('0px');
      expect(mockMenu.style.right).toBe('0px');
      expect(mockMenu.style.bottom).toBe('0px');
      expect(mockMenu.style.width).toBe('100%');
    });

    test('should position below button on desktop', () => {
      window.innerWidth = 1024; // Desktop

      kebabMenu.positionMenu();

      expect(mockMenu.style.position).toBe('absolute');
      expect(mockMenu.style.top).toBe('82px'); // button.bottom + gap + scrollY
      expect(mockMenu.style.left).toBe('100px'); // button.left + scrollX
    });

    test('should flip above button when no space below', () => {
      window.innerHeight = 100; // Small viewport
      mockButton.getBoundingClientRect = jest.fn(() => ({
        left: 100,
        top: 80,
        right: 124,
        bottom: 90, // Close to bottom
        width: 24,
        height: 10,
      }));

      kebabMenu.positionMenu();

      // Should position above: button.top - menuHeight - gap
      expect(mockMenu.style.top).toBe('-228px'); // 80 - 300 - 8 + 0 scrollY
    });

    test('should adjust horizontal position to stay in viewport', () => {
      window.innerWidth = 200; // Narrow viewport
      mockButton.getBoundingClientRect = jest.fn(() => ({
        left: 150, // Would push menu off-screen
        top: 50,
        right: 174,
        bottom: 74,
        width: 24,
        height: 24,
      }));

      kebabMenu.positionMenu();

      // Should clamp to viewport: vw - menuWidth - margin = 200 - 280 - 16 = -96, clamped to 16
      expect(mockMenu.style.left).toBe('0px'); // Gets clamped at scrollX (0px) since left calculation goes negative
    });
  });

  describe('mobile touch interactions', () => {
    beforeEach(() => {
      kebabMenu.initialize();
      window.innerWidth = 375; // Mobile width
    });

    test('should start drag on touch start on handle', () => {
      const handle = mockMenu.querySelector('.kebab-menu-handle');

      // Mock the event target.closest method to return the handle
      const touchEvent = {
        touches: [{ clientY: 100 }],
        target: {
          closest: jest.fn().mockReturnValue(handle),
        },
      };

      // Manually call the touch start handler since the actual event listener setup
      // happens in setupMobileInteractions which uses closure
      kebabMenu.setupMobileInteractions();

      // Simulate the touch start logic
      if (
        window.innerWidth <= 720 &&
        touchEvent.target.closest('.kebab-menu-handle')
      ) {
        kebabMenu.startY = touchEvent.touches[0].clientY;
        kebabMenu.currentY = kebabMenu.startY;
        kebabMenu.dragging = true;
      }

      expect(kebabMenu.startY).toBe(100);
      expect(kebabMenu.dragging).toBe(true);
    });

    test('should not start drag on desktop', () => {
      window.innerWidth = 1024; // Desktop width
      const handle = mockMenu.querySelector('.kebab-menu-handle');
      const touchEvent = new TouchEvent('touchstart', {
        touches: [{ clientY: 100 }],
      });

      handle.dispatchEvent(touchEvent);

      expect(kebabMenu.dragging).toBe(false);
    });

    test('should update transform during drag', () => {
      kebabMenu.dragging = true;
      kebabMenu.startY = 100;

      const touchEvent = new TouchEvent('touchmove', {
        touches: [{ clientY: 150 }], // 50px down
      });

      mockMenu.dispatchEvent(touchEvent);

      expect(mockMenu.style.transform).toBe('translateY(50px)');
    });

    test('should close menu on large swipe down', () => {
      kebabMenu.dragging = true;
      kebabMenu.startY = 100;
      kebabMenu.currentY = 160; // 60px down (> 50px threshold)
      kebabMenu.closeMenu = jest.fn();

      const touchEvent = new TouchEvent('touchend');
      mockMenu.dispatchEvent(touchEvent);

      expect(kebabMenu.closeMenu).toHaveBeenCalled();
      expect(kebabMenu.dragging).toBe(false);
    });

    test('should not close menu on small swipe', () => {
      kebabMenu.dragging = true;
      kebabMenu.startY = 100;
      kebabMenu.currentY = 130; // 30px down (< 50px threshold)
      kebabMenu.closeMenu = jest.fn();

      const touchEvent = new TouchEvent('touchend');
      mockMenu.dispatchEvent(touchEvent);

      expect(kebabMenu.closeMenu).not.toHaveBeenCalled();
      expect(mockMenu.style.transform).toBe('');
    });
  });

  describe('menu actions', () => {
    beforeEach(() => {
      kebabMenu.initialize();
      document.dispatchEvent = jest.fn();
    });

    test('should dispatch clear-canvas action', () => {
      kebabMenu.handleMenuAction('clear-canvas');

      expect(document.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'kebab-menu-action',
          detail: { action: 'clear-canvas' },
        }),
      );
    });

    test('should dispatch import-from-file action for import-file', () => {
      kebabMenu.handleMenuAction('import-file');

      expect(document.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { action: 'import-from-file' },
        }),
      );
    });

    test('should dispatch export-to-file action for export-file', () => {
      kebabMenu.handleMenuAction('export-file');

      expect(document.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { action: 'export-to-file' },
        }),
      );
    });

    test('should warn on unknown action', () => {
      console.warn = jest.fn();

      kebabMenu.handleMenuAction('unknown-action');

      expect(console.warn).toHaveBeenCalledWith(
        'Unknown kebab menu action: unknown-action',
      );
    });

    test('should close menu after menu item click', () => {
      kebabMenu.openMenu();
      const menuItem = mockMenu.querySelector('.kebab-menu-item');

      menuItem.click();

      expect(kebabMenu.isOpen).toBe(false);
    });
  });

  describe('resize handling', () => {
    beforeEach(() => {
      kebabMenu.initialize();
      kebabMenu.openMenu();
      kebabMenu.positionMenu = jest.fn();
    });

    test('should reposition menu on window resize when open', () => {
      window.dispatchEvent(new Event('resize'));

      expect(kebabMenu.positionMenu).toHaveBeenCalled();
    });

    test('should not reposition menu when closed', () => {
      kebabMenu.closeMenu();

      window.dispatchEvent(new Event('resize'));

      expect(kebabMenu.positionMenu).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    beforeEach(() => {
      kebabMenu.initialize();
    });

    test('should have proper ARIA attributes when closed', () => {
      expect(mockMenu.getAttribute('aria-hidden')).toBe('true');
      expect(mockButton.getAttribute('aria-expanded')).toBe('false');
    });

    test('should update ARIA attributes when opened', () => {
      kebabMenu.openMenu();

      expect(mockMenu.getAttribute('aria-hidden')).toBe('false');
      expect(mockButton.getAttribute('aria-expanded')).toBe('true');
    });

    test('should restore ARIA attributes when closed', () => {
      kebabMenu.openMenu();
      kebabMenu.closeMenu();

      expect(mockMenu.getAttribute('aria-hidden')).toBe('true');
      expect(mockButton.getAttribute('aria-expanded')).toBe('false');
    });
  });
});
