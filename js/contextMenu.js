// contextMenu.js
import { log } from './utils.js';

export class ContextMenu {
  constructor(CONNECTION_TYPES, STROKE_COLOR) {
    this.CONNECTION_TYPES = CONNECTION_TYPES;
    this.STROKE_COLOR = STROKE_COLOR;
    this.activeMenu = null;
    this.isMouseOver = false;
    this.hideTimeout = null;
    this.onDelete = null;
    this.onTypeChange = null;

    // Bind the handleClick method to this instance
    this.handleClick = this.handleClick.bind(this);
  }

  createMenu() {
    const menu = this.createSVGElement('g', { class: 'context-menu' });

    const menuItems = [
      { type: 'delete', symbol: 'x', y: -40 },
      { type: this.CONNECTION_TYPES.UNI_BACKWARD, symbol: '<', y: -20 },
      { type: this.CONNECTION_TYPES.NONE, symbol: '-', y: 0 },
      { type: this.CONNECTION_TYPES.UNI_FORWARD, symbol: '>', y: 20 },
      { type: this.CONNECTION_TYPES.BI, symbol: '<>', y: 40 },
    ];

    menuItems.forEach((item) => {
      const button = this.createSVGElement('g', {
        class: 'menu-item context-menu-item',
        'data-type': item.type,
      });

      const circle = this.createSVGElement('circle', {
        r: '10',
        cx: '0',
        cy: item.y,
        fill: item.type === 'delete' ? 'pink' : 'white',
        stroke: this.STROKE_COLOR,
      });

      const text = this.createSVGElement('text', {
        x: '0',
        y: item.y,
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
        'font-size': '12',
        fill: 'black',
      });
      text.textContent = item.symbol;

      button.appendChild(circle);
      button.appendChild(text);
      menu.appendChild(button);
    });

    const menuBackground = this.createSVGElement('rect', {
      x: -15,
      y: -55,
      width: 30,
      height: 110,
      fill: 'transparent',
      class: 'menu-background',
    });
    menu.insertBefore(menuBackground, menu.firstChild);

    menu.addEventListener('mouseenter', this.handleMouseEnter.bind(this));
    menu.addEventListener('mouseleave', this.handleMouseLeave.bind(this));

    return menu;
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
  //   hide() {
  //     if (this.activeMenu) {
  //       this.activeMenu.style.display = 'none';
  //       this.activeMenu = null;
  //     }
  //   }

  handleMouseEnter() {
    this.isMouseOver = true;
    clearTimeout(this.hideTimeout);
  }

  handleMouseLeave() {
    this.isMouseOver = false;
    this.hide();
  }

  handleClick(event) {
    log('Context menu item clicked', event.target);
    const menuItem = event.target.closest('.menu-item');
    if (!menuItem) return;

    event.preventDefault();
    event.stopPropagation();

    console.log('Menu item clicked:', menuItem.dataset.type);

    const connectionType = menuItem.dataset.type;
    const connectionGroup = menuItem.closest('g');

    if (!connectionGroup) {
      console.error('Connection group not found');
      return;
    }

    const startId = connectionGroup.dataset.start;
    const endId = connectionGroup.dataset.end;

    console.log('Connection details:', { startId, endId, connectionType });
    console.log(
      'Connection group query:',
      `g[data-start="${startId}"][data-end="${endId}"]`,
    );

    log('Connection details:', { startId, endId, connectionType });

    if (connectionType === 'delete') {
      if (this.onDelete) {
        log('Executing delete callback');
        this.onDelete(startId, endId);
      } else {
        console.warn('Delete callback not set');
      }
    } else {
      if (this.onTypeChange) {
        log('Executing type change callback');
        this.onTypeChange(startId, endId, connectionType);
      } else {
        console.warn('Type change callback not set');
      }
    }

    this.hide();
  }

  attachClickHandler(element) {
    element.addEventListener('click', this.handleClick);
  }

  setDeleteCallback(callback) {
    log('Delete callback set');
    this.onDelete = callback;
  }

  setTypeChangeCallback(callback) {
    log('Type change callback set');
    this.onTypeChange = callback;
  }
}
