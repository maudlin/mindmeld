// tests/unit/app.test.js
import { canvasManager } from '../../src/js/core/canvasManager';

// Mock the canvasManager module
jest.mock('../../src/js/core/canvasManager', () => {
  const mockCanvasManager = {
    loadModules: jest.fn().mockResolvedValue(undefined),
    setCurrentModule: jest.fn(),
    switchBackgroundLayout: jest.fn(),
    getCurrentModule: jest.fn(),
    getAvailableModules: jest.fn().mockReturnValue([]),
  };
  return { canvasManager: mockCanvasManager };
});

// Mock the storageManager module
jest.mock('../../src/js/data/storageManager', () => ({
  loadStateFromStorage: jest.fn(),
  initializeStateManagement: jest.fn(),
  shouldRestoreState: jest.fn().mockReturnValue(false),
}));

// Mock the event module
jest.mock('../../src/js/core/event', () => ({
  setupCanvasEvents: jest.fn(),
  setupDocumentEvents: jest.fn(),
}));

import * as storageManager from '../../src/js/data/storageManager';
import * as eventHandlers from '../../src/js/core/event';

describe('App Initialization', () => {
  let consoleOutput = [];
  const mockConsoleLog = (output) => consoleOutput.push(output);
  const mockConsoleError = (output) => consoleOutput.push(output);

  beforeEach(() => {
    consoleOutput = [];
    console.log = mockConsoleLog;
    console.error = mockConsoleError;
    jest.clearAllMocks();
    document.body.innerHTML = `
      <div id="canvas-container"></div>
      <div id="svg-container"></div>
      <canvas id="canvas"></canvas>
      <div id="zoom-display"></div>
      <select id="canvas-style-dropdown"></select>
      <div id="menu"></div>
    `;
  });

  test('app initializes correctly', async () => {
    await jest.isolateModules(async () => {
      await import('../../src/js/app');

      // Simulate DOMContentLoaded event
      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);
    });

    // Wait for any potential asynchronous operations
    await new Promise((resolve) => setTimeout(resolve, 100));

    console.log('Console output:', consoleOutput);

    expect(canvasManager.loadModules).toHaveBeenCalled();
    expect(storageManager.loadStateFromStorage).toHaveBeenCalled();
    expect(storageManager.shouldRestoreState).toHaveBeenCalled();
    expect(storageManager.initializeStateManagement).toHaveBeenCalled();
    expect(eventHandlers.setupCanvasEvents).toHaveBeenCalled();
    expect(eventHandlers.setupDocumentEvents).toHaveBeenCalled();
  });
});
