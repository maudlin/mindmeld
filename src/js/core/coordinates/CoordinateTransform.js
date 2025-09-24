/**
 * CoordinateTransform Service
 *
 * Single source of truth for all coordinate transformations in MindMeld.
 * Replaces scattered coordinate logic throughout the codebase with clean,
 * cached, and error-safe coordinate operations.
 */

import {
  COORDINATE_CONFIG,
  getScaleFromZoomLevel,
  validateCoordinates,
  snapToPixel,
  getFallbackCoordinates,
} from './CoordinateConfig.js';
import { logger } from '../../services/logger.js';
import { CoordinateCache } from './CoordinateCache.js';

export class CoordinateTransform {
  constructor(canvas, zoomProvider) {
    if (!canvas) {
      throw new Error('Canvas element required for CoordinateTransform');
    }

    if (!zoomProvider || typeof zoomProvider.getZoomLevel !== 'function') {
      throw new Error('ZoomProvider with getZoomLevel() method required');
    }

    this.canvas = canvas;
    this.zoomProvider = zoomProvider;
    this.cache = new CoordinateCache(canvas);
    this.config = COORDINATE_CONFIG;

    // Performance metrics (if enabled)
    this.metrics = {
      transformCount: 0,
      cacheHits: 0,
      errors: 0,
    };
  }

  /**
   * Convert viewport coordinates to canvas coordinates
   * Core transformation that replaces all manual coordinate calculations
   *
   * @param {number} viewportX - X coordinate in viewport space (clientX)
   * @param {number} viewportY - Y coordinate in viewport space (clientY)
   * @returns {Object} Canvas coordinates { x, y }
   */
  viewportToCanvas(viewportX, viewportY) {
    try {
      // Input validation
      validateCoordinates(viewportX, viewportY);

      // Get cached canvas rect
      const rect = this.cache.getCanvasRect();
      if (!rect || rect.width === 0 || rect.height === 0) {
        if (this.config.debug.logTransformations) {
          logger.warn(
            'CoordinateTransform: Invalid canvas rect, using fallback',
          );
        }
        return getFallbackCoordinates();
      }

      // Get safe scale
      const scale = this.getSafeScale();

      // Transform coordinates
      let canvasX = (viewportX - rect.left) / scale;
      let canvasY = (viewportY - rect.top) / scale;

      // Apply pixel snapping if enabled
      const snapped = snapToPixel(canvasX, canvasY);

      // Update metrics
      this.updateMetrics('transform');

      if (this.config.debug.logTransformations) {
        logger.info('CoordinateTransform: viewport->canvas', {
          viewport: { x: viewportX, y: viewportY },
          canvas: snapped,
          scale,
          rect: { left: rect.left, top: rect.top },
        });
      }

      return snapped;
    } catch (error) {
      this.handleTransformError('viewportToCanvas', error, {
        viewportX,
        viewportY,
      });
      return getFallbackCoordinates();
    }
  }

  /**
   * Convert canvas coordinates back to viewport coordinates
   * Used for reverse transformations and validation
   *
   * @param {number} canvasX - X coordinate in canvas space
   * @param {number} canvasY - Y coordinate in canvas space
   * @returns {Object} Viewport coordinates { x, y }
   */
  canvasToViewport(canvasX, canvasY) {
    try {
      validateCoordinates(canvasX, canvasY);

      const rect = this.cache.getCanvasRect();
      if (!rect) {
        return getFallbackCoordinates();
      }

      const scale = this.getSafeScale();

      const viewportX = canvasX * scale + rect.left;
      const viewportY = canvasY * scale + rect.top;

      const result = snapToPixel(viewportX, viewportY);

      this.updateMetrics('transform');

      return result;
    } catch (error) {
      this.handleTransformError('canvasToViewport', error, {
        canvasX,
        canvasY,
      });
      return getFallbackCoordinates();
    }
  }

  /**
   * Get canvas coordinates of a DOM element
   * Used for drag calculations and element positioning
   *
   * @param {HTMLElement} element - DOM element to get position of
   * @returns {Object} Canvas coordinates { x, y }
   */
  elementToCanvas(element) {
    try {
      if (!element || !element.style) {
        throw new Error('Invalid element provided');
      }

      // Get element position from CSS (already in canvas coordinates)
      const x = parseInt(element.style.left) || 0;
      const y = parseInt(element.style.top) || 0;

      validateCoordinates(x, y);

      return snapToPixel(x, y);
    } catch (error) {
      this.handleTransformError('elementToCanvas', error, { element });
      return getFallbackCoordinates();
    }
  }

  /**
   * Convert viewport coordinates to element-relative coordinates
   * Accounts for element position and dimensions
   *
   * @param {number} viewportX - Viewport X coordinate
   * @param {number} viewportY - Viewport Y coordinate
   * @param {HTMLElement} element - Target element
   * @returns {Object} Element-relative coordinates { x, y }
   */
  viewportToElement(viewportX, viewportY, element) {
    try {
      if (!element) {
        throw new Error('Element required for element-relative transformation');
      }

      // Get canvas position of viewport coordinates
      const canvasPos = this.viewportToCanvas(viewportX, viewportY);

      // Get element canvas position
      const elementPos = this.elementToCanvas(element);

      // Calculate relative position
      const relativeX = canvasPos.x - elementPos.x;
      const relativeY = canvasPos.y - elementPos.y;

      return snapToPixel(relativeX, relativeY);
    } catch (error) {
      this.handleTransformError('viewportToElement', error, {
        viewportX,
        viewportY,
        element,
      });
      return getFallbackCoordinates();
    }
  }

  /**
   * Scale a coordinate value between zoom levels
   * Used for zoom-aware calculations
   *
   * @param {number} value - Value to scale
   * @param {number} fromZoom - Source zoom level
   * @param {number} toZoom - Target zoom level
   * @returns {number} Scaled value
   */
  scaleCoordinate(value, fromZoom, toZoom) {
    try {
      if (typeof value !== 'number' || !isFinite(value)) {
        throw new Error('Invalid value for scaling');
      }

      const fromScale = getScaleFromZoomLevel(fromZoom);
      const toScale = getScaleFromZoomLevel(toZoom);

      if (fromScale === 0) {
        throw new Error('Invalid from scale (zero)');
      }

      return value * (toScale / fromScale);
    } catch (error) {
      this.handleTransformError('scaleCoordinate', error, {
        value,
        fromZoom,
        toZoom,
      });
      return value; // Return original value as fallback
    }
  }

  /**
   * Expand touch hit target to find nearby interactive elements
   * Replaces complex manual hit target expansion in TouchAdapter
   *
   * @param {Object} touch - Touch object with clientX, clientY, target
   * @param {number} expansionPx - Pixels to expand hit target (optional)
   * @returns {HTMLElement} Best target element within expansion area
   */
  expandHitTarget(touch, expansionPx = null) {
    try {
      if (
        !touch ||
        typeof touch.clientX !== 'number' ||
        typeof touch.clientY !== 'number'
      ) {
        throw new Error('Invalid touch object');
      }

      const expansion = expansionPx || this.config.touch.hitTargetExpansion;
      const originalTarget = touch.target;

      // If we hit a note directly, no expansion needed
      if (
        originalTarget &&
        originalTarget.closest &&
        originalTarget.closest('.note')
      ) {
        return originalTarget;
      }

      // Find nearby notes within expansion radius
      const notes = document.querySelectorAll('.note');
      for (const note of notes) {
        const rect = note.getBoundingClientRect();
        const expandedRect = {
          left: rect.left - expansion,
          top: rect.top - expansion,
          right: rect.right + expansion,
          bottom: rect.bottom + expansion,
        };

        if (
          touch.clientX >= expandedRect.left &&
          touch.clientX <= expandedRect.right &&
          touch.clientY >= expandedRect.top &&
          touch.clientY <= expandedRect.bottom
        ) {
          return note;
        }
      }

      return originalTarget;
    } catch (error) {
      this.handleTransformError('expandHitTarget', error, {
        touch,
        expansionPx,
      });
      return touch?.target || null;
    }
  }

  /**
   * Batch transform multiple viewport coordinates to canvas coordinates
   * Performance optimization for multi-note operations
   *
   * @param {Array} coordinates - Array of {x, y} viewport coordinates
   * @returns {Array} Array of canvas coordinates
   */
  transformMultiple(coordinates) {
    try {
      if (!Array.isArray(coordinates)) {
        throw new Error('Coordinates must be an array');
      }

      // Get rect and scale once for all transformations
      const rect = this.cache.getCanvasRect();
      const scale = this.getSafeScale();

      if (!rect) {
        return coordinates.map(() => getFallbackCoordinates());
      }

      return coordinates.map(({ x, y }) => {
        validateCoordinates(x, y);

        const canvasX = (x - rect.left) / scale;
        const canvasY = (y - rect.top) / scale;

        return snapToPixel(canvasX, canvasY);
      });
    } catch (error) {
      this.handleTransformError('transformMultiple', error, { coordinates });
      return coordinates.map(() => getFallbackCoordinates());
    }
  }

  /**
   * Get safe scale factor with bounds checking
   * Prevents divide by zero and ensures reasonable scale values
   *
   * @returns {number} Safe scale factor
   */
  getSafeScale() {
    try {
      const zoomLevel = this.zoomProvider.getZoomLevel();
      const scale = getScaleFromZoomLevel(zoomLevel);

      // Ensure scale is within safe bounds
      return Math.max(this.config.zoom.minScale, scale);
    } catch (error) {
      logger.warn(
        'CoordinateTransform: Failed to get zoom scale, using default:',
        error,
      );
      return getScaleFromZoomLevel(this.config.zoom.defaultLevel);
    }
  }

  /**
   * Invalidate coordinate cache
   * Called when canvas size or position changes
   */
  invalidateCache() {
    this.cache.invalidate();

    if (this.config.debug.logTransformations) {
      logger.info('CoordinateTransform: Cache invalidated');
    }
  }

  /**
   * Update performance metrics
   * @private
   */
  updateMetrics(type) {
    if (!this.config.debug.performanceMetrics) {
      return;
    }

    this.metrics.transformCount++;

    if (type === 'cacheHit') {
      this.metrics.cacheHits++;
    }
  }

  /**
   * Handle coordinate transformation errors
   * @private
   */
  handleTransformError(method, error, context) {
    this.metrics.errors++;

    if (this.config.errorHandling.logErrors) {
      logger.error(`CoordinateTransform.${method}: ${error.message}`, {
        error,
        context,
        metrics: this.metrics,
      });
    }

    if (!this.config.errorHandling.gracefulDegradation) {
      throw error;
    }
  }

  /**
   * Get performance metrics
   * @returns {Object} Performance statistics
   */
  getMetrics() {
    if (!this.config.debug.performanceMetrics) {
      return { disabled: true };
    }

    const cacheStats = this.cache.getStatistics();

    return {
      ...this.metrics,
      cacheHitRatio:
        this.metrics.transformCount > 0
          ? (cacheStats.hits / this.metrics.transformCount).toFixed(3)
          : 0,
      cache: cacheStats,
    };
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.cache) {
      this.cache.destroy();
    }

    this.canvas = null;
    this.zoomProvider = null;
    this.cache = null;
  }
}
