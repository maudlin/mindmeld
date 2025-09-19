// tests/unit/features/note/noteDeletion.integration.test.js
// Integration tests for NoteDeletion DataProvider migration

import { jest } from '@jest/globals';

describe('NoteDeletion DataProvider Integration Tests', () => {
  let noteDeletion;
  let DataProviderService;
  let mockDataProviderService;
  let mockDeleteConnectionsByNote;
  let mockConnectionManager;
  let mockNoteManager;

  beforeEach(async () => {
    // Reset modules
    jest.resetModules();

    // Mock DataProviderService
    mockDataProviderService = {
      deleteNote: jest.fn(),
    };

    DataProviderService = {
      getInstance: jest.fn(() => mockDataProviderService),
    };

    // Mock connection utilities
    mockDeleteConnectionsByNote = jest.fn();
    mockConnectionManager = {
      updateConnections: jest.fn(),
    };

    // Mock noteManager
    mockNoteManager = {
      getSelectedNotes: jest.fn(() => []),
    };

    // Mock the imports
    jest.doMock('../../../../src/js/services/DataProviderService.js', () => ({
      DataProviderService,
    }));
    jest.doMock('../../../../src/js/features/connection/connection.js', () => ({
      deleteConnectionsByNote: mockDeleteConnectionsByNote,
    }));
    jest.doMock(
      '../../../../src/js/features/connection/connectionManager.js',
      () => ({
        connectionManager: mockConnectionManager,
      }),
    );
    jest.doMock('../../../../src/js/services/noteManager.js', () => ({
      noteManager: mockNoteManager,
    }));

    // Import after mocking
    const module = await import(
      '../../../../src/js/features/note/noteDeletion.js'
    );
    noteDeletion = module;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    document.body.innerHTML = '';
  });

  describe('DataProvider Integration - deleteNoteWithConnections', () => {
    test('should use DataProviderService for note deletion', () => {
      // Setup DOM
      document.body.innerHTML = '<div id="canvas"></div>';
      const canvas = document.getElementById('canvas');

      // Setup mock note
      const mockNote = {
        id: 'test-note-1',
        remove: jest.fn(),
      };

      // Execute function
      noteDeletion.deleteNoteWithConnections(mockNote, canvas);

      // Verify DataProviderService is used for note deletion
      expect(DataProviderService.getInstance).toHaveBeenCalled();
      expect(mockDataProviderService.deleteNote).toHaveBeenCalledWith(
        'test-note-1',
        { origin: 'user' },
      );

      // Verify connection cleanup still works
      expect(mockDeleteConnectionsByNote).toHaveBeenCalledWith(mockNote);
      expect(mockConnectionManager.updateConnections).toHaveBeenCalledWith(
        mockNote,
        canvas,
      );

      // Verify DOM cleanup still works
      expect(mockNote.remove).toHaveBeenCalled();
    });

    test('should handle DataProviderService errors gracefully', () => {
      // Setup DOM
      document.body.innerHTML = '<div id="canvas"></div>';
      const canvas = document.getElementById('canvas');

      // Setup error scenario
      mockDataProviderService.deleteNote.mockImplementation(() => {
        throw new Error('Provider deletion failed');
      });

      const mockNote = {
        id: 'test-note-1',
        remove: jest.fn(),
      };

      // Should not throw - error should be handled gracefully
      expect(() => {
        noteDeletion.deleteNoteWithConnections(mockNote, canvas);
      }).not.toThrow();

      // Connection cleanup should still happen
      expect(mockDeleteConnectionsByNote).toHaveBeenCalledWith(mockNote);
      expect(mockNote.remove).toHaveBeenCalled();
    });

    test('should call DataProviderService with correct origin parameter', () => {
      // Setup DOM
      document.body.innerHTML = '<div id="canvas"></div>';
      const canvas = document.getElementById('canvas');

      const mockNote = {
        id: 'test-note-abc',
        remove: jest.fn(),
      };

      noteDeletion.deleteNoteWithConnections(mockNote, canvas);

      // Verify origin is set to 'user' for user-initiated deletions
      expect(mockDataProviderService.deleteNote).toHaveBeenCalledWith(
        'test-note-abc',
        { origin: 'user' },
      );
    });
  });

  describe('DataProvider Integration - deleteNote (multiple notes)', () => {
    test('should use DataProviderService for multiple note deletion', () => {
      // Setup DOM
      document.body.innerHTML = '<div id="canvas"></div>';

      // Setup multiple selected notes
      const mockNotes = [
        { id: 'note-1', remove: jest.fn() },
        { id: 'note-2', remove: jest.fn() },
        { id: 'note-3', remove: jest.fn() },
      ];

      mockNoteManager.getSelectedNotes.mockReturnValue(mockNotes);

      // Execute function
      noteDeletion.deleteNote();

      // Verify DataProviderService is called for each note
      expect(DataProviderService.getInstance).toHaveBeenCalled();
      expect(mockDataProviderService.deleteNote).toHaveBeenCalledTimes(3);
      expect(mockDataProviderService.deleteNote).toHaveBeenCalledWith(
        'note-1',
        { origin: 'user' },
      );
      expect(mockDataProviderService.deleteNote).toHaveBeenCalledWith(
        'note-2',
        { origin: 'user' },
      );
      expect(mockDataProviderService.deleteNote).toHaveBeenCalledWith(
        'note-3',
        { origin: 'user' },
      );

      // Verify all notes are removed from DOM
      mockNotes.forEach((note) => {
        expect(note.remove).toHaveBeenCalled();
      });

      // Verify connection cleanup for each note
      expect(mockDeleteConnectionsByNote).toHaveBeenCalledTimes(3);
      expect(mockConnectionManager.updateConnections).toHaveBeenCalledTimes(3);
    });

    test('should handle empty selection gracefully', () => {
      mockNoteManager.getSelectedNotes.mockReturnValue([]);

      expect(() => noteDeletion.deleteNote()).not.toThrow();

      // No DataProvider calls should be made
      expect(mockDataProviderService.deleteNote).not.toHaveBeenCalled();
      expect(mockDeleteConnectionsByNote).not.toHaveBeenCalled();
    });

    test('should continue deleting other notes if one fails', () => {
      // Setup DOM
      document.body.innerHTML = '<div id="canvas"></div>';

      const mockNotes = [
        { id: 'note-1', remove: jest.fn() },
        { id: 'note-2', remove: jest.fn() },
        { id: 'note-3', remove: jest.fn() },
      ];

      mockNoteManager.getSelectedNotes.mockReturnValue(mockNotes);

      // Make second note deletion fail
      mockDataProviderService.deleteNote.mockImplementation((id) => {
        if (id === 'note-2') {
          throw new Error('Deletion failed');
        }
      });

      // Should not throw
      expect(() => noteDeletion.deleteNote()).not.toThrow();

      // All three notes should still be processed
      expect(mockDataProviderService.deleteNote).toHaveBeenCalledTimes(3);
      expect(mockDeleteConnectionsByNote).toHaveBeenCalledTimes(3);

      // All notes should be removed from DOM even if provider deletion fails
      mockNotes.forEach((note) => {
        expect(note.remove).toHaveBeenCalled();
      });
    });
  });

  describe('Behavioral Compatibility', () => {
    test('should maintain same function signatures', () => {
      // Verify deleteNoteWithConnections signature
      expect(typeof noteDeletion.deleteNoteWithConnections).toBe('function');
      expect(noteDeletion.deleteNoteWithConnections.length).toBe(2); // note, canvas

      // Verify deleteNote signature
      expect(typeof noteDeletion.deleteNote).toBe('function');
      expect(noteDeletion.deleteNote.length).toBe(0); // no parameters
    });

    test('should maintain DOM manipulation behavior', () => {
      // Setup DOM
      document.body.innerHTML = '<div id="canvas"></div>';
      const canvas = document.getElementById('canvas');

      const mockNote = {
        id: 'test-note',
        remove: jest.fn(),
      };

      noteDeletion.deleteNoteWithConnections(mockNote, canvas);

      // DOM cleanup should happen regardless of DataProvider success/failure
      expect(mockNote.remove).toHaveBeenCalled();
    });

    test('should maintain connection cleanup behavior', () => {
      // Setup DOM
      document.body.innerHTML = '<div id="canvas"></div>';
      const canvas = document.getElementById('canvas');

      const mockNote = {
        id: 'test-note',
        remove: jest.fn(),
      };

      noteDeletion.deleteNoteWithConnections(mockNote, canvas);

      // Connection cleanup should happen regardless of DataProvider success/failure
      expect(mockDeleteConnectionsByNote).toHaveBeenCalledWith(mockNote);
      expect(mockConnectionManager.updateConnections).toHaveBeenCalledWith(
        mockNote,
        canvas,
      );
    });
  });

  describe('Error Resilience', () => {
    test('should be resilient to DataProviderService initialization failures', () => {
      // Mock DataProviderService to fail during getInstance
      DataProviderService.getInstance.mockImplementation(() => {
        throw new Error('Service initialization failed');
      });

      // Setup DOM and note
      document.body.innerHTML = '<div id="canvas"></div>';
      const canvas = document.getElementById('canvas');
      const mockNote = {
        id: 'test-note',
        remove: jest.fn(),
      };

      // Should not throw
      expect(() => {
        noteDeletion.deleteNoteWithConnections(mockNote, canvas);
      }).not.toThrow();

      // Connection and DOM cleanup should still work
      expect(mockDeleteConnectionsByNote).toHaveBeenCalledWith(mockNote);
      expect(mockNote.remove).toHaveBeenCalled();
    });

    test('should handle missing canvas element gracefully', () => {
      // Don't setup canvas in DOM
      document.body.innerHTML = '';

      const mockNote = {
        id: 'test-note',
        remove: jest.fn(),
      };

      // Should not throw
      expect(() => {
        noteDeletion.deleteNoteWithConnections(mockNote, null);
      }).not.toThrow();

      // DataProvider deletion should still be called
      expect(mockDataProviderService.deleteNote).toHaveBeenCalledWith(
        'test-note',
        { origin: 'user' },
      );
    });
  });

  describe('API Contract Verification', () => {
    test('should call DataProviderService with exact expected parameters', () => {
      // Setup DOM
      document.body.innerHTML = '<div id="canvas"></div>';
      const canvas = document.getElementById('canvas');

      const mockNote = {
        id: 'precise-test-id',
        remove: jest.fn(),
      };

      noteDeletion.deleteNoteWithConnections(mockNote, canvas);

      // Verify exact API contract
      expect(mockDataProviderService.deleteNote).toHaveBeenCalledWith(
        'precise-test-id',
        { origin: 'user' },
      );
      expect(mockDataProviderService.deleteNote).toHaveBeenCalledTimes(1);
    });

    test('should use singleton pattern correctly', () => {
      // Setup
      document.body.innerHTML = '<div id="canvas"></div>';
      const canvas = document.getElementById('canvas');

      const mockNote1 = { id: 'note-1', remove: jest.fn() };
      const mockNote2 = { id: 'note-2', remove: jest.fn() };

      // Call twice
      noteDeletion.deleteNoteWithConnections(mockNote1, canvas);
      noteDeletion.deleteNoteWithConnections(mockNote2, canvas);

      // getInstance should be called for each operation
      expect(DataProviderService.getInstance).toHaveBeenCalledTimes(2);
    });
  });
});
