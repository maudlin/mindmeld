/**
 * Multiple Note Deletion Tests
 *
 * Tests for V1 regression fix - ensuring multiple selected notes
 * can be deleted with Delete key and delete button clicks.
 */
import { deleteNote } from '../../../../src/js/features/note/noteDeletion.js';
import { createDeleteButton } from '../../../../src/js/features/note/deleteButton.js';
import { noteManager } from '../../../../src/js/services/noteManager.js';
import { eventBus } from '../../../../src/js/core/eventBus.js';

// Mock dependencies
jest.mock('../../../../src/js/services/noteManager.js');
jest.mock('../../../../src/js/data/dataStore.js');
jest.mock('../../../../src/js/features/connection/connection.js');
jest.mock('../../../../src/js/features/connection/connectionManager.js');
jest.mock('../../../../src/js/core/eventBus.js');

describe('Multiple Note Deletion', () => {
  let mockNotes;

  beforeEach(() => {
    // Set up DOM
    document.body.innerHTML = '<div id="canvas"></div>';

    // Create mock notes
    mockNotes = [
      { id: 'note-1', remove: jest.fn() },
      { id: 'note-2', remove: jest.fn() },
      { id: 'note-3', remove: jest.fn() },
    ];

    // Clear mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Single Note Deletion', () => {
    test('should delete single selected note', () => {
      noteManager.getSelectedNotes.mockReturnValue([mockNotes[0]]);

      deleteNote();

      expect(mockNotes[0].remove).toHaveBeenCalledTimes(1);
      expect(mockNotes[1].remove).not.toHaveBeenCalled();
      expect(mockNotes[2].remove).not.toHaveBeenCalled();
    });
  });

  describe('Multiple Note Deletion - Fixed', () => {
    test('should delete all selected notes', () => {
      noteManager.getSelectedNotes.mockReturnValue([
        mockNotes[0],
        mockNotes[1],
        mockNotes[2],
      ]);

      deleteNote();

      // All selected notes should be deleted
      expect(mockNotes[0].remove).toHaveBeenCalledTimes(1);
      expect(mockNotes[1].remove).toHaveBeenCalledTimes(1);
      expect(mockNotes[2].remove).toHaveBeenCalledTimes(1);
    });

    test('should delete two selected notes', () => {
      noteManager.getSelectedNotes.mockReturnValue([
        mockNotes[1],
        mockNotes[2],
      ]);

      deleteNote();

      expect(mockNotes[0].remove).not.toHaveBeenCalled();
      expect(mockNotes[1].remove).toHaveBeenCalledTimes(1);
      expect(mockNotes[2].remove).toHaveBeenCalledTimes(1);
    });
  });

  describe('No Selection', () => {
    test('should handle no selected notes gracefully', () => {
      noteManager.getSelectedNotes.mockReturnValue([]);

      expect(() => deleteNote()).not.toThrow();

      mockNotes.forEach((note) => {
        expect(note.remove).not.toHaveBeenCalled();
      });
    });
  });

  describe('Delete Button Integration', () => {
    let mockNote;
    let deleteButton;

    beforeEach(() => {
      // Create a mock note element
      mockNote = document.createElement('div');
      mockNote.id = 'note-1';
      document.body.appendChild(mockNote);

      // Create delete button
      createDeleteButton(mockNote);
      deleteButton = mockNote.querySelector('.shared-delete-button');

      // Reset eventBus mock
      eventBus.emit.mockClear();
    });

    afterEach(() => {
      if (mockNote.parentNode) {
        mockNote.parentNode.removeChild(mockNote);
      }
    });

    test('should delete single note when no other notes selected', () => {
      noteManager.getSelectedNotes.mockReturnValue([]);

      // Click the delete button
      deleteButton.click();

      // Should emit event for single note deletion
      expect(eventBus.emit).toHaveBeenCalledWith('note.deleteWithConnections', {
        note: mockNote,
        canvas: expect.any(Object),
      });
    });

    test('should delete all selected notes when multiple are selected', () => {
      noteManager.getSelectedNotes.mockReturnValue([
        mockNotes[0],
        mockNotes[1],
      ]);

      // Click the delete button
      deleteButton.click();

      // Should emit notes.deleteSelected event for multi-delete
      expect(eventBus.emit).toHaveBeenCalledWith('notes.deleteSelected');

      // Should NOT call individual note remove directly (that's handled by the event handler)
      expect(mockNotes[0].remove).not.toHaveBeenCalled();
      expect(mockNotes[1].remove).not.toHaveBeenCalled();
      expect(mockNotes[2].remove).not.toHaveBeenCalled();
    });
  });
});
