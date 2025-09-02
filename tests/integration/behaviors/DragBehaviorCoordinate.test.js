/**
 * DragBehavior Integration Test Suite
 *
 * Integration tests for DragBehavior with actual CoordinateTransform service.
 * Tests verify clean coordinate handling without complex manual calculations.
 */

import { jest } from '@jest/globals';
import { DragBehavior } from '../../../src/js/interactions/behaviors/DragBehavior.js';
import { CoordinateTransform } from '../../../src/js/core/coordinates/CoordinateTransform.js';

// Mock DOM elements
const createMockNote = (id, x = 100, y = 100) => {
  const note = document.createElement('div');
  note.id = id;
  note.className = 'note';
  note.style.left = `${x}px`;
  note.style.top = `${y}px`;
  note.style.width = '120px';
  note.style.height = '80px';

  // Mock getBoundingClientRect
  note.getBoundingClientRect = jest.fn(() => ({
    left: x,
    top: y,
    width: 120,
    height: 80,
    right: x + 120,
    bottom: y + 80,
  }));

  return note;
};

// Mock canvas element for CoordinateTransform
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

// Mock zoom provider
const mockZoomProvider = {
  getZoomLevel: jest.fn(() => 5.0),
};

// Mock event bus
const mockEventBus = {
  emit: jest.fn(),
};

// Mock note manager
const mockNoteManager = {
  getSelectedNotes: jest.fn(() => []),
  selectNote: jest.fn(),
  clearSelections: jest.fn(),
};

// Mock global modules that DragBehavior imports
jest.mock('../../../src/js/services/noteManager.js', () => ({
  noteManager: mockNoteManager,
}));

jest.mock('../../../src/js/features/connection/connectionManager.js', () => ({
  connectionManager: {
    setDragState: jest.fn(),
    updateConnections: jest.fn(),
  },
}));

describe('DragBehavior - CoordinateTransform Integration', () => {
  let dragBehavior;
  let coordinateTransform;
  let note1, note2, note3;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create test notes
    note1 = createMockNote('note-1', 100, 150);
    note2 = createMockNote('note-2', 200, 200);
    note3 = createMockNote('note-3', 300, 100);

    // Create actual CoordinateTransform service
    coordinateTransform = new CoordinateTransform(mockCanvas, mockZoomProvider);

    // Create actual DragBehavior with injected coordinate service
    dragBehavior = new DragBehavior(mockEventBus, coordinateTransform);

    // Initialize the behavior
    dragBehavior.initialize();
  });

  describe('Clean Coordinate API Contract', () => {
    describe('startDrag()', () => {
      it('should use service for all coordinate calculations', () => {
        const mockEvent = { clientX: 150, clientY: 175 };

        // Spy on coordinate service methods
        const viewportToCanvasSpy = jest.spyOn(
          coordinateTransform,
          'viewportToCanvas',
        );
        const elementToCanvasSpy = jest.spyOn(
          coordinateTransform,
          'elementToCanvas',
        );

        dragBehavior.startDrag(note1, mockEvent, 'desktop');

        // Should call coordinate service, not manual calculations
        expect(viewportToCanvasSpy).toHaveBeenCalledWith(150, 175);
        expect(elementToCanvasSpy).toHaveBeenCalledWith(note1);

        // Should not contain manual rect calculations
        expect(note1.getBoundingClientRect).not.toHaveBeenCalled();
      });

      it('should calculate clean shift offsets using service', () => {
        const mockEvent = { clientX: 250, clientY: 200 };

        dragBehavior.startDrag(note1, mockEvent, 'desktop');

        // Should have calculated shift offsets based on coordinate service
        expect(typeof dragBehavior.shiftX).toBe('number');
        expect(typeof dragBehavior.shiftY).toBe('number');
        expect(dragBehavior.isDragging).toBe(true);

        // Should have initialized selectedNotesOffsets array
        expect(Array.isArray(dragBehavior.selectedNotesOffsets)).toBe(true);
      });

      it('should handle multi-note drag with clean calculations', () => {
        const selectedNotes = [note1, note2, note3];
        mockNoteManager.getSelectedNotes.mockReturnValue(selectedNotes);

        const mockEvent = { clientX: 150, clientY: 175 };

        dragBehavior.startDrag(note1, mockEvent, 'desktop');

        // Should have calculated relative offsets for all selected notes
        expect(dragBehavior.selectedNotesOffsets).toHaveLength(3);
        expect(dragBehavior.selectedNotesOffsets[0].note).toBe(note1);
        expect(dragBehavior.selectedNotesOffsets[1].note).toBe(note2);
        expect(dragBehavior.selectedNotesOffsets[2].note).toBe(note3);

        // All offsets should be numbers
        dragBehavior.selectedNotesOffsets.forEach(({ offsetX, offsetY }) => {
          expect(typeof offsetX).toBe('number');
          expect(typeof offsetY).toBe('number');
        });
      });
    });

    describe('updateDrag()', () => {
      beforeEach(() => {
        // Start a drag first to set up proper state
        const startEvent = { clientX: 150, clientY: 175 };
        dragBehavior.startDrag(note1, startEvent, 'desktop');

        // Set up multi-note selection for testing
        mockNoteManager.getSelectedNotes.mockReturnValue([note1, note2]);
      });

      it('should use service for position updates', () => {
        const mockEvent = { clientX: 250, clientY: 250 };

        // Spy on coordinate service
        const viewportToCanvasSpy = jest.spyOn(
          coordinateTransform,
          'viewportToCanvas',
        );

        dragBehavior.updateDrag(mockEvent, 'desktop');

        // Should use coordinate service for transformation
        expect(viewportToCanvasSpy).toHaveBeenCalledWith(250, 250);
      });

      it('should update note positions cleanly', () => {
        const mockEvent = { clientX: 250, clientY: 250 };

        // Get initial positions
        const initialLeft = note1.style.left;
        const initialTop = note1.style.top;

        dragBehavior.updateDrag(mockEvent, 'desktop');

        // Should update note positions (exact values depend on coordinate calculations)
        expect(note1.style.left).not.toBe(initialLeft);
        expect(note1.style.top).not.toBe(initialTop);

        // Positions should be valid pixel values
        expect(note1.style.left).toMatch(/^-?\d+px$/);
        expect(note1.style.top).toMatch(/^-?\d+px$/);
      });

      it('should emit events with correct data', () => {
        const mockEvent = { clientX: 250, clientY: 250 };

        dragBehavior.updateDrag(mockEvent, 'desktop');

        // Should emit note updates
        expect(mockEventBus.emit).toHaveBeenCalledWith(
          'note.updated',
          expect.objectContaining({
            id: 'note-1',
            left: expect.stringMatching(/^-?\d+px$/),
            top: expect.stringMatching(/^-?\d+px$/),
          }),
        );
      });
    });

    describe('endDrag()', () => {
      beforeEach(() => {
        // Start a drag first to set up proper state
        const startEvent = { clientX: 150, clientY: 175 };
        dragBehavior.startDrag(note1, startEvent, 'desktop');
      });

      it('should clean up state properly', () => {
        const mockEvent = { clientX: 300, clientY: 300 };

        dragBehavior.endDrag(mockEvent, 'desktop');

        expect(dragBehavior.isDragging).toBe(false);
        expect(dragBehavior.dragState).toBeNull();
        expect(mockEventBus.emit).toHaveBeenCalledWith(
          'drag.ended',
          expect.any(Object),
        );
      });

      it('should handle missing end event gracefully', () => {
        dragBehavior.endDrag(null, 'desktop');

        // Should not throw and should clean up state
        expect(dragBehavior.isDragging).toBe(false);
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle coordinate service failures gracefully', () => {
      // Mock the coordinate service to throw an error
      jest
        .spyOn(coordinateTransform, 'viewportToCanvas')
        .mockImplementation(() => {
          throw new Error('Coordinate transformation failed');
        });

      const mockEvent = { clientX: 150, clientY: 175 };

      expect(() =>
        dragBehavior.startDrag(note1, mockEvent, 'desktop'),
      ).not.toThrow();

      // Should not be in dragging state if coordinate service fails
      expect(dragBehavior.isDragging).toBe(false);
    });

    it('should handle invalid note elements', () => {
      const invalidNote = null;
      const mockEvent = { clientX: 150, clientY: 175 };

      expect(() =>
        dragBehavior.startDrag(invalidNote, mockEvent, 'desktop'),
      ).not.toThrow();

      expect(dragBehavior.isDragging).toBe(false);
    });

    it('should handle invalid event coordinates', () => {
      const mockEvent = { clientX: 'invalid', clientY: null };

      expect(() =>
        dragBehavior.startDrag(note1, mockEvent, 'desktop'),
      ).not.toThrow();

      expect(dragBehavior.isDragging).toBe(false);
    });
  });

  describe('Performance Integration', () => {
    it('should minimize coordinate service calls during drag', () => {
      // Spy on coordinate service
      const viewportToCanvasSpy = jest.spyOn(
        coordinateTransform,
        'viewportToCanvas',
      );

      // Start drag
      dragBehavior.startDrag(note1, { clientX: 150, clientY: 175 }, 'desktop');

      // Multiple updates
      dragBehavior.updateDrag({ clientX: 160, clientY: 180 }, 'desktop');
      dragBehavior.updateDrag({ clientX: 170, clientY: 185 }, 'desktop');
      dragBehavior.updateDrag({ clientX: 180, clientY: 190 }, 'desktop');

      // Should call service efficiently (each drag operation calls service once)
      const totalCalls = viewportToCanvasSpy.mock.calls.length;
      expect(totalCalls).toBe(4); // 1 start + 3 updates
    });

    it('should handle rapid drag updates without performance degradation', () => {
      dragBehavior.startDrag(note1, { clientX: 150, clientY: 175 }, 'desktop');

      const startTime = performance.now();

      // Simulate rapid updates
      for (let i = 0; i < 100; i++) {
        dragBehavior.updateDrag(
          {
            clientX: 150 + i,
            clientY: 175 + i,
          },
          'desktop',
        );
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete rapidly (less than 100ms for 100 updates)
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Cross-Platform Consistency', () => {
    it('should handle desktop and touch events identically', () => {
      const coordinates = { clientX: 200, clientY: 225 };

      // Desktop event
      dragBehavior.startDrag(note1, coordinates, 'desktop');
      const desktopShiftX = dragBehavior.shiftX;
      const desktopShiftY = dragBehavior.shiftY;
      dragBehavior.endDrag(coordinates, 'desktop');

      // Touch event with same coordinates (create new DragBehavior instance)
      const touchDragBehavior = new DragBehavior(
        mockEventBus,
        coordinateTransform,
      );
      touchDragBehavior.initialize();
      touchDragBehavior.startDrag(note1, coordinates, 'touch');
      const touchShiftX = touchDragBehavior.shiftX;
      const touchShiftY = touchDragBehavior.shiftY;

      // Should produce identical results
      expect(desktopShiftX).toBe(touchShiftX);
      expect(desktopShiftY).toBe(touchShiftY);
    });
  });
});
