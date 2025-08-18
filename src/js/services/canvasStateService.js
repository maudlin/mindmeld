// src/js/services/canvasStateService.js

import { eventBus } from '../core/eventBus.js';
import { appState } from '../data/observableState.js';
import { canvasManager } from '../core/canvasManager.js';
import config from '../core/config.js';
import { log } from '../utils/utils.js';

/**
 * CanvasStateService
 *
 * Manages canvas type persistence by:
 * - Storing canvas type in observableState for persistence
 * - Synchronizing between state and canvasManager
 * - Handling canvas switch events to update state automatically
 * - Providing restoration capabilities during app bootstrap
 */
export class CanvasStateService {
  /**
   * Valid canvas types extracted from config
   */
  static get VALID_CANVAS_TYPES() {
    return Object.values(config.canvasTypes).map(
      (canvasType) => canvasType.name,
    );
  }

  /**
   * Check if canvas type is valid
   */
  static isValidCanvasType(canvasType) {
    return (
      typeof canvasType === 'string' &&
      this.VALID_CANVAS_TYPES.includes(canvasType)
    );
  }

  /**
   * Set canvas type in both state and canvasManager
   */
  static async setCanvasType(canvasType, canvas = null) {
    // Validate canvas type
    if (!this.isValidCanvasType(canvasType)) {
      log('CanvasStateService: Invalid canvas type', canvasType);
      return false;
    }

    // Update state (this will trigger persistence via observableState)
    appState.setState({
      canvasType: canvasType,
    });

    // Update canvasManager if canvas element provided
    if (canvas) {
      await canvasManager.switchBackgroundLayout(canvasType, canvas);
    }

    // Emit event for other components
    eventBus.emit('canvas.type.changed', {
      canvasType: canvasType,
    });

    log('CanvasStateService: Set canvas type', canvasType);
    return true;
  }

  /**
   * Get current canvas type from state
   */
  static getCanvasType() {
    const state = appState.getState();
    return state.canvasType || config.defaultCanvasType;
  }

  /**
   * Restore canvas type from state to canvasManager
   * Used during app initialization
   */
  static async restoreCanvasType(canvas) {
    const canvasType = this.getCanvasType();
    if (canvas) {
      await canvasManager.switchBackgroundLayout(canvasType, canvas);
    }
    log('CanvasStateService: Restored canvas type', canvasType);
  }

  /**
   * Initialize canvas state service
   * Sets up event listeners for automatic state synchronization
   */
  static initialize() {
    // Listen for canvas switch events from UI interactions
    eventBus.on('canvas.switch', async (event) => {
      const { canvasType, canvas } = event;

      if (this.isValidCanvasType(canvasType)) {
        // Update state
        appState.setState({
          canvasType: canvasType,
        });

        // Update canvasManager
        if (canvas) {
          await canvasManager.switchBackgroundLayout(canvasType, canvas);
        }

        log('CanvasStateService: Canvas switched via interaction', canvasType);
      }
    });

    log('CanvasStateService: Initialized');
  }

  /**
   * Get canvas type key from canvas type name
   * Useful for mapping between display names and internal keys
   */
  static getCanvasTypeKey(canvasTypeName) {
    const entry = Object.entries(config.canvasTypes).find(
      ([, value]) => value.name === canvasTypeName,
    );
    return entry ? entry[0] : null;
  }
}
