/**
 * NoteBehavior - Comprehensive Unit Tests
 *
 * Tests the unified note interaction behavior that handles click detection,
 * edit mode requests, and selection logic for both normal and styled content.
 * Addresses MM-183 bug where styled content couldn't be clicked to enter edit mode.
 */

import { NoteBehavior } from '../../../../src/js/interactions/behaviors/NoteBehavior.js';

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
        });
      });
    });

    describe('Styled Content Clicks (MM-183 Bug Fix)', () => {
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

    test('should handle clicks on note borders/padding', () => {
      // Mock noteElement doesn't have closest method, but this simulates click on note itself
      const mockNoteElementForClick = {
        ...mockNoteElement,
        tagName: 'DIV',
      };

      const mockEvent = {
        target: mockNoteElementForClick,
        clientX: 100,
        clientY: 200,
        composedPath: () => [mockNoteElementForClick],
      };

      // Note element itself clicked, should find note content
      noteBehavior.handleNoteClick(mockNoteElement, mockEvent, 'desktop');

      expect(mockEventBus.emit).toHaveBeenCalledWith('note.requestEdit', {
        noteElement: mockNoteElement,
        behavior: noteBehavior,
        inputType: 'desktop',
      });
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
      });
    });
  });
});
