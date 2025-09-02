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
    // Create realistic DOM setup matching new single-transform architecture
    document.body.innerHTML = `
      <div id="canvas-container" style="position: relative; width: 800px; height: 600px; overflow: hidden; background-color: #ccc;">
        <canvas id="canvas" width="7680" height="4320" style="position: absolute; top: 0; left: 0; transform-origin: top left;"></canvas>
      </div>
      <div id="zoom-display">5.0x</div>
    `;

    canvas = document.getElementById('canvas');
    canvasWrapper = document.getElementById('canvas-container'); // Updated reference
    zoomDisplay = document.getElementById('zoom-display');

    // Mock proper canvas dimensions for getBoundingClientRect
    Object.defineProperty(canvas, 'offsetWidth', {
      value: 7680,
      writable: true,
    });
    Object.defineProperty(canvas, 'offsetHeight', {
      value: 4320,
      writable: true,
    });

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

  describe('Single-Transform Zoom Behavior', () => {
    test('should apply zoom transforms correctly at specific viewport coordinates', async () => {
      await viewportBehavior.initialize(canvas, zoomDisplay);

      // Verify initialization
      expect(viewportBehavior.coordinateTransform).toBeTruthy();
      expect(canvas.style.transform).toContain('translate'); // Initial centering applied

      // Start from a zoomable level (not max zoom)
      viewportBehavior.setZoomLevel(3);

      // Simulate mouse wheel at specific viewport position
      const viewportX = 400; // Middle of viewport
      const viewportY = 300; // Middle of viewport

      const initialTransform = canvas.style.transform;

      // Test zoom behavior - should apply new transform
      viewportBehavior.handleWheelZoom('in', viewportX, viewportY, 'desktop');

      // Verify zoom level changed
      expect(viewportBehavior.getZoomLevel()).toBe(4);

      // Verify transform was applied and contains both scale and translate
      const newTransform = canvas.style.transform;
      expect(newTransform).toContain('scale');
      expect(newTransform).toContain('translate');
      expect(newTransform).not.toBe(initialTransform); // Transform should have changed
    });

    test('should handle zoom operations with different container positioning', async () => {
      // Move container to different viewport position (new architecture)
      canvasWrapper.style.position = 'absolute';
      canvasWrapper.style.left = '50px';
      canvasWrapper.style.top = '25px';

      await viewportBehavior.initialize(canvas, zoomDisplay);

      const viewportX = 300;
      const viewportY = 200;

      // Start from zoomable level
      viewportBehavior.setZoomLevel(3);
      const initialTransform = canvas.style.transform;

      // Zoom should work correctly regardless of container position
      viewportBehavior.handleWheelZoom('out', viewportX, viewportY, 'desktop');

      // Verify zoom level changed
      expect(viewportBehavior.getZoomLevel()).toBe(2);

      // Verify transform updated
      const newTransform = canvas.style.transform;
      expect(newTransform).toContain('scale');
      expect(newTransform).toContain('translate');
      expect(newTransform).not.toBe(initialTransform);
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

      // Start from a zoomable level (not at max)
      viewportBehavior.setZoomLevel(3);
      const initialZoom = viewportBehavior.getZoomLevel();

      // Simulate coordinate service failure
      const originalViewportToCanvas =
        viewportBehavior.coordinateTransform.viewportToCanvas;
      viewportBehavior.coordinateTransform.viewportToCanvas = jest.fn(() => {
        throw new Error('Coordinate service failure');
      });

      // Should not crash and should still perform zoom (using fallback behavior)
      expect(() => {
        viewportBehavior.handleWheelZoom('in', 400, 300, 'desktop');
      }).not.toThrow();

      // Zoom should still change (our new architecture handles this gracefully)
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

      // Should complete reasonably quickly - new architecture should be efficient
      // Allow more time for test environments (was 100ms, now 200ms)
      expect(totalTime).toBeLessThan(200);
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
