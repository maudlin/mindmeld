/**
 * DragBehavior Integration Test Suite
 *
 * TDD foundation for DragBehavior integration with CoordinateTransform service.
 * Tests define clean coordinate handling without complex manual calculations.
 */

import { jest } from '@jest/globals';

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

// Mock CoordinateTransform service
const mockCoordinateTransform = {
  viewportToCanvas: jest.fn((x, y) => ({
    x: (x - 100) / 1.0, // Mock canvas offset and scale
    y: (y - 50) / 1.0,
  })),

  canvasToViewport: jest.fn((x, y) => ({
    x: x * 1.0 + 100,
    y: y * 1.0 + 50,
  })),

  elementToCanvas: jest.fn((element) => ({
    x: parseInt(element.style.left) || 0,
    y: parseInt(element.style.top) || 0,
  })),
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

describe('DragBehavior - CoordinateTransform Integration TDD', () => {
  let dragBehavior;
  let note1, note2, note3;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create test notes
    note1 = createMockNote('note-1', 100, 150);
    note2 = createMockNote('note-2', 200, 200);
    note3 = createMockNote('note-3', 300, 100);

    // Mock DragBehavior with coordinate service injection
    dragBehavior = {
      eventBus: mockEventBus,
      coordinateTransform: mockCoordinateTransform,
      noteManager: mockNoteManager,

      // State
      isDragging: false,
      dragState: null,
      shiftX: 0,
      shiftY: 0,
      selectedNotesOffsets: [],

      // Configuration
      config: {
        performance: {
          throttleDrag: true,
          batchUpdates: true,
        },
      },
    };
  });

  describe('Clean Coordinate API Contract', () => {
    describe('startDrag()', () => {
      it('should use service for all coordinate calculations', () => {
        const mockEvent = { clientX: 150, clientY: 175 };

        startDrag.call(dragBehavior, note1, mockEvent, 'desktop');

        // Should call coordinate service, not manual calculations
        expect(mockCoordinateTransform.viewportToCanvas).toHaveBeenCalledWith(
          150,
          175,
        );
        expect(mockCoordinateTransform.elementToCanvas).toHaveBeenCalledWith(
          note1,
        );

        // Should not contain manual rect calculations
        expect(note1.getBoundingClientRect).not.toHaveBeenCalled();
      });

      it('should calculate clean shift offsets using service', () => {
        const mockEvent = { clientX: 200, clientY: 200 };

        // Mock service responses
        mockCoordinateTransform.viewportToCanvas.mockReturnValue({
          x: 100,
          y: 150,
        });
        mockCoordinateTransform.elementToCanvas.mockReturnValue({
          x: 100,
          y: 150,
        });

        startDrag.call(dragBehavior, note1, mockEvent, 'desktop');

        // Should have clean shift calculations
        expect(dragBehavior.shiftX).toBe(0); // 100 - 100
        expect(dragBehavior.shiftY).toBe(0); // 150 - 150
        expect(dragBehavior.isDragging).toBe(true);
      });

      it('should handle multi-note drag with clean calculations', () => {
        const selectedNotes = [note1, note2, note3];
        mockNoteManager.getSelectedNotes.mockReturnValue(selectedNotes);

        // Mock element positions
        mockCoordinateTransform.elementToCanvas
          .mockReturnValueOnce({ x: 100, y: 150 }) // note1 (primary)
          .mockReturnValueOnce({ x: 200, y: 200 }) // note2
          .mockReturnValueOnce({ x: 300, y: 100 }); // note3

        const mockEvent = { clientX: 150, clientY: 175 };

        startDrag.call(dragBehavior, note1, mockEvent, 'desktop');

        // Should calculate clean relative offsets
        expect(dragBehavior.selectedNotesOffsets).toEqual([
          { note: note1, offsetX: 0, offsetY: 0 }, // Primary note
          { note: note2, offsetX: 100, offsetY: 50 }, // 200-100, 200-150
          { note: note3, offsetX: 200, offsetY: -50 }, // 300-100, 100-150
        ]);
      });
    });

    describe('updateDrag()', () => {
      beforeEach(() => {
        // Set up drag state
        dragBehavior.isDragging = true;
        dragBehavior.shiftX = 25;
        dragBehavior.shiftY = 25;
        dragBehavior.selectedNotesOffsets = [
          { note: note1, offsetX: 0, offsetY: 0 },
          { note: note2, offsetX: 100, offsetY: 50 },
        ];
      });

      it('should use service for position updates', () => {
        const mockEvent = { clientX: 250, clientY: 250 };

        updateDrag.call(dragBehavior, mockEvent, 'desktop');

        // Should use coordinate service for transformation
        expect(mockCoordinateTransform.viewportToCanvas).toHaveBeenCalledWith(
          250,
          250,
        );
      });

      it('should update note positions cleanly', () => {
        const mockEvent = { clientX: 250, clientY: 250 };

        // Mock service response
        mockCoordinateTransform.viewportToCanvas.mockReturnValue({
          x: 150,
          y: 200,
        });

        updateDrag.call(dragBehavior, mockEvent, 'desktop');

        // Should update note positions using clean calculations
        // Expected: canvasPos.x - shiftX + offsetX
        expect(note1.style.left).toBe('125px'); // 150 - 25 + 0
        expect(note1.style.top).toBe('175px'); // 200 - 25 + 0

        expect(note2.style.left).toBe('225px'); // 150 - 25 + 100
        expect(note2.style.top).toBe('225px'); // 200 - 25 + 50
      });

      it('should emit events with correct data', () => {
        const mockEvent = { clientX: 250, clientY: 250 };
        mockCoordinateTransform.viewportToCanvas.mockReturnValue({
          x: 150,
          y: 200,
        });

        updateDrag.call(dragBehavior, mockEvent, 'desktop');

        // Should emit note updates
        expect(mockEventBus.emit).toHaveBeenCalledWith('note.updated', {
          id: 'note-1',
          left: '125px',
          top: '175px',
        });
      });
    });

    describe('endDrag()', () => {
      beforeEach(() => {
        dragBehavior.isDragging = true;
        dragBehavior.dragState = { inputType: 'desktop' };
      });

      it('should clean up state properly', () => {
        const mockEvent = { clientX: 300, clientY: 300 };

        endDrag.call(dragBehavior, mockEvent, 'desktop');

        expect(dragBehavior.isDragging).toBe(false);
        expect(dragBehavior.dragState).toBeNull();
        expect(mockEventBus.emit).toHaveBeenCalledWith(
          'drag.ended',
          expect.any(Object),
        );
      });

      it('should handle missing end event gracefully', () => {
        endDrag.call(dragBehavior, null, 'desktop');

        // Should not throw and should clean up state
        expect(dragBehavior.isDragging).toBe(false);
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle coordinate service failures gracefully', () => {
      mockCoordinateTransform.viewportToCanvas.mockImplementation(() => {
        throw new Error('Coordinate transformation failed');
      });

      const mockEvent = { clientX: 150, clientY: 175 };

      expect(() =>
        startDrag.call(dragBehavior, note1, mockEvent, 'desktop'),
      ).not.toThrow();

      // Should not be in dragging state if coordinate service fails
      expect(dragBehavior.isDragging).toBe(false);
    });

    it('should handle invalid note elements', () => {
      const invalidNote = null;
      const mockEvent = { clientX: 150, clientY: 175 };

      expect(() =>
        startDrag.call(dragBehavior, invalidNote, mockEvent, 'desktop'),
      ).not.toThrow();

      expect(dragBehavior.isDragging).toBe(false);
    });

    it('should handle invalid event coordinates', () => {
      const mockEvent = { clientX: 'invalid', clientY: null };

      expect(() =>
        startDrag.call(dragBehavior, note1, mockEvent, 'desktop'),
      ).not.toThrow();

      expect(dragBehavior.isDragging).toBe(false);
    });
  });

  describe('Performance Integration', () => {
    it('should minimize coordinate service calls during drag', () => {
      // Start drag
      startDrag.call(
        dragBehavior,
        note1,
        { clientX: 150, clientY: 175 },
        'desktop',
      );

      // Multiple updates
      updateDrag.call(dragBehavior, { clientX: 160, clientY: 180 }, 'desktop');
      updateDrag.call(dragBehavior, { clientX: 170, clientY: 185 }, 'desktop');
      updateDrag.call(dragBehavior, { clientX: 180, clientY: 190 }, 'desktop');

      // Should call service efficiently (not excessively)
      const totalCalls =
        mockCoordinateTransform.viewportToCanvas.mock.calls.length;
      expect(totalCalls).toBe(4); // 1 start + 3 updates
    });

    it('should handle rapid drag updates without performance degradation', () => {
      startDrag.call(
        dragBehavior,
        note1,
        { clientX: 150, clientY: 175 },
        'desktop',
      );

      const startTime = performance.now();

      // Simulate rapid updates
      for (let i = 0; i < 100; i++) {
        updateDrag.call(
          dragBehavior,
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
      startDrag.call(dragBehavior, note1, coordinates, 'desktop');
      const desktopState = { ...dragBehavior };
      endDrag.call(dragBehavior, coordinates, 'desktop');

      // Reset
      dragBehavior.isDragging = false;
      dragBehavior.dragState = null;

      // Touch event with same coordinates
      startDrag.call(dragBehavior, note1, coordinates, 'touch');
      const touchState = { ...dragBehavior };

      // Should produce identical results
      expect(desktopState.shiftX).toBe(touchState.shiftX);
      expect(desktopState.shiftY).toBe(touchState.shiftY);
    });
  });
});

// Mock implementations defining the clean API we want to build
function startDrag(noteElement, event, inputType) {
  if (!noteElement || !event) {
    console.warn('DragBehavior: Invalid parameters for startDrag');
    return;
  }

  try {
    // Use coordinate service for all transformations
    const pointerCanvas = this.coordinateTransform.viewportToCanvas(
      event.clientX,
      event.clientY,
    );
    const noteCanvas = this.coordinateTransform.elementToCanvas(noteElement);

    // Clean shift calculations
    this.shiftX = pointerCanvas.x - noteCanvas.x;
    this.shiftY = pointerCanvas.y - noteCanvas.y;

    // Get selected notes for multi-drag
    const selectedNotes = this.noteManager.getSelectedNotes();

    // Calculate relative offsets using service
    this.selectedNotesOffsets = selectedNotes.map((note) => {
      const notePos = this.coordinateTransform.elementToCanvas(note);
      return {
        note,
        offsetX: notePos.x - noteCanvas.x,
        offsetY: notePos.y - noteCanvas.y,
      };
    });

    this.isDragging = true;
    this.dragState = { inputType };

    this.eventBus.emit('drag.started', {
      noteElement,
      inputType,
      startPosition: { x: event.clientX, y: event.clientY },
    });
  } catch (error) {
    console.error('DragBehavior: Failed to start drag:', error);
    this.isDragging = false;
  }
}

function updateDrag(event) {
  if (!this.isDragging || !event) {
    return;
  }

  try {
    // Use service for coordinate transformation
    const canvasPos = this.coordinateTransform.viewportToCanvas(
      event.clientX,
      event.clientY,
    );

    const offsetX = canvasPos.x - this.shiftX;
    const offsetY = canvasPos.y - this.shiftY;

    // Update all selected notes
    this.selectedNotesOffsets.forEach(
      ({ note, offsetX: relX, offsetY: relY }) => {
        const noteX = offsetX + relX;
        const noteY = offsetY + relY;

        // Update DOM position directly
        note.style.left = `${noteX}px`;
        note.style.top = `${noteY}px`;

        // Emit update event
        this.eventBus.emit('note.updated', {
          id: note.id,
          left: note.style.left,
          top: note.style.top,
        });
      },
    );
  } catch (error) {
    console.error('DragBehavior: Failed to update drag:', error);
  }
}

function endDrag(event, inputType) {
  if (!this.isDragging) {
    return;
  }

  try {
    const finalPosition = event ? { x: event.clientX, y: event.clientY } : null;

    this.isDragging = false;
    const savedInputType = this.dragState?.inputType || inputType;
    this.dragState = null;

    this.eventBus.emit('drag.ended', {
      finalPosition,
      inputType: savedInputType,
    });
  } catch (error) {
    console.error('DragBehavior: Failed to end drag:', error);
    // Force cleanup even on error
    this.isDragging = false;
    this.dragState = null;
  }
}
