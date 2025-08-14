// src/js/accessibility/adaptiveHelp.js

import { CapabilityDetector } from '../interactions/capabilities/detector.js';

/**
 * Adaptive Help System
 * Provides context-aware help text and ARIA labels based on device capabilities
 */
export class AdaptiveHelp {
  constructor() {
    this.capabilityDetector = new CapabilityDetector();
    this.helpElement = null;
    this.isTouch = false;
  }

  /**
   * Initialize adaptive help system
   */
  initialize() {
    this.helpElement = document.getElementById('help-text');
    this.isTouch = this.capabilityDetector.isTouchFirst();

    this.updateHelpText();
    this.updateAriaLabels();
    this.setupEventListeners();
  }

  /**
   * Update help text based on device capabilities
   */
  updateHelpText() {
    if (!this.helpElement) return;

    const capabilities = this.capabilityDetector.getCapabilities();
    const isTouch = capabilities.isTouchFirst;
    const isHybrid = capabilities.isHybridDevice;

    let helpHTML = '';

    if (isTouch) {
      // Touch-first help text
      helpHTML = `
        <strong>Create a note:</strong> double-tap on the canvas<br />
        <strong>Select notes:</strong> tap to select<br />
        <strong>Color notes:</strong> use the color picker at the top<br />
        <strong>Connect notes:</strong> drag from one connector to another<br />
        <strong>Pan & Zoom:</strong> drag to pan, pinch to zoom<br />
        <strong>Long press:</strong> for context menu<br />
        <strong><span id="version">v0.10.0 (2025-08-14)</span></strong>
      `;
    } else if (isHybrid) {
      // Hybrid device help text (both touch and mouse)
      helpHTML = `
        <strong>Create a note:</strong> double-click/tap on the canvas<br />
        <strong>Select notes:</strong> click/tap to select, Shift+click for multiple<br />
        <strong>Color notes:</strong> use the color picker at the top<br />
        <strong>Connect notes:</strong> drag from one connector to another<br />
        <strong>Pan & Zoom:</strong> right-click & drag or touch-drag to pan, scroll or pinch to zoom<br />
        <strong><span id="version">v0.10.0 (2025-08-14)</span></strong>
      `;
    } else {
      // Desktop help text (original)
      helpHTML = `
        <strong>Create a note:</strong> double click on the canvas<br />
        <strong>Select & delete notes:</strong> left click to select a note. Press delete key to delete<br />
        <strong>Color notes:</strong> use the color picker at the top to apply colors to selected notes<br />
        <strong>Connect two notes:</strong> drag a line from one blue connector to another<br />
        <strong>Select multiple notes:</strong> click on the canvas and drag to select notes<br />
        <strong>Pan & Zoom:</strong> right click & drag to pan, scroll to zoom<br />
        <strong><span id="version">v0.10.0 (2025-08-14)</span></strong>
      `;
    }

    this.helpElement.innerHTML = helpHTML;
  }

  /**
   * Update ARIA labels based on input capabilities
   */
  updateAriaLabels() {
    const capabilities = this.capabilityDetector.getCapabilities();
    const isTouch = capabilities.isTouchFirst;

    // Update canvas ARIA label
    const canvas = document.getElementById('canvas');
    if (canvas) {
      const canvasLabel = isTouch
        ? 'Mind map canvas. Double-tap to create notes, drag to move notes and pan canvas, pinch to zoom'
        : 'Mind map canvas. Double-click to create notes, drag to move notes, right-click and drag to pan, scroll to zoom';

      canvas.setAttribute('aria-label', canvasLabel);
      canvas.setAttribute('role', 'application');
    }

    // Update color picker ARIA labels
    const colorSwatches = document.querySelectorAll('.color-swatch');
    colorSwatches.forEach((swatch) => {
      const currentLabel = swatch.getAttribute('aria-label');

      if (isTouch && !currentLabel.includes('tap')) {
        const touchLabel = currentLabel.replace('Select', 'Tap to select');
        swatch.setAttribute('aria-label', touchLabel);
      }
    });

    // Update menu button labels for touch
    const menuButtons = document.querySelectorAll('.menu-button');
    menuButtons.forEach((button) => {
      if (isTouch) {
        const currentLabel =
          button.getAttribute('aria-label') || button.textContent;
        if (!currentLabel.includes('tap')) {
          button.setAttribute(
            'aria-label',
            `Tap to open ${button.textContent.toLowerCase()} menu`,
          );
        }
      }
    });
  }

  /**
   * Setup event listeners for input mode changes
   */
  setupEventListeners() {
    // Listen for input mode changes (if supported by InputController)
    document.addEventListener('input.modeChanged', (event) => {
      this.isTouch = event.detail.to === 'touch';
      this.updateHelpText();
      this.updateAriaLabels();
    });

    // Listen for orientation changes on mobile
    window.addEventListener('orientationchange', () => {
      // Small delay to ensure viewport has updated
      setTimeout(() => {
        this.updateHelpText();
      }, 100);
    });
  }

  /**
   * Get contextual help for specific gestures
   */
  getGestureHelp(gesture) {
    const capabilities = this.capabilityDetector.getCapabilities();
    const isTouch = capabilities.isTouchFirst;

    const gestureHelp = {
      create: isTouch
        ? 'Double-tap on empty canvas area'
        : 'Double-click on empty canvas area',
      select: isTouch ? 'Tap on note' : 'Click on note',
      multiSelect: isTouch
        ? 'Not available on touch devices'
        : 'Shift+click or drag selection box',
      move: isTouch ? 'Touch and drag note' : 'Click and drag note',
      connect: isTouch
        ? "Drag from blue connector to another note's connector"
        : "Drag from blue connector to another note's connector",
      pan: isTouch
        ? 'Touch and drag on empty canvas'
        : 'Right-click and drag on canvas',
      zoom: isTouch ? 'Pinch with two fingers' : 'Scroll wheel',
      contextMenu: isTouch
        ? 'Long press on note or canvas'
        : 'Right-click on note or canvas',
      delete: 'Select note and press Delete key',
    };

    // Safe: gesture parameter is validated by the calling code and comes from controlled sources
    // eslint-disable-next-line security/detect-object-injection
    return gestureHelp[gesture] || 'Gesture not recognized';
  }

  /**
   * Show contextual help tooltip
   */
  showContextualHelp(element, gesture) {
    const helpText = this.getGestureHelp(gesture);

    // Create or update tooltip
    let tooltip = element.querySelector('.adaptive-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.className = 'adaptive-tooltip';
      tooltip.style.cssText = `
        position: absolute;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 1001;
        pointer-events: none;
        white-space: nowrap;
        top: -35px;
        left: 50%;
        transform: translateX(-50%);
      `;
      element.style.position = 'relative';
      element.appendChild(tooltip);
    }

    tooltip.textContent = helpText;
    tooltip.style.display = 'block';

    // Auto-hide after 3 seconds
    setTimeout(() => {
      if (tooltip.parentNode) {
        tooltip.style.display = 'none';
      }
    }, 3000);
  }
}
