/**
 * Context Menu Touch Interaction Tests
 *
 * Tests touch event handling on context menu buttons.
 * Focus on touchend events triggering callbacks properly.
 */
import { ContextMenu } from '../../../../src/js/features/connection/contextMenu.js';

describe('Context Menu Touch Interactions', () => {
  let contextMenu;
  let mockDeleteCallback;
  let mockTypeChangeCallback;
  let mockConnection;
  let svgContainer;

  beforeEach(() => {
    // Create mock connection types
    const CONNECTION_TYPES = {
      NONE: 'none',
      UNI_FORWARD: 'uni-forward',
      UNI_BACKWARD: 'uni-backward',
      BI: 'bi',
    };

    contextMenu = new ContextMenu(CONNECTION_TYPES, '#333', 2);

    // Set up callbacks
    mockDeleteCallback = jest.fn();
    mockTypeChangeCallback = jest.fn();
    contextMenu.setDeleteCallback(mockDeleteCallback);
    contextMenu.setTypeChangeCallback(mockTypeChangeCallback);

    // Create DOM structure for testing
    document.body.innerHTML = `
      <div id="canvas">
        <div id="svg-container">
          <g data-start="note1" data-end="note2" data-type="uni-forward">
            <path d="M100,100 L200,200" stroke="blue" stroke-width="2"/>
            <circle class="connector-hotspot" cx="150" cy="150" r="10"/>
          </g>
        </div>
      </div>
    `;

    svgContainer = document.getElementById('svg-container');
    mockConnection = svgContainer.querySelector('g[data-start][data-end]');

    // Create and attach context menu to connection
    const menu = contextMenu.createMenu();
    menu.style.display = 'none';
    mockConnection.appendChild(menu);

    // Attach click handler to container
    contextMenu.attachClickHandler(svgContainer);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('Touch Event Support', () => {
    test('delete button responds to touchend events', () => {
      const menu = mockConnection.querySelector('.context-menu');
      const deleteButton = menu.querySelector('.menu-item[data-type="delete"]');

      expect(deleteButton).toBeTruthy();

      // Show menu first
      menu.style.display = 'block';

      // Simulate touch sequence on delete button
      const touchStartEvent = new TouchEvent('touchstart', {
        bubbles: true,
        touches: [{ clientX: 100, clientY: 100 }],
      });
      const touchEndEvent = new TouchEvent('touchend', {
        bubbles: true,
        changedTouches: [{ clientX: 100, clientY: 100 }],
      });

      deleteButton.dispatchEvent(touchStartEvent);
      deleteButton.dispatchEvent(touchEndEvent);

      expect(mockDeleteCallback).toHaveBeenCalledWith(
        'note1',
        'note2',
        mockConnection,
      );
    });

    test('cycle button responds to touchend events', () => {
      const menu = mockConnection.querySelector('.context-menu');
      const cycleButton = menu.querySelector('.menu-item[data-type="cycle"]');

      expect(cycleButton).toBeTruthy();

      // Show menu first
      menu.style.display = 'block';

      // Simulate touch sequence on cycle button
      const touchStartEvent = new TouchEvent('touchstart', {
        bubbles: true,
        touches: [{ clientX: 100, clientY: 100 }],
      });
      const touchEndEvent = new TouchEvent('touchend', {
        bubbles: true,
        changedTouches: [{ clientX: 100, clientY: 100 }],
      });

      cycleButton.dispatchEvent(touchStartEvent);
      cycleButton.dispatchEvent(touchEndEvent);

      expect(mockTypeChangeCallback).toHaveBeenCalledWith(
        'note1',
        'note2',
        'uni-backward',
      );
    });

    test('touch events are properly isolated from click events', () => {
      const menu = mockConnection.querySelector('.context-menu');
      const deleteButton = menu.querySelector('.menu-item[data-type="delete"]');

      // Show menu first
      menu.style.display = 'block';

      // Simulate only touchstart (no touchend or click)
      const touchStartEvent = new TouchEvent('touchstart', {
        bubbles: true,
        touches: [{ clientX: 100, clientY: 100 }],
      });

      deleteButton.dispatchEvent(touchStartEvent);

      // Should not trigger callback with only touchstart
      expect(mockDeleteCallback).not.toHaveBeenCalled();

      // Now add touchend
      const touchEndEvent = new TouchEvent('touchend', {
        bubbles: true,
        changedTouches: [{ clientX: 100, clientY: 100 }],
      });

      deleteButton.dispatchEvent(touchEndEvent);

      // Should trigger callback after touchend
      expect(mockDeleteCallback).toHaveBeenCalledWith(
        'note1',
        'note2',
        mockConnection,
      );
    });

    test('touch events prevent default behavior', () => {
      const menu = mockConnection.querySelector('.context-menu');
      const cycleButton = menu.querySelector('.menu-item[data-type="cycle"]');

      // Show menu first
      menu.style.display = 'block';

      // Create mock events that track preventDefault
      const touchEndEvent = new TouchEvent('touchend', {
        bubbles: true,
        changedTouches: [{ clientX: 100, clientY: 100 }],
      });

      const preventDefaultSpy = jest.spyOn(touchEndEvent, 'preventDefault');

      cycleButton.dispatchEvent(touchEndEvent);

      // Verify preventDefault was called (handled by context menu)
      expect(preventDefaultSpy).toHaveBeenCalled();

      preventDefaultSpy.mockRestore();
    });
  });

  describe('Touch and Click Event Coexistence', () => {
    test('both touch and click events work on same element', () => {
      const menu = mockConnection.querySelector('.context-menu');
      const deleteButton = menu.querySelector('.menu-item[data-type="delete"]');

      // Show menu first
      menu.style.display = 'block';

      // Test click event
      const clickEvent = new MouseEvent('click', { bubbles: true });
      deleteButton.dispatchEvent(clickEvent);

      expect(mockDeleteCallback).toHaveBeenCalledWith(
        'note1',
        'note2',
        mockConnection,
      );

      // Reset mock
      mockDeleteCallback.mockClear();

      // Test touch event
      const touchEndEvent = new TouchEvent('touchend', {
        bubbles: true,
        changedTouches: [{ clientX: 100, clientY: 100 }],
      });

      deleteButton.dispatchEvent(touchEndEvent);

      expect(mockDeleteCallback).toHaveBeenCalledWith(
        'note1',
        'note2',
        mockConnection,
      );
    });
  });
});
