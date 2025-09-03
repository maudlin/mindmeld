/**
 * ViewportBehavior - Handles all viewport transformation logic (pan, zoom)
 *
 * Unified behavior for viewport navigation across all input methods.
 * Receives input from both DesktopAdapter and TouchAdapter.
 * Implements Google Maps-style smooth simultaneous pan/zoom gestures.
 */

import config from '../../core/config.js';
import { getScaleFromZoomLevel } from '../../core/coordinates/CoordinateConfig.js';
import { getCoordinateTransform } from '../../core/coordinates/coordinateService.js';

export class ViewportBehavior {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.isInitialized = false;
    this.name = 'ViewportBehavior';

    // Canvas references
    this.canvas = null;
    this.zoomDisplay = null;
    this.coordinateTransform = null;

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

    // Get coordinate transform service for viewport->canvas coordinate conversion
    try {
      this.coordinateTransform = getCoordinateTransform();
    } catch (error) {
      console.warn(
        'ViewportBehavior: CoordinateTransform service not available:',
        error.message,
      );
    }

    // Initialize canvas center position (replaces CSS centering)
    this.initializeCenterCanvas();

    // Set initial zoom level and display
    this.setZoomLevel(config.zoomLevels.default);
    this.updateZoomDisplay(); // Initialize zoom display visibility

    this.isInitialized = true;
    console.log('ViewportBehavior: Initialized', {
      hasCanvas: !!this.canvas,
      hasZoomDisplay: !!this.zoomDisplay,
      hasCoordinateTransform: !!this.coordinateTransform,
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
   * FIXED: Fine-grained proportional zoom control like Google Maps
   */
  handlePinchZoom(scaleDelta, centerX, centerY, inputType) {
    if (!this.canvas) {
      console.warn('ViewportBehavior: Canvas not available for pinch zoom');
      return;
    }

    console.log('ViewportBehavior: Pinch zoom detected', {
      scaleDelta,
      viewportCenter: { x: centerX, y: centerY },
      inputType,
    });

    // FIXED: Direct proportional zoom level calculation from current zoom
    // scaleDelta 1.0 = no change, scaleDelta > 1.0 = zoom in, scaleDelta < 1.0 = zoom out
    // Apply relative zoom change from current zoom level for smooth control
    const zoomDelta = Math.log2(scaleDelta) * 2; // 2x sensitivity for good control range
    const newZoomLevel = this.zoomLevel + zoomDelta;

    // Apply zoom with viewport center point - applyZoomAtPoint will handle coordinate conversion
    this.applyZoomAtPoint(newZoomLevel, centerX, centerY);
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
   * Enhanced: Use separate operations for cleaner logic
   */
  handleSimultaneousPanZoom(
    panDeltaX,
    panDeltaY,
    scaleDelta,
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
      scaleDelta,
      centerX,
      centerY,
      inputType,
    });

    // Apply pan first
    this.handlePan(panDeltaX, panDeltaY, inputType);

    // Then apply zoom using the same logic as individual pinch
    this.handlePinchZoom(scaleDelta, centerX, centerY, inputType);
  }

  /**
   * Apply zoom at a specific point using simplified single-transform approach (MM-221)
   * Industry standard viewport-to-content coordinate conversion
   */
  applyZoomAtPoint(newZoomLevel, viewportX, viewportY) {
    const oldZoom = this.zoomLevel;
    this.setZoomLevel(newZoomLevel);
    const actualZoomLevel = this.zoomLevel; // May be clamped

    // Get current transform state using DOMMatrix for accuracy
    let currentTranslate = { x: 0, y: 0 };
    let currentScale = 1;

    if (typeof DOMMatrix !== 'undefined') {
      const matrix = new DOMMatrix(getComputedStyle(this.canvas).transform);
      currentTranslate.x = matrix.e;
      currentTranslate.y = matrix.f;
      currentScale = matrix.a;
    } else {
      // Fallback for test environments
      const transform = this.canvas.style.transform || '';
      const scaleMatch = transform.match(/scale\(([\d.]+)\)/);
      const translateMatch = transform.match(
        /translate\(([\d.-]+)px,\s*([\d.-]+)px\)/,
      );

      if (scaleMatch) currentScale = parseFloat(scaleMatch[1]);
      if (translateMatch) {
        currentTranslate.x = parseFloat(translateMatch[1]);
        currentTranslate.y = parseFloat(translateMatch[2]);
      }
    }

    // Calculate new scale from zoom level
    const newScale = getScaleFromZoomLevel(actualZoomLevel);

    // Use provided coordinates or default to viewport center
    const mouseX = isNaN(viewportX) ? window.innerWidth / 2 : viewportX;
    const mouseY = isNaN(viewportY) ? window.innerHeight / 2 : viewportY;

    // Standard zoom-to-point algorithm: contentPoint = (viewportPoint - translate) / scale
    const contentPointX = (mouseX - currentTranslate.x) / currentScale;
    const contentPointY = (mouseY - currentTranslate.y) / currentScale;

    // Calculate new translate to keep content point under cursor
    const newTranslateX = mouseX - contentPointX * newScale;
    const newTranslateY = mouseY - contentPointY * newScale;

    // Apply the single transform
    const newTransform = `translate(${newTranslateX}px, ${newTranslateY}px) scale(${newScale})`;
    this.canvas.style.transform = newTransform;

    this.updateZoomDisplay();

    console.log('ViewportBehavior: Single-transform zoom applied', {
      oldZoom,
      newZoom: actualZoomLevel,
      mouse: { x: mouseX, y: mouseY },
      currentTransform: { translate: currentTranslate, scale: currentScale },
      newTransform: {
        translate: { x: newTranslateX, y: newTranslateY },
        scale: newScale,
      },
      contentPoint: { x: contentPointX, y: contentPointY },
    });
  }

  /**
   * Apply CSS scale directly (for touch pinch) with zoom limit enforcement
   */
  applyCssScale(scale, centerX, centerY) {
    const containerRect = this.canvas.parentElement.getBoundingClientRect();
    const validCenterX = isNaN(centerX) ? this.canvas.width / 2 : centerX;
    const validCenterY = isNaN(centerY) ? this.canvas.height / 2 : centerY;

    // Convert CSS scale to zoom level for limit enforcement
    const zoomLevel = scale * 5; // CSS scale 1.0 = zoom level 5
    const clampedZoomLevel = Math.max(
      config.zoomLevels.min,
      Math.min(config.zoomLevels.max, zoomLevel),
    );
    const clampedScale = getScaleFromZoomLevel(clampedZoomLevel);

    // Update internal zoom level state
    this.zoomLevel = clampedZoomLevel;

    // Calculate position to keep center point fixed
    const offsetX = containerRect.width / 2 - validCenterX * clampedScale;
    const offsetY = containerRect.height / 2 - validCenterY * clampedScale;

    this.canvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${clampedScale})`;

    // Update zoom display
    this.updateZoomDisplay();

    console.log('ViewportBehavior: CSS scale applied with limits', {
      requestedScale: scale,
      clampedScale: clampedScale,
      zoomLevel: clampedZoomLevel,
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
   * FIXED: Now properly handles coordinate conversion if needed
   */
  setFixedZoom(level, centerX, centerY, coordinateType = 'canvas') {
    const oldZoom = this.getZoomLevel();
    this.setZoomLevel(level);
    const newZoom = this.getZoomLevel();

    console.log('ViewportBehavior: Setting fixed zoom:', {
      level,
      centerX,
      centerY,
      coordinateType,
      oldZoom,
      newZoom,
    });

    const newScale = getScaleFromZoomLevel(newZoom);

    // Convert coordinates if needed
    let canvasX, canvasY;

    if (
      coordinateType === 'viewport' &&
      this.coordinateTransform &&
      !isNaN(centerX) &&
      !isNaN(centerY)
    ) {
      try {
        const canvasCoords = this.coordinateTransform.viewportToCanvas(
          centerX,
          centerY,
        );
        canvasX = canvasCoords.x;
        canvasY = canvasCoords.y;
      } catch (error) {
        console.warn(
          'ViewportBehavior: Coordinate conversion failed in setFixedZoom:',
          error.message,
        );
        canvasX = this.canvas.clientWidth / 2;
        canvasY = this.canvas.clientHeight / 2;
      }
    } else {
      // Use provided coordinates as canvas coordinates, or default to center
      canvasX = isNaN(centerX) ? this.canvas.clientWidth / 2 : centerX;
      canvasY = isNaN(centerY) ? this.canvas.clientHeight / 2 : centerY;
    }

    // Calculate position to keep center point fixed
    const containerRect = this.canvas.parentElement.getBoundingClientRect();
    const offsetX = containerRect.width / 2 - canvasX * newScale;
    const offsetY = containerRect.height / 2 - canvasY * newScale;

    this.canvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${newScale})`;

    if (this.zoomDisplay) {
      this.updateZoomDisplay();
    }

    console.log(
      `ViewportBehavior: Zoom level set from ${oldZoom} to ${newZoom}, centered at canvas(${canvasX}, ${canvasY})`,
    );
  }

  /**
   * Update zoom display UI
   */
  updateZoomDisplay() {
    if (this.zoomDisplay) {
      // Round to 1 decimal place for cleaner display
      const roundedZoom = Math.round(this.zoomLevel * 10) / 10;
      this.zoomDisplay.textContent = `${roundedZoom}x`;
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

    // Canvas positioning is handled by CSS centering via #canvas-wrapper
    // No need to override with JavaScript positioning

    // Initialize zoom display
    this.updateZoomDisplay();

    // Prevent default context menu (from old zoomManager)
    if (canvasContainer) {
      canvasContainer.addEventListener('contextmenu', (event) =>
        event.preventDefault(),
      );
    }
  }

  /**
   * Position canvas at center
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
      this.canvas.clientWidth / 2,
      this.canvas.clientHeight / 2,
    );
  }

  zoomOut() {
    console.log('ViewportBehavior: Zoom out requested');
    this.applyZoomAtPoint(
      this.zoomLevel - 1,
      this.canvas.clientWidth / 2,
      this.canvas.clientHeight / 2,
    );
  }

  /**
   * Initialize canvas to center position (replaces CSS centering)
   * Implements single-transform approach per MM-221 architecture
   */
  initializeCenterCanvas() {
    if (!this.canvas || !this.canvas.parentElement) {
      console.warn(
        'ViewportBehavior: Cannot initialize center - canvas or container not available',
      );
      return;
    }

    const container = this.canvas.parentElement;
    const viewportCenterX = container.offsetWidth / 2;
    const viewportCenterY = container.offsetHeight / 2;
    const canvasCenterX = this.canvas.offsetWidth / 2;
    const canvasCenterY = this.canvas.offsetHeight / 2;

    const initialTranslateX = viewportCenterX - canvasCenterX;
    const initialTranslateY = viewportCenterY - canvasCenterY;
    const initialScale = getScaleFromZoomLevel(this.zoomLevel);

    this.canvas.style.transform = `translate(${initialTranslateX}px, ${initialTranslateY}px) scale(${initialScale})`;

    console.log('ViewportBehavior: Canvas initialized at center', {
      viewport: {
        width: container.offsetWidth,
        height: container.offsetHeight,
      },
      canvas: {
        width: this.canvas.offsetWidth,
        height: this.canvas.offsetHeight,
      },
      translate: { x: initialTranslateX, y: initialTranslateY },
      scale: initialScale,
    });
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
