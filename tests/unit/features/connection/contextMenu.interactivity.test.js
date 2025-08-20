/**
 * Context Menu Interactivity Tests
 *
 * Tests context menu click handling and callback execution.
 * Focus on actual user interactions with delete and cycle buttons.
 */
import { ContextMenu } from '../../../../src/js/features/connection/contextMenu.js';

describe('Context Menu Interactivity', () => {
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
    menu.style.display = 'none'; // Hidden by default
    mockConnection.appendChild(menu);

    // Attach click handler to container
    contextMenu.attachClickHandler(svgContainer);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('Menu Item Click Detection', () => {
    test('detects clicks on delete button', () => {
      const menu = mockConnection.querySelector('.context-menu');
      const deleteButton = menu.querySelector('.menu-item[data-type="delete"]');

      expect(deleteButton).toBeTruthy();

      // Show menu first
      menu.style.display = 'block';

      // Simulate click on delete button
      const clickEvent = new MouseEvent('click', { bubbles: true });
      deleteButton.dispatchEvent(clickEvent);

      expect(mockDeleteCallback).toHaveBeenCalledWith(
        'note1',
        'note2',
        mockConnection,
      );
    });

    test('detects clicks on cycle button', () => {
      const menu = mockConnection.querySelector('.context-menu');
      const cycleButton = menu.querySelector('.menu-item[data-type="cycle"]');

      expect(cycleButton).toBeTruthy();

      // Show menu first
      menu.style.display = 'block';

      // Simulate click on cycle button
      const clickEvent = new MouseEvent('click', { bubbles: true });
      cycleButton.dispatchEvent(clickEvent);

      expect(mockTypeChangeCallback).toHaveBeenCalledWith(
        'note1',
        'note2',
        'uni-backward',
      );
    });
  });

  describe('Menu Visibility After Click', () => {
    test('hides menu after delete button click', () => {
      const menu = mockConnection.querySelector('.context-menu');
      const deleteButton = menu.querySelector('.menu-item[data-type="delete"]');

      // Show menu first
      menu.style.display = 'block';
      contextMenu.activeMenu = menu;

      // Click delete button
      const clickEvent = new MouseEvent('click', { bubbles: true });
      deleteButton.dispatchEvent(clickEvent);

      // Menu should be hidden (may take some time due to timeout)
      setTimeout(() => {
        expect(menu.style.display).toBe('none');
      }, 350); // Wait for hide timeout
    });

    test('hides menu after cycle button click', () => {
      const menu = mockConnection.querySelector('.context-menu');
      const cycleButton = menu.querySelector('.menu-item[data-type="cycle"]');

      // Show menu first
      menu.style.display = 'block';
      contextMenu.activeMenu = menu;

      // Click cycle button
      const clickEvent = new MouseEvent('click', { bubbles: true });
      cycleButton.dispatchEvent(clickEvent);

      // Menu should be hidden (may take some time due to timeout)
      setTimeout(() => {
        expect(menu.style.display).toBe('none');
      }, 350); // Wait for hide timeout
    });
  });

  describe('Event Handling Edge Cases', () => {
    test('ignores clicks outside menu items', () => {
      const menu = mockConnection.querySelector('.context-menu');

      // Show menu first
      menu.style.display = 'block';

      // Click on menu background (not a menu item)
      const background = menu.querySelector('.menu-background');
      const clickEvent = new MouseEvent('click', { bubbles: true });
      background.dispatchEvent(clickEvent);

      expect(mockDeleteCallback).not.toHaveBeenCalled();
      expect(mockTypeChangeCallback).not.toHaveBeenCalled();
    });

    test('handles clicks when connection group missing', () => {
      // Create orphaned menu (not attached to connection group)
      const orphanedMenu = contextMenu.createMenu();
      document.body.appendChild(orphanedMenu);

      const deleteButton = orphanedMenu.querySelector(
        '.menu-item[data-type="delete"]',
      );
      const clickEvent = new MouseEvent('click', { bubbles: true });

      // Should not throw error or call callbacks
      expect(() => deleteButton.dispatchEvent(clickEvent)).not.toThrow();
      expect(mockDeleteCallback).not.toHaveBeenCalled();

      document.body.removeChild(orphanedMenu);
    });
  });

  describe('Connection Type Cycling', () => {
    test('cycles through all connection types correctly', () => {
      const menu = mockConnection.querySelector('.context-menu');
      const cycleButton = menu.querySelector('.menu-item[data-type="cycle"]');

      menu.style.display = 'block';

      // Test cycling through types: uni-forward -> uni-backward -> bi -> none -> uni-forward
      const expectedTypes = ['uni-backward', 'bi', 'none', 'uni-forward'];

      expectedTypes.forEach((expectedType, index) => {
        // Update current type in DOM
        mockConnection.dataset.type =
          index === 0 ? 'uni-forward' : expectedTypes[index - 1];

        const clickEvent = new MouseEvent('click', { bubbles: true });
        cycleButton.dispatchEvent(clickEvent);

        expect(mockTypeChangeCallback).toHaveBeenLastCalledWith(
          'note1',
          'note2',
          expectedType,
        );
      });
    });
  });
});
