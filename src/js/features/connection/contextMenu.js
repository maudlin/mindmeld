// contextMenu.js
import { log } from '../../utils/utils.js';

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
    return [
      { type: 'delete', symbol: 'x', y: -40 },
      { type: this.CONNECTION_TYPES.UNI_BACKWARD, symbol: '<', y: -20 },
      { type: this.CONNECTION_TYPES.NONE, symbol: '-', y: 0 },
      { type: this.CONNECTION_TYPES.UNI_FORWARD, symbol: '>', y: 20 },
      { type: this.CONNECTION_TYPES.BI, symbol: '<>', y: 40 },
    ];
  }

  createMenu() {
    const menu = this.createSVGElement('g', { class: 'context-menu' });

    // Add background rectangle
    menu.appendChild(this.createBackgroundRect());

    // Add menu items
    this.menuItems.forEach((item) => {
      menu.appendChild(this.createMenuItem(item));
    });

    // Add menu background
    menu.insertBefore(this.createMenuBackground(), menu.firstChild);

    menu.addEventListener('mouseenter', this.handleMouseEnter);
    menu.addEventListener('mouseleave', this.handleMouseLeave);

    return menu;
  }

  createBackgroundRect() {
    return this.createSVGElement('rect', {
      x: -1,
      y: -60,
      width: 1,
      height: 120,
      fill: '#ccc',
      class: 'menu-background-line',
    });
  }

  createMenuItem(item) {
    const button = this.createSVGElement('g', {
      class: 'menu-item context-menu-item',
      'data-type': item.type,
    });

    button.appendChild(
      this.createSVGElement('circle', {
        r: '10',
        cx: '0',
        cy: item.y,
        fill: item.type === 'delete' ? 'pink' : 'white',
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

  createMenuBackground() {
    return this.createSVGElement('rect', {
      x: -15,
      y: -55,
      width: 30,
      height: 110,
      fill: 'transparent',
      class: 'menu-background',
    });
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
    } else {
      this.onTypeChange?.(startId, endId, connectionType);
    }

    this.hide();
  }

  attachClickHandler(element) {
    element.addEventListener('click', this.handleClick);
  }

  setDeleteCallback(callback) {
    this.onDelete = callback;
  }

  setTypeChangeCallback(callback) {
    this.onTypeChange = callback;
  }
}
