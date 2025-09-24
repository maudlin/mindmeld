import { logger, errorHandler } from '../../services/logger.js';
/**
 * Viewport Adapter - Provides global access to ViewportBehavior methods
 *
 * This adapter allows legacy services to access viewport functionality
 * without having direct access to the ViewportBehavior instance.
 * The InteractionController will set the behavior reference during initialization.
 */

let viewportBehavior = null;

export function setViewportBehavior(behavior) {
  viewportBehavior = behavior;
  // Process any deferred setup that was waiting for ViewportBehavior
  processDeferredSetup();
}

export function getZoomLevel() {
  if (!viewportBehavior) {
    logger.warn('ViewportBehavior not initialized');
    return 5; // Default zoom level
  }
  return viewportBehavior.getZoomLevel();
}

export function setZoomLevel(level) {
  if (!viewportBehavior) {
    logger.warn('ViewportBehavior not initialized');
    return;
  }
  return viewportBehavior.setZoomLevel(level);
}

export function setFixedZoom(level, centerX, centerY) {
  if (!viewportBehavior) {
    logger.warn('ViewportBehavior not initialized');
    return;
  }
  return viewportBehavior.setFixedZoom(level, centerX, centerY);
}

export function setupZoomAndPan(canvasContainer, canvas, zoomDisplay) {
  if (!viewportBehavior) {
    console.warn(
      'ViewportAdapter: ViewportBehavior not initialized yet, deferring setupZoomAndPan',
    );
    // Store parameters for later initialization when ViewportBehavior is ready
    deferredSetup = { canvasContainer, canvas, zoomDisplay };
    return;
  }
  return viewportBehavior.setupZoomAndPan(canvasContainer);
}

// Store deferred setup parameters
let deferredSetup = null;

// Called when ViewportBehavior becomes available
function processDeferredSetup() {
  if (deferredSetup && viewportBehavior) {
    console.log('ViewportAdapter: Processing deferred setupZoomAndPan');
    viewportBehavior.setupZoomAndPan(deferredSetup.canvasContainer);
    deferredSetup = null;
  }
}
