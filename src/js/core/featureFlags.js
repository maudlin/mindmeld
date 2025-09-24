// src/js/core/featureFlags.js
// Feature flags for controlling experimental features and provider selection

import { logger, errorHandler } from '../services/logger.js';

/**
 * Feature flags configuration for MindMeld
 *
 * Controls experimental features and provider selection.
 * These flags allow safe testing of new functionality without breaking existing features.
 */
export const FEATURE_FLAGS = {
  /**
   * Enable YjsProvider instead of LocalJSONProvider for real-time collaboration
   * Default: false (use LocalJSONProvider for stability)
   *
   * When enabled:
   * - DataProviderService uses YjsProvider
   * - Real-time collaboration capabilities activated
   * - Requires Yjs WebSocket server for full functionality
   *
   * When disabled:
   * - DataProviderService uses LocalJSONProvider
   * - Local storage only, no real-time features
   * - Production-stable behavior
   */
  USE_YJS_PROVIDER: false,

  /**
   * Emergency disable flag for YjsProvider
   * Default: false (normal operation)
   *
   * When enabled:
   * - Forces LocalJSONProvider regardless of USE_YJS_PROVIDER
   * - Provides immediate rollback capability
   * - Use for emergency situations
   */
  EMERGENCY_DISABLE_YJS: false,

  /**
   * Enable debug logging for DataProvider operations
   * Default: false (production mode)
   *
   * When enabled:
   * - Verbose logging of provider operations
   * - Origin tracking debug information
   * - Useful for debugging feedback loops
   */
  DEBUG_PROVIDER_OPERATIONS: false,

  /**
   * Enable observer debouncing to prevent event storms
   * Default: true (recommended for performance)
   *
   * When enabled:
   * - DataProvider change events are debounced
   * - Prevents excessive UI updates during bulk operations
   * - Improves performance during large data imports
   */
  ENABLE_OBSERVER_DEBOUNCING: true,
};

/**
 * Get effective provider type based on feature flags
 * @returns {'yjs'|'local'} The provider type to use
 */
export function getProviderType() {
  // Emergency disable takes precedence
  if (FEATURE_FLAGS.EMERGENCY_DISABLE_YJS) {
    return 'local';
  }

  // Normal feature flag check
  return FEATURE_FLAGS.USE_YJS_PROVIDER ? 'yjs' : 'local';
}

/**
 * Initialize YjsProvider if needed
 * This is called when YjsProvider is actually required
 */
export async function initializeYjsProvider() {
  if (getProviderType() === 'yjs') {
    try {
      // Dynamic import to avoid loading Yjs when not needed
      const module = await import('../data/providers/YjsProvider.js');
      return module.YjsProvider;
    } catch (error) {
      logger.error('Failed to load YjsProvider:', error);
      throw new Error(
        'YjsProvider not available. Ensure Yjs is properly installed.',
      );
    }
  }
  return null;
}

/**
 * Check if debug logging is enabled
 * @returns {boolean}
 */
export function isDebugEnabled() {
  return FEATURE_FLAGS.DEBUG_PROVIDER_OPERATIONS;
}

/**
 * Check if observer debouncing is enabled
 * @returns {boolean}
 */
export function isDebounceEnabled() {
  return FEATURE_FLAGS.ENABLE_OBSERVER_DEBOUNCING;
}

/**
 * Override feature flags for testing
 * @param {Partial<typeof FEATURE_FLAGS>} overrides
 */
export function setFeatureFlags(overrides) {
  Object.assign(FEATURE_FLAGS, overrides);
}

/**
 * Reset feature flags to defaults
 */
export function resetFeatureFlags() {
  FEATURE_FLAGS.USE_YJS_PROVIDER = false;
  FEATURE_FLAGS.EMERGENCY_DISABLE_YJS = false;
  FEATURE_FLAGS.DEBUG_PROVIDER_OPERATIONS = false;
  FEATURE_FLAGS.ENABLE_OBSERVER_DEBOUNCING = true;
}
