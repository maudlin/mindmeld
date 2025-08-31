// src/js/services/zoomStateService.js

import { eventBus } from '../core/eventBus.js';
import { appState } from '../data/observableState.js';
import {
  setZoomLevel as setZoomManagerLevel,
  getZoomLevel as getZoomManagerLevel,
} from '../features/zoom/viewportAdapter.js';
import config from '../core/config.js';
import { log } from '../utils/utils.js';

/**
 * ZoomStateService
 *
 * Manages zoom level persistence by:
 * - Storing zoom level in observableState for persistence
 * - Synchronizing between state and zoomManager
 * - Handling zoom change events to update state automatically
 * - Providing restoration capabilities during app bootstrap
 */
export class ZoomStateService {
  /**
   * Set zoom level in both state and zoomManager
   */
  static setZoomLevel(zoomLevel) {
    // Validate zoom level
    if (typeof zoomLevel !== 'number' || isNaN(zoomLevel)) {
      log('ZoomStateService: Invalid zoom level', zoomLevel);
      return false;
    }

    // Check bounds
    if (
      zoomLevel < config.zoomLevels.min ||
      zoomLevel > config.zoomLevels.max
    ) {
      log('ZoomStateService: Zoom level out of bounds', zoomLevel);
      return false;
    }

    // Update state (this will trigger persistence via observableState)
    appState.setState({
      zoomLevel: zoomLevel,
    });

    // Update zoomManager
    setZoomManagerLevel(zoomLevel);

    // Emit event for other components
    eventBus.emit('zoom.level.changed', {
      zoomLevel: zoomLevel,
    });

    log('ZoomStateService: Set zoom level', zoomLevel);
    return true;
  }

  /**
   * Get current zoom level from state
   */
  static getZoomLevel() {
    const state = appState.getState();
    return state.zoomLevel || config.zoomLevels.default;
  }

  /**
   * Restore zoom level from state to zoomManager
   * Used during app initialization
   */
  static restoreZoomLevel() {
    const zoomLevel = this.getZoomLevel();
    setZoomManagerLevel(zoomLevel);
    log('ZoomStateService: Restored zoom level', zoomLevel);
  }

  /**
   * Initialize zoom state service
   * Sets up event listeners for automatic state synchronization
   */
  static initialize() {
    // Listen for zoom changes from UI interactions
    eventBus.on('zoom.change', () => {
      // Get actual zoom level from zoomManager (which applies bounds)
      const actualZoomLevel = getZoomManagerLevel();

      // Update state to match actual zoom level
      appState.setState({
        zoomLevel: actualZoomLevel,
      });

      log('ZoomStateService: Zoom changed via interaction', actualZoomLevel);
    });

    log('ZoomStateService: Initialized');
  }
}
