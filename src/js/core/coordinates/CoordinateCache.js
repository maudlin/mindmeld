/**
 * CoordinateCache
 *
 * High-performance caching layer for getBoundingClientRect operations.
 * Provides significant performance improvements during gesture sequences
 * by caching expensive DOM rect calculations.
 */

import { COORDINATE_CONFIG } from './CoordinateConfig.js';

export class CoordinateCache {
  constructor(canvas) {
    if (!canvas) {
      throw new Error('Canvas element required for CoordinateCache');
    }

    this.canvas = canvas;
    this.config = COORDINATE_CONFIG.performance;

    // Cache state
    this.canvasRect = null;
    this.lastCacheTime = 0;
    this.cacheDuration = this.config.cacheDuration;
    this.cacheEnabled = this.config.cacheRect;

    // Activity tracking for adaptive caching
    this.activityLevel = 0;
    this.lastActivityTime = 0;

    // Performance statistics
    this.statistics = {
      hits: 0,
      misses: 0,
      invalidations: 0,
      errors: 0,
    };

    // Adaptive caching configuration
    this.adaptiveConfig = {
      enabled: this.config.adaptiveCaching,
      baseExtension: 2, // Activity multiplier
      maxExtension: 100, // Maximum cache duration
      activityDecay: 1000, // Activity decay time (ms)
    };
  }

  /**
   * Get cached canvas rect or calculate new one
   * Core caching method that replaces direct getBoundingClientRect calls
   *
   * @returns {DOMRect|null} Canvas bounding rect
   */
  getCanvasRect() {
    try {
      // If caching disabled, always calculate fresh
      if (!this.cacheEnabled) {
        this.statistics.misses++;
        return this.calculateFreshRect();
      }

      const now = this.getCurrentTime();

      // Decay activity level over time
      this.decayActivity(now);

      // Check if cache is valid
      if (this.isCacheValid(now)) {
        this.statistics.hits++;
        return this.canvasRect;
      }

      // Cache miss - calculate fresh rect
      this.statistics.misses++;
      return this.refreshCache(now);
    } catch (error) {
      this.statistics.errors++;
      this.handleCacheError('getCanvasRect', error);

      // Fallback to direct calculation
      return this.calculateFreshRect();
    }
  }

  /**
   * Force cache invalidation
   * Called when canvas position/size changes
   */
  invalidate() {
    this.canvasRect = null;
    this.lastCacheTime = 0;
    this.statistics.invalidations++;

    if (this.config.debug?.logTransformations) {
      console.log('CoordinateCache: Cache invalidated', {
        statistics: this.statistics,
      });
    }
  }

  /**
   * Update activity level for adaptive caching
   * Higher activity extends cache duration during gestures
   */
  updateActivity() {
    if (!this.adaptiveConfig.enabled) {
      return;
    }

    const now = this.getCurrentTime();
    this.activityLevel++;
    this.lastActivityTime = now;

    // Extend cache duration based on activity
    this.cacheDuration = Math.min(
      this.adaptiveConfig.maxExtension,
      this.config.cacheDuration +
        this.activityLevel * this.adaptiveConfig.baseExtension,
    );

    if (this.config.debug?.cacheStatistics) {
      console.log('CoordinateCache: Activity updated', {
        level: this.activityLevel,
        duration: this.cacheDuration,
      });
    }
  }

  /**
   * Enable or disable caching at runtime
   * @param {boolean} enabled - Whether to enable caching
   */
  setEnabled(enabled) {
    this.cacheEnabled = enabled;

    if (!enabled) {
      this.invalidate();
    }
  }

  /**
   * Get cache performance statistics
   * @returns {Object} Performance metrics
   */
  getStatistics() {
    const total = this.statistics.hits + this.statistics.misses;

    return {
      ...this.statistics,
      total,
      hitRatio: total > 0 ? (this.statistics.hits / total).toFixed(3) : 0,
      enabled: this.cacheEnabled,
      currentDuration: this.cacheDuration,
      activityLevel: this.activityLevel,
    };
  }

  /**
   * Reset cache statistics
   */
  resetStatistics() {
    this.statistics = {
      hits: 0,
      misses: 0,
      invalidations: 0,
      errors: 0,
    };
  }

  /**
   * Check if current cache is valid
   * @private
   * @param {number} now - Current timestamp
   * @returns {boolean} True if cache is valid
   */
  isCacheValid(now) {
    if (!this.canvasRect) {
      return false;
    }

    const age = now - this.lastCacheTime;
    const maxAge = Math.min(this.cacheDuration, this.config.maxCacheAge);

    return age <= maxAge;
  }

  /**
   * Refresh cache with new rect calculation
   * @private
   * @param {number} now - Current timestamp
   * @returns {DOMRect|null} Fresh canvas rect
   */
  refreshCache(now) {
    try {
      this.canvasRect = this.calculateFreshRect();
      this.lastCacheTime = now;

      // Update activity for adaptive caching
      this.updateActivity();

      return this.canvasRect;
    } catch (error) {
      // Clear cache on error to prevent inconsistent state
      this.canvasRect = null;
      this.lastCacheTime = 0;
      throw error;
    }
  }

  /**
   * Calculate fresh canvas rect
   * @private
   * @returns {DOMRect|null} Canvas bounding rect
   */
  calculateFreshRect() {
    if (!this.canvas || !this.canvas.getBoundingClientRect) {
      return null;
    }

    return this.canvas.getBoundingClientRect();
  }

  /**
   * Get current timestamp with fallback
   * @private
   * @returns {number} Current timestamp in milliseconds
   */
  getCurrentTime() {
    try {
      return performance.now();
    } catch {
      // Fallback to Date.now() if performance API unavailable
      return Date.now();
    }
  }

  /**
   * Decay activity level over time
   * @private
   * @param {number} now - Current timestamp
   */
  decayActivity(now) {
    if (!this.adaptiveConfig.enabled || this.activityLevel === 0) {
      return;
    }

    const timeSinceActivity = now - this.lastActivityTime;

    if (timeSinceActivity > this.adaptiveConfig.activityDecay) {
      // Reset activity and cache duration
      this.activityLevel = 0;
      this.cacheDuration = this.config.cacheDuration;
    }
  }

  /**
   * Handle cache operation errors
   * @private
   * @param {string} method - Method name where error occurred
   * @param {Error} error - The error that occurred
   */
  handleCacheError(method, error) {
    if (this.config.debug?.logTransformations) {
      console.error(`CoordinateCache.${method}: ${error.message}`, {
        error,
        statistics: this.statistics,
        cacheState: {
          enabled: this.cacheEnabled,
          hasRect: !!this.canvasRect,
          age: this.getCurrentTime() - this.lastCacheTime,
        },
      });
    }
  }

  /**
   * Clean up cache resources
   */
  destroy() {
    this.invalidate();
    this.canvas = null;

    if (this.config.debug?.cacheStatistics) {
      console.log(
        'CoordinateCache: Destroyed with final statistics:',
        this.getStatistics(),
      );
    }
  }
}

/**
 * Create cache instance with validation
 * Factory function for consistent cache creation
 *
 * @param {HTMLElement} canvas - Canvas element to cache
 * @returns {CoordinateCache} Cache instance
 */
export function createCoordinateCache(canvas) {
  if (!canvas) {
    throw new Error('Canvas element required for cache creation');
  }

  const cache = new CoordinateCache(canvas);

  // Validate cache functionality
  try {
    const testRect = cache.getCanvasRect();
    if (testRect && typeof testRect.left === 'number') {
      // Cache working correctly
      return cache;
    }
  } catch (error) {
    console.warn(
      'CoordinateCache: Initial validation failed, disabling cache:',
      error,
    );
    cache.setEnabled(false);
  }

  return cache;
}
