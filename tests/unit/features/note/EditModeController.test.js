/**
 * EditModeController Unit Tests
 *
 * Tests the unified controller for note edit/view mode transitions.
 * Verifies EventBus integration, state management, and markdown pipeline.
 */

import { editModeController } from '../../../../src/js/features/note/EditModeController.js';
import { eventBus } from '../../../../src/js/core/eventBus.js';
import {
  displayAsViewMode,
  displayAsEditMode,
  getCurrentMarkdownContent,
} from '../../../../src/js/features/note/editViewMode.js';

// Mock the editViewMode module
jest.mock('../../../../src/js/features/note/editViewMode.js', () => ({
  displayAsViewMode: jest.fn(),
  displayAsEditMode: jest.fn(),
  getCurrentMarkdownContent: jest.fn(),
}));

describe('EditModeController', () => {
  let mockNote;
  let mockNoteContent;

  beforeEach(() => {
    // Reset controller state
    editModeController.currentEditingNote = null;
    editModeController.state = 'VIEW';
    editModeController.initialized = false;

    // Clear all event listeners
    eventBus.off();

    // Create mock DOM elements
    mockNoteContent = document.createElement('div');
    mockNoteContent.className = 'note-content';
    mockNoteContent.textContent = 'Test note content';

    mockNote = document.createElement('div');
    mockNote.id = 'note-123';
    mockNote.className = 'note';
    mockNote.appendChild(mockNoteContent);

    document.body.appendChild(mockNote);

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up DOM
    document.body.innerHTML = '';

    // Clean up controller
    editModeController.cleanup();
  });

  describe('Initialization', () => {
    it('should initialize only once', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      editModeController.initialize();
      expect(editModeController.initialized).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        'EditModeController: Initialized',
      );

      // Try to initialize again
      editModeController.initialize();
      expect(warnSpy).toHaveBeenCalledWith(
        'EditModeController: Already initialized',
      );

      consoleSpy.mockRestore();
      warnSpy.mockRestore();
    });

    it('should set up event listeners on initialization', () => {
      const onSpy = jest.spyOn(eventBus, 'on');

      editModeController.initialize();

      expect(onSpy).toHaveBeenCalledWith(
        'note.requestEdit',
        expect.any(Function),
      );
      expect(onSpy).toHaveBeenCalledWith(
        'note.requestView',
        expect.any(Function),
      );
      expect(onSpy).toHaveBeenCalledWith(
        'canvas.clicked',
        expect.any(Function),
      );
      expect(onSpy).toHaveBeenCalledWith('note.selected', expect.any(Function));
      expect(onSpy).toHaveBeenCalledWith('note.deleted', expect.any(Function));
    });
  });

  describe('Edit Mode Entry', () => {
    beforeEach(() => {
      editModeController.initialize();
    });

    it('should enter edit mode when receiving requestEdit event', () => {
      getCurrentMarkdownContent.mockReturnValue('# Test Content');

      eventBus.emit('note.requestEdit', {
        noteId: 'note-123',
        noteElement: mockNote,
      });

      expect(editModeController.state).toBe('EDITING');
      expect(editModeController.currentEditingNote).toEqual({
        id: 'note-123',
        element: mockNote,
        contentElement: mockNoteContent,
      });
      expect(displayAsEditMode).toHaveBeenCalledWith(
        mockNoteContent,
        '# Test Content',
      );
      // Note: contentEditable is set by displayAsEditMode, not directly by controller
    });

    it('should ignore edit request if already editing same note', () => {
      getCurrentMarkdownContent.mockReturnValue('Test');

      // Enter edit mode
      eventBus.emit('note.requestEdit', {
        noteId: 'note-123',
        noteElement: mockNote,
      });

      const callCount = displayAsEditMode.mock.calls.length;

      // Try to edit same note again
      eventBus.emit('note.requestEdit', {
        noteId: 'note-123',
        noteElement: mockNote,
      });

      expect(displayAsEditMode).toHaveBeenCalledTimes(callCount);
    });

    it('should exit current edit when editing different note', () => {
      // Create second note
      const mockNote2 = document.createElement('div');
      mockNote2.id = 'note-456';
      const mockNoteContent2 = document.createElement('div');
      mockNoteContent2.className = 'note-content';
      mockNote2.appendChild(mockNoteContent2);

      // Mock different returns for different calls
      getCurrentMarkdownContent
        .mockReturnValueOnce('Content 1') // First note entry
        .mockReturnValueOnce('Content 1') // First note exit
        .mockReturnValueOnce('Content 2'); // Second note entry

      // Edit first note
      eventBus.emit('note.requestEdit', {
        noteId: 'note-123',
        noteElement: mockNote,
      });

      expect(editModeController.currentEditingNote.id).toBe('note-123');

      // Edit second note - should trigger exit of first
      eventBus.emit('note.requestEdit', {
        noteId: 'note-456',
        noteElement: mockNote2,
      });

      expect(displayAsViewMode).toHaveBeenCalledWith(
        mockNoteContent,
        'Content 1',
      );
      expect(editModeController.currentEditingNote.id).toBe('note-456');
    });

    it('should emit editModeEntered event', () => {
      const emitSpy = jest.spyOn(eventBus, 'emit');

      eventBus.emit('note.requestEdit', {
        noteId: 'note-123',
        noteElement: mockNote,
      });

      expect(emitSpy).toHaveBeenCalledWith('note.editModeEntered', {
        noteId: 'note-123',
        element: mockNote,
      });
    });
  });

  describe('Edit Mode Exit', () => {
    beforeEach(() => {
      editModeController.initialize();
      getCurrentMarkdownContent.mockReturnValue('Test content');

      // Enter edit mode first
      eventBus.emit('note.requestEdit', {
        noteId: 'note-123',
        noteElement: mockNote,
      });
    });

    it('should exit edit mode when receiving requestView event', () => {
      getCurrentMarkdownContent.mockReturnValue('Updated content');

      eventBus.emit('note.requestView', {
        noteId: 'note-123',
      });

      expect(editModeController.state).toBe('VIEW');
      expect(editModeController.currentEditingNote).toBeNull();
      expect(displayAsViewMode).toHaveBeenCalledWith(
        mockNoteContent,
        'Updated content',
      );
      expect(mockNote.hasAttribute('contenteditable')).toBe(false);
    });

    it('should save content when exiting edit mode', () => {
      const emitSpy = jest.spyOn(eventBus, 'emit');
      getCurrentMarkdownContent.mockReturnValue('New content');

      eventBus.emit('note.requestView', {});

      expect(emitSpy).toHaveBeenCalledWith('note.updated', {
        id: 'note-123',
        content: 'New content',
      });
      expect(emitSpy).toHaveBeenCalledWith('state.save');
    });

    it('should exit edit mode when canvas is clicked', () => {
      eventBus.emit('canvas.clicked');

      expect(editModeController.state).toBe('VIEW');
      expect(editModeController.currentEditingNote).toBeNull();
    });

    it('should exit edit mode when different note is selected', () => {
      eventBus.emit('note.selected', { id: 'note-456' });

      expect(editModeController.state).toBe('VIEW');
      expect(editModeController.currentEditingNote).toBeNull();
    });

    it('should not exit edit mode when same note is selected', () => {
      eventBus.emit('note.selected', { id: 'note-123' });

      expect(editModeController.state).toBe('EDITING');
      expect(editModeController.currentEditingNote).not.toBeNull();
    });

    it('should emit editModeExited event', () => {
      const emitSpy = jest.spyOn(eventBus, 'emit');

      eventBus.emit('note.requestView', {});

      expect(emitSpy).toHaveBeenCalledWith('note.editModeExited', {
        noteId: 'note-123',
        element: mockNote,
      });
    });
  });

  describe('Blur Handling', () => {
    beforeEach(() => {
      editModeController.initialize();
      getCurrentMarkdownContent.mockReturnValue('Test');
    });

    it.skip('should exit edit mode on blur after delay (DISABLED - handled by adapters)', () => {
      // Blur handling is now done through adapters emitting note.requestView events
      // This test is obsolete as direct blur handling is disabled in favor of click-outside
      expect(true).toBe(true); // Dummy assertion
    });

    it('should not exit on internal focus change', () => {
      const internalElement = document.createElement('input');
      mockNote.appendChild(internalElement);

      eventBus.emit('note.requestEdit', {
        noteId: 'note-123',
        noteElement: mockNote,
      });

      // Simulate blur with internal target
      const blurEvent = new FocusEvent('blur', {
        relatedTarget: internalElement,
      });
      mockNote.dispatchEvent(blurEvent);

      expect(editModeController.state).toBe('EDITING');
    });
  });

  describe('State Management', () => {
    beforeEach(() => {
      editModeController.initialize();
    });

    it('should track state transitions correctly', () => {
      expect(editModeController.getState()).toBe('VIEW');

      // Enter edit mode
      eventBus.emit('note.requestEdit', {
        noteId: 'note-123',
        noteElement: mockNote,
      });
      expect(editModeController.getState()).toBe('EDITING');

      // Exit edit mode
      eventBus.emit('note.requestView', {});
      expect(editModeController.getState()).toBe('VIEW');
    });

    it('should prevent operations during TRANSITIONING state', () => {
      editModeController.state = 'TRANSITIONING';

      eventBus.emit('note.requestEdit', {
        noteId: 'note-123',
        noteElement: mockNote,
      });

      expect(displayAsEditMode).not.toHaveBeenCalled();
    });

    it('should handle note deletion while editing', () => {
      eventBus.emit('note.requestEdit', {
        noteId: 'note-123',
        noteElement: mockNote,
      });

      eventBus.emit('note.deleted', { id: 'note-123' });

      expect(editModeController.currentEditingNote).toBeNull();
      expect(editModeController.state).toBe('VIEW');
    });
  });

  describe('Helper Methods', () => {
    beforeEach(() => {
      editModeController.initialize();
    });

    it('should check if note is being edited', () => {
      expect(editModeController.isEditing('note-123')).toBe(false);

      eventBus.emit('note.requestEdit', {
        noteId: 'note-123',
        noteElement: mockNote,
      });

      expect(editModeController.isEditing('note-123')).toBe(true);
      expect(editModeController.isEditing('note-456')).toBe(false);
    });
  });

  describe('Cleanup', () => {
    it('should clean up resources properly', () => {
      editModeController.initialize();

      eventBus.emit('note.requestEdit', {
        noteId: 'note-123',
        noteElement: mockNote,
      });

      const offSpy = jest.spyOn(eventBus, 'off');

      editModeController.cleanup();

      expect(editModeController.initialized).toBe(false);
      expect(editModeController.currentEditingNote).toBeNull();
      expect(editModeController.state).toBe('VIEW');
      expect(offSpy).toHaveBeenCalledTimes(5); // All event types
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      editModeController.initialize();
    });

    it('should handle missing note element gracefully', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      eventBus.emit('note.requestEdit', {
        noteId: 'note-123',
        noteElement: null,
      });

      expect(warnSpy).toHaveBeenCalledWith(
        'EditModeController: No note element provided',
      );
      expect(editModeController.state).toBe('VIEW');

      warnSpy.mockRestore();
    });

    it('should handle missing note content element', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const emptyNote = document.createElement('div');
      emptyNote.id = 'empty-note';

      eventBus.emit('note.requestEdit', {
        noteId: 'empty-note',
        noteElement: emptyNote,
      });

      expect(warnSpy).toHaveBeenCalledWith(
        'EditModeController: No note content element found',
      );
      expect(editModeController.state).toBe('VIEW');

      warnSpy.mockRestore();
    });

    it('should handle empty content gracefully', () => {
      mockNoteContent.textContent = '';
      getCurrentMarkdownContent.mockReturnValue('');

      eventBus.emit('note.requestEdit', {
        noteId: 'note-123',
        noteElement: mockNote,
      });

      expect(displayAsEditMode).toHaveBeenCalledWith(mockNoteContent, '');
      expect(editModeController.state).toBe('EDITING');
    });
  });
});
