/**
 * Page Refresh Persistence Tests
 *
 * Tests the critical issue where markdown content becomes corrupted during page refreshes.
 * Reproduces the bug: MD -> HTML elements -> stripped text across refreshes.
 */

import {
  saveNotesToStorage,
  loadNotesFromStorage,
} from '../../../src/js/data/canonicalStorage.js';
import { defangToPlainText } from '../../../src/js/features/markdown/defangPipeline.js';
import { renderMarkdown } from '../../../src/js/features/markdown/markdownRenderer.js';
import {
  displayAsViewMode,
  getCurrentMarkdownContent,
} from '../../../src/js/features/note/editViewMode.js';

// Mock localStorage
const mockLocalStorage = {
  data: {},
  getItem: jest.fn((key) => mockLocalStorage.data[key] || null),
  setItem: jest.fn((key, value) => {
    mockLocalStorage.data[key] = value;
  }),
  removeItem: jest.fn((key) => {
    delete mockLocalStorage.data[key];
  }),
  clear: jest.fn(() => {
    mockLocalStorage.data = {};
  }),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('Page Refresh Persistence Issue', () => {
  let mockNote;

  beforeEach(() => {
    // Clear localStorage
    mockLocalStorage.clear();

    // Create realistic mock note content element
    const createMockNoteContent = (initialContent = '', isHtml = false) => ({
      innerHTML: isHtml ? initialContent : '',
      textContent: !isHtml
        ? initialContent
        : initialContent.replace(/<[^>]*>/g, ''),
      dataset: {},
      contentEditable: 'false',
      setAttribute: jest.fn((attr, value) => {
        if (attr.startsWith('data-')) {
          const key = attr.replace('data-', '');
          this.dataset[key] = value;
        }
      }),
      getAttribute: jest.fn((attr) => {
        if (attr.startsWith('data-')) {
          const key = attr.replace('data-', '');
          return this.dataset[key];
        }
        return null;
      }),
    });

    // Create mock note element
    mockNote = {
      id: 'note-123',
      querySelector: jest.fn(() => createMockNoteContent()),
      classList: {
        contains: jest.fn(() => false),
        add: jest.fn(),
        remove: jest.fn(),
      },
      style: {
        left: '100px',
        top: '200px',
      },
    };

    // Mock DOM
    global.document = {
      createElement: jest.fn(() => ({
        innerHTML: '',
        textContent: '',
        classList: { add: jest.fn(), remove: jest.fn() },
        appendChild: jest.fn(),
        setAttribute: jest.fn(),
        getAttribute: jest.fn(),
      })),
      querySelectorAll: jest.fn(() => [mockNote]),
      getElementById: jest.fn(() => null),
    };

    jest.clearAllMocks();
  });

  describe('Markdown Persistence Corruption Bug', () => {
    it('should reproduce the manual testing refresh corruption bug', () => {
      const originalMarkdown = '# H1';

      // Step 1: Simulate creating and saving a note with markdown
      const notes = [
        {
          id: 'note-123',
          content: originalMarkdown,
          left: 100,
          top: 200,
        },
      ];

      // Save using canonical storage (what actually happens)
      saveNotesToStorage(notes);
      console.log('Step 1 - Saved notes:', notes);

      // Step 2: Simulate first page load - load from storage and display
      const loadedData = loadNotesFromStorage();
      console.log('Step 2 - Loaded from storage:', loadedData);

      expect(loadedData.notes).toHaveLength(1);
      expect(loadedData.notes[0].content).toBe(originalMarkdown);

      // Simulate creating DOM element from loaded data (what NoteService does)
      const noteContent = {
        innerHTML: '',
        textContent: '',
        dataset: {},
        contentEditable: 'false',
        classList: {
          add: jest.fn(),
          remove: jest.fn(),
          contains: jest.fn(() => false),
        },
        setAttribute: jest.fn((attr, value) => {
          if (attr === 'data-markdown') {
            noteContent.dataset.markdown = value;
          }
        }),
      };

      // This is what happens when notes are loaded and displayed
      displayAsViewMode(noteContent, loadedData.notes[0].content);

      console.log('Step 2 - After display:', {
        innerHTML: noteContent.innerHTML,
        dataset: noteContent.dataset,
      });

      // Step 3: First refresh - what gets re-saved?
      // This is where the bug might occur - if something incorrectly saves the HTML

      // Simulate what might happen if the system incorrectly extracts content
      const potentialCorruptedContent = noteContent.innerHTML; // This would be HTML
      console.log(
        'Step 3 - Potentially corrupted content:',
        potentialCorruptedContent,
      );

      if (
        potentialCorruptedContent &&
        potentialCorruptedContent !== originalMarkdown
      ) {
        // If the system saves HTML instead of markdown, this is the bug
        const corruptedNotes = [
          {
            id: 'note-123',
            content: potentialCorruptedContent, // BUG: HTML instead of markdown
            left: 100,
            top: 200,
          },
        ];

        saveNotesToStorage(corruptedNotes);
        console.log(
          'Step 3 - Saved corrupted content:',
          potentialCorruptedContent,
        );

        // Step 4: Second refresh - load the corrupted HTML and see what happens
        const secondLoadedNotes = loadNotesFromStorage();
        console.log('Step 4 - Loaded corrupted notes:', secondLoadedNotes);

        // The canonical storage should defang HTML to plain text
        const secondNote = secondLoadedNotes.notes[0];
        console.log('Step 4 - Content after processing:', secondNote.content);

        // This is where "H1" comes from - HTML gets stripped to text
        // eslint-disable-next-line jest/no-conditional-expect
        expect(secondNote.content).toBe('H1'); // This demonstrates the bug
        // eslint-disable-next-line jest/no-conditional-expect
        expect(secondNote.content).not.toBe(originalMarkdown); // Original is lost
      }
    });

    it('should identify where content corruption occurs during note processing', () => {
      const originalMarkdown = '# Header\n**Bold text**';

      // Test each step of the pipeline independently
      console.log('Original:', originalMarkdown);

      // Step 1: Test defang pipeline
      const defanged = defangToPlainText(originalMarkdown, false);
      console.log('After defang:', defanged);
      expect(defanged).toBe(originalMarkdown); // Should preserve markdown

      // Step 2: Test rendering
      const rendered = renderMarkdown(defanged);
      console.log('After render:', rendered);
      expect(rendered).toContain('<h1>Header</h1>');
      expect(rendered).toContain('<strong>Bold text</strong>');

      // Step 3: Test if HTML gets defanged when it shouldn't be
      const defangedHtml = defangToPlainText(rendered, true); // isHtml=true
      console.log('HTML defanged:', defangedHtml);
      // This should strip HTML and return plain text - this is the likely source of "H1"
      expect(defangedHtml).toBe('Header Bold text');
    });

    it('should test the critical getCurrentMarkdownContent function', () => {
      // This function is critical - it determines what content gets saved

      // Test with note in edit mode (should return textContent)
      const editModeNote = {
        innerHTML: '<h1>Header</h1>',
        textContent: '# Header',
        dataset: { markdown: '# Header' },
        contentEditable: 'true',
        getAttribute: jest.fn(() => 'true'),
        classList: {
          contains: jest.fn(() => true), // Simulates edit-mode class
        },
      };

      const editModeContent = getCurrentMarkdownContent(editModeNote);
      console.log('Edit mode content:', editModeContent);
      expect(editModeContent).toBe('# Header'); // Should return textContent

      // Test with note in view mode (should return dataset.markdown)
      const viewModeNote = {
        innerHTML: '<h1>Header</h1>',
        textContent: 'Header',
        dataset: { markdown: '# Header' },
        contentEditable: 'false',
        getAttribute: jest.fn((attr) => {
          if (attr === 'data-markdown') return '# Header';
          if (attr === 'contenteditable') return 'false';
          return null;
        }),
        classList: {
          contains: jest.fn(() => false), // Not in edit-mode
        },
      };

      const viewModeContent = getCurrentMarkdownContent(viewModeNote);
      console.log('View mode content:', viewModeContent);
      expect(viewModeContent).toBe('# Header'); // Should return dataset.markdown
    });
  });
});
