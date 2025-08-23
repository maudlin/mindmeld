// tests/unit/features/note/markdownWorking.test.js
// Tests for the actual working markdown integration (not ideal behavior, but current behavior)

import { displayAsViewMode, displayAsEditMode, getCurrentMarkdownContent } from '../../../../src/js/features/note/editViewMode.js';

describe('Working Markdown Integration Tests', () => {
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

  describe('Basic Functionality', () => {
    test('should render headers correctly', () => {
      displayAsViewMode(noteContent, '# Test Header');
      expect(noteContent.innerHTML).toBe('<h1>Test Header</h1>');
    });

    test('should render bold text correctly', () => {
      displayAsViewMode(noteContent, '**bold text**');
      expect(noteContent.innerHTML).toBe('<p><strong>bold text</strong></p>');
    });

    test('should render italic text correctly', () => {
      displayAsViewMode(noteContent, '*italic text*');
      expect(noteContent.innerHTML).toBe('<p><em>italic text</em></p>');
    });

    test('should keep plain text as text (no markdown processing)', () => {
      displayAsViewMode(noteContent, 'plain text');
      expect(noteContent.textContent).toBe('plain text');
      expect(noteContent.innerHTML).toBe('plain text');
    });

    test('should detect markdown vs plain text', () => {
      // Plain text - no markdown symbols
      displayAsViewMode(noteContent, 'hello world');
      expect(noteContent.textContent).toBe('hello world');

      // Clear and test markdown
      noteContent.innerHTML = '';
      noteContent.textContent = '';
      
      displayAsViewMode(noteContent, '**bold**');
      expect(noteContent.innerHTML).toContain('<strong>');
    });
  });

  describe('Edit Mode', () => {
    test('should show raw markdown in edit mode', () => {
      displayAsEditMode(noteContent, '# Test Header');
      expect(noteContent.textContent).toBe('# Test Header');
      expect(noteContent.classList.contains('edit-mode')).toBe(true);
    });

    test('should retrieve markdown from storage', () => {
      // Set up view mode first
      displayAsViewMode(noteContent, '# Test');
      
      // Switch to edit mode without providing content
      displayAsEditMode(noteContent);
      
      // Should show the stored markdown
      expect(noteContent.textContent).toBe('# Test');
    });
  });

  describe('Data Consistency', () => {
    test('should maintain markdown through multiple cycles', () => {
      const original = '# Header';
      
      // View mode
      displayAsViewMode(noteContent, original);
      expect(noteContent.innerHTML).toBe('<h1>Header</h1>');
      
      // Edit mode
      displayAsEditMode(noteContent);
      expect(noteContent.textContent).toBe(original);
      
      // Back to view mode
      displayAsViewMode(noteContent, getCurrentMarkdownContent(noteContent));
      expect(noteContent.innerHTML).toBe('<h1>Header</h1>');
      
      // Should preserve original
      expect(getCurrentMarkdownContent(noteContent)).toBe(original);
    });

    test('should handle empty content gracefully', () => {
      displayAsViewMode(noteContent, '');
      expect(noteContent.textContent).toBe('');
      expect(getCurrentMarkdownContent(noteContent)).toBe('');
    });
  });

  describe('Security', () => {
    test('should escape HTML in content', () => {
      displayAsViewMode(noteContent, '<script>alert("xss")</script>**bold**');
      
      // Should not contain unescaped script tags
      expect(noteContent.innerHTML).not.toContain('<script>');
      
      // Should contain escaped content
      expect(noteContent.innerHTML).toContain('&lt;script&gt;');
      
      // Should still process safe markdown
      expect(noteContent.innerHTML).toContain('<strong>bold</strong>');
    });
  });

  describe('Performance', () => {
    test('should handle reasonable content quickly', () => {
      const content = '# Header\n' + Array(10).fill('**Bold** text').join(' ');
      
      const start = performance.now();
      displayAsViewMode(noteContent, content);
      const end = performance.now();
      
      expect(end - start).toBeLessThan(50); // Should be fast
      expect(noteContent.innerHTML).toContain('<h1>');
      expect(noteContent.innerHTML).toContain('Header');
    });
  });

  describe('Edge Cases', () => {
    test('should handle content with only spaces', () => {
      displayAsViewMode(noteContent, '   ');
      expect(noteContent.textContent.trim()).toBe('');
    });

    test('should handle mixed markdown and plain text', () => {
      displayAsViewMode(noteContent, 'Plain **bold** plain');
      expect(noteContent.innerHTML).toContain('<strong>bold</strong>');
      expect(noteContent.innerHTML).toContain('Plain');
    });

    test('should handle special characters', () => {
      displayAsViewMode(noteContent, '# Héllo Wörld 🌍');
      expect(noteContent.innerHTML).toBe('<h1>Héllo Wörld 🌍</h1>');
    });
  });
});