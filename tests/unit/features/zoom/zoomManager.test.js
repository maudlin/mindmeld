// tests/unit/features/zoom/zoomManager.test.js

// Define mocks before imports
jest.mock('../../../../src/js/core/eventBus.js', () => ({
  eventBus: {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  },
}));

jest.mock('../../../../src/js/core/config.js', () => ({
  zoomLevels: {
    min: 1,
    max: 5,
    default: 5,
  },
}));

import {
  getZoomLevel,
  setZoomLevel,
  setFixedZoom,
  resetZoomLevel,
  setupZoom,
  setupPan,
  setupZoomAndPan,
  removeZoomAndPan,
} from '../../../../src/js/features/zoom/zoomManager.js';
import config from '../../../../src/js/core/config.js';
import { eventBus } from '../../../../src/js/core/eventBus.js';

describe('zoomManager', () => {
  let mockCanvas;
  let mockCanvasContainer;
  let mockZoomDisplay;

  beforeEach(() => {
    // Reset eventBus mocks
    eventBus.on.mockClear();
    eventBus.off.mockClear();
    eventBus.emit.mockClear();
    mockCanvas = {
      style: {},
      getBoundingClientRect: jest.fn(() => ({ width: 1000, height: 800 })),
      parentElement: {
        getBoundingClientRect: jest.fn(() => ({ width: 1200, height: 900 })),
      },
      width: 2000,
      height: 1600,
    };
    mockCanvasContainer = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    mockZoomDisplay = { textContent: '' };
    document.getElementById = jest.fn((id) => {
      if (id === 'canvas') return mockCanvas;
      if (id === 'zoom-display') return mockZoomDisplay;
    });
    window.getComputedStyle = jest.fn(() => ({
      transform: 'matrix(1, 0, 0, 1, 0, 0)',
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getZoomLevel and setZoomLevel', () => {
    it('should get and set zoom level within bounds', () => {
      setZoomLevel(3);
      expect(getZoomLevel()).toBe(3);

      setZoomLevel(10); // Above max
      expect(getZoomLevel()).toBe(config.zoomLevels.max);

      setZoomLevel(0); // Below min
      expect(getZoomLevel()).toBe(config.zoomLevels.min);
    });
  });

  describe('setFixedZoom', () => {
    it('should set fixed zoom and update canvas transform', () => {
      setFixedZoom(2, mockCanvas, mockZoomDisplay, 500, 400);
      expect(mockCanvas.style.transform).toMatch(/scale\(0\.4\)/);
      expect(mockZoomDisplay.textContent).toBe('2x');
    });

    it('should use default center if centerX or centerY are NaN', () => {
      setFixedZoom(2, mockCanvas, mockZoomDisplay, NaN, NaN);
      expect(mockCanvas.style.transform).toMatch(
        /translate\(.*\) scale\(0\.4\)/,
      );
    });
  });

  describe('resetZoomLevel', () => {
    it('should reset zoom level to minimum', () => {
      setZoomLevel(4);
      const resetLevel = resetZoomLevel();
      expect(resetLevel).toBe(config.zoomLevels.min);
      expect(getZoomLevel()).toBe(config.zoomLevels.min);
    });
  });

  describe('setupZoom', () => {
    it('should set up zoom event listener', () => {
      setupZoom(mockCanvasContainer, mockCanvas, mockZoomDisplay);
      expect(mockCanvasContainer.addEventListener).toHaveBeenCalledWith(
        'wheel',
        expect.any(Function),
        { passive: false },
      );
    });

    it('should remove existing zoom listener before adding a new one', () => {
      setupZoom(mockCanvasContainer, mockCanvas, mockZoomDisplay);
      const firstCall = mockCanvasContainer.addEventListener.mock.calls[0];
      const firstListener = firstCall[1];

      setupZoom(mockCanvasContainer, mockCanvas, mockZoomDisplay);
      const secondCall = mockCanvasContainer.addEventListener.mock.calls[1];
      const secondListener = secondCall[1];

      expect(mockCanvasContainer.removeEventListener).toHaveBeenCalledTimes(2);
      expect(mockCanvasContainer.removeEventListener).toHaveBeenNthCalledWith(
        1,
        'wheel',
        expect.any(Function),
        { passive: false },
      );
      expect(mockCanvasContainer.removeEventListener).toHaveBeenNthCalledWith(
        2,
        'wheel',
        firstListener,
        { passive: false },
      );
      expect(mockCanvasContainer.addEventListener).toHaveBeenCalledTimes(2);
      expect(firstListener).not.toBe(secondListener);
    });
  });

  describe('setupPan', () => {
    it('should set up pan event listeners', () => {
      setupPan(mockCanvasContainer, mockCanvas);
      expect(mockCanvasContainer.addEventListener).toHaveBeenCalledTimes(4);
      expect(mockCanvasContainer.addEventListener).toHaveBeenCalledWith(
        'mousedown',
        expect.any(Function),
      );
      expect(mockCanvasContainer.addEventListener).toHaveBeenCalledWith(
        'mousemove',
        expect.any(Function),
      );
      expect(mockCanvasContainer.addEventListener).toHaveBeenCalledWith(
        'mouseup',
        expect.any(Function),
      );
      expect(mockCanvasContainer.addEventListener).toHaveBeenCalledWith(
        'mouseleave',
        expect.any(Function),
      );
    });
  });

  describe('setupZoomAndPan', () => {
    it('should set up both zoom and pan', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      setupZoomAndPan(mockCanvasContainer, mockCanvas, mockZoomDisplay);
      expect(mockCanvasContainer.addEventListener).toHaveBeenCalledWith(
        'contextmenu',
        expect.any(Function),
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'resize',
        expect.any(Function),
      );
    });
  });

  describe('removeZoomAndPan', () => {
    it('should remove zoom and pan event listeners', () => {
      setupZoomAndPan(mockCanvasContainer, mockCanvas, mockZoomDisplay);
      removeZoomAndPan(mockCanvasContainer);
      // Update the expected number of calls to match the actual implementation
      // Expects: wheel(1) + mouse events(4) + touch events(4) + initial wheel cleanup(1) = 10
      expect(mockCanvasContainer.removeEventListener).toHaveBeenCalledTimes(10);
    });
  });

  describe('EventBus canvas.pan listener', () => {
    beforeEach(() => {
      // Reset mocks
      eventBus.on.mockClear();

      // Mock getComputedStyle
      Object.defineProperty(window, 'getComputedStyle', {
        writable: true,
        value: jest.fn(() => ({
          transform: 'matrix(1, 0, 0, 1, 100, 50)', // translate(100px, 50px) scale(1)
        })),
      });

      // Mock DOMMatrix
      global.DOMMatrix = jest.fn().mockImplementation(() => ({
        e: 100, // translateX
        f: 50, // translateY
        a: 1, // scaleX
      }));
    });

    it('should set up EventBus listener for canvas.pan events', () => {
      setupZoomAndPan(mockCanvasContainer, mockCanvas, mockZoomDisplay);

      // Should have registered a listener for canvas.pan
      expect(eventBus.on).toHaveBeenCalledWith(
        'canvas.pan',
        expect.any(Function),
      );
    });

    it('should apply pan transform when canvas.pan event is received', () => {
      setupZoomAndPan(mockCanvasContainer, mockCanvas, mockZoomDisplay);

      // Get the registered canvas.pan handler
      const panHandler = eventBus.on.mock.calls.find(
        (call) => call[0] === 'canvas.pan',
      )[1];

      // Trigger the handler with mock delta values
      panHandler({ deltaX: 20, deltaY: -10 });

      // Should apply transform with deltas added to current position
      expect(mockCanvas.style.transform).toBe(
        'translate(120px, 40px) scale(1)',
      );
    });
  });
});
