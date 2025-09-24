// canvasInitialization.js - Handles canvas initialization
import { canvasManager } from './canvasManager.js';
import { setupZoomAndPan } from '../features/zoom/viewportAdapter.js';
import config from './config.js';
import { logger } from '../services/logger.js';

export async function initializeCanvas(elements) {
  logger.info('Initializing canvas...');
  const initialModule = canvasManager.setCurrentModule(
    config.defaultCanvasType,
  );
  if (initialModule) {
    logger.info(`Initial module set: ${initialModule.name}`);

    // Ensure background layout is fully switched before proceeding to avoid duplicates
    await canvasManager.switchBackgroundLayout(
      initialModule.name,
      elements.canvas,
    );

    setupZoomAndPan(
      elements.canvasContainer,
      elements.canvas,
      elements.zoomDisplay,
    );
  } else {
    logger.info('Failed to initialize canvas. No default module found.');
  }
}
