// src/js/features/connection/contextMenu.js
import { log } from '../../utils/utils.js';
import { createSVGDeleteButton } from '../../components/deleteButton/deleteButtonFactory.js';

export class ContextMenu {
  constructor(CONNECTION_TYPES, STROKE_COLOR, STROKE_WIDTH) {
    this.CONNECTION_TYPES = CONNECTION_TYPES;
    this.STROKE_COLOR = STROKE_COLOR;
    this.STROKE_WIDTH = STROKE_WIDTH;
    this.activeMenu = null;
    this.isMouseOver = false;
    this.hideTimeout = null;
    this.onDelete = null;
    this.onTypeChange = null;
    this.connectionGroup = null;

    // Pre-create menu items
    this.menuItems = this.createMenuItems();

    // Bind methods
    this.handleClick = this.handleClick.bind(this);
    this.handleMouseEnter = this.handleMouseEnter.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
  }

  createMenuItems() {
    // Detect if we're on a touch device for appropriate spacing
    const isTouchDevice =
      'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (isTouchDevice) {
      // Touch-friendly spacing: 22px gap between buttons
      return [
        { type: 'delete', symbol: 'x', y: -20 }, // Top button: 22px gap + 18px button = 40px apart, so ±20px
        { type: 'cycle', symbol: '<>', y: 20 }, // Bottom button: positioned 20px below center
      ];
    } else {
      // Desktop spacing: 5px above/below center line (10px gap total)
      return [
        { type: 'delete', symbol: 'x', y: -14 }, // Top button: 10px gap + 18px button = 28px apart, so ±14px
        { type: 'cycle', symbol: '<>', y: 14 }, // Bottom button: positioned 14px below center
      ];
    }
  }

  createMenu() {
    const menu = this.createSVGElement('g', { class: 'context-menu' });

    // Detect if we're on a touch device for appropriate capsule sizing
    const isTouchDevice =
      'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Calculate capsule dimensions based on device type
    const capsuleHeight = isTouchDevice ? 68 : 56; // Touch: 68px (22px gap), Desktop: 56px (10px gap)
    const halfHeight = capsuleHeight / 2;

    // Add capsule background with device-appropriate size
    const capsuleBackground = this.createSVGElement('rect', {
      x: -14, // 28px width / 2
      y: -halfHeight,
      width: 28,
      height: capsuleHeight,
      rx: 12,
      ry: 12,
      fill: 'rgba(255, 255, 255, 0.7)',
      stroke: 'none',
      filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.18))',
      class: 'capsule-background',
    });
    menu.appendChild(capsuleBackground);

    // Add horizontal separator line (centered, 80% width)
    const separator = this.createSVGElement('line', {
      x1: -11.2, // 80% of 28px = 22.4, so ±11.2 from center
      x2: 11.2,
      y1: 0,
      y2: 0,
      stroke: '#e5e7eb',
      'stroke-width': 1,
      class: 'capsule-separator',
    });
    menu.appendChild(separator);

    // Add menu items (existing red delete and blue switch buttons)
    this.menuItems.forEach((item) => {
      menu.appendChild(this.createMenuItem(item));
    });

    // Single event listener on the main menu group only - simpler and more reliable
    menu.addEventListener('mouseenter', this.handleMouseEnter);
    menu.addEventListener('mouseleave', this.handleMouseLeave);

    return menu;
  }

  createMenuItem(item) {
    if (item.type === 'delete') {
      // Use shared delete button component
      const deleteButton = createSVGDeleteButton({
        x: 0,
        y: item.y,
        onClick: null, // Will be handled by attachClickHandler
      });

      // Add the menu-item class for compatibility
      deleteButton.container.classList.add('menu-item', 'context-menu-item');

      return deleteButton.container;
    } else if (item.type === 'cycle') {
      // Use new arrow-based toggle design for cycle button (MM-148)
      return this.createToggleButton(item);
    } else {
      // Keep existing style for any other menu items
      const button = this.createSVGElement('g', {
        class: 'menu-item context-menu-item',
        'data-type': item.type,
      });

      button.appendChild(
        this.createSVGElement('circle', {
          r: '10',
          cx: '0',
          cy: item.y,
          fill: 'white',
          stroke: this.STROKE_COLOR,
          'stroke-width': this.STROKE_WIDTH,
        }),
      );

      const text = this.createSVGElement('text', {
        x: '0',
        y: item.y,
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
        'font-size': '8',
        fill: 'black',
      });
      text.textContent = item.symbol;
      button.appendChild(text);

      return button;
    }
  }

  createToggleButton(item) {
    // Create container group for the toggle button (MM-148)
    const button = this.createSVGElement('g', {
      class: 'menu-item context-menu-item mm-arrow-toggle',
      'data-type': item.type,
    });

    // Main circle background
    const mainCircle = this.createSVGElement('circle', {
      cx: '0',
      cy: item.y,
      r: '9',
      fill: 'var(--mm-arrow-fill, #8585ecff)',
      stroke: 'var(--mm-arrow-stroke, transparent)',
      'stroke-width': '1',
    });
    button.appendChild(mainCircle);

    // Left arrow polyline
    const leftArrow = this.createSVGElement('polyline', {
      points: '-3,-3 -6,0 -3,3',
      fill: 'none',
      stroke: 'var(--mm-arrow-stroke, #FFFFFF)',
      'stroke-width': '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      transform: `translate(0, ${item.y})`,
    });
    button.appendChild(leftArrow);

    // Right arrow polyline
    const rightArrow = this.createSVGElement('polyline', {
      points: '3,-3 6,0 3,3',
      fill: 'none',
      stroke: 'var(--mm-arrow-stroke, #FFFFFF)',
      'stroke-width': '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      transform: `translate(0, ${item.y})`,
    });
    button.appendChild(rightArrow);

    // Inner highlight circle
    const innerCircle = this.createSVGElement('circle', {
      cx: '0',
      cy: item.y,
      r: '2',
      fill: 'var(--mm-arrow-fill, #ffffff88)',
    });
    button.appendChild(innerCircle);

    return button;
  }

  createSVGElement(type, attributes = {}) {
    const element = document.createElementNS(
      'http://www.w3.org/2000/svg',
      type,
    );
    Object.entries(attributes).forEach(([key, value]) =>
      element.setAttribute(key, value),
    );
    return element;
  }

  show(hotspot) {
    if (this.activeMenu) {
      this.activeMenu.style.display = 'none';
    }
    const connectionGroup = hotspot.closest('g');
    const contextMenu = connectionGroup.querySelector('.context-menu');
    contextMenu.style.display = 'block';
    this.activeMenu = contextMenu;
  }

  hide() {
    clearTimeout(this.hideTimeout);
    this.hideTimeout = setTimeout(() => {
      if (this.activeMenu && !this.isMouseOver) {
        this.activeMenu.style.display = 'none';
        this.activeMenu = null;
      }
    }, 300);
  }

  handleMouseEnter() {
    this.isMouseOver = true;
    clearTimeout(this.hideTimeout);
  }

  handleMouseLeave() {
    this.isMouseOver = false;
    this.hide();
  }

  handleClick(event) {
    // First check if clicking on a connector-hotspot to show the menu
    const hotspot = event.target.closest('.connector-hotspot');
    if (hotspot) {
      // Only show context menu for permanent connections (same logic as handleSvgMouseMove)
      const connectionGroup = hotspot.closest('g[data-start][data-end]');
      if (connectionGroup) {
        event.preventDefault();
        event.stopPropagation();
        this.show(hotspot);
        return;
      }
    }

    // Then check if clicking on a menu item to handle actions
    const menuItem = event.target.closest('.menu-item');
    if (!menuItem) return;

    event.preventDefault();
    event.stopPropagation();

    const connectionType = menuItem.dataset.type;
    const connectionGroup = menuItem.closest('g[data-start][data-end]');

    if (!connectionGroup) {
      log('Connection group not found');
      return;
    }

    const { start: startId, end: endId } = connectionGroup.dataset;

    if (connectionType === 'delete') {
      this.onDelete?.(startId, endId, connectionGroup);
    } else if (connectionType === 'cycle') {
      const currentType = connectionGroup.dataset.type;
      const newType = this.getNextConnectionType(currentType);
      this.onTypeChange?.(startId, endId, newType);
    }

    this.hide();
  }

  getNextConnectionType(currentType) {
    const types = Object.values(this.CONNECTION_TYPES);
    const currentIndex = types.indexOf(currentType);
    const nextIndex = (currentIndex + 1) % types.length;
    // eslint-disable-next-line security/detect-object-injection
    return types[nextIndex];
  }

  attachClickHandler(element) {
    element.addEventListener('click', this.handleClick);

    // Add touch support for mobile devices
    element.addEventListener(
      'touchstart',
      (event) => {
        event.stopPropagation();
      },
      { passive: true },
    );

    element.addEventListener('touchend', this.handleClick);
  }

  setDeleteCallback(callback) {
    this.onDelete = callback;
  }

  setTypeChangeCallback(callback) {
    this.onTypeChange = callback;
  }
}
