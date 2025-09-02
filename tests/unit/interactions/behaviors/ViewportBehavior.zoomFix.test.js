/**
 * ViewportBehavior Zoom Center Fix Integration Tests
 *
 * Integration tests to verify the zoom center coordinate bug fix works
 * with the actual coordinate service in a realistic DOM environment.
 */

import { ViewportBehavior } from '../../../../src/js/interactions/behaviors/ViewportBehavior.js';

describe('ViewportBehavior - Zoom Center Fix Integration', () => {
  let viewportBehavior;
  let canvas;
  let canvasWrapper;
  let zoomDisplay;
  let mockEventBus;

  beforeEach(() => {
    // Create realistic DOM setup like the app
    document.body.innerHTML = `
      <div id="canvas-wrapper" style="position: fixed; top: 100px; left: 150px; width: 800px; height: 600px;">
        <canvas id="canvas" width="800" height="600" style="border: 1px solid #ccc;"></canvas>
      </div>
      <div id="zoom-display">5.0x</div>
    `;

    canvas = document.getElementById('canvas');
    canvasWrapper = document.getElementById('canvas-wrapper');
    zoomDisplay = document.getElementById('zoom-display');

    mockEventBus = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    };

    viewportBehavior = new ViewportBehavior(mockEventBus);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Zoom Center Coordinate Conversion', () => {
    test('should properly convert viewport coordinates to canvas coordinates for zoom', async () => {
      await viewportBehavior.initialize(canvas, zoomDisplay);

      // Verify coordinate service is available
      expect(viewportBehavior.coordinateTransform).toBeTruthy();

      // Simulate mouse wheel at specific viewport position
      const viewportX = 400; // Middle of viewport
      const viewportY = 350; // Middle of viewport

      // Calculate expected canvas coordinates
      const canvasRect = canvas.getBoundingClientRect();
      const expectedCanvasX = viewportX - canvasRect.left;
      const expectedCanvasY = viewportY - canvasRect.top;

      console.log('Integration test coordinates:', {
        viewport: { x: viewportX, y: viewportY },
        canvasRect: { left: canvasRect.left, top: canvasRect.top },
        expectedCanvas: { x: expectedCanvasX, y: expectedCanvasY },
      });

      // Test coordinate transformation
      const canvasCoords =
        viewportBehavior.coordinateTransform.viewportToCanvas(
          viewportX,
          viewportY,
        );
      expect(canvasCoords.x).toBeCloseTo(expectedCanvasX, 1);
      expect(canvasCoords.y).toBeCloseTo(expectedCanvasY, 1);

      // Test zoom behavior with proper coordinate conversion
      const initialZoom = viewportBehavior.getZoomLevel();
      viewportBehavior.handleWheelZoom('in', viewportX, viewportY, 'desktop');

      const newZoom = viewportBehavior.getZoomLevel();
      expect(newZoom).toBe(initialZoom + 1);
      expect(canvas.style.transform).toContain('scale');
    });

    test('should handle edge cases with canvas at different viewport positions', async () => {
      // Move canvas to different position in viewport
      canvasWrapper.style.left = '50px';
      canvasWrapper.style.top = '25px';

      await viewportBehavior.initialize(canvas, zoomDisplay);

      const viewportX = 300;
      const viewportY = 200;

      // Test that coordinate conversion accounts for new canvas position
      const canvasCoords =
        viewportBehavior.coordinateTransform.viewportToCanvas(
          viewportX,
          viewportY,
        );
      const canvasRect = canvas.getBoundingClientRect();

      expect(canvasCoords.x).toBeCloseTo(viewportX - canvasRect.left, 1);
      expect(canvasCoords.y).toBeCloseTo(viewportY - canvasRect.top, 1);

      // Zoom should work correctly at new position
      viewportBehavior.handleWheelZoom('out', viewportX, viewportY, 'desktop');
      expect(canvas.style.transform).toContain('scale');
    });

    test('should maintain zoom center consistency across multiple zoom operations', async () => {
      await viewportBehavior.initialize(canvas, zoomDisplay);

      const fixedViewportX = 450;
      const fixedViewportY = 380;

      // Perform multiple zoom operations at same viewport point
      const zoomSequence = ['in', 'in', 'out', 'in', 'out', 'out'];

      zoomSequence.forEach((direction, index) => {
        const beforeZoom = viewportBehavior.getZoomLevel();
        viewportBehavior.handleWheelZoom(
          direction,
          fixedViewportX,
          fixedViewportY,
          'desktop',
        );
        const afterZoom = viewportBehavior.getZoomLevel();

        const expectedChange = direction === 'in' ? 1 : -1;
        const actualChange = afterZoom - beforeZoom;

        // Account for zoom limits (1=most zoomed out, 5=most zoomed in)
        const canChangeZoom =
          (direction === 'in' && beforeZoom < 5) ||
          (direction === 'out' && beforeZoom > 1);
        const expectedActualChange = canChangeZoom ? expectedChange : 0;
        expect(actualChange).toBe(expectedActualChange);

        // Transform should always be applied
        expect(canvas.style.transform).toContain('scale');
        expect(canvas.style.transform).toContain('translate');

        console.log(
          `Zoom step ${index + 1}: ${direction} -> ${beforeZoom} to ${afterZoom}`,
        );
      });
    });
  });

  describe('Touch vs Desktop Consistency', () => {
    test('should produce consistent results for touch and desktop zoom at same point', async () => {
      await viewportBehavior.initialize(canvas, zoomDisplay);

      const testX = 375;
      const testY = 300;

      // Reset to known zoom level (use 3 so we can zoom in)
      viewportBehavior.setZoomLevel(3);
      const initialTransform = canvas.style.transform;

      // Test desktop wheel zoom
      viewportBehavior.handleWheelZoom('in', testX, testY, 'desktop');
      const desktopTransform = canvas.style.transform;
      const desktopZoom = viewportBehavior.getZoomLevel();

      // Reset to same initial state
      viewportBehavior.setZoomLevel(3);
      canvas.style.transform = initialTransform;

      // Test touch pinch zoom (equivalent scale change)
      viewportBehavior.handlePinchZoom(1.2, testX, testY, 'touch');
      const touchTransform = canvas.style.transform;
      const touchZoom = viewportBehavior.getZoomLevel();

      console.log('Touch vs Desktop consistency test:', {
        desktopZoom,
        touchZoom,
        desktopTransform,
        touchTransform,
      });

      // Both should zoom in the same direction (from 3)
      expect(desktopZoom).toBeGreaterThan(3);
      expect(touchZoom).toBeGreaterThan(3);

      // Both should apply transforms
      expect(desktopTransform).toContain('scale');
      expect(touchTransform).toContain('scale');
    });
  });

  describe('Performance and Error Handling', () => {
    test('should handle coordinate service failures gracefully', async () => {
      await viewportBehavior.initialize(canvas, zoomDisplay);

      // Simulate coordinate service failure
      const originalViewportToCanvas =
        viewportBehavior.coordinateTransform.viewportToCanvas;
      viewportBehavior.coordinateTransform.viewportToCanvas = jest.fn(() => {
        throw new Error('Coordinate service failure');
      });

      const initialZoom = viewportBehavior.getZoomLevel();

      // Should not crash and should still perform zoom
      expect(() => {
        viewportBehavior.handleWheelZoom('in', 400, 300, 'desktop');
      }).not.toThrow();

      // Zoom should still change (using fallback center)
      const newZoom = viewportBehavior.getZoomLevel();
      expect(newZoom).toBe(initialZoom + 1);

      // Restore original function
      viewportBehavior.coordinateTransform.viewportToCanvas =
        originalViewportToCanvas;
    });

    test('should handle invalid coordinate inputs gracefully', async () => {
      await viewportBehavior.initialize(canvas, zoomDisplay);

      const testCases = [
        { x: NaN, y: 300 },
        { x: 400, y: NaN },
        { x: NaN, y: NaN },
        { x: Infinity, y: 300 },
        { x: 400, y: -Infinity },
        { x: null, y: 300 },
        { x: undefined, y: undefined },
      ];

      testCases.forEach(({ x, y }) => {
        const initialZoom = viewportBehavior.getZoomLevel();

        expect(() => {
          viewportBehavior.handleWheelZoom('in', x, y, 'desktop');
        }).not.toThrow();

        // Should still perform zoom operation
        expect(viewportBehavior.getZoomLevel()).toBeGreaterThanOrEqual(
          initialZoom,
        );
      });
    });

    test('should perform zoom operations efficiently', async () => {
      await viewportBehavior.initialize(canvas, zoomDisplay);

      const startTime = performance.now();

      // Perform 100 zoom operations
      for (let i = 0; i < 100; i++) {
        const direction = i % 2 === 0 ? 'in' : 'out';
        viewportBehavior.handleWheelZoom(
          direction,
          400 + i,
          300 + i,
          'desktop',
        );
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      console.log(`100 zoom operations took ${totalTime.toFixed(2)}ms`);

      // Should complete quickly (less than 100ms for 100 operations)
      expect(totalTime).toBeLessThan(100);
    });
  });

  describe('Zoom Limits and Bounds', () => {
    test('should respect zoom limits and not exceed bounds', async () => {
      await viewportBehavior.initialize(canvas, zoomDisplay);

      // Test zoom in limit
      viewportBehavior.setZoomLevel(5); // Max zoom
      viewportBehavior.handleWheelZoom('in', 400, 300, 'desktop');
      expect(viewportBehavior.getZoomLevel()).toBe(5); // Should not exceed max

      // Test zoom out limit
      viewportBehavior.setZoomLevel(1); // Min zoom
      viewportBehavior.handleWheelZoom('out', 400, 300, 'desktop');
      expect(viewportBehavior.getZoomLevel()).toBe(1); // Should not go below min
    });

    test('should handle zoom center at canvas boundaries', async () => {
      await viewportBehavior.initialize(canvas, zoomDisplay);

      const canvasRect = canvas.getBoundingClientRect();

      const boundaryTests = [
        { x: canvasRect.left, y: canvasRect.top }, // Top-left corner
        { x: canvasRect.right, y: canvasRect.top }, // Top-right corner
        { x: canvasRect.left, y: canvasRect.bottom }, // Bottom-left corner
        { x: canvasRect.right, y: canvasRect.bottom }, // Bottom-right corner
        { x: canvasRect.left + canvasRect.width / 2, y: canvasRect.top }, // Top center
        { x: canvasRect.left, y: canvasRect.top + canvasRect.height / 2 }, // Left center
      ];

      boundaryTests.forEach(({ x, y }) => {
        const initialZoom = viewportBehavior.getZoomLevel();

        expect(() => {
          viewportBehavior.handleWheelZoom('in', x, y, 'desktop');
        }).not.toThrow();

        expect(viewportBehavior.getZoomLevel()).toBeGreaterThanOrEqual(
          initialZoom,
        );
        expect(canvas.style.transform).toContain('scale');
      });
    });
  });
});
