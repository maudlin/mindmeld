// src/js/features/kebabMenu/kebabMenu.js

/**
 * Kebab context menu functionality for the color picker palette
 * Provides access to canvas management, file operations, templates, and help
 */
export class KebabMenu {
  constructor() {
    this.button = null;
    this.menu = null;
    this.isOpen = false;
    this.startY = 0;
    this.currentY = 0;
    this.dragging = false;
  }

  /**
   * Initialize the kebab menu
   */
  initialize() {
    this.button = document.getElementById('kebab-menu-button');
    this.menu = document.getElementById('kebab-context-menu');

    if (!this.button || !this.menu) {
      console.warn('Kebab menu elements not found');
      return;
    }

    this.setupEventListeners();
  }

  /**
   * Set up all event listeners for the kebab menu
   */
  setupEventListeners() {
    // Button click toggle
    this.button.addEventListener('click', (e) => {
      e.stopPropagation();
      this.isOpen ? this.closeMenu() : this.openMenu();
    });

    // Button keyboard support
    this.button.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        this.isOpen ? this.closeMenu() : this.openMenu();
      }
    });

    // Menu item clicks
    this.menu.addEventListener('click', (e) => {
      const menuItem = e.target.closest('.kebab-menu-item');
      if (menuItem) {
        e.stopPropagation();
        this.handleMenuAction(menuItem.dataset.action);
        this.closeMenu();
      }
    });

    // Click-away to close
    document.addEventListener('click', (e) => {
      // Don't close menu when clicking on textarea in edit mode
      if (
        e.target.tagName === 'TEXTAREA' &&
        e.target.classList.contains('note-content')
      ) {
        return;
      }

      if (!this.menu.contains(e.target) && !this.button.contains(e.target)) {
        this.closeMenu();
      }
    });

    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeMenu();
      }
    });

    // Reposition on resize (desktop <-> mobile)
    window.addEventListener('resize', () => {
      if (this.isOpen) {
        this.positionMenu();
      }
    });

    // Mobile swipe-to-close functionality
    this.setupMobileInteractions();
  }

  /**
   * Setup mobile touch interactions for bottom sheet
   */
  setupMobileInteractions() {
    const onTouchStart = (e) => {
      if (window.innerWidth > 720) return;
      if (!e.target.closest('.kebab-menu-handle')) return;

      this.startY = e.touches[0].clientY;
      this.currentY = this.startY;
      this.dragging = true;
      this.menu.style.transition = 'transform 0.2s ease';
      document.body.style.overflow = 'hidden';
    };

    const onTouchMove = (e) => {
      if (!this.dragging) return;

      this.currentY = e.touches[0].clientY;
      const diff = this.currentY - this.startY;

      if (diff > 0) {
        this.menu.style.transform = `translateY(${diff}px)`;
      } else {
        this.menu.style.transform = '';
      }
    };

    const onTouchEnd = () => {
      if (!this.dragging) return;

      this.dragging = false;
      const diff = this.currentY - this.startY;
      document.body.style.overflow = '';

      if (diff > 50) {
        this.closeMenu();
      } else {
        this.menu.style.transform = '';
      }
    };

    this.menu.addEventListener('touchstart', onTouchStart, { passive: true });
    this.menu.addEventListener('touchmove', onTouchMove, { passive: true });
    this.menu.addEventListener('touchend', onTouchEnd);
  }

  /**
   * Open the kebab menu with smart positioning
   */
  openMenu() {
    this.positionMenu();
    this.menu.classList.add('open');
    this.menu.setAttribute('aria-hidden', 'false');
    this.button.setAttribute('aria-expanded', 'true');
    this.isOpen = true;

    // Focus first menu item for keyboard accessibility
    const firstMenuItem = this.menu.querySelector('.kebab-menu-item');
    if (firstMenuItem) {
      firstMenuItem.focus();
    }
  }

  /**
   * Close the kebab menu
   */
  closeMenu() {
    this.menu.classList.remove('open');
    this.menu.setAttribute('aria-hidden', 'true');
    this.button.setAttribute('aria-expanded', 'false');
    this.menu.style.transform = '';
    this.isOpen = false;

    // Return focus to button for keyboard accessibility
    this.button.focus();
  }

  /**
   * Position the menu intelligently based on screen size and available space
   */
  positionMenu() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 16;
    const gap = 8;

    // Mobile: bottom sheet full width
    if (vw <= 720) {
      this.menu.style.position = 'fixed';
      this.menu.style.top = '';
      this.menu.style.left = '0';
      this.menu.style.right = '0';
      this.menu.style.bottom = '0';
      this.menu.style.width = '100%';
      this.menu.style.borderRadius = '16px 16px 0 0';
      return;
    }

    // Desktop/tablet: place near button, never off-screen
    const rect = this.button.getBoundingClientRect();

    // Temporarily make visible to measure true size
    const prevVis = this.menu.style.visibility;
    const prevDisp = this.menu.style.display;
    this.menu.style.visibility = 'hidden';
    this.menu.style.display = 'block';

    const menuRect = this.menu.getBoundingClientRect();

    // Prefer below; flip above if needed
    let top = rect.bottom + gap;
    if (top + menuRect.height > vh - margin) {
      top = rect.top - menuRect.height - gap;
    }

    // Prefer align-left with button; shift/clamp as needed
    let left = rect.left;
    if (left + menuRect.width > vw - margin) {
      left = vw - menuRect.width - margin;
    }
    if (left < margin) left = margin;

    this.menu.style.position = 'absolute';
    this.menu.style.top = `${top + window.scrollY}px`;
    this.menu.style.left = `${left + window.scrollX}px`;
    this.menu.style.width = '';

    // Restore styles
    this.menu.style.visibility = prevVis;
    this.menu.style.display = prevDisp || '';
  }

  /**
   * Handle menu item actions by dispatching to appropriate handlers
   * @param {string} action - The action to perform
   */
  handleMenuAction(action) {
    switch (action) {
      case 'clear-canvas':
        this.dispatchAction('clear-canvas');
        break;
      case 'import-file':
        this.dispatchAction('import-from-file');
        break;
      case 'export-file':
        this.dispatchAction('export-to-file');
        break;
      case 'copy-clipboard':
        this.dispatchAction('export-to-clipboard');
        break;
      case 'paste-clipboard':
        this.dispatchAction('import-from-clipboard');
        break;
      default:
        console.warn(`Unknown kebab menu action: ${action}`);
    }
  }

  /**
   * Dispatch custom events for actions to be handled by existing systems
   * @param {string} actionType - Type of action to dispatch
   */
  dispatchAction(actionType) {
    const event = new CustomEvent('kebab-menu-action', {
      detail: { action: actionType },
      bubbles: true,
    });
    document.dispatchEvent(event);
  }
}
