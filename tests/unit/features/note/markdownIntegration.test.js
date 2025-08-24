// tests/unit/features/note/markdownIntegration.test.js
// Comprehensive tests for markdown integration with the note system

import {
  displayAsViewMode,
  displayAsEditMode,
  getCurrentMarkdownContent,
} from '../../../../src/js/features/note/editViewMode.js';
import { NoteService } from '../../../../src/js/services/noteService.js';

// Mock the event bus
jest.mock('../../../../src/js/core/eventBus.js', () => ({
  eventBus: {
    emit: jest.fn(),
  },
}));

describe('Markdown Integration with Note System', () => {
  let canvas;

  beforeEach(() => {
    canvas = document.createElement('div');
    document.body.appendChild(canvas);
  });

  afterEach(() => {
    document.body.removeChild(canvas);
    document.querySelectorAll('.note').forEach((note) => note.remove());
  });

  describe('Core Display Functions', () => {
    let noteContent;

    beforeEach(() => {
      noteContent = document.createElement('div');
      noteContent.className = 'note-content';
      noteContent.contentEditable = true;
      document.body.appendChild(noteContent);
    });

    afterEach(() => {
      document.body.removeChild(noteContent);
    });

    test('should render headers correctly', () => {
      displayAsViewMode(noteContent, '# Main Header');
      expect(noteContent.innerHTML).toBe('<h1>Main Header</h1>');
      expect(noteContent.getAttribute('data-markdown')).toBe('# Main Header');
    });

    test('should render h2 headers correctly', () => {
      displayAsViewMode(noteContent, '## Sub Header');
      expect(noteContent.innerHTML).toBe('<h2>Sub Header</h2>');
    });

    test('should render bold text correctly', () => {
      displayAsViewMode(noteContent, '**Bold text**');
      expect(noteContent.innerHTML).toBe('<p><strong>Bold text</strong></p>');
    });

    test('should render italic text correctly', () => {
      displayAsViewMode(noteContent, '*Italic text*');
      expect(noteContent.innerHTML).toBe('<p><em>Italic text</em></p>');
    });

    test('should render lists correctly', () => {
      displayAsViewMode(noteContent, '- Item 1\n- Item 2');
      expect(noteContent.innerHTML).toContain('<ul>');
      expect(noteContent.innerHTML).toContain('<li>Item 1</li>');
      expect(noteContent.innerHTML).toContain('<li>Item 2</li>');
    });

    test('should keep plain text as textContent (no HTML wrapper)', () => {
      displayAsViewMode(noteContent, 'Just plain text');
      expect(noteContent.textContent).toBe('Just plain text');
      // Note: When using textContent, innerHTML should be empty or contain the same text
      // The key expectation is that no HTML tags are created for plain text
      expect(noteContent.innerHTML).not.toContain('<');
      expect(noteContent.innerHTML).not.toContain('>');
    });

    test('should detect markdown vs plain text correctly', () => {
      // Plain text - should not render as HTML
      displayAsViewMode(noteContent, 'hello world');
      expect(noteContent.textContent).toBe('hello world');

      // Markdown - should render as HTML
      displayAsViewMode(noteContent, '**bold**');
      expect(noteContent.innerHTML).toContain('<strong>bold</strong>');

      // Header - should render as HTML
      displayAsViewMode(noteContent, '# Header');
      expect(noteContent.innerHTML).toBe('<h1>Header</h1>');
    });
  });

  describe('Edit Mode Functions', () => {
    let noteContent;

    beforeEach(() => {
      noteContent = document.createElement('div');
      noteContent.className = 'note-content';
      noteContent.contentEditable = true;
      document.body.appendChild(noteContent);
    });

    afterEach(() => {
      document.body.removeChild(noteContent);
    });

    test('should switch to raw markdown in edit mode', () => {
      // First set up view mode
      displayAsViewMode(noteContent, '# Test Header');
      expect(noteContent.innerHTML).toBe('<h1>Test Header</h1>');

      // Switch to edit mode
      displayAsEditMode(noteContent);
      expect(noteContent.textContent).toBe('# Test Header');
      expect(noteContent.classList.contains('edit-mode')).toBe(true);
    });

    test('should preserve line breaks in edit mode', () => {
      const markdown = '# Header\n\n**Bold** text\n\n- List item';
      displayAsEditMode(noteContent, markdown);
      expect(noteContent.textContent).toBe(markdown);
    });
  });

  describe('getCurrentMarkdownContent Function', () => {
    let noteContent;

    beforeEach(() => {
      noteContent = document.createElement('div');
      noteContent.className = 'note-content';
      document.body.appendChild(noteContent);
    });

    afterEach(() => {
      document.body.removeChild(noteContent);
    });

    test('should return textContent in edit mode', () => {
      displayAsEditMode(noteContent, '# Test');
      const result = getCurrentMarkdownContent(noteContent);
      expect(result).toBe('# Test');
    });

    test('should return stored markdown in view mode', () => {
      displayAsViewMode(noteContent, '# Test');
      const result = getCurrentMarkdownContent(noteContent);
      expect(result).toBe('# Test');
    });

    test('should handle empty content', () => {
      const result = getCurrentMarkdownContent(noteContent);
      expect(result).toBe('');
    });
  });

  describe('Data Consistency', () => {
    test('should maintain markdown through view/edit cycles', () => {
      const noteContent = document.createElement('div');
      noteContent.className = 'note-content';
      document.body.appendChild(noteContent);

      const originalMarkdown = '# Header\n**Bold** text\n- Item 1\n- Item 2';

      // Start in view mode
      displayAsViewMode(noteContent, originalMarkdown);
      expect(noteContent.innerHTML).toContain('<h1>Header</h1>');
      expect(noteContent.innerHTML).toContain('<strong>Bold</strong>');
      expect(noteContent.innerHTML).toContain('<li>Item 1</li>');

      // Switch to edit mode
      displayAsEditMode(noteContent);
      expect(noteContent.textContent).toBe(originalMarkdown);

      // Switch back to view mode
      displayAsViewMode(noteContent, getCurrentMarkdownContent(noteContent));
      expect(noteContent.innerHTML).toContain('<h1>Header</h1>');
      expect(noteContent.innerHTML).toContain('<strong>Bold</strong>');

      // Verify the stored markdown is preserved
      expect(getCurrentMarkdownContent(noteContent)).toBe(originalMarkdown);

      document.body.removeChild(noteContent);
    });
  });

  describe('Security Tests', () => {
    let noteContent;

    beforeEach(() => {
      noteContent = document.createElement('div');
      noteContent.className = 'note-content';
      document.body.appendChild(noteContent);
    });

    afterEach(() => {
      document.body.removeChild(noteContent);
    });

    test('should sanitize HTML injection attempts', () => {
      const maliciousInput = '<script>alert("xss")</script>**Bold** text';
      displayAsViewMode(noteContent, maliciousInput);

      // Should not contain script tags or javascript: URLs
      expect(noteContent.innerHTML).not.toContain('<script>');
      expect(noteContent.innerHTML).not.toContain('javascript:');

      // Should still render safe markdown (case-sensitive match for what was actually input)
      expect(noteContent.innerHTML).toContain('<strong>Bold</strong>');
    });

    test('should handle dangerous markdown attempts', () => {
      const dangerousInput = '[link](javascript:alert("xss"))\n**bold**';
      displayAsViewMode(noteContent, dangerousInput);

      // Should not contain javascript: links (links aren't supported)
      expect(noteContent.innerHTML).not.toContain('javascript:');
      expect(noteContent.innerHTML).not.toContain('alert');

      // Should render as plain text since links aren't supported
      expect(noteContent.textContent || noteContent.innerHTML).toContain(
        'link',
      );
    });
  });

  describe('Storage Integration', () => {
    test('should load notes from storage in view mode', () => {
      const noteData = {
        id: 'test-note',
        content: '# Stored Header\n**Stored content**',
        left: '100px',
        top: '100px',
      };

      const note = NoteService.createNoteFromData(noteData, canvas);
      const noteContent = note.querySelector('.note-content');

      // Should be in view mode with rendered HTML
      expect(noteContent.classList.contains('view-mode')).toBe(true);
      expect(noteContent.innerHTML).toContain('<h1>Stored Header</h1>');
      expect(noteContent.innerHTML).toContain(
        '<strong>Stored content</strong>',
      );

      // Should have stored the raw markdown
      expect(noteContent.getAttribute('data-markdown')).toBe(
        '# Stored Header\n**Stored content**',
      );
    });

    test('should preserve original content format in storage', () => {
      const noteData = {
        id: 'test-note',
        content: 'plain text without markdown',
        left: '100px',
        top: '100px',
      };

      const note = NoteService.createNoteFromData(noteData, canvas);
      const noteContent = note.querySelector('.note-content');

      // Plain text should remain as textContent and not contain HTML tags
      expect(noteContent.textContent).toBe('plain text without markdown');
      expect(noteContent.innerHTML).not.toContain('<');
      expect(noteContent.innerHTML).not.toContain('>');
    });
  });

  describe('Performance Tests', () => {
    test('should handle typical note content efficiently', () => {
      const noteContent = document.createElement('div');
      noteContent.className = 'note-content';
      document.body.appendChild(noteContent);

      const largeContent =
        '# Header\n\n' +
        Array(50)
          .fill('**Bold text** with *italic* content and - list items')
          .join('\n');

      const startTime = performance.now();
      displayAsViewMode(noteContent, largeContent);
      const endTime = performance.now();

      // Should complete within reasonable time (< 200ms for large content)
      expect(endTime - startTime).toBeLessThan(200);

      // Should still render correctly
      expect(noteContent.innerHTML).toContain('<h1>Header</h1>');
      expect(noteContent.innerHTML).toContain('<strong>Bold text</strong>');

      document.body.removeChild(noteContent);
    });
  });
});
