// tests/unit/interactions/gestures/TouchState.test.js

import { TouchState } from '../../../../src/js/interactions/gestures/TouchState.js';

describe('TouchState', () => {
  let touchState;

  beforeEach(() => {
    touchState = new TouchState();
  });

  describe('Constructor and Reset', () => {
    it('should initialize with empty state', () => {
      expect(touchState.getTouchCount()).toBe(0);
      expect(touchState.isActive).toBe(false);
      expect(touchState.gestureType).toBe(null);
    });

    it('should reset all state', () => {
      // Add some touches first
      const mockTouch = createMockTouch(1, 100, 200);
      touchState.addTouch(mockTouch);
      touchState.gestureType = 'tap';

      expect(touchState.getTouchCount()).toBe(1);
      expect(touchState.isActive).toBe(true);

      touchState.reset();

      expect(touchState.getTouchCount()).toBe(0);
      expect(touchState.isActive).toBe(false);
      expect(touchState.gestureType).toBe(null);
    });
  });

  describe('Touch Management', () => {
    it('should add touch points correctly', () => {
      const mockTouch = createMockTouch(1, 100, 200);
      touchState.addTouch(mockTouch);

      expect(touchState.getTouchCount()).toBe(1);
      expect(touchState.isActive).toBe(true);

      const touchData = touchState.getTouch(1);
      expect(touchData).toBeDefined();
      expect(touchData.startX).toBe(100);
      expect(touchData.startY).toBe(200);
      expect(touchData.currentX).toBe(100);
      expect(touchData.currentY).toBe(200);
    });

    it('should handle multiple touches', () => {
      const touch1 = createMockTouch(1, 100, 200);
      const touch2 = createMockTouch(2, 300, 400);

      touchState.addTouch(touch1);
      touchState.addTouch(touch2);

      expect(touchState.getTouchCount()).toBe(2);
      expect(touchState.getTouch(1)).toBeDefined();
      expect(touchState.getTouch(2)).toBeDefined();
    });

    it('should update existing touch points', () => {
      const mockTouch = createMockTouch(1, 100, 200);
      touchState.addTouch(mockTouch);

      const updatedTouch = createMockTouch(1, 150, 250);
      touchState.updateTouch(updatedTouch);

      const touchData = touchState.getTouch(1);
      expect(touchData.currentX).toBe(150);
      expect(touchData.currentY).toBe(250);
      expect(touchData.lastX).toBe(100); // Previous position
      expect(touchData.lastY).toBe(200); // Previous position
    });

    it('should remove touch points', () => {
      const touch1 = createMockTouch(1, 100, 200);
      const touch2 = createMockTouch(2, 300, 400);

      touchState.addTouch(touch1);
      touchState.addTouch(touch2);
      expect(touchState.getTouchCount()).toBe(2);

      touchState.removeTouch(1);
      expect(touchState.getTouchCount()).toBe(1);
      expect(touchState.getTouch(1)).toBeUndefined();
      expect(touchState.getTouch(2)).toBeDefined();

      touchState.removeTouch(2);
      expect(touchState.getTouchCount()).toBe(0);
      expect(touchState.isActive).toBe(false);
    });
  });

  describe('Touch Retrieval', () => {
    it('should get primary touch (first touch)', () => {
      const touch1 = createMockTouch(1, 100, 200);
      const touch2 = createMockTouch(2, 300, 400);

      touchState.addTouch(touch1);
      touchState.addTouch(touch2);

      const primary = touchState.getPrimaryTouch();
      expect(primary).toBeDefined();
      expect(primary.id).toBe(1);
    });

    it('should return undefined for primary touch when no touches', () => {
      expect(touchState.getPrimaryTouch()).toBeUndefined();
    });

    it('should get all touches as array', () => {
      const touch1 = createMockTouch(1, 100, 200);
      const touch2 = createMockTouch(2, 300, 400);

      touchState.addTouch(touch1);
      touchState.addTouch(touch2);

      const allTouches = touchState.getAllTouches();
      expect(allTouches).toHaveLength(2);
      expect(allTouches.find((t) => t.id === 1)).toBeDefined();
      expect(allTouches.find((t) => t.id === 2)).toBeDefined();
    });
  });

  describe('Movement Calculations', () => {
    it('should calculate total movement for primary touch', () => {
      const mockTouch = createMockTouch(1, 100, 200);
      touchState.addTouch(mockTouch);

      // Simulate movement (3-4-5 triangle)
      const movedTouch = createMockTouch(1, 103, 204);
      touchState.updateTouch(movedTouch);

      expect(touchState.getTotalMovement()).toBe(5); // 3² + 4² = 5²
    });

    it('should return 0 movement when no touches', () => {
      expect(touchState.getTotalMovement()).toBe(0);
    });

    it('should calculate distance between two touches', () => {
      const touch1 = createMockTouch(1, 100, 200);
      const touch2 = createMockTouch(2, 103, 204);

      touchState.addTouch(touch1);
      touchState.addTouch(touch2);

      expect(touchState.getTouchDistance()).toBe(5); // 3-4-5 triangle
    });

    it('should return null distance with less than 2 touches', () => {
      const touch1 = createMockTouch(1, 100, 200);
      touchState.addTouch(touch1);

      expect(touchState.getTouchDistance()).toBe(null);
    });

    it('should calculate center point of touches', () => {
      const touch1 = createMockTouch(1, 100, 200);
      const touch2 = createMockTouch(2, 200, 300);

      touchState.addTouch(touch1);
      touchState.addTouch(touch2);

      const center = touchState.getCenterPoint();
      expect(center.x).toBe(150); // (100 + 200) / 2
      expect(center.y).toBe(250); // (200 + 300) / 2
    });

    it('should return null center point when no touches', () => {
      expect(touchState.getCenterPoint()).toBe(null);
    });
  });

  describe('Gesture Classification', () => {
    let mockNow;

    beforeEach(() => {
      mockNow = jest.spyOn(Date, 'now');
    });

    afterEach(() => {
      mockNow.mockRestore();
    });

    it('should identify likely tap gesture', () => {
      mockNow.mockReturnValue(1000);
      const mockTouch = createMockTouch(1, 100, 200);
      touchState.addTouch(mockTouch);

      mockNow.mockReturnValue(1200);
      // Minimal movement
      const movedTouch = createMockTouch(1, 102, 201);
      touchState.updateTouch(movedTouch);

      expect(touchState.isLikelyTap(10, 500)).toBe(true);
      expect(touchState.isLikelyTap(1, 500)).toBe(false); // Too much movement
    });

    it('should identify likely long press', () => {
      mockNow.mockReturnValue(1000);
      const mockTouch = createMockTouch(1, 100, 200);
      touchState.addTouch(mockTouch);

      mockNow.mockReturnValue(1600); // 600ms duration
      // Minimal movement
      const movedTouch = createMockTouch(1, 102, 201);
      touchState.updateTouch(movedTouch);

      expect(touchState.isLikelyLongPress(500, 10)).toBe(true);
      expect(touchState.isLikelyLongPress(700, 10)).toBe(false); // Not long enough
    });

    it('should calculate gesture duration', () => {
      mockNow.mockReturnValue(1000);
      const mockTouch = createMockTouch(1, 100, 200);
      touchState.addTouch(mockTouch);

      mockNow.mockReturnValue(1200);
      // Trigger lastEventTime update
      const movedTouch = createMockTouch(1, 100, 200);
      touchState.updateTouch(movedTouch);

      expect(touchState.getDuration()).toBe(200); // 1200 - 1000
    });
  });

  describe('Edge Cases', () => {
    it('should handle updating non-existent touch', () => {
      const mockTouch = createMockTouch(999, 100, 200);

      // Should not throw
      expect(() => touchState.updateTouch(mockTouch)).not.toThrow();
    });

    it('should handle removing non-existent touch', () => {
      // Should not throw
      expect(() => touchState.removeTouch(999)).not.toThrow();
    });

    it('should maintain state consistency after operations', () => {
      const touch1 = createMockTouch(1, 100, 200);
      const touch2 = createMockTouch(2, 300, 400);

      touchState.addTouch(touch1);
      touchState.addTouch(touch2);
      touchState.removeTouch(1);
      touchState.addTouch(createMockTouch(3, 500, 600));

      expect(touchState.getTouchCount()).toBe(2);
      expect(touchState.getTouch(1)).toBeUndefined();
      expect(touchState.getTouch(2)).toBeDefined();
      expect(touchState.getTouch(3)).toBeDefined();
    });
  });
});

// Helper function to create mock touch objects
function createMockTouch(identifier, clientX, clientY) {
  return {
    identifier,
    clientX,
    clientY,
    target: null,
    screenX: clientX,
    screenY: clientY,
    pageX: clientX,
    pageY: clientY,
  };
}
