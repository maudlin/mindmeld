// src/js/services/canvasStateService.js

import { eventBus } from '../core/eventBus.js';
import { appState } from '../data/observableState.js';
import { canvasManager } from '../core/canvasManager.js';
import config from '../core/config.js';
import { logger } from './logger.js';

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
   * V1 Simplification: Only Standard Canvas is valid
   */
  static get VALID_CANVAS_TYPES() {
    return ['Standard Canvas'];
  }

  /**
   * Check if canvas type is valid (V1: only Standard Canvas)
   */
  static isValidCanvasType(canvasType) {
    return canvasType === 'Standard Canvas';
  }

  /**
   * Set canvas type in both state and canvasManager
   */
  static async setCanvasType(canvasType, canvas = null) {
    // Validate canvas type
    if (!this.isValidCanvasType(canvasType)) {
      logger.info('CanvasStateService: Invalid canvas type', canvasType);
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

    logger.info('CanvasStateService: Set canvas type', canvasType);
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
    logger.info('CanvasStateService: Restored canvas type', canvasType);
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

        logger.info(
          'CanvasStateService: Canvas switched via interaction',
          canvasType,
        );
      }
    });

    logger.info('CanvasStateService: Initialized');
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
