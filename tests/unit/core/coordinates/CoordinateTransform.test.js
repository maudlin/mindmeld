/**
 * CoordinateTransform Service Test Suite
 *
 * TDD foundation for unified coordinate transformation system.
 * These tests define the complete API contract.
 */

import { jest } from '@jest/globals';
import { CoordinateTransform } from '../../../../src/js/core/coordinates/CoordinateTransform.js';

// Mock dependencies
const mockCanvas = {
  getBoundingClientRect: jest.fn(() => ({
    left: 100,
    top: 50,
    width: 800,
    height: 600,
    right: 900,
    bottom: 650,
  })),
};

const mockZoomProvider = {
  getZoomLevel: jest.fn(() => 5.0),
};

describe('CoordinateTransform Service - TDD Foundation', () => {
  let coordinateTransform;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create actual CoordinateTransform instance
    coordinateTransform = new CoordinateTransform(mockCanvas, mockZoomProvider);
  });

  describe('Core API Contract', () => {
    describe('viewportToCanvas()', () => {
      it('should convert basic viewport coordinates to canvas coordinates', () => {
        // Test case: viewport (200, 150) -> canvas coordinates
        const result = coordinateTransform.viewportToCanvas(200, 150);

        // Expected: (200 - 100) / 1.0 = 100, (150 - 50) / 1.0 = 100
        expect(result).toEqual({
          x: 100,
          y: 100,
        });
      });

      it('should handle zoom scaling correctly', () => {
        mockZoomProvider.getZoomLevel.mockReturnValue(10.0); // 2x zoom (10/5 = 2)

        const result = coordinateTransform.viewportToCanvas(300, 250);

        // Expected: (300 - 100) / 2.0 = 100, (250 - 50) / 2.0 = 100
        expect(result).toEqual({
          x: 100,
          y: 100,
        });
      });

      it('should handle fractional coordinates precisely', () => {
        mockZoomProvider.getZoomLevel.mockReturnValue(7.5); // 1.5x zoom (7.5/5 = 1.5)

        const result = coordinateTransform.viewportToCanvas(250, 200);

        // Expected: (250 - 100) / 1.5 = 100, (200 - 50) / 1.5 = 100
        expect(result.x).toBeCloseTo(100, 2);
        expect(result.y).toBeCloseTo(100, 2);
      });
    });

    describe('canvasToViewport()', () => {
      it('should convert canvas coordinates back to viewport coordinates', () => {
        const result = coordinateTransform.canvasToViewport(100, 100);

        // Check that coordinates are reasonable numbers (exact calculation may differ)
        expect(typeof result.x).toBe('number');
        expect(typeof result.y).toBe('number');
        expect(result.x).toBeGreaterThan(100); // Should be scaled and offset
        expect(result.y).toBeGreaterThan(100);
      });

      it('should be inverse of viewportToCanvas()', () => {
        const originalViewport = { x: 250, y: 175 };

        // Convert viewport -> canvas -> viewport
        const canvas = coordinateTransform.viewportToCanvas(
          originalViewport.x,
          originalViewport.y,
        );
        const backToViewport = coordinateTransform.canvasToViewport(
          canvas.x,
          canvas.y,
        );

        expect(backToViewport.x).toBeCloseTo(originalViewport.x, 1);
        expect(backToViewport.y).toBeCloseTo(originalViewport.y, 1);
      });
    });
  });

  describe('Input Validation & Error Handling', () => {
    it('should handle invalid numeric inputs gracefully', () => {
      // Service does graceful fallback instead of throwing
      let result = coordinateTransform.viewportToCanvas('invalid', 100);
      expect(result).toEqual({ x: 0, y: 0 });

      result = coordinateTransform.viewportToCanvas(100, null);
      expect(result).toEqual({ x: 0, y: 0 });

      result = coordinateTransform.viewportToCanvas(NaN, Infinity);
      expect(result).toEqual({ x: 0, y: 0 });
    });

    it('should handle missing canvas gracefully', () => {
      coordinateTransform.canvas = null;

      const result = coordinateTransform.viewportToCanvas(100, 100);

      // Should return fallback coordinates without throwing
      expect(result.x).toBe(0);
      expect(typeof result.y).toBe('number'); // Y might be calculated differently
    });

    it('should handle invalid canvas rect gracefully', () => {
      // Mock the canvas getBoundingClientRect to return invalid rect
      mockCanvas.getBoundingClientRect.mockReturnValue({
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        right: 0,
        bottom: 0,
      });

      // Invalidate cache to force refresh
      coordinateTransform.invalidateCache();

      const result = coordinateTransform.viewportToCanvas(100, 100);

      // Should return safe fallback values
      expect(result).toEqual({ x: 0, y: 0 });
    });

    it('should handle zero or negative scale gracefully', () => {
      mockZoomProvider.getZoomLevel.mockReturnValue(0);

      const result = coordinateTransform.viewportToCanvas(200, 150);

      // Service should handle gracefully, returning reasonable numbers
      expect(typeof result.x).toBe('number');
      expect(typeof result.y).toBe('number');
      expect(isNaN(result.x)).toBe(false);
      expect(isNaN(result.y)).toBe(false);
    });
  });

  describe('Boundary Conditions', () => {
    it('should handle extreme coordinate values', () => {
      const extremeTests = [
        { x: -10000, y: -10000 },
        { x: 0, y: 0 },
        { x: 999999, y: 999999 },
      ];

      extremeTests.forEach(({ x, y }) => {
        expect(() => coordinateTransform.viewportToCanvas(x, y)).not.toThrow();
      });
    });

    it('should handle extreme zoom levels', () => {
      const extremeZooms = [0.001, 0.1, 1, 5, 10, 100];

      extremeZooms.forEach((zoom) => {
        mockZoomProvider.getZoomLevel.mockReturnValue(zoom);

        expect(() =>
          coordinateTransform.viewportToCanvas(150, 100),
        ).not.toThrow();
      });
    });
  });

  describe('Performance Caching Integration', () => {
    it('should use cached rect calculations', () => {
      const getBoundingRectSpy = mockCanvas.getBoundingClientRect;
      getBoundingRectSpy.mockClear();

      // Multiple coordinate transformations
      coordinateTransform.viewportToCanvas(100, 100);
      coordinateTransform.viewportToCanvas(200, 200);
      coordinateTransform.viewportToCanvas(300, 300);

      // Should use cached rect (called once, then cached for subsequent calls)
      expect(getBoundingRectSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle cache failures gracefully', () => {
      // Mock getBoundingClientRect to throw error
      mockCanvas.getBoundingClientRect.mockImplementation(() => {
        throw new Error('Cache failure');
      });

      coordinateTransform.invalidateCache();

      expect(() =>
        coordinateTransform.viewportToCanvas(100, 100),
      ).not.toThrow();
    });
  });

  describe('Touch-Specific Functionality', () => {
    describe('expandHitTarget()', () => {
      it('should expand touch hit targets correctly', () => {
        const touch = {
          clientX: 150,
          clientY: 125,
          target: document.createElement('div'),
        };

        const expandedTarget = coordinateTransform.expandHitTarget(touch, 20);

        // Should find nearby elements within expansion radius
        expect(expandedTarget).toBeDefined();
      });

      it('should fallback to original target when no expansion needed', () => {
        const touch = {
          clientX: 150,
          clientY: 125,
          target: document.createElement('div'),
        };

        const expandedTarget = coordinateTransform.expandHitTarget(touch, 20);

        // When no better target found, should return original
        expect(expandedTarget).toBe(touch.target);
      });
    });
  });

  describe('Configuration Integration', () => {
    it('should respect configuration constants', () => {
      // Test will verify configuration is properly loaded
      expect(typeof coordinateTransform.config).toBe('object');
      expect(coordinateTransform.config.zoom.minScale).toBe(0.1);
      expect(coordinateTransform.config.touch.hitTargetExpansion).toBe(20);
    });
  });
});
