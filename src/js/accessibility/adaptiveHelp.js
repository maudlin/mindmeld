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
    this.helpButton = null;
    this.isTouch = false;
    this.isHelpVisible = false;
  }

  /**
   * Initialize adaptive help system
   */
  initialize() {
    this.helpElement = document.getElementById('help-text');
    this.isTouch = this.capabilityDetector.isTouchFirst();

    this.createHelpButton();
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

    // Read version and build date from meta tags
    const versionMeta = document.querySelector('meta[name="app-version"]');
    const dateMeta = document.querySelector('meta[name="build-date"]');
    const version = versionMeta ? versionMeta.content : 'dev';
    const buildDate = dateMeta ? dateMeta.content : '';

    // Clear existing content
    while (this.helpElement.firstChild)
      this.helpElement.removeChild(this.helpElement.firstChild);

    const lines = [];
    if (isTouch) {
      lines.push(
        ['Create a note:', 'double-tap on the canvas'],
        ['Select notes:', 'tap to select'],
        ['Color notes:', 'use the color picker at the top'],
        ['Connect notes:', 'tap connecting point on one note, tap second note'],
        ['Pan & Zoom:', 'drag to pan, pinch to zoom'],
        ['Long press on note:', 'start moving note'],
      );
    } else if (isHybrid) {
      lines.push(
        ['Create a note:', 'double-click/tap on the canvas'],
        ['Select notes:', 'click/tap to select, Shift+click for multiple'],
        ['Color notes:', 'use the color picker at the top'],
        ['Connect notes:', 'drag from one connector to another'],
        [
          'Pan & Zoom:',
          'right-click & drag or touch-drag to pan, scroll or pinch to zoom',
        ],
      );
    } else {
      lines.push(
        ['Create a note:', 'double click on the canvas'],
        [
          'Select & delete notes:',
          'left click to select a note. Press delete key to delete',
        ],
        [
          'Color notes:',
          'use the color picker at the top to apply colors to selected notes',
        ],
        [
          'Connect two notes:',
          'drag a line from one blue connector to another note',
        ],
        [
          'Select multiple notes:',
          'click on the canvas and drag to select notes',
        ],
        ['Pan & Zoom:', 'right click & drag to pan, scroll to zoom'],
      );
    }

    // Build help text DOM
    for (const [strongText, restText] of lines) {
      const strongEl = document.createElement('strong');
      strongEl.textContent = strongText + ' ';
      this.helpElement.appendChild(strongEl);
      this.helpElement.appendChild(document.createTextNode(restText));
      this.helpElement.appendChild(document.createElement('br'));
    }

    // Version line
    const versionStrong = document.createElement('strong');
    const versionSpan = document.createElement('span');
    versionSpan.id = 'version';
    versionSpan.textContent = `v${version}${buildDate ? ` (${buildDate})` : ''}`;
    versionStrong.appendChild(versionSpan);
    this.helpElement.appendChild(versionStrong);
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
   * Create the help button element
   */
  createHelpButton() {
    // Create help button
    this.helpButton = document.createElement('button');
    this.helpButton.id = 'help-button';
    this.helpButton.className = 'help-button';
    this.helpButton.innerHTML = '?';
    this.helpButton.setAttribute(
      'aria-label',
      this.isTouch ? 'Tap to show help' : 'Click to show help',
    );
    this.helpButton.setAttribute('role', 'button');
    this.helpButton.setAttribute('tabindex', '0');

    // Add click/tap event listener
    this.helpButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleHelp();
    });

    // Add keyboard support
    this.helpButton.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.toggleHelp();
      }
    });

    // Insert into DOM
    document.body.appendChild(this.helpButton);
  }

  /**
   * Toggle help text visibility
   */
  toggleHelp() {
    if (!this.helpElement) return;

    this.isHelpVisible = !this.isHelpVisible;

    if (this.isHelpVisible) {
      this.helpElement.classList.add('visible');
      this.helpButton.setAttribute(
        'aria-label',
        this.isTouch ? 'Tap to hide help' : 'Click to hide help',
      );
      this.helpButton.setAttribute('aria-expanded', 'true');
    } else {
      this.helpElement.classList.remove('visible');
      this.helpButton.setAttribute(
        'aria-label',
        this.isTouch ? 'Tap to show help' : 'Click to show help',
      );
      this.helpButton.setAttribute('aria-expanded', 'false');
    }
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

    // Close help when clicking outside
    document.addEventListener('click', (e) => {
      if (
        this.isHelpVisible &&
        !this.helpElement.contains(e.target) &&
        !this.helpButton.contains(e.target)
      ) {
        this.toggleHelp();
      }
    });

    // Close help on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isHelpVisible) {
        this.toggleHelp();
      }
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

    // Validate gesture parameter before using for object property access
    const allowedGestures = Object.keys(gestureHelp);
    if (typeof gesture === 'string' && allowedGestures.includes(gesture)) {
      return gestureHelp[gesture];
    }
    return 'Gesture not recognized';
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
