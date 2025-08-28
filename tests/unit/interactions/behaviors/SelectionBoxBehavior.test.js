/**
 * SelectionBoxBehavior - Comprehensive Unit Tests
 *
 * Tests the unified selection box behavior that handles lasso selection operations
 * and multi-note selection coordination. Works with both desktop and touch input.
 */

import { SelectionBoxBehavior } from '../../../../src/js/interactions/behaviors/SelectionBoxBehavior.js';

describe('SelectionBoxBehavior', () => {
  let selectionBoxBehavior;
  let mockEventBus;
  let mockCanvas;
  let mockSelectionBox;

  beforeEach(() => {
    // Create mock event bus
    mockEventBus = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    };

    // Create mock canvas element
    mockCanvas = {
      id: 'canvas',
      appendChild: jest.fn(),
      removeChild: jest.fn(),
      getBoundingClientRect: jest.fn(() => ({
        left: 0,
        top: 0,
        width: 1000,
        height: 800,
      })),
    };

    // Create mock selection box element
    mockSelectionBox = {
      className: 'selection-box',
      style: {
        left: '0px',
        top: '0px',
        width: '0px',
        height: '0px',
        display: 'none',
      },
      remove: jest.fn(),
    };

    // Mock document.createElement for selection box
    global.document = global.document || {};
    global.document.createElement = jest.fn(() => mockSelectionBox);
    global.document.getElementById = jest.fn((id) => {
      if (id === 'canvas') return mockCanvas;
      return null;
    });

    selectionBoxBehavior = new SelectionBoxBehavior(mockEventBus);
  });

  describe('Initialization', () => {
    test('should create behavior with correct name', () => {
      expect(selectionBoxBehavior.name).toBe('SelectionBoxBehavior');
      expect(selectionBoxBehavior.isInitialized).toBe(false);
      expect(selectionBoxBehavior.isDrawingSelectionBox).toBe(false);
    });

    test('should initialize successfully', async () => {
      await selectionBoxBehavior.initialize();
      
      expect(selectionBoxBehavior.isInitialized).toBe(true);
    });

    test('should not initialize twice', async () => {
      await selectionBoxBehavior.initialize();
      const firstInitialized = selectionBoxBehavior.isInitialized;
      
      await selectionBoxBehavior.initialize();
      
      expect(firstInitialized).toBe(true);
      expect(selectionBoxBehavior.isInitialized).toBe(true);
    });
  });

  describe('Selection Box Drawing', () => {
    beforeEach(async () => {
      await selectionBoxBehavior.initialize();
    });

    test('should start selection box from desktop input', () => {
      const mockEvent = {
        clientX: 100,
        clientY: 200,
        preventDefault: jest.fn(),
      };

      selectionBoxBehavior.startSelectionBox(mockEvent, 'desktop');

      expect(selectionBoxBehavior.isDrawingSelectionBox).toBe(true);
      expect(mockCanvas.appendChild).toHaveBeenCalledWith(mockSelectionBox);
      expect(mockEventBus.emit).toHaveBeenCalledWith('interaction.start', {
        type: 'selection',
        behavior: selectionBoxBehavior,
      });
      expect(mockEventBus.emit).toHaveBeenCalledWith('selection.started', {
        startPosition: { x: 100, y: 200 },
        inputType: 'desktop',
      });
    });

    test('should start selection box from touch input', () => {
      const mockEvent = {
        clientX: 150,
        clientY: 250,
        preventDefault: jest.fn(),
      };

      selectionBoxBehavior.startSelectionBox(mockEvent, 'touch');

      expect(selectionBoxBehavior.isDrawingSelectionBox).toBe(true);
      expect(mockEventBus.emit).toHaveBeenCalledWith('selection.started', {
        startPosition: { x: 150, y: 250 },
        inputType: 'touch',
      });
    });

    test('should update selection box dimensions', () => {
      const startEvent = {
        clientX: 100,
        clientY: 200,
        preventDefault: jest.fn(),
      };

      const updateEvent = {
        clientX: 250,
        clientY: 350,
        preventDefault: jest.fn(),
      };

      selectionBoxBehavior.startSelectionBox(startEvent, 'desktop');
      selectionBoxBehavior.updateSelectionBox(updateEvent, 'desktop');

      expect(mockSelectionBox.style.left).toBe('100px');
      expect(mockSelectionBox.style.top).toBe('200px');
      expect(mockSelectionBox.style.width).toBe('150px');
      expect(mockSelectionBox.style.height).toBe('150px');
      expect(mockSelectionBox.style.display).toBe('block');
    });

    test('should handle negative selection dimensions', () => {
      const startEvent = {
        clientX: 250,
        clientY: 350,
        preventDefault: jest.fn(),
      };

      const updateEvent = {
        clientX: 100,
        clientY: 200,
        preventDefault: jest.fn(),
      };

      selectionBoxBehavior.startSelectionBox(startEvent, 'desktop');
      selectionBoxBehavior.updateSelectionBox(updateEvent, 'desktop');

      // Should handle reverse selection (dragging up/left)
      expect(mockSelectionBox.style.left).toBe('100px');
      expect(mockSelectionBox.style.top).toBe('200px');
      expect(mockSelectionBox.style.width).toBe('150px');
      expect(mockSelectionBox.style.height).toBe('150px');
    });

    test('should not update selection box when not drawing', () => {
      const mockEvent = {
        clientX: 200,
        clientY: 300,
        preventDefault: jest.fn(),
      };

      selectionBoxBehavior.updateSelectionBox(mockEvent, 'desktop');

      expect(mockSelectionBox.style.display).toBe('none');
    });

    test('should end selection box drawing', () => {
      const startEvent = {
        clientX: 100,
        clientY: 200,
        preventDefault: jest.fn(),
      };

      const endEvent = {
        clientX: 250,
        clientY: 350,
        preventDefault: jest.fn(),
      };

      selectionBoxBehavior.startSelectionBox(startEvent, 'desktop');
      selectionBoxBehavior.endSelectionBox(endEvent, 'desktop');

      expect(selectionBoxBehavior.isDrawingSelectionBox).toBe(false);
      expect(mockSelectionBox.remove).toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalledWith('selection.ended', {
        selectionBounds: {
          left: 100,
          top: 200,
          right: 250,
          bottom: 350,
          width: 150,
          height: 150,
        },
        selectedNotes: [],
        inputType: 'desktop',
      });
      expect(mockEventBus.emit).toHaveBeenCalledWith('interaction.end', {
        type: 'selection',
      });
    });

    test('should not end selection box when not drawing', () => {
      const mockEvent = {
        clientX: 200,
        clientY: 300,
        preventDefault: jest.fn(),
      };

      selectionBoxBehavior.endSelectionBox(mockEvent, 'desktop');

      expect(mockSelectionBox.remove).not.toHaveBeenCalled();
    });
  });

  describe('Note Detection', () => {
    let mockNote1, mockNote2, mockNote3;

    beforeEach(async () => {
      await selectionBoxBehavior.initialize();

      // Create mock notes
      mockNote1 = {
        id: 'note-1',
        getBoundingClientRect: () => ({ left: 50, top: 50, right: 150, bottom: 100 }),
      };
      mockNote2 = {
        id: 'note-2', 
        getBoundingClientRect: () => ({ left: 200, top: 150, right: 300, bottom: 200 }),
      };
      mockNote3 = {
        id: 'note-3',
        getBoundingClientRect: () => ({ left: 400, top: 400, right: 500, bottom: 450 }),
      };

      // Mock querySelectorAll to return our test notes
      global.document.querySelectorAll = jest.fn(() => [mockNote1, mockNote2, mockNote3]);
    });

    test('should detect notes within selection bounds', () => {
      const startEvent = {
        clientX: 0,
        clientY: 0,
        preventDefault: jest.fn(),
      };

      const endEvent = {
        clientX: 350,
        clientY: 250,
        preventDefault: jest.fn(),
      };

      selectionBoxBehavior.startSelectionBox(startEvent, 'desktop');
      selectionBoxBehavior.endSelectionBox(endEvent, 'desktop');

      // Should emit notes found within selection
      expect(mockEventBus.emit).toHaveBeenCalledWith('selection.ended', 
        expect.objectContaining({
          selectedNotes: [mockNote1, mockNote2],
        })
      );
    });

    test('should handle empty selection', () => {
      const startEvent = {
        clientX: 600,
        clientY: 600,
        preventDefault: jest.fn(),
      };

      const endEvent = {
        clientX: 700,
        clientY: 700,
        preventDefault: jest.fn(),
      };

      selectionBoxBehavior.startSelectionBox(startEvent, 'desktop');
      selectionBoxBehavior.endSelectionBox(endEvent, 'desktop');

      expect(mockEventBus.emit).toHaveBeenCalledWith('selection.ended', 
        expect.objectContaining({
          selectedNotes: [],
        })
      );
    });

    test('should update selection during drag', () => {
      const startEvent = {
        clientX: 0,
        clientY: 0,
        preventDefault: jest.fn(),
      };

      const updateEvent = {
        clientX: 175,
        clientY: 125,
        preventDefault: jest.fn(),
      };

      selectionBoxBehavior.startSelectionBox(startEvent, 'desktop');
      selectionBoxBehavior.updateSelectionBox(updateEvent, 'desktop');

      expect(mockEventBus.emit).toHaveBeenCalledWith('selection.updated', {
        currentBounds: {
          left: 0,
          top: 0,
          right: 175,
          bottom: 125,
          width: 175,
          height: 125,
        },
        selectedNotes: [mockNote1],
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await selectionBoxBehavior.initialize();
    });

    test('should handle null event gracefully', () => {
      expect(() => {
        selectionBoxBehavior.startSelectionBox(null, 'desktop');
      }).not.toThrow();

      expect(selectionBoxBehavior.isDrawingSelectionBox).toBe(false);
    });

    test('should handle missing coordinates', () => {
      const mockEvent = {
        preventDefault: jest.fn(),
        // Missing clientX, clientY
      };

      expect(() => {
        selectionBoxBehavior.startSelectionBox(mockEvent, 'desktop');
      }).not.toThrow();
    });

    test('should handle missing canvas element', () => {
      global.document.getElementById = jest.fn(() => null);

      expect(() => {
        selectionBoxBehavior.startSelectionBox({ clientX: 100, clientY: 200 }, 'desktop');
      }).not.toThrow();
    });
  });

  describe('Selection State Management', () => {
    beforeEach(async () => {
      await selectionBoxBehavior.initialize();
    });

    test('should prevent multiple concurrent selections', () => {
      const event1 = { clientX: 100, clientY: 200, preventDefault: jest.fn() };
      const event2 = { clientX: 300, clientY: 400, preventDefault: jest.fn() };

      selectionBoxBehavior.startSelectionBox(event1, 'desktop');
      const firstSelectionState = selectionBoxBehavior.isDrawingSelectionBox;

      // Try to start another selection
      selectionBoxBehavior.startSelectionBox(event2, 'desktop');

      expect(firstSelectionState).toBe(true);
      expect(selectionBoxBehavior.isDrawingSelectionBox).toBe(true);
      // Should only create one selection box
      expect(mockCanvas.appendChild).toHaveBeenCalledTimes(1);
    });

    test('should cancel active selection', () => {
      const mockEvent = {
        clientX: 100,
        clientY: 200,
        preventDefault: jest.fn(),
      };

      selectionBoxBehavior.startSelectionBox(mockEvent, 'desktop');
      selectionBoxBehavior.cancel();

      expect(selectionBoxBehavior.isDrawingSelectionBox).toBe(false);
      expect(selectionBoxBehavior.selectionBoxState).toBe(null);
      expect(mockSelectionBox.remove).toHaveBeenCalled();
    });

    test('should not cancel when not drawing', () => {
      expect(() => {
        selectionBoxBehavior.cancel();
      }).not.toThrow();

      expect(mockSelectionBox.remove).not.toHaveBeenCalled();
    });
  });

  describe('Behavior Lifecycle', () => {
    test('should destroy behavior cleanly', async () => {
      await selectionBoxBehavior.initialize();
      
      const mockEvent = {
        clientX: 100,
        clientY: 200,
        preventDefault: jest.fn(),
      };

      // Start a selection and then destroy
      selectionBoxBehavior.startSelectionBox(mockEvent, 'desktop');
      await selectionBoxBehavior.destroy();

      expect(selectionBoxBehavior.isDrawingSelectionBox).toBe(false);
      expect(selectionBoxBehavior.isInitialized).toBe(false);
      expect(selectionBoxBehavior.eventBus).toBe(null);
    });

    test('should handle destroy when not initialized', async () => {
      expect(() => {
        selectionBoxBehavior.destroy();
      }).not.toThrow();
    });
  });

  describe('Visual Selection Box', () => {
    beforeEach(async () => {
      await selectionBoxBehavior.initialize();
    });

    test('should create selection box with correct styles', () => {
      const mockEvent = {
        clientX: 100,
        clientY: 200,
        preventDefault: jest.fn(),
      };

      selectionBoxBehavior.startSelectionBox(mockEvent, 'desktop');

      expect(global.document.createElement).toHaveBeenCalledWith('div');
      expect(mockSelectionBox.className).toBe('selection-box');
      expect(mockCanvas.appendChild).toHaveBeenCalledWith(mockSelectionBox);
    });

    test('should remove selection box on end', () => {
      const startEvent = { clientX: 100, clientY: 200, preventDefault: jest.fn() };
      const endEvent = { clientX: 250, clientY: 350, preventDefault: jest.fn() };

      selectionBoxBehavior.startSelectionBox(startEvent, 'desktop');
      selectionBoxBehavior.endSelectionBox(endEvent, 'desktop');

      expect(mockSelectionBox.remove).toHaveBeenCalled();
    });

    test('should remove selection box on cancel', () => {
      const mockEvent = { clientX: 100, clientY: 200, preventDefault: jest.fn() };

      selectionBoxBehavior.startSelectionBox(mockEvent, 'desktop');
      selectionBoxBehavior.cancel();

      expect(mockSelectionBox.remove).toHaveBeenCalled();
    });
  });
});