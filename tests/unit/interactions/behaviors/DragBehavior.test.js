/**
 * DragBehavior - Comprehensive Unit Tests
 *
 * Tests the unified drag behavior that handles single-note dragging,
 * multi-note dragging, and connection updates. Works with both desktop and touch input.
 */

import { DragBehavior } from '../../../../src/js/interactions/behaviors/DragBehavior.js';

describe('DragBehavior', () => {
  let dragBehavior;
  let mockEventBus;
  let mockNoteElement;
  let mockNoteElement2;

  beforeEach(() => {
    // Create canvas element for coordinate transformations
    const canvas = document.createElement('div');
    canvas.id = 'canvas';
    document.body.appendChild(canvas);

    // Create mock event bus
    mockEventBus = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    };

    // Create mock note elements
    mockNoteElement = {
      id: 'note-123',
      className: 'note',
      style: {
        left: '100px',
        top: '200px',
        transform: '',
      },
      getBoundingClientRect: jest.fn(() => ({
        left: 100,
        top: 200,
        width: 150,
        height: 100,
      })),
    };

    mockNoteElement2 = {
      id: 'note-456',
      className: 'note selected',
      style: {
        left: '300px',
        top: '400px',
        transform: '',
      },
      getBoundingClientRect: jest.fn(() => ({
        left: 300,
        top: 400,
        width: 150,
        height: 100,
      })),
    };

    dragBehavior = new DragBehavior(mockEventBus);
  });

  afterEach(() => {
    // Clean up canvas element
    const canvas = document.getElementById('canvas');
    if (canvas) {
      document.body.removeChild(canvas);
    }
  });

  describe('Initialization', () => {
    test('should create behavior with correct name', () => {
      expect(dragBehavior.name).toBe('DragBehavior');
      expect(dragBehavior.isInitialized).toBe(false);
      expect(dragBehavior.isDragging).toBe(false);
    });

    test('should initialize successfully', async () => {
      await dragBehavior.initialize();

      expect(dragBehavior.isInitialized).toBe(true);
    });

    test('should not initialize twice', async () => {
      await dragBehavior.initialize();
      const firstInitialized = dragBehavior.isInitialized;

      await dragBehavior.initialize();

      expect(firstInitialized).toBe(true);
      expect(dragBehavior.isInitialized).toBe(true);
    });
  });

  describe('Single Note Drag', () => {
    beforeEach(async () => {
      await dragBehavior.initialize();
    });

    test('should start drag operation from desktop input', () => {
      const mockEvent = {
        clientX: 150,
        clientY: 250,
        preventDefault: jest.fn(),
      };

      dragBehavior.startDrag(mockNoteElement, mockEvent, 'desktop');

      expect(dragBehavior.isDragging).toBe(true);
      expect(mockEventBus.emit).toHaveBeenCalledWith('interaction.start', {
        type: 'drag',
        behavior: dragBehavior,
      });
      expect(mockEventBus.emit).toHaveBeenCalledWith('drag.started', {
        noteElement: mockNoteElement,
        inputType: 'desktop',
        startPosition: { x: 150, y: 250 },
      });
    });

    test('should start drag operation from touch input', () => {
      const mockEvent = {
        clientX: 150,
        clientY: 250,
        preventDefault: jest.fn(),
      };

      dragBehavior.startDrag(mockNoteElement, mockEvent, 'touch');

      expect(dragBehavior.isDragging).toBe(true);
      expect(mockEventBus.emit).toHaveBeenCalledWith('interaction.start', {
        type: 'drag',
        behavior: dragBehavior,
      });
      expect(mockEventBus.emit).toHaveBeenCalledWith('drag.started', {
        noteElement: mockNoteElement,
        inputType: 'touch',
        startPosition: { x: 150, y: 250 },
      });
    });

    test('should update drag position', () => {
      const startEvent = {
        clientX: 150,
        clientY: 250,
        preventDefault: jest.fn(),
      };

      const updateEvent = {
        clientX: 200,
        clientY: 300,
        preventDefault: jest.fn(),
      };

      dragBehavior.startDrag(mockNoteElement, startEvent, 'desktop');
      dragBehavior.updateDrag(updateEvent, 'desktop');

      expect(mockEventBus.emit).toHaveBeenCalledWith('drag.updated', {
        deltaX: 50,
        deltaY: 50,
        currentPosition: { x: 200, y: 300 },
      });
    });

    test('should end drag operation', () => {
      const startEvent = {
        clientX: 150,
        clientY: 250,
        preventDefault: jest.fn(),
      };

      const endEvent = {
        clientX: 200,
        clientY: 300,
        preventDefault: jest.fn(),
      };

      dragBehavior.startDrag(mockNoteElement, startEvent, 'desktop');
      dragBehavior.endDrag(endEvent, 'desktop');

      expect(dragBehavior.isDragging).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith('drag.ended', {
        finalDelta: { x: 50, y: 50 },
        inputType: 'desktop',
      });
      expect(mockEventBus.emit).toHaveBeenCalledWith('interaction.end', {
        type: 'drag',
      });
    });

    test('should not update drag when not dragging', () => {
      const mockEvent = {
        clientX: 200,
        clientY: 300,
        preventDefault: jest.fn(),
      };

      dragBehavior.updateDrag(mockEvent, 'desktop');

      expect(mockEventBus.emit).not.toHaveBeenCalledWith(
        'drag.updated',
        expect.any(Object),
      );
    });

    test('should not end drag when not dragging', () => {
      const mockEvent = {
        clientX: 200,
        clientY: 300,
        preventDefault: jest.fn(),
      };

      dragBehavior.endDrag(mockEvent, 'desktop');

      expect(mockEventBus.emit).not.toHaveBeenCalledWith(
        'drag.ended',
        expect.any(Object),
      );
    });
  });

  describe('Multi-Note Drag', () => {
    beforeEach(async () => {
      await dragBehavior.initialize();
    });

    test('should handle multi-note drag start', () => {
      const mockEvent = {
        clientX: 150,
        clientY: 250,
        preventDefault: jest.fn(),
      };

      const selectedNotes = [mockNoteElement, mockNoteElement2];

      dragBehavior.startDrag(mockNoteElement, mockEvent, 'desktop', {
        selectedNotes,
      });

      expect(dragBehavior.isDragging).toBe(true);
      expect(mockEventBus.emit).toHaveBeenCalledWith('drag.started', {
        noteElement: mockNoteElement,
        inputType: 'desktop',
        startPosition: { x: 150, y: 250 },
        selectedNotes: selectedNotes,
        isMultiNoteDrag: true,
      });
    });

    test('should calculate relative offsets for multi-note drag', () => {
      const mockEvent = {
        clientX: 150,
        clientY: 250,
        preventDefault: jest.fn(),
      };

      const selectedNotes = [mockNoteElement, mockNoteElement2];

      dragBehavior.startDrag(mockNoteElement, mockEvent, 'desktop', {
        selectedNotes,
      });

      // Should emit drag started with offset calculations
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'drag.started',
        expect.objectContaining({
          selectedNotes: selectedNotes,
          isMultiNoteDrag: true,
        }),
      );
    });
  });

  describe('Drag State Management', () => {
    beforeEach(async () => {
      await dragBehavior.initialize();
    });

    test('should prevent multiple concurrent drags', () => {
      const mockEvent1 = {
        clientX: 150,
        clientY: 250,
        preventDefault: jest.fn(),
      };

      const mockEvent2 = {
        clientX: 200,
        clientY: 300,
        preventDefault: jest.fn(),
      };

      dragBehavior.startDrag(mockNoteElement, mockEvent1, 'desktop');
      const firstDragState = dragBehavior.isDragging;

      // Try to start another drag
      dragBehavior.startDrag(mockNoteElement2, mockEvent2, 'desktop');

      expect(firstDragState).toBe(true);
      expect(dragBehavior.isDragging).toBe(true);
      // Should only emit start event once
      expect(mockEventBus.emit).toHaveBeenCalledTimes(2); // interaction.start + drag.started
    });

    test('should cancel active drag', () => {
      const mockEvent = {
        clientX: 150,
        clientY: 250,
        preventDefault: jest.fn(),
      };

      dragBehavior.startDrag(mockNoteElement, mockEvent, 'desktop');
      dragBehavior.cancel();

      expect(dragBehavior.isDragging).toBe(false);
      expect(dragBehavior.dragState).toBe(null);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await dragBehavior.initialize();
    });

    test('should handle null note element', () => {
      const mockEvent = {
        clientX: 150,
        clientY: 250,
        preventDefault: jest.fn(),
      };

      expect(() => {
        dragBehavior.startDrag(null, mockEvent, 'desktop');
      }).not.toThrow();

      expect(dragBehavior.isDragging).toBe(false);
      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });

    test('should handle invalid event', () => {
      expect(() => {
        dragBehavior.startDrag(mockNoteElement, null, 'desktop');
      }).not.toThrow();

      expect(dragBehavior.isDragging).toBe(false);
    });

    test('should handle missing coordinates in event', () => {
      const mockEvent = {
        preventDefault: jest.fn(),
        // Missing clientX, clientY
      };

      expect(() => {
        dragBehavior.startDrag(mockNoteElement, mockEvent, 'desktop');
      }).not.toThrow();
    });
  });

  describe('Connection Update Coordination', () => {
    beforeEach(async () => {
      await dragBehavior.initialize();
    });

    test('should emit connection update events during drag', () => {
      const startEvent = {
        clientX: 150,
        clientY: 250,
        preventDefault: jest.fn(),
      };

      const updateEvent = {
        clientX: 200,
        clientY: 300,
        preventDefault: jest.fn(),
      };

      dragBehavior.startDrag(mockNoteElement, startEvent, 'desktop');
      dragBehavior.updateDrag(updateEvent, 'desktop');

      // Should emit both drag update and connection update
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'drag.updated',
        expect.any(Object),
      );
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'connection.updateNeeded',
        {
          noteElement: mockNoteElement,
          deltaX: 50,
          deltaY: 50,
        },
      );
    });
  });

  describe('Behavior Lifecycle', () => {
    test('should destroy behavior cleanly', async () => {
      await dragBehavior.initialize();

      const mockEvent = {
        clientX: 150,
        clientY: 250,
        preventDefault: jest.fn(),
      };

      // Start a drag and then destroy
      dragBehavior.startDrag(mockNoteElement, mockEvent, 'desktop');
      await dragBehavior.destroy();

      expect(dragBehavior.isDragging).toBe(false);
      expect(dragBehavior.isInitialized).toBe(false);
      expect(dragBehavior.eventBus).toBe(null);
    });

    test('should handle destroy when not initialized', async () => {
      expect(() => {
        dragBehavior.destroy();
      }).not.toThrow();
    });
  });

  describe('Touch-Specific Behavior', () => {
    beforeEach(async () => {
      await dragBehavior.initialize();
    });

    test('should handle touch drag with proper event prevention', () => {
      const mockTouchEvent = {
        clientX: 150,
        clientY: 250,
        preventDefault: jest.fn(),
        type: 'touchstart',
      };

      dragBehavior.startDrag(mockNoteElement, mockTouchEvent, 'touch');

      expect(mockTouchEvent.preventDefault).toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'drag.started',
        expect.objectContaining({
          inputType: 'touch',
        }),
      );
    });
  });
});
