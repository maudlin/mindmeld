/**
 * Coordinate System Configuration
 *
 * Centralized configuration for coordinate transformations, caching, and performance.
 * Eliminates hardcoded magic numbers throughout the codebase.
 */

export const COORDINATE_CONFIG = {
  // Zoom configuration - replaces hardcoded /5 scaling
  zoom: {
    baseScale: 5, // Base scale divisor (was hardcoded as /5)
    minScale: 0.1, // Minimum safe scale to prevent divide by zero
    maxScale: 20, // Maximum scale for bounds checking
    defaultLevel: 5, // Default zoom level
  },

  // Touch interaction configuration
  touch: {
    hitTargetExpansion: 20, // Pixels to expand touch targets
    gestureTolerance: 15, // Movement threshold before gesture starts
    doubleTapDelay: 300, // Maximum time between taps for double-tap
    doubleTapDistance: 30, // Maximum distance between taps for double-tap
    longPressThreshold: 500, // Time threshold for long press detection
  },

  // Performance and caching configuration
  performance: {
    cacheRect: true, // Enable getBoundingClientRect caching
    cacheDuration: 16, // Cache validity duration (1 frame at 60fps)
    maxCacheAge: 1000, // Maximum cache age before forced refresh
    rafUpdates: true, // Use requestAnimationFrame for updates
    batchUpdates: true, // Batch coordinate transformations
    throttleDrag: true, // Throttle drag updates for performance
    adaptiveCaching: true, // Extend cache during high activity
  },

  // Coordinate bounds and validation
  bounds: {
    maxCoordinate: 999999, // Maximum coordinate value
    minCoordinate: -999999, // Minimum coordinate value
    precisionDigits: 2, // Decimal precision for coordinates
    snapToPixel: true, // Round coordinates to nearest pixel
  },

  // Error handling configuration
  errorHandling: {
    gracefulDegradation: true, // Continue operation on coordinate errors
    logErrors: true, // Log coordinate transformation errors
    fallbackCoordinates: { x: 0, y: 0 }, // Safe fallback coordinates
    maxRetries: 3, // Maximum retries for failed transformations
  },

  // Debug configuration
  debug: {
    logTransformations: false, // Log coordinate transformations
    validateInputs: true, // Validate coordinate inputs
    performanceMetrics: false, // Track performance metrics
    cacheStatistics: false, // Track cache hit/miss statistics
  },
};

/**
 * Get zoom scale factor from zoom level
 * Replaces hardcoded "zoomLevel / 5" throughout codebase
 */
export function getScaleFromZoomLevel(zoomLevel) {
  const clampedZoom = Math.max(
    COORDINATE_CONFIG.zoom.minScale,
    Math.min(COORDINATE_CONFIG.zoom.maxScale, zoomLevel),
  );

  return clampedZoom / COORDINATE_CONFIG.zoom.baseScale;
}

/**
 * Validate coordinate values
 * Ensures coordinates are safe for calculations
 */
export function validateCoordinates(x, y) {
  const config = COORDINATE_CONFIG.bounds;

  if (typeof x !== 'number' || typeof y !== 'number') {
    throw new Error('Invalid coordinates: x and y must be numbers');
  }

  if (!isFinite(x) || !isFinite(y)) {
    throw new Error('Invalid coordinates: x and y must be finite numbers');
  }

  if (
    x < config.minCoordinate ||
    x > config.maxCoordinate ||
    y < config.minCoordinate ||
    y > config.maxCoordinate
  ) {
    throw new Error(`Coordinates out of bounds: (${x}, ${y})`);
  }

  return true;
}

/**
 * Round coordinates to pixel boundaries
 * Improves rendering performance and visual consistency
 */
export function snapToPixel(x, y) {
  if (!COORDINATE_CONFIG.bounds.snapToPixel) {
    return { x, y };
  }

  return {
    x: Math.round(x),
    y: Math.round(y),
  };
}

/**
 * Apply precision to coordinate values
 * Prevents floating point precision issues
 */
export function applyPrecision(value) {
  const digits = COORDINATE_CONFIG.bounds.precisionDigits;
  return Math.round(value * Math.pow(10, digits)) / Math.pow(10, digits);
}

/**
 * Get safe fallback coordinates
 * Used when coordinate transformations fail
 */
export function getFallbackCoordinates() {
  return { ...COORDINATE_CONFIG.errorHandling.fallbackCoordinates };
}

/**
 * Configuration validation
 * Ensures configuration values are valid at startup
 */
export function validateConfiguration() {
  const config = COORDINATE_CONFIG;

  // Validate zoom configuration
  if (config.zoom.baseScale <= 0) {
    throw new Error('Invalid zoom baseScale: must be positive');
  }

  if (config.zoom.minScale >= config.zoom.maxScale) {
    throw new Error('Invalid zoom scales: minScale must be less than maxScale');
  }

  // Validate performance configuration
  if (config.performance.cacheDuration < 0) {
    throw new Error('Invalid cacheDuration: must be non-negative');
  }

  // Validate bounds configuration
  if (config.bounds.minCoordinate >= config.bounds.maxCoordinate) {
    throw new Error('Invalid coordinate bounds: min must be less than max');
  }

  return true;
}

// Validate configuration on import
validateConfiguration();
