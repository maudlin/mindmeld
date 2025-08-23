/**
 * TouchAdapter - Edit Mode Integration Tests
 *
 * Tests the TouchAdapter's integration with EditModeController for mobile edit mode functionality.
 * Tests double-tap for edit mode entry and touch-outside for exit.
 */

import { TouchAdapter } from '../../../../src/js/interactions/adapters/TouchAdapter.js';
import { eventBus } from '../../../../src/js/core/eventBus.js';

// Mock dependencies
jest.mock('../../../../src/js/interactions/gestures/GestureRecognizer.js');
jest.mock('../../../../src/js/services/noteManager.js');
jest.mock('../../../../src/js/features/zoom/zoomManager.js');
jest.mock('../../../../src/js/features/connection/connectionManager.js');
jest.mock('../../../../src/js/data/observableState.js');

describe('TouchAdapter - Edit Mode Integration', () => {
  let touchAdapter;
  let mockCanvas;
  let mockEventBus;

  beforeEach(() => {
    // Mock DOM elements
    mockCanvas = {
      id: 'canvas',
      classList: { contains: jest.fn(() => false) },
      closest: jest.fn(() => null),
      getBoundingClientRect: jest.fn(() => ({ left: 0, top: 0 })),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      appendChild: jest.fn(),
      setPointerCapture: jest.fn(),
      releasePointerCapture: jest.fn(),
    };

    global.document = {
      getElementById: jest.fn((id) => (id === 'canvas' ? mockCanvas : null)),
      createElement: jest.fn(() => ({
        id: '',
        style: {},
        classList: { add: jest.fn(), remove: jest.fn() },
        remove: jest.fn(),
      })),
      querySelectorAll: jest.fn(() => []),
      body: {
        classList: { add: jest.fn(), remove: jest.fn() },
      },
    };

    // Create fresh TouchAdapter instance
    touchAdapter = new TouchAdapter();

    // Set eventBus without calling full init
    touchAdapter.eventBus = eventBus;
    touchAdapter.isInitialized = true;

    // Mock the gesture recognizer for clean testing
    touchAdapter.gestureRecognizer = {
      initialize: jest.fn(),
      destroy: jest.fn(),
      emitTap: jest.fn(),
      emitDoubleTap: jest.fn(),
      emitLongPress: jest.fn(),
      emitDragStart: jest.fn(),
      emitDragMove: jest.fn(),
      emitDragEnd: jest.fn(),
      emitPinchStart: jest.fn(),
      emitPinchMove: jest.fn(),
      emitPinchEnd: jest.fn(),
    };

    touchAdapter.canvas = mockCanvas;

    // Spy on eventBus emit
    mockEventBus = jest.spyOn(eventBus, 'emit');
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockEventBus.mockRestore();
  });

  describe('Double-Tap for Edit Mode Entry', () => {
    it('should emit note.requestEdit when double-tapping a note', () => {
      // Mock note element
      const mockNote = {
        id: 'note-123',
        classList: {
          contains: jest.fn((className) => 
            className === 'note' || className === 'selected'
          ),
        },
        closest: jest.fn(() => null),
        querySelector: jest.fn(() => ({
          classList: { contains: jest.fn(() => false) },
        })),
      };

      const mockTouch = {
        currentX: 100,
        currentY: 100,
        identifier: 0,
      };

      // Mock getTouchTarget to return the note
      touchAdapter.getTouchTarget = jest.fn(() => ({ target: mockNote }));

      // Mock noteManager methods
      const mockNoteManager = require('../../../../src/js/services/noteManager.js');
      mockNoteManager.noteManager.clearSelections = jest.fn();
      mockNoteManager.noteManager.selectNote = jest.fn();

      // Call handleDoubleTap
      touchAdapter.handleDoubleTap(mockTouch);

      // Verify edit request was emitted
      expect(mockEventBus).toHaveBeenCalledWith('note.requestEdit', expect.objectContaining({
        noteId: 'note-123',
        noteElement: mockNote,
        _gesture: 'doubletap',
      }));

      // Verify note selection change was emitted
      expect(mockEventBus).toHaveBeenCalledWith('note.selection.changed');
    });

    it('should ensure note is selected before requesting edit', () => {
      // Mock unselected note
      const mockNote = {
        id: 'note-123',
        classList: {
          contains: jest.fn((className) => className === 'note'), // Not selected
        },
        closest: jest.fn(() => null),
        querySelector: jest.fn(() => ({
          classList: { contains: jest.fn(() => false) },
        })),
      };

      const mockTouch = {
        currentX: 100,
        currentY: 100,
        identifier: 0,
      };

      touchAdapter.getTouchTarget = jest.fn(() => ({ target: mockNote }));

      const mockNoteManager = require('../../../../src/js/services/noteManager.js');
      mockNoteManager.noteManager.clearSelections = jest.fn();
      mockNoteManager.noteManager.selectNote = jest.fn();

      touchAdapter.handleDoubleTap(mockTouch);

      // Verify note was selected
      expect(mockNoteManager.noteManager.clearSelections).toHaveBeenCalled();
      expect(mockNoteManager.noteManager.selectNote).toHaveBeenCalledWith(mockNote);

      // Verify edit request was still emitted
      expect(mockEventBus).toHaveBeenCalledWith('note.requestEdit', expect.objectContaining({
        noteId: 'note-123',
        noteElement: mockNote,
        _gesture: 'doubletap',
      }));
    });

    it('should create note on double-tap canvas (existing behavior preserved)', () => {
      const mockTouch = {
        currentX: 150,
        currentY: 150,
        identifier: 0,
      };

      touchAdapter.getTouchTarget = jest.fn(() => ({ target: mockCanvas }));
      touchAdapter.isClickOnCanvas = jest.fn(() => true);

      touchAdapter.handleDoubleTap(mockTouch);

      // Verify note creation was emitted
      expect(mockEventBus).toHaveBeenCalledWith('note.createAtPosition', expect.objectContaining({
        canvas: mockCanvas,
        event: expect.objectContaining({
          clientX: 150,
          clientY: 150,
          type: 'doubletap',
        }),
        _gesture: 'doubletap',
      }));

      expect(mockEventBus).toHaveBeenCalledWith('state.save', expect.any(Object));
    });
  });

  describe('Touch-Outside for Edit Mode Exit', () => {
    it('should emit canvas.clicked when tapping canvas', () => {
      const mockTouch = {
        currentX: 200,
        currentY: 200,
      };

      touchAdapter.getTouchTarget = jest.fn(() => ({ target: mockCanvas }));
      touchAdapter.isClickOnCanvas = jest.fn(() => true);

      // Mock methods called during canvas tap
      touchAdapter.clearAllJiggleAnimations = jest.fn();
      touchAdapter.clearConnectionMode = jest.fn();

      const mockNoteManager = require('../../../../src/js/services/noteManager.js');
      mockNoteManager.noteManager.clearSelections = jest.fn();

      touchAdapter.handleTap(mockTouch);

      // Verify canvas.clicked was emitted for EditModeController
      expect(mockEventBus).toHaveBeenCalledWith('canvas.clicked', expect.objectContaining({ _gesture: 'tap' }));

      // Verify other cleanup was performed
      expect(mockNoteManager.noteManager.clearSelections).toHaveBeenCalled();
      expect(mockEventBus).toHaveBeenCalledWith('note.selection.changed', expect.any(Object));
      expect(mockEventBus).toHaveBeenCalledWith('interaction.cancel', expect.objectContaining({ _gesture: 'tap' }));
    });

    it('should not emit canvas.clicked when tapping notes or other elements', () => {
      const mockNote = {
        classList: { contains: jest.fn(() => true) }, // Is a note
        closest: jest.fn(() => null),
      };

      const mockTouch = {
        currentX: 100,
        currentY: 100,
      };

      touchAdapter.getTouchTarget = jest.fn(() => ({ target: mockNote }));
      touchAdapter.handleNoteSelection = jest.fn();

      touchAdapter.handleTap(mockTouch);

      // Verify canvas.clicked was NOT emitted
      expect(mockEventBus).not.toHaveBeenCalledWith('canvas.clicked', expect.any(Object));

      // But note selection was handled
      expect(touchAdapter.handleNoteSelection).toHaveBeenCalledWith(mockNote);
    });
  });

  describe('Event Integration', () => {
    it('should preserve all existing touch functionality while adding edit mode', () => {
      // This test ensures we didn't break existing functionality
      
      // Test connection mode functionality still works
      const mockConnector = {
        classList: { 
          contains: jest.fn(() => true), // Is ghost connector
          add: jest.fn(),
          remove: jest.fn()
        },
        closest: jest.fn(() => ({
          id: 'note-connector-parent',
          classList: { add: jest.fn(), remove: jest.fn() }
        })),
      };

      touchAdapter.getTouchTarget = jest.fn(() => ({ target: mockConnector }));
      touchAdapter.handleGhostConnectorTap = jest.fn();
      touchAdapter.clearConnectionMode = jest.fn();

      const mockTouch = { currentX: 100, currentY: 100 };
      touchAdapter.handleTap(mockTouch);

      expect(touchAdapter.handleGhostConnectorTap).toHaveBeenCalledWith(mockConnector);

      // Test note selection still works
      const mockNote = {
        classList: { contains: jest.fn(() => true) },
        closest: jest.fn(() => null),
      };

      touchAdapter.getTouchTarget = jest.fn(() => ({ target: mockNote }));
      touchAdapter.handleNoteSelection = jest.fn();

      touchAdapter.handleTap(mockTouch);

      expect(touchAdapter.handleNoteSelection).toHaveBeenCalledWith(mockNote);
    });
  });
});