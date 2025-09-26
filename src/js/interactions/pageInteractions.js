import { logger } from '../services/logger.js';
/**
 * Page Interactions - Simple DOM event handling for page UI elements
 *
 * Handles interactions for elements outside the canvas (menus, nav, etc.)
 * Incorporates the working KebabMenu UI logic with MenuBehavior business logic.
 * Server Connection Configuration UI
 */

let menuBehavior = null;
let serverConnectionBehavior = null;
let menuButton = null;
let menuElement = null;
let isMenuOpen = false;

// Mobile interaction state
let startY = 0;
let currentY = 0;
let dragging = false;

/**
 * Reset/cleanup page interactions (for testing)
 */
export function resetPageInteractions() {
  // Reset module state
  menuBehavior = null;
  serverConnectionBehavior = null;
  menuButton = null;
  menuElement = null;
  isMenuOpen = false;
  startY = 0;
  currentY = 0;
  dragging = false;
}

/**
 * Initialize page interactions with behavior references
 * @param {Object} interactionController - Controller with behavior references
 */
export function initializePageInteractions(interactionController) {
  // Get behavior references
  menuBehavior = interactionController.getBehavior('menu');
  serverConnectionBehavior =
    interactionController.getBehavior('serverConnection');

  if (!menuBehavior) {
    logger.warn('MenuBehavior not available');
    return;
  }

  if (!serverConnectionBehavior) {
    logger.warn('ServerConnectionBehavior not available');
    return;
  }

  // Get UI references
  menuButton = document.getElementById('kebab-menu-button');
  menuElement = document.getElementById('kebab-context-menu');

  if (!menuButton || !menuElement) {
    logger.warn('Menu elements not found');
    return;
  }

  // Set up menu interactions
  setupMenuInteractions();

  // Set up server connection modal interactions
  setupServerConnectionModalInteractions();

  logger.info(
    'PageInteractions: Initialized with MenuBehavior, ServerConnectionBehavior, and UI elements',
  );
}

/**
 * Set up menu button and menu item interactions (from working KebabMenu)
 */
function setupMenuInteractions() {
  // Menu button click toggle
  menuButton.addEventListener('click', (e) => {
    e.stopPropagation();
    isMenuOpen ? closeMenu() : openMenu();
    // Also notify MenuBehavior for business logic
    menuBehavior.handleMenuButtonAction('page');
  });

  // Menu button keyboard support
  menuButton.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      isMenuOpen ? closeMenu() : openMenu();
      menuBehavior.handleMenuButtonAction('keyboard');
    }
  });

  // Menu item clicks
  menuElement.addEventListener('click', (e) => {
    const menuItem = e.target.closest('.kebab-menu-item');
    if (menuItem) {
      e.stopPropagation();
      const action = menuItem.getAttribute('data-action');
      menuBehavior.handleMenuAction(action, 'page');
      closeMenu();
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

    // Don't close menu when interacting with server connection modal
    if (e.target.closest('#server-connection-modal')) {
      return;
    }

    if (
      !menuElement.contains(e.target) &&
      !menuButton.contains(e.target) &&
      isMenuOpen
    ) {
      closeMenu();
    }
  });

  // Escape key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isMenuOpen) {
      closeMenu();
    }
  });

  // Reposition on resize (desktop <-> mobile)
  window.addEventListener('resize', () => {
    if (isMenuOpen) {
      positionMenu();
    }
  });

  // Mobile swipe-to-close functionality
  setupMobileInteractions();

  logger.info('PageInteractions: Menu event listeners set up');
}

/**
 * Open the menu with smart positioning (from working KebabMenu)
 */
function openMenu() {
  positionMenu();
  menuElement.classList.add('open');
  menuElement.setAttribute('aria-hidden', 'false');
  menuButton.setAttribute('aria-expanded', 'true');
  isMenuOpen = true;

  // Focus first menu item for keyboard accessibility
  const firstMenuItem = menuElement.querySelector('.kebab-menu-item');
  if (firstMenuItem) {
    firstMenuItem.focus();
  }

  logger.info('PageInteractions: Menu opened');
}

/**
 * Close the menu (from working KebabMenu)
 */
function closeMenu() {
  menuElement.classList.remove('open');
  menuElement.setAttribute('aria-hidden', 'true');
  menuButton.setAttribute('aria-expanded', 'false');
  menuElement.style.transform = '';
  isMenuOpen = false;

  // Return focus to button for keyboard accessibility
  menuButton.focus();

  logger.info('PageInteractions: Menu closed');
}

/**
 * Position the menu intelligently (from working KebabMenu)
 */
function positionMenu() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const margin = 16;
  const gap = 8;

  // Mobile: bottom sheet full width
  if (vw <= 720) {
    menuElement.style.position = 'fixed';
    menuElement.style.top = '';
    menuElement.style.left = '0';
    menuElement.style.right = '0';
    menuElement.style.bottom = '0';
    menuElement.style.width = '100%';
    menuElement.style.borderRadius = '16px 16px 0 0';
    return;
  }

  // Desktop/tablet: place near button, never off-screen
  const rect = menuButton.getBoundingClientRect();

  // Temporarily make visible to measure true size
  const prevVis = menuElement.style.visibility;
  const prevDisp = menuElement.style.display;
  menuElement.style.visibility = 'hidden';
  menuElement.style.display = 'block';

  const menuRect = menuElement.getBoundingClientRect();

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

  menuElement.style.position = 'absolute';
  menuElement.style.top = `${top + window.scrollY}px`;
  menuElement.style.left = `${left + window.scrollX}px`;
  menuElement.style.width = '';

  // Restore styles
  menuElement.style.visibility = prevVis;
  menuElement.style.display = prevDisp || '';
}

/**
 * Setup mobile touch interactions for bottom sheet (from working KebabMenu)
 */
function setupMobileInteractions() {
  const onTouchStart = (e) => {
    if (window.innerWidth > 720) return;
    if (!e.target.closest('.kebab-menu-handle')) return;

    startY = e.touches[0].clientY;
    currentY = startY;
    dragging = true;
    menuElement.style.transition = 'transform 0.2s ease';
    document.body.style.overflow = 'hidden';
  };

  const onTouchMove = (e) => {
    if (!dragging) return;

    currentY = e.touches[0].clientY;
    const diff = currentY - startY;

    if (diff > 0) {
      menuElement.style.transform = `translateY(${diff}px)`;
    } else {
      menuElement.style.transform = '';
    }
  };

  const onTouchEnd = () => {
    if (!dragging) return;

    dragging = false;
    const diff = currentY - startY;
    document.body.style.overflow = '';

    if (diff > 50) {
      closeMenu();
    } else {
      menuElement.style.transform = '';
    }
  };

  menuElement.addEventListener('touchstart', onTouchStart, { passive: true });
  menuElement.addEventListener('touchmove', onTouchMove, { passive: true });
  menuElement.addEventListener('touchend', onTouchEnd);
}

/**
 * Set up server connection modal interactions
 * Server Connection Configuration UI
 */
function setupServerConnectionModalInteractions() {
  // Verify server connection modal elements exist (they should be in index.html)
  const modal = document.getElementById('server-connection-modal');
  if (!modal) {
    logger.warn('Server connection modal not found in HTML');
    return;
  }

  logger.info('PageInteractions: Server connection modal interactions set up');
}
