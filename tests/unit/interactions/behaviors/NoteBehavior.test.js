/**
 * NoteBehavior - Comprehensive Unit Tests
 *
 * Tests the unified note interaction behavior that handles click detection,
 * edit mode requests, and selection logic for both normal and styled content.
 * Addresses bug where styled content couldn't be clicked to enter edit mode.
 */

import { NoteBehavior } from '../../../../src/js/interactions/behaviors/NoteBehavior.js';
import { NoteIdService } from '../../../../src/js/services/noteIdService.js';

describe('NoteBehavior', () => {
  let noteBehavior;
  let mockEventBus;
  let mockNoteElement;
  let mockNoteContent;

  beforeEach(() => {
    // Create mock event bus
    mockEventBus = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    };

    // Create mock note content element
    mockNoteContent = {
      id: 'note-content-123',
      tagName: 'DIV',
      className: 'note-content',
      classList: {
        contains: jest.fn(() => false),
        add: jest.fn(),
        remove: jest.fn(),
      },
      closest: jest.fn(),
      textContent: 'Test note content',
    };

    // Create mock note element
    mockNoteElement = {
      id: 'note-123',
      tagName: 'DIV',
      className: 'note',
      classList: {
        contains: jest.fn(() => false),
        add: jest.fn(),
        remove: jest.fn(),
      },
      querySelector: jest.fn(() => mockNoteContent),
      closest: jest.fn(),
    };

    // Set up DOM relationships
    mockNoteContent.closest.mockImplementation((selector) => {
      if (selector === '.note') return mockNoteElement;
      if (selector === '.note-content') return mockNoteContent;
      return null;
    });

    noteBehavior = new NoteBehavior(mockEventBus);
  });

  describe('Initialization', () => {
    test('should create behavior with correct name', () => {
      expect(noteBehavior.name).toBe('NoteBehavior');
      expect(noteBehavior.isInitialized).toBe(false);
    });

    test('should initialize successfully', async () => {
      await noteBehavior.initialize();

      expect(noteBehavior.isInitialized).toBe(true);
    });

    test('should not initialize twice', async () => {
      await noteBehavior.initialize();
      const firstInitialized = noteBehavior.isInitialized;

      await noteBehavior.initialize();

      expect(firstInitialized).toBe(true);
      expect(noteBehavior.isInitialized).toBe(true);
    });
  });

  describe('Note Click Handling', () => {
    beforeEach(async () => {
      await noteBehavior.initialize();
    });

    describe('Normal Content Clicks', () => {
      test('should handle click on normal note content', () => {
        const mockEvent = {
          target: mockNoteContent,
          clientX: 100,
          clientY: 200,
          composedPath: () => [mockNoteContent, mockNoteElement],
        };

        noteBehavior.handleNoteClick(mockNoteElement, mockEvent, 'desktop');

        expect(mockEventBus.emit).toHaveBeenCalledWith('note.requestEdit', {
          noteElement: mockNoteElement,
          behavior: noteBehavior,
          inputType: 'desktop',
          noteId: 'note-123',
        });
      });

      test('should handle click from touch input', () => {
        const mockEvent = {
          target: mockNoteContent,
          clientX: 100,
          clientY: 200,
          composedPath: () => [mockNoteContent, mockNoteElement],
        };

        noteBehavior.handleNoteClick(mockNoteElement, mockEvent, 'touch');

        expect(mockEventBus.emit).toHaveBeenCalledWith('note.requestEdit', {
          noteElement: mockNoteElement,
          behavior: noteBehavior,
          inputType: 'touch',
          noteId: 'note-123',
        });
      });
    });

    describe('Styled Content Clicks', () => {
      test('should handle click on bold text', () => {
        const mockStrongElement = {
          tagName: 'STRONG',
          textContent: 'Bold text',
          closest: jest.fn(() => mockNoteContent),
        };

        const mockEvent = {
          target: mockStrongElement,
          clientX: 100,
          clientY: 200,
          composedPath: () => [
            mockStrongElement,
            mockNoteContent,
            mockNoteElement,
          ],
        };

        noteBehavior.handleNoteClick(mockNoteElement, mockEvent, 'desktop');

        expect(mockEventBus.emit).toHaveBeenCalledWith('note.requestEdit', {
          noteElement: mockNoteElement,
          behavior: noteBehavior,
          inputType: 'desktop',
          noteId: 'note-123',
        });
      });

      test('should handle click on heading text', () => {
        const mockHeadingElement = {
          tagName: 'H1',
          textContent: 'Heading text',
          closest: jest.fn(() => mockNoteContent),
        };

        const mockEvent = {
          target: mockHeadingElement,
          clientX: 100,
          clientY: 200,
          composedPath: () => [
            mockHeadingElement,
            mockNoteContent,
            mockNoteElement,
          ],
        };

        noteBehavior.handleNoteClick(mockNoteElement, mockEvent, 'touch');

        expect(mockEventBus.emit).toHaveBeenCalledWith('note.requestEdit', {
          noteElement: mockNoteElement,
          behavior: noteBehavior,
          inputType: 'touch',
          noteId: 'note-123',
        });
      });

      test('should handle click on italic text', () => {
        const mockEmElement = {
          tagName: 'EM',
          textContent: 'Italic text',
          closest: jest.fn(() => mockNoteContent),
        };

        const mockEvent = {
          target: mockEmElement,
          clientX: 100,
          clientY: 200,
          composedPath: () => [mockEmElement, mockNoteContent, mockNoteElement],
        };

        noteBehavior.handleNoteClick(mockNoteElement, mockEvent, 'desktop');

        expect(mockEventBus.emit).toHaveBeenCalledWith('note.requestEdit', {
          noteElement: mockNoteElement,
          behavior: noteBehavior,
          inputType: 'desktop',
          noteId: 'note-123',
        });
      });

      test('should handle deeply nested styled content', () => {
        const mockSpanElement = {
          tagName: 'SPAN',
          textContent: 'Nested span',
          closest: jest.fn(() => mockNoteContent),
        };

        const mockStrongElement = {
          tagName: 'STRONG',
          contains: jest.fn(() => true),
        };

        const mockEvent = {
          target: mockSpanElement,
          clientX: 100,
          clientY: 200,
          composedPath: () => [
            mockSpanElement,
            mockStrongElement,
            mockNoteContent,
            mockNoteElement,
          ],
        };

        noteBehavior.handleNoteClick(mockNoteElement, mockEvent, 'desktop');

        expect(mockEventBus.emit).toHaveBeenCalledWith('note.requestEdit', {
          noteElement: mockNoteElement,
          behavior: noteBehavior,
          inputType: 'desktop',
          noteId: 'note-123',
        });
      });
    });

    describe('Edit Mode Detection', () => {
      test('should not request edit mode when note is already in edit mode', () => {
        mockNoteContent.classList.contains.mockImplementation(
          (className) => className === 'edit-mode',
        );

        const mockEvent = {
          target: mockNoteContent,
          clientX: 100,
          clientY: 200,
          composedPath: () => [mockNoteContent, mockNoteElement],
        };

        noteBehavior.handleNoteClick(mockNoteElement, mockEvent, 'desktop');

        expect(mockEventBus.emit).not.toHaveBeenCalledWith(
          'note.requestEdit',
          expect.any(Object),
        );
      });

      test('should request edit mode when note is not in edit mode', () => {
        mockNoteContent.classList.contains.mockImplementation(() => false);

        const mockEvent = {
          target: mockNoteContent,
          clientX: 100,
          clientY: 200,
          composedPath: () => [mockNoteContent, mockNoteElement],
        };

        noteBehavior.handleNoteClick(mockNoteElement, mockEvent, 'desktop');

        expect(mockEventBus.emit).toHaveBeenCalledWith('note.requestEdit', {
          noteElement: mockNoteElement,
          behavior: noteBehavior,
          inputType: 'desktop',
          noteId: 'note-123',
        });
      });
    });

    describe('Invalid Click Handling', () => {
      test('should handle click with null note element', () => {
        const mockEvent = {
          target: mockNoteContent,
          clientX: 100,
          clientY: 200,
          composedPath: () => [mockNoteContent],
        };

        expect(() => {
          noteBehavior.handleNoteClick(null, mockEvent, 'desktop');
        }).not.toThrow();

        expect(mockEventBus.emit).not.toHaveBeenCalled();
      });

      test('should handle click with no note content found', () => {
        mockNoteElement.querySelector.mockReturnValue(null);

        const mockEvent = {
          target: mockNoteElement,
          clientX: 100,
          clientY: 200,
          composedPath: () => [mockNoteElement],
        };

        noteBehavior.handleNoteClick(mockNoteElement, mockEvent, 'desktop');

        expect(mockEventBus.emit).not.toHaveBeenCalled();
      });
    });
  });

  describe('Note Selection', () => {
    beforeEach(async () => {
      await noteBehavior.initialize();
    });

    test('should handle single note selection', () => {
      noteBehavior.handleNoteSelection(mockNoteElement, false);

      expect(mockEventBus.emit).toHaveBeenCalledWith('note.selected', {
        noteElement: mockNoteElement,
        isMultiSelect: false,
        behavior: noteBehavior,
      });
    });

    test('should handle multi-note selection', () => {
      noteBehavior.handleNoteSelection(mockNoteElement, true);

      expect(mockEventBus.emit).toHaveBeenCalledWith('note.selected', {
        noteElement: mockNoteElement,
        isMultiSelect: true,
        behavior: noteBehavior,
      });
    });

    test('should handle null note element in selection', () => {
      expect(() => {
        noteBehavior.handleNoteSelection(null, false);
      }).not.toThrow();

      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });
  });

  describe('Edit Mode Request', () => {
    beforeEach(async () => {
      await noteBehavior.initialize();
    });

    test('should emit edit mode request event', () => {
      noteBehavior.requestEditMode(mockNoteElement);

      expect(mockEventBus.emit).toHaveBeenCalledWith('note.requestEdit', {
        noteElement: mockNoteElement,
        behavior: noteBehavior,
        inputType: 'unknown',
        noteId: 'note-123',
      });
    });

    test('should handle null note element in edit mode request', () => {
      expect(() => {
        noteBehavior.requestEditMode(null);
      }).not.toThrow();

      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });
  });

  describe('Behavior Lifecycle', () => {
    test('should cancel active interactions', () => {
      expect(() => {
        noteBehavior.cancel();
      }).not.toThrow();
    });

    test('should destroy behavior cleanly', async () => {
      await noteBehavior.initialize();

      await noteBehavior.destroy();

      expect(noteBehavior.isInitialized).toBe(false);
      expect(noteBehavior.eventBus).toBe(null);
    });

    test('should handle destroy when not initialized', async () => {
      expect(() => {
        noteBehavior.destroy();
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    beforeEach(async () => {
      await noteBehavior.initialize();
    });

    test('should handle complex DOM structures with multiple note content elements', () => {
      const mockSecondNoteContent = {
        className: 'note-content secondary',
        classList: { contains: jest.fn(() => false) },
        closest: jest.fn((selector) => {
          if (selector === '.note-content') return mockNoteContent;
          return null;
        }),
      };

      mockNoteElement.querySelector.mockImplementation((selector) => {
        if (selector === '.note-content') return mockNoteContent;
        return null;
      });

      const mockEvent = {
        target: mockSecondNoteContent,
        clientX: 100,
        clientY: 200,
        composedPath: () => [mockSecondNoteContent, mockNoteElement],
      };

      noteBehavior.handleNoteClick(mockNoteElement, mockEvent, 'desktop');

      expect(mockEventBus.emit).toHaveBeenCalledWith('note.requestEdit', {
        noteElement: mockNoteElement,
        behavior: noteBehavior,
        inputType: 'desktop',
        noteId: 'note-123',
      });
    });
  });

  // Note Creation Methods (Behavior Refactor)
  describe('Note Creation', () => {
    let mockCanvas;
    let mockDataProvider;

    beforeEach(async () => {
      await noteBehavior.initialize();

      // Reset ID service for each test
      NoteIdService.reset();

      // Create mock DataProvider
      mockDataProvider = {
        upsertNote: jest.fn(),
        deleteNote: jest.fn(),
      };

      // Mock DataProviderService
      const { DataProviderService } = await import(
        '../../../../src/js/services/DataProviderService.js'
      );
      jest
        .spyOn(DataProviderService, 'getInstance')
        .mockReturnValue(mockDataProvider);

      // Create mock canvas element
      mockCanvas = {
        tagName: 'DIV',
        id: 'canvas',
        appendChild: jest.fn(),
        querySelector: jest.fn(),
        querySelectorAll: jest.fn(() => []),
      };

      // Mock document.createElement
      global.document = {
        createElement: jest.fn((tagName) => {
          if (tagName === 'div') {
            return {
              tagName: 'DIV',
              className: '',
              appendChild: jest.fn(),
              querySelector: jest.fn(),
              style: {},
              dataset: {},
              classList: {
                add: jest.fn(),
                remove: jest.fn(),
                contains: jest.fn(() => false),
              },
              addEventListener: jest.fn(),
            };
          }
          return {};
        }),
        querySelectorAll: jest.fn(() => []),
      };
    });

    describe('createNoteAtPosition', () => {
      test('should create note at specified position with unique ID', () => {
        const mockEvent = {
          clientX: 150,
          clientY: 200,
        };

        const note = noteBehavior.createNoteAtPosition(mockCanvas, mockEvent);

        expect(note).toBeDefined();
        expect(note.id).toBe('1'); // First ID from NoteIdService
        expect(note.dataset.id).toBe('1');
        expect(mockCanvas.appendChild).toHaveBeenCalledWith(note);
        // Note: note.created event no longer emitted - handled by DataProvider pattern
      });

      test('should generate sequential unique IDs for multiple notes', () => {
        const mockEvent = { clientX: 100, clientY: 100 };

        const note1 = noteBehavior.createNoteAtPosition(mockCanvas, mockEvent);
        const note2 = noteBehavior.createNoteAtPosition(mockCanvas, mockEvent);
        const note3 = noteBehavior.createNoteAtPosition(mockCanvas, mockEvent);

        expect(note1.id).toBe('1');
        expect(note2.id).toBe('2');
        expect(note3.id).toBe('3');

        // Ensure all IDs are unique
        const ids = [note1.id, note2.id, note3.id];
        expect(new Set(ids).size).toBe(3);
      });

      test('should prevent ID collisions with existing notes', () => {
        // Simulate existing notes with IDs 1, 2, 5
        const existingNotes = [{ id: '1' }, { id: '2' }, { id: '5' }];

        noteBehavior.ensureUniqueIds(existingNotes);

        const mockEvent = { clientX: 100, clientY: 100 };
        const newNote = noteBehavior.createNoteAtPosition(
          mockCanvas,
          mockEvent,
        );

        expect(newNote.id).toBe('6'); // Should skip to 6, avoiding collision with 5
      });

      test('should handle null/undefined event gracefully', () => {
        expect(() => {
          noteBehavior.createNoteAtPosition(mockCanvas, null);
        }).not.toThrow();
      });

      test('should handle null/undefined canvas gracefully', () => {
        const mockEvent = { clientX: 100, clientY: 100 };

        expect(() => {
          noteBehavior.createNoteAtPosition(null, mockEvent);
        }).not.toThrow();
      });
    });

    describe('createNoteFromData', () => {
      test('should create note from data with specified ID', () => {
        const noteData = {
          id: '7',
          content: 'Test note content',
          left: '100px',
          top: '200px',
        };

        const note = noteBehavior.createNoteFromData(noteData, mockCanvas);

        expect(note.id).toBe('7');
        expect(note.dataset.id).toBe('7');
        expect(mockCanvas.appendChild).toHaveBeenCalledWith(note);
      });

      test('should handle compressed data format (import/export)', () => {
        const noteData = {
          i: 'a', // ID in compressed format
          c: 'Compressed note', // Content in compressed format
          p: [150, 250], // Position in compressed format
        };

        const note = noteBehavior.createNoteFromData(noteData, mockCanvas);

        expect(note.id).toBe('a');
        expect(note.dataset.id).toBe('a');
      });

      test('should not affect ID counter when creating from data', () => {
        const noteData = { id: 'z', content: 'High ID note' };

        noteBehavior.createNoteFromData(noteData, mockCanvas);

        // Next generated ID should still be sequential from counter
        const mockEvent = { clientX: 100, clientY: 100 };
        const newNote = noteBehavior.createNoteAtPosition(
          mockCanvas,
          mockEvent,
        );

        expect(newNote.id).toBe('1'); // Counter unaffected by createNoteFromData
      });

      test('should handle invalid note data gracefully', () => {
        expect(() => {
          noteBehavior.createNoteFromData(null, mockCanvas);
        }).not.toThrow();

        expect(() => {
          noteBehavior.createNoteFromData({}, mockCanvas);
        }).not.toThrow();
      });
    });

    describe('ensureUniqueIds', () => {
      test('should update ID service counter to prevent collisions', () => {
        const existingNotes = [
          { id: '1' },
          { id: '5' },
          { id: 'a' }, // 10 in decimal
        ];

        noteBehavior.ensureUniqueIds(existingNotes);

        const mockEvent = { clientX: 100, clientY: 100 };
        const newNote = noteBehavior.createNoteAtPosition(
          mockCanvas,
          mockEvent,
        );

        expect(newNote.id).toBe('b'); // 11 in decimal, avoiding collision with 'a'
      });

      test('should handle DOM elements from querySelectorAll', () => {
        const existingElements = [
          { id: '3', querySelector: jest.fn() },
          { id: '7', querySelector: jest.fn() },
        ];

        noteBehavior.ensureUniqueIds(existingElements);

        const mockEvent = { clientX: 100, clientY: 100 };
        const newNote = noteBehavior.createNoteAtPosition(
          mockCanvas,
          mockEvent,
        );

        expect(newNote.id).toBe('8'); // Next after 7
      });

      test('should handle empty array', () => {
        noteBehavior.ensureUniqueIds([]);

        const mockEvent = { clientX: 100, clientY: 100 };
        const newNote = noteBehavior.createNoteAtPosition(
          mockCanvas,
          mockEvent,
        );

        expect(newNote.id).toBe('1'); // Should start from 1
      });

      test('should handle invalid/null array', () => {
        expect(() => {
          noteBehavior.ensureUniqueIds(null);
        }).not.toThrow();

        expect(() => {
          noteBehavior.ensureUniqueIds(undefined);
        }).not.toThrow();
      });
    });

    describe('Integration with Legacy Factory', () => {
      test('should call DataProvider with integrated color data', () => {
        const mockEvent = { clientX: 100, clientY: 100 };

        noteBehavior.createNoteAtPosition(mockCanvas, mockEvent);

        expect(mockDataProvider.upsertNote).toHaveBeenCalledWith(
          {
            id: '1',
            content: '',
            pos: [expect.any(Number), expect.any(Number)],
            color: expect.any(String),
          },
          { origin: 'user' },
        );
      });

      test('should create DOM structure compatible with legacy system', () => {
        const mockEvent = { clientX: 100, clientY: 100 };

        const note = noteBehavior.createNoteAtPosition(mockCanvas, mockEvent);

        // Should have same structure as legacy factory
        expect(note.className).toContain('note');
        expect(typeof note.querySelector).toBe('function');
        expect(note.style.left).toBeDefined();
        expect(note.style.top).toBeDefined();
      });
    });

    describe('Error Handling', () => {
      test('should handle ID service errors gracefully', () => {
        // Mock ID service to throw error
        jest.spyOn(NoteIdService, 'generateNextId').mockImplementation(() => {
          throw new Error('ID generation failed');
        });

        const mockEvent = { clientX: 100, clientY: 100 };

        expect(() => {
          noteBehavior.createNoteAtPosition(mockCanvas, mockEvent);
        }).not.toThrow();

        // Restore original implementation
        NoteIdService.generateNextId.mockRestore();
      });

      test('should handle DOM creation errors gracefully', () => {
        // Mock document.createElement to fail
        document.createElement = jest.fn(() => {
          throw new Error('DOM creation failed');
        });

        const mockEvent = { clientX: 100, clientY: 100 };

        expect(() => {
          noteBehavior.createNoteAtPosition(mockCanvas, mockEvent);
        }).not.toThrow();
      });
    });
  });
});
