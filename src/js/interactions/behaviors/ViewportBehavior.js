/**
 * ViewportBehavior - Handles all viewport transformation logic (pan, zoom)
 *
 * Unified behavior for viewport navigation across all input methods.
 * Receives input from both DesktopAdapter and TouchAdapter.
 * Implements Google Maps-style smooth simultaneous pan/zoom gestures.
 */

import config from '../../core/config.js';

export class ViewportBehavior {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.isInitialized = false;
    this.name = 'ViewportBehavior';

    // Canvas references
    this.canvas = null;
    this.zoomDisplay = null;

    // Current zoom state
    this.zoomLevel = config.zoomLevels.default;

    console.log('ViewportBehavior: Created');
  }

  /**
   * Initialize the behavior with canvas references
   */
  async initialize(canvas, zoomDisplay) {
    if (this.isInitialized) {
      return;
    }

    this.canvas = canvas;
    this.zoomDisplay = zoomDisplay;

    // Set initial zoom level and display
    this.setZoomLevel(config.zoomLevels.default);
    this.updateZoomDisplay(); // Initialize zoom display visibility

    this.isInitialized = true;
    console.log('ViewportBehavior: Initialized', {
      hasCanvas: !!this.canvas,
      hasZoomDisplay: !!this.zoomDisplay,
      initialZoomLevel: this.zoomLevel,
    });
  }

  /**
   * Handle wheel zoom from DesktopAdapter
   * Receives: { direction: 'in'|'out', x, y }
   */
  handleWheelZoom(direction, x, y, inputType) {
    if (!this.canvas) {
      console.warn('ViewportBehavior: Canvas not available for wheel zoom');
      return;
    }

    console.log('ViewportBehavior: Wheel zoom detected', {
      direction,
      x,
      y,
      inputType,
    });

    // Calculate zoom delta based on direction
    const zoomDelta = direction === 'in' ? 1 : -1;
    const newZoomLevel = this.zoomLevel + zoomDelta;

    // Apply zoom with center point
    this.applyZoomAtPoint(newZoomLevel, x, y);
  }

  /**
   * Handle pinch zoom from TouchAdapter
   * Receives: { scale, centerX, centerY } (CSS scale factor)
   */
  handlePinchZoom(scale, centerX, centerY, inputType) {
    if (!this.canvas) {
      console.warn('ViewportBehavior: Canvas not available for pinch zoom');
      return;
    }

    console.log('ViewportBehavior: Pinch zoom detected', {
      scale,
      centerX,
      centerY,
      inputType,
    });

    // TouchAdapter sends CSS scale factor directly - apply it
    this.applyCssScale(scale, centerX, centerY);
  }

  /**
   * Handle pan from TouchAdapter or future sources
   * Google Maps style: Immediate 1:1 response, no damping
   */
  handlePan(deltaX, deltaY, inputType) {
    if (!this.canvas) {
      console.warn('ViewportBehavior: Canvas not available for pan');
      return;
    }

    console.log('ViewportBehavior: Pan detected', {
      deltaX,
      deltaY,
      inputType,
    });

    // Google Maps approach: Direct 1:1 movement, no damping
    const transform = new DOMMatrix(
      window.getComputedStyle(this.canvas).transform,
    );
    this.canvas.style.transform = `translate(${transform.e + deltaX}px, ${
      transform.f + deltaY
    }px) scale(${transform.a})`;
  }

  /**
   * Handle desktop right-click pan (matches old zoomManager behavior)
   * Uses direct DOM manipulation like the old implementation
   */
  handleDesktopPan(deltaX, deltaY) {
    if (!this.canvas) {
      console.warn('ViewportBehavior: Canvas not available for desktop pan');
      return;
    }

    console.log('ViewportBehavior: Desktop pan detected', {
      deltaX,
      deltaY,
    });

    // Direct DOM manipulation like old zoomManager
    const transform = new DOMMatrix(
      window.getComputedStyle(this.canvas).transform,
    );
    this.canvas.style.transform = `translate(${transform.e + deltaX}px, ${
      transform.f + deltaY
    }px) scale(${transform.a})`;
  }

  /**
   * Handle simultaneous pan and zoom (Google Maps style)
   * This is where the magic happens - no conflict resolution needed
   */
  handleSimultaneousPanZoom(
    panDeltaX,
    panDeltaY,
    scale,
    centerX,
    centerY,
    inputType,
  ) {
    if (!this.canvas) {
      console.warn(
        'ViewportBehavior: Canvas not available for simultaneous pan/zoom',
      );
      return;
    }

    console.log('ViewportBehavior: Simultaneous pan/zoom detected', {
      panDeltaX,
      panDeltaY,
      scale,
      centerX,
      centerY,
      inputType,
    });

    // Get current transform
    const transform = new DOMMatrix(
      window.getComputedStyle(this.canvas).transform,
    );

    // Apply pan first (translate)
    let newTranslateX = transform.e + panDeltaX;
    let newTranslateY = transform.f + panDeltaY;

    // Then apply zoom with center point adjustment
    if (scale && scale !== transform.a) {
      const containerRect = this.canvas.parentElement.getBoundingClientRect();
      const validCenterX = isNaN(centerX) ? this.canvas.width / 2 : centerX;
      const validCenterY = isNaN(centerY) ? this.canvas.height / 2 : centerY;

      // Adjust translation to keep center point fixed during zoom
      newTranslateX = containerRect.width / 2 - validCenterX * scale;
      newTranslateY = containerRect.height / 2 - validCenterY * scale;
    }

    // Apply combined transform
    this.canvas.style.transform = `translate(${newTranslateX}px, ${newTranslateY}px) scale(${scale || transform.a})`;
  }

  /**
   * Apply zoom at specific point (for wheel zoom) - using old zoomManager algorithm
   */
  applyZoomAtPoint(newZoomLevel, centerX, centerY) {
    const oldZoom = this.zoomLevel;
    this.setZoomLevel(newZoomLevel);
    const actualZoomLevel = this.zoomLevel; // May be clamped

    if (oldZoom === actualZoomLevel) {
      return; // No change after clamping
    }

    const newScale = actualZoomLevel / 5;
    const oldScale = oldZoom / 5;

    // Use provided center point or default to center
    const validCenterX = isNaN(centerX) ? this.canvas.clientWidth / 2 : centerX;
    const validCenterY = isNaN(centerY)
      ? this.canvas.clientHeight / 2
      : centerY;

    // Use old zoomManager incremental algorithm for wheel zoom
    const dx = (validCenterX / oldScale) * (newScale - oldScale);
    const dy = (validCenterY / oldScale) * (newScale - oldScale);

    // Get current transform and apply delta
    const transform = new DOMMatrix(
      window.getComputedStyle(this.canvas).transform,
    );
    const newTransform = `translate(${transform.e - dx}px, ${transform.f - dy}px) scale(${newScale})`;

    this.canvas.style.transform = newTransform;

    this.updateZoomDisplay();

    console.log('ViewportBehavior: Zoom applied at point', {
      oldZoom,
      newZoom: actualZoomLevel,
      centerX: validCenterX,
      centerY: validCenterY,
    });
  }

  /**
   * Apply CSS scale directly (for touch pinch)
   */
  applyCssScale(scale, centerX, centerY) {
    const containerRect = this.canvas.parentElement.getBoundingClientRect();
    const validCenterX = isNaN(centerX) ? this.canvas.width / 2 : centerX;
    const validCenterY = isNaN(centerY) ? this.canvas.height / 2 : centerY;

    // Calculate position to keep center point fixed
    const offsetX = containerRect.width / 2 - validCenterX * scale;
    const offsetY = containerRect.height / 2 - validCenterY * scale;

    this.canvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;

    console.log('ViewportBehavior: CSS scale applied', {
      scale,
      centerX: validCenterX,
      centerY: validCenterY,
    });
  }

  /**
   * Zoom level management (internal state)
   */
  setZoomLevel(newLevel) {
    this.zoomLevel = Math.max(
      config.zoomLevels.min,
      Math.min(config.zoomLevels.max, newLevel),
    );
  }

  getZoomLevel() {
    return this.zoomLevel;
  }

  /**
   * Set fixed zoom level at specific center point (replaces zoomManager.setFixedZoom)
   */
  setFixedZoom(level, centerX, centerY) {
    const oldZoom = this.getZoomLevel();
    this.setZoomLevel(level);
    const newZoom = this.getZoomLevel();

    console.log('ViewportBehavior: Setting fixed zoom:', {
      level,
      centerX,
      centerY,
      oldZoom,
      newZoom,
    });

    const newScale = newZoom / 5;

    // Use default center if centerX or centerY are NaN
    centerX = isNaN(centerX) ? this.canvas.width / 2 : centerX;
    centerY = isNaN(centerY) ? this.canvas.height / 2 : centerY;

    // Calculate position to keep center point fixed
    const containerRect = this.canvas.parentElement.getBoundingClientRect();
    const offsetX = containerRect.width / 2 - centerX * newScale;
    const offsetY = containerRect.height / 2 - centerY * newScale;

    this.canvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${newScale})`;

    if (this.zoomDisplay) {
      this.updateZoomDisplay();
    }

    console.log(
      `ViewportBehavior: Zoom level set from ${oldZoom} to ${newZoom}, centered at (${centerX}, ${centerY})`,
    );
  }

  /**
   * Update zoom display UI
   */
  updateZoomDisplay() {
    if (this.zoomDisplay) {
      this.zoomDisplay.textContent = `${this.zoomLevel}x`;
    }
  }

  /**
   * Setup zoom and pan functionality (legacy bridge method)
   * Called from canvasInitialization.js and uiSetup.js
   */
  setupZoomAndPan(canvasContainer) {
    if (!this.canvas || !this.zoomDisplay) {
      console.warn(
        'ViewportBehavior: Canvas or zoomDisplay not available for setup',
      );
      return;
    }

    console.log('ViewportBehavior: Setting up zoom and pan');

    // Position canvas initially (like old zoomManager)
    this.positionCanvas();

    // Initialize zoom display (this was the missing piece!)
    this.updateZoomDisplay();

    // Prevent default context menu (from old zoomManager)
    if (canvasContainer) {
      canvasContainer.addEventListener('contextmenu', (event) =>
        event.preventDefault(),
      );
    }
  }

  /**
   * Position canvas at center (from old zoomManager)
   */
  positionCanvas() {
    const centerX = this.canvas.clientWidth / 2;
    const centerY = this.canvas.clientHeight / 2;
    console.log('ViewportBehavior: Positioning canvas at center', {
      centerX,
      centerY,
      clientWidth: this.canvas.clientWidth,
      clientHeight: this.canvas.clientHeight,
    });
    this.applyZoomAtPoint(this.zoomLevel, centerX, centerY);
  }

  /**
   * Utility: Reset zoom to default
   */
  resetZoom() {
    console.log('ViewportBehavior: Resetting zoom to default');
    this.applyZoomAtPoint(
      config.zoomLevels.default,
      this.canvas.clientWidth / 2,
      this.canvas.clientHeight / 2,
    );
  }

  /**
   * Utility: Zoom in/out by steps
   */
  zoomIn() {
    console.log('ViewportBehavior: Zoom in requested');
    this.applyZoomAtPoint(
      this.zoomLevel + 1,
      this.canvas.width / 2,
      this.canvas.height / 2,
    );
  }

  zoomOut() {
    console.log('ViewportBehavior: Zoom out requested');
    this.applyZoomAtPoint(
      this.zoomLevel - 1,
      this.canvas.width / 2,
      this.canvas.height / 2,
    );
  }

  /**
   * Cleanup
   */
  async destroy() {
    this.canvas = null;
    this.zoomDisplay = null;
    this.isInitialized = false;
    console.log('ViewportBehavior: Destroyed');
  }
}
