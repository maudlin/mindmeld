// Test for delete/backspace bug when editing empty notes

import { DesktopAdapter } from '../../../../src/js/interactions/adapters/DesktopAdapter.js';

describe('DesktopAdapter - Delete Empty Note Bug', () => {
  let adapter;
  let mockCanvas;
  let mockEventBus;

  beforeEach(() => {
    // Mock canvas
    mockCanvas = document.createElement('div');
    mockCanvas.id = 'canvas';
    document.body.appendChild(mockCanvas);

    // Mock eventBus
    mockEventBus = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    };

    // Create adapter with mocked eventBus
    adapter = new DesktopAdapter();
    adapter.eventBus = mockEventBus;
    adapter.canvas = mockCanvas;

    // Initialize adapter to allow event emission
    adapter.isInitialized = true;
  });

  afterEach(() => {
    if (mockCanvas && mockCanvas.parentNode) {
      mockCanvas.parentNode.removeChild(mockCanvas);
    }
  });

  describe('isContentEmpty', () => {
    test('should correctly identify empty textarea', () => {
      const textarea = document.createElement('textarea');
      textarea.value = '';

      const result = adapter.isContentEmpty(textarea);

      expect(result).toBe(true);
    });

    test('should correctly identify non-empty textarea', () => {
      const textarea = document.createElement('textarea');
      textarea.value = 'Some content';

      const result = adapter.isContentEmpty(textarea);

      expect(result).toBe(false);
    });

    test('should handle note-content container with empty textarea', () => {
      const noteContent = document.createElement('div');
      const textarea = document.createElement('textarea');
      textarea.classList.add('edit-textarea');
      textarea.value = '';
      noteContent.appendChild(textarea);

      const result = adapter.isContentEmpty(noteContent);

      expect(result).toBe(true);
    });

    test('should handle elements with textContent', () => {
      const div = document.createElement('div');
      div.textContent = '';

      const result = adapter.isContentEmpty(div);

      expect(result).toBe(true);
    });
  });

  describe('handleKeyDown - Delete/Backspace on empty note', () => {
    let mockNote;
    let mockTextarea;

    beforeEach(() => {
      // Create a mock note structure
      mockNote = document.createElement('div');
      mockNote.classList.add('note');
      mockNote.id = 'test-note-1';

      mockTextarea = document.createElement('textarea');
      mockTextarea.classList.add('edit-textarea');
      mockTextarea.value = ''; // Empty content

      mockNote.appendChild(mockTextarea);
      mockCanvas.appendChild(mockNote);

      // Mock isEditingNoteContent to return true for our textarea
      adapter.isEditingNoteContent = jest.fn((element) => {
        return element === mockTextarea;
      });
    });

    test('should NOT delete note when backspace pressed on empty content (bug fix)', () => {
      const event = new KeyboardEvent('keydown', {
        key: 'Backspace',
        bubbles: true,
        cancelable: true,
      });

      // Set up event target
      Object.defineProperty(event, 'target', {
        value: mockTextarea,
        enumerable: true,
      });

      // Call handleKeyDown
      adapter.handleKeyDown(event);

      // After bug fix: Should NOT delete note when editing, even if empty
      expect(mockEventBus.emit).not.toHaveBeenCalledWith(
        'note.deleteWithConnections',
        expect.anything(),
      );

      // Should NOT trigger state save
      expect(mockEventBus.emit).not.toHaveBeenCalledWith('state.save');

      // Should NOT prevent default (allow normal backspace behavior in textarea)
      expect(event.defaultPrevented).toBe(false);
    });

    test('should NOT delete note when backspace pressed on non-empty content', () => {
      mockTextarea.value = 'Some content';

      const event = new KeyboardEvent('keydown', {
        key: 'Backspace',
        bubbles: true,
        cancelable: true,
      });

      Object.defineProperty(event, 'target', {
        value: mockTextarea,
        enumerable: true,
      });

      adapter.handleKeyDown(event);

      // Should NOT emit deletion events
      expect(mockEventBus.emit).not.toHaveBeenCalledWith(
        'note.deleteWithConnections',
        expect.anything(),
      );
      expect(mockEventBus.emit).not.toHaveBeenCalledWith('state.save');

      // Should NOT prevent default (allow normal backspace behavior)
      expect(event.defaultPrevented).toBe(false);
    });

    test('should NOT delete note when Delete key pressed on empty content (only Backspace)', () => {
      const event = new KeyboardEvent('keydown', {
        key: 'Delete',
        bubbles: true,
        cancelable: true,
      });

      Object.defineProperty(event, 'target', {
        value: mockTextarea,
        enumerable: true,
      });

      adapter.handleKeyDown(event);

      // Should NOT emit deletion events for Delete key
      expect(mockEventBus.emit).not.toHaveBeenCalledWith(
        'note.deleteWithConnections',
        expect.anything(),
      );
    });
  });
});
