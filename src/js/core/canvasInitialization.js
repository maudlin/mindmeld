// canvasInitialization.js - Handles canvas initialization
import { log } from '../utils/utils.js';
import { canvasManager } from './canvasManager.js';
import { setupZoomAndPan } from '../features/zoom/zoomManager.js';
import config from './config.js';

export async function initializeCanvas(elements) {
  log('Initializing canvas...');
  const initialModule = canvasManager.setCurrentModule(
    config.defaultCanvasType,
  );
  if (initialModule) {
    log(`Initial module set: ${initialModule.name}`);

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
    log('Failed to initialize canvas. No default module found.');
  }
}
