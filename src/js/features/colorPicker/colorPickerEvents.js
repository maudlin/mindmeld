// src/js/features/colorPicker/colorPickerEvents.js
import { ColorService } from '../../services/colorService.js';
import { eventBus } from '../../core/eventBus.js';
import { logger } from '../../services/logger.js';

/**
 * Color Picker Event Handling System
 * Manages user interactions with the color picker UI
 */
export class ColorPickerEvents {
  static isInitialized = false;

  /**
   * Initialize color picker event handlers
   */
  static initialize() {
    if (this.isInitialized) {
      logger.info('Color picker events already initialized');
      return;
    }

    this.setupColorSwatchEvents();
    this.setupKeyboardNavigation();
    this.subscribeToStateChanges();

    this.isInitialized = true;
    logger.info('Color picker events initialized');
  }

  /**
   * Set up click and touch events for color swatches
   */
  static setupColorSwatchEvents() {
    const swatches = document.querySelectorAll('.color-swatch');

    swatches.forEach((swatch) => {
      // Click event
      swatch.addEventListener('click', (event) => {
        this.handleColorSelection(event);
      });

      // Touch event for mobile
      swatch.addEventListener('touchend', (event) => {
        event.preventDefault(); // Prevent click event
        this.handleColorSelection(event);
      });

      // Hover effects for preview
      swatch.addEventListener('mouseenter', (event) => {
        this.handleColorHover(event);
      });

      swatch.addEventListener('mouseleave', (event) => {
        this.handleColorHoverEnd(event);
      });
    });
  }

  /**
   * Set up keyboard navigation for accessibility
   */
  static setupKeyboardNavigation() {
    const swatches = document.querySelectorAll('.color-swatch');

    swatches.forEach((swatch) => {
      swatch.addEventListener('keydown', (event) => {
        this.handleKeyboardNavigation(event);
      });
    });
  }

  /**
   * Handle color swatch selection
   * @param {Event} event - Click or touch event
   */
  static handleColorSelection(event) {
    const swatch = event.target;
    const color = swatch.getAttribute('data-color');

    if (!color) {
      logger.info('No color found on swatch');
      return;
    }

    // Update visual state
    this.updateActiveColorSwatch(color);

    // Apply color logic based on current state
    ColorService.applyColorToSelectedNotes(color);

    // Emit selection event
    eventBus.emit('colorPicker.selection', { color, swatch });
    logger.info(`Color picker selection: ${color}`);
  }

  /**
   * Handle keyboard navigation
   * @param {KeyboardEvent} event - Keyboard event
   */
  static handleKeyboardNavigation(event) {
    const swatch = event.target;

    switch (event.key) {
      case 'Enter':
      case ' ': // Spacebar
        event.preventDefault();
        this.handleColorSelection(event);
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        this.focusNextSwatch(swatch);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        this.focusPreviousSwatch(swatch);
        break;
      case 'Home':
        event.preventDefault();
        this.focusFirstSwatch();
        break;
      case 'End':
        event.preventDefault();
        this.focusLastSwatch();
        break;
    }
  }

  /**
   * Handle color hover for preview
   * @param {MouseEvent} event - Mouse event
   */
  static handleColorHover(event) {
    const swatch = event.target;
    const color = swatch.getAttribute('data-color');

    // Add hover visual feedback
    swatch.classList.add('hover');

    // Emit hover event for potential preview functionality
    eventBus.emit('colorPicker.hover', { color, swatch });
  }

  /**
   * Handle end of color hover
   * @param {MouseEvent} event - Mouse event
   */
  static handleColorHoverEnd(event) {
    const swatch = event.target;
    const color = swatch.getAttribute('data-color');

    // Remove hover visual feedback
    swatch.classList.remove('hover');

    // Emit hover end event
    eventBus.emit('colorPicker.hover.end', { color, swatch });
  }

  /**
   * Update which color swatch appears active
   * @param {string} color - Color scheme name
   */
  static updateActiveColorSwatch(color) {
    // Remove active class from all swatches
    document.querySelectorAll('.color-swatch').forEach((swatch) => {
      swatch.classList.remove('active');
    });

    // Add active class to selected swatch
    const activeSwatch = document.querySelector(`[data-color="${color}"]`);
    if (activeSwatch) {
      activeSwatch.classList.add('active');
    }
  }

  /**
   * Focus next color swatch in sequence
   * @param {HTMLElement} currentSwatch - Currently focused swatch
   */
  static focusNextSwatch(currentSwatch) {
    const swatches = Array.from(document.querySelectorAll('.color-swatch'));
    const currentIndex = swatches.indexOf(currentSwatch);
    const nextIndex = (currentIndex + 1) % swatches.length;
    // eslint-disable-next-line security/detect-object-injection
    swatches[nextIndex].focus();
  }

  /**
   * Focus previous color swatch in sequence
   * @param {HTMLElement} currentSwatch - Currently focused swatch
   */
  static focusPreviousSwatch(currentSwatch) {
    const swatches = Array.from(document.querySelectorAll('.color-swatch'));
    const currentIndex = swatches.indexOf(currentSwatch);
    const prevIndex =
      currentIndex === 0 ? swatches.length - 1 : currentIndex - 1;
    // eslint-disable-next-line security/detect-object-injection
    swatches[prevIndex].focus();
  }

  /**
   * Focus first color swatch
   */
  static focusFirstSwatch() {
    const firstSwatch = document.querySelector('.color-swatch');
    if (firstSwatch) firstSwatch.focus();
  }

  /**
   * Focus last color swatch
   */
  static focusLastSwatch() {
    const swatches = document.querySelectorAll('.color-swatch');
    const lastSwatch = swatches[swatches.length - 1];
    if (lastSwatch) lastSwatch.focus();
  }

  /**
   * Subscribe to state changes to update UI
   */
  static subscribeToStateChanges() {
    // Listen for color state changes
    eventBus.on('color.changed', (data) => {
      this.updateActiveColorSwatch(data.color);
    });

    // Listen for note selection changes to update picker state
    eventBus.on('note.selection.changed', () => {
      this.updatePickerForSelectionChange();
    });

    // Listen for color state reset
    eventBus.on('color.state.reset', () => {
      this.updateActiveColorSwatch('yellow');
    });

    // Listen for app state restoration to update active swatch
    eventBus.on('app.state.restored', (data) => {
      if (data.colorState && data.colorState.currentColor) {
        // Validate the restored color before using it
        if (ColorService.isValidColor(data.colorState.currentColor)) {
          this.updateActiveColorSwatch(data.colorState.currentColor);
        } else {
          // Invalid color - fallback to default and get current color from service
          const currentColor = ColorService.getCurrentColor();
          this.updateActiveColorSwatch(currentColor);
        }
      } else {
        // No color state - fallback to getting current color from service
        const currentColor = ColorService.getCurrentColor();
        this.updateActiveColorSwatch(currentColor);
      }
    });
  }

  /**
   * Update color picker when note selection changes
   */
  static updatePickerForSelectionChange() {
    const selectedNotes = document.querySelectorAll('.note.selected');

    if (selectedNotes.length === 0) {
      // No notes selected - show current global color
      const currentColor = ColorService.getCurrentColor();
      this.updateActiveColorSwatch(currentColor);
    } else if (selectedNotes.length === 1) {
      // Single note selected - show its color
      const noteId = selectedNotes[0].id;
      const noteColor = ColorService.getNoteColor(noteId);
      this.updateActiveColorSwatch(noteColor);
    } else {
      // Multiple notes selected - show current global color
      const currentColor = ColorService.getCurrentColor();
      this.updateActiveColorSwatch(currentColor);
    }
  }

  /**
   * Clean up event handlers (for testing or reset)
   */
  static cleanup() {
    const swatches = document.querySelectorAll('.color-swatch');
    swatches.forEach((swatch) => {
      swatch.replaceWith(swatch.cloneNode(true));
    });

    this.isInitialized = false;
    logger.info('Color picker events cleaned up');
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    ColorPickerEvents.initialize();
  });
} else {
  ColorPickerEvents.initialize();
}
