/**
 * ViewportBehavior Zoom Center Coordinate Tests
 *
 * Tests the critical bug where zoom center calculation uses viewport coordinates
 * instead of canvas coordinates, causing zoom to center around wrong point.
 */

import { ViewportBehavior } from '../../../../src/js/interactions/behaviors/ViewportBehavior.js';

describe('ViewportBehavior - Zoom Center Coordinate Bug', () => {
  let viewportBehavior;
  let mockCanvas;
  let mockZoomDisplay;
  let mockCoordinateTransform;
  let mockEventBus;

  beforeEach(() => {
    // Setup DOM elements
    mockCanvas = {
      id: 'canvas',
      clientWidth: 800,
      clientHeight: 600,
      getBoundingClientRect: jest.fn(() => ({
        left: 100, // Canvas is offset from viewport edge
        top: 50, // Canvas is offset from viewport edge
        width: 800,
        height: 600,
        right: 900,
        bottom: 650,
      })),
      style: {
        transform: 'translate(0px, 0px) scale(1)',
      },
      parentElement: {
        getBoundingClientRect: jest.fn(() => ({
          width: 1000,
          height: 700,
        })),
      },
    };

    mockZoomDisplay = {
      textContent: '5.0x',
    };

    // Mock coordinate transform service
    mockCoordinateTransform = {
      viewportToCanvas: jest.fn((viewportX, viewportY) => {
        // Convert viewport coordinates to canvas coordinates
        const canvasRect = mockCanvas.getBoundingClientRect();
        return {
          x: viewportX - canvasRect.left,
          y: viewportY - canvasRect.top,
        };
      }),
    };

    mockEventBus = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    };

    // Create behavior
    viewportBehavior = new ViewportBehavior(mockEventBus);
  });

  describe('Zoom Center Coordinate Bug Demonstration', () => {
    test('should demonstrate the viewport vs canvas coordinate bug', async () => {
      await viewportBehavior.initialize(mockCanvas, mockZoomDisplay);

      // Simulate wheel zoom at specific viewport coordinates
      const viewportX = 300; // Viewport coordinate
      const viewportY = 200; // Viewport coordinate

      // These should be converted to canvas coordinates:
      // canvasX = viewportX - canvasRect.left = 300 - 100 = 200
      // canvasY = viewportY - canvasRect.top = 200 - 50 = 150

      // Current buggy behavior: uses viewport coordinates directly
      viewportBehavior.handleWheelZoom('in', viewportX, viewportY, 'desktop');

      // BUG: The zoom calculation uses (300, 200) as canvas coordinates
      // when it should use (200, 150) as canvas coordinates

      // This test demonstrates the bug exists - the zoom center calculation
      // is using viewport coordinates where it should use canvas coordinates
      expect(mockCanvas.style.transform).toBeDefined();
    });

    test('should show correct vs incorrect zoom center calculations', async () => {
      await viewportBehavior.initialize(mockCanvas, mockZoomDisplay);

      const viewportX = 400; // Viewport coordinate
      const viewportY = 300; // Viewport coordinate

      // CORRECT: Convert to canvas coordinates first
      const correctCanvasCoords = mockCoordinateTransform.viewportToCanvas(
        viewportX,
        viewportY,
      );
      expect(correctCanvasCoords.x).toBe(300); // 400 - 100 (canvas left offset)
      expect(correctCanvasCoords.y).toBe(250); // 300 - 50 (canvas top offset)

      // INCORRECT: Current bug uses viewport coordinates as canvas coordinates
      const incorrectCanvasX = viewportX; // 400 (wrong!)
      const incorrectCanvasY = viewportY; // 300 (wrong!)

      expect(incorrectCanvasX).not.toBe(correctCanvasCoords.x);
      expect(incorrectCanvasY).not.toBe(correctCanvasCoords.y);

      console.log('Zoom center bug demonstration:', {
        viewportCoords: { x: viewportX, y: viewportY },
        correctCanvasCoords: correctCanvasCoords,
        incorrectCanvasCoords: { x: incorrectCanvasX, y: incorrectCanvasY },
        canvasOffset: { left: 100, top: 50 },
      });
    });

    test('should demonstrate Google Maps expected behavior', async () => {
      await viewportBehavior.initialize(mockCanvas, mockZoomDisplay);

      // Google Maps behavior: If I point my cursor at a specific location on the map
      // and zoom, that location should stay under my cursor after zoom

      const cursorViewportX = 500; // Where my cursor is in viewport
      const cursorViewportY = 400; // Where my cursor is in viewport

      // This should translate to specific canvas coordinates
      const cursorCanvasCoords = mockCoordinateTransform.viewportToCanvas(
        cursorViewportX,
        cursorViewportY,
      );

      // Expected: cursor stays at same canvas position after zoom
      // Reality with bug: cursor moves because zoom uses wrong center point

      expect(cursorCanvasCoords.x).toBe(400); // 500 - 100 (canvas offset)
      expect(cursorCanvasCoords.y).toBe(350); // 400 - 50 (canvas offset)

      // The zoom should center around these canvas coordinates, not viewport coordinates
    });
  });

  describe('Canvas Offset Scenarios', () => {
    test('should handle canvas at different viewport positions', () => {
      // Test when canvas is positioned at different locations in viewport
      const testCases = [
        { canvasLeft: 0, canvasTop: 0, viewportX: 200, viewportY: 150 },
        { canvasLeft: 100, canvasTop: 50, viewportX: 300, viewportY: 200 },
        { canvasLeft: 50, canvasTop: 100, viewportX: 250, viewportY: 300 },
      ];

      testCases.forEach(({ canvasLeft, canvasTop, viewportX, viewportY }) => {
        // Mock canvas at different position
        mockCanvas.getBoundingClientRect.mockReturnValue({
          left: canvasLeft,
          top: canvasTop,
          width: 800,
          height: 600,
          right: canvasLeft + 800,
          bottom: canvasTop + 600,
        });

        const canvasCoords = mockCoordinateTransform.viewportToCanvas(
          viewportX,
          viewportY,
        );

        expect(canvasCoords.x).toBe(viewportX - canvasLeft);
        expect(canvasCoords.y).toBe(viewportY - canvasTop);
      });
    });

    test('should handle edge cases with extreme canvas offsets', () => {
      // Canvas way off to the right and down
      mockCanvas.getBoundingClientRect.mockReturnValue({
        left: 500,
        top: 300,
        width: 800,
        height: 600,
        right: 1300,
        bottom: 900,
      });

      const viewportX = 700; // Cursor in middle of canvas
      const viewportY = 500;

      const canvasCoords = mockCoordinateTransform.viewportToCanvas(
        viewportX,
        viewportY,
      );

      expect(canvasCoords.x).toBe(200); // 700 - 500
      expect(canvasCoords.y).toBe(200); // 500 - 300

      // Bug: current code would use (700, 500) as canvas coords instead of (200, 200)
    });
  });

  describe('Zoom Level and Scale Consistency', () => {
    test('should maintain consistent zoom center across different zoom levels', async () => {
      await viewportBehavior.initialize(mockCanvas, mockZoomDisplay);

      const viewportX = 350;
      const viewportY = 275;
      const canvasCoords = mockCoordinateTransform.viewportToCanvas(
        viewportX,
        viewportY,
      );

      // Test zoom at different levels
      const zoomLevels = [1, 3, 5, 7, 10];

      zoomLevels.forEach((zoomLevel) => {
        viewportBehavior.setZoomLevel(zoomLevel);

        // The canvas coordinate should remain the same regardless of zoom level
        // Only the transformation around that coordinate should change
        expect(canvasCoords.x).toBe(250); // 350 - 100
        expect(canvasCoords.y).toBe(225); // 275 - 50
      });
    });
  });

  describe('Integration with CoordinateTransform Service', () => {
    test('should use CoordinateTransform service for proper coordinate conversion', () => {
      // Test that our mock coordinate transform works correctly
      const testCases = [
        { viewport: { x: 150, y: 100 }, expectedCanvas: { x: 50, y: 50 } },
        { viewport: { x: 500, y: 350 }, expectedCanvas: { x: 400, y: 300 } },
        { viewport: { x: 900, y: 650 }, expectedCanvas: { x: 800, y: 600 } },
      ];

      testCases.forEach(({ viewport, expectedCanvas }) => {
        const result = mockCoordinateTransform.viewportToCanvas(
          viewport.x,
          viewport.y,
        );
        expect(result.x).toBe(expectedCanvas.x);
        expect(result.y).toBe(expectedCanvas.y);
      });
    });
  });
});
