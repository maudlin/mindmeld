/**
 * Coordinate Service - Shared singleton for utilities
 *
 * Provides cached CoordinateTransform instance for utilities and standalone functions
 * that don't have dependency injection infrastructure.
 */

import { CoordinateTransform } from './CoordinateTransform.js';
import { getZoomLevel } from '../../features/zoom/viewportAdapter.js';

let sharedCoordinateTransform = null;

/**
 * Get shared coordinate transform instance
 * Creates singleton on first call, reuses thereafter
 *
 * @returns {CoordinateTransform} Shared coordinate transform service
 */
export function getCoordinateTransform() {
  if (!sharedCoordinateTransform) {
    const canvas = document.getElementById('canvas');
    if (!canvas) {
      throw new Error('Canvas element required for coordinate transforms');
    }

    const zoomProvider = {
      getZoomLevel: () => getZoomLevel(),
    };

    sharedCoordinateTransform = new CoordinateTransform(canvas, zoomProvider);
  }

  return sharedCoordinateTransform;
}

/**
 * Invalidate shared coordinate transform cache
 * Called when canvas changes size/position
 */
export function invalidateCoordinateCache() {
  if (sharedCoordinateTransform) {
    sharedCoordinateTransform.invalidateCache();
  }
}

/**
 * Clean up shared coordinate transform
 * Called during app shutdown or major reinitialization
 */
export function destroyCoordinateService() {
  if (sharedCoordinateTransform) {
    sharedCoordinateTransform.destroy();
    sharedCoordinateTransform = null;
  }
}
