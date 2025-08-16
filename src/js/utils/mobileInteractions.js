// src/js/utils/mobileInteractions.js

/**
 * Mobile Interaction Utilities
 *
 * Provides consistent mobile-friendly interaction patterns for UI components.
 * These utilities ensure touch devices have proper tap-to-open/tap-to-close behavior
 * while maintaining desktop hover compatibility.
 */

/**
 * Setup mobile-friendly dropdown behavior for menu items
 * Converts hover-based dropdowns to click-based with click-away-to-close
 *
 * @param {string|NodeList|Element} selector - CSS selector, NodeList, or single Element
 * @param {Object} options - Configuration options
 * @param {string} options.dropdownSelector - Selector for dropdown within menu item (default: '.dropdown')
 * @param {boolean} options.preventDefaultClick - Prevent default click behavior (default: true)
 * @param {boolean} options.singleDropdown - Only allow one dropdown open at a time (default: true)
 * @param {function} options.onOpen - Callback when dropdown opens
 * @param {function} options.onClose - Callback when dropdown closes
 */
export function setupMobileDropdown(selector, options = {}) {
  const config = {
    dropdownSelector: '.dropdown',
    preventDefaultClick: true,
    singleDropdown: true,
    onOpen: null,
    onClose: null,
    ...options,
  };

  // Get elements
  let menuItems;
  if (typeof selector === 'string') {
    menuItems = document.querySelectorAll(selector);
  } else if (selector.nodeType === Node.ELEMENT_NODE) {
    menuItems = [selector];
  } else {
    menuItems = selector;
  }

  // Setup click behavior for each menu item
  menuItems.forEach((menuItem) => {
    const dropdown = menuItem.querySelector(config.dropdownSelector);
    if (!dropdown) return;

    // Click handler for menu item
    const clickHandler = (e) => {
      if (config.preventDefaultClick) {
        e.preventDefault();
        e.stopPropagation();
      }

      const isCurrentlyOpen = dropdown.style.display === 'block';

      // Close other dropdowns if singleDropdown is enabled
      if (config.singleDropdown) {
        document
          .querySelectorAll(config.dropdownSelector)
          .forEach((otherDropdown) => {
            if (
              otherDropdown !== dropdown &&
              otherDropdown.style.display === 'block'
            ) {
              otherDropdown.style.display = 'none';
              if (config.onClose) config.onClose(otherDropdown);
            }
          });
      }

      // Toggle this dropdown
      if (isCurrentlyOpen) {
        dropdown.style.display = 'none';
        if (config.onClose) config.onClose(dropdown);
      } else {
        dropdown.style.display = 'block';
        if (config.onOpen) config.onOpen(dropdown);
      }
    };

    // Remove existing listeners to prevent duplicates
    menuItem.removeEventListener('click', clickHandler);
    menuItem.addEventListener('click', clickHandler);
  });

  // Setup global click-away behavior (only add once)
  if (!document._mobileDropdownListenerAdded) {
    document.addEventListener('click', (e) => {
      const clickedMenuItem = e.target.closest('.menu-item');
      if (!clickedMenuItem) {
        // Clicked outside any menu item - close all dropdowns
        document
          .querySelectorAll(config.dropdownSelector)
          .forEach((dropdown) => {
            if (dropdown.style.display === 'block') {
              dropdown.style.display = 'none';
              if (config.onClose) config.onClose(dropdown);
            }
          });
      }
    });

    // Escape key support
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document
          .querySelectorAll(config.dropdownSelector)
          .forEach((dropdown) => {
            if (dropdown.style.display === 'block') {
              dropdown.style.display = 'none';
              if (config.onClose) config.onClose(dropdown);
            }
          });
      }
    });

    document._mobileDropdownListenerAdded = true;
  }
}

/**
 * Setup mobile-friendly modal/overlay behavior
 * Provides consistent touch interactions for modal dialogs
 *
 * @param {string|Element} triggerSelector - Element that opens the modal
 * @param {string|Element} modalSelector - The modal element
 * @param {string|Element} closeSelector - Element(s) that close the modal
 * @param {Object} options - Configuration options
 */
export function setupMobileModal(
  triggerSelector,
  modalSelector,
  closeSelector,
  options = {},
) {
  const config = {
    backdropClose: true,
    escapeClose: true,
    preventScroll: true,
    onOpen: null,
    onClose: null,
    ...options,
  };

  const trigger =
    typeof triggerSelector === 'string'
      ? document.querySelector(triggerSelector)
      : triggerSelector;
  const modal =
    typeof modalSelector === 'string'
      ? document.querySelector(modalSelector)
      : modalSelector;
  const closeElements =
    typeof closeSelector === 'string'
      ? document.querySelectorAll(closeSelector)
      : [closeSelector];

  if (!trigger || !modal) return;

  // Open modal
  const openModal = () => {
    modal.style.display = 'block';
    modal.setAttribute('aria-hidden', 'false');

    if (config.preventScroll) {
      document.body.style.overflow = 'hidden';
    }

    if (config.onOpen) config.onOpen(modal);
  };

  // Close modal
  const closeModal = () => {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');

    if (config.preventScroll) {
      document.body.style.overflow = '';
    }

    if (config.onClose) config.onClose(modal);
  };

  // Setup trigger
  trigger.addEventListener('click', (e) => {
    e.preventDefault();
    openModal();
  });

  // Setup close elements
  closeElements.forEach((closeEl) => {
    if (closeEl) {
      closeEl.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal();
      });
    }
  });

  // Backdrop close
  if (config.backdropClose) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  // Escape key close
  if (config.escapeClose) {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.style.display === 'block') {
        closeModal();
      }
    });
  }

  return { openModal, closeModal };
}

/**
 * Add touch feedback to buttons/interactive elements
 * Provides visual feedback for touch interactions
 *
 * @param {string|NodeList|Element} selector - Elements to add touch feedback to
 * @param {Object} options - Configuration options
 */
export function setupTouchFeedback(selector, options = {}) {
  const config = {
    feedbackClass: 'touch-active',
    duration: 150,
    ...options,
  };

  let elements;
  if (typeof selector === 'string') {
    elements = document.querySelectorAll(selector);
  } else if (selector.nodeType === Node.ELEMENT_NODE) {
    elements = [selector];
  } else {
    elements = selector;
  }

  elements.forEach((element) => {
    element.addEventListener('touchstart', () => {
      element.classList.add(config.feedbackClass);
    });

    element.addEventListener('touchend', () => {
      setTimeout(() => {
        element.classList.remove(config.feedbackClass);
      }, config.duration);
    });

    element.addEventListener('touchcancel', () => {
      element.classList.remove(config.feedbackClass);
    });
  });
}

/**
 * Detect if the current device is touch-capable
 * Useful for conditional mobile behavior
 *
 * @returns {boolean} True if touch is supported
 */
export function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Get viewport size information
 * Useful for responsive behavior decisions
 *
 * @returns {Object} Viewport information
 */
export function getViewportInfo() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    isMobile: window.innerWidth <= 768,
    isTablet: window.innerWidth > 768 && window.innerWidth <= 1024,
    isDesktop: window.innerWidth > 1024,
  };
}
