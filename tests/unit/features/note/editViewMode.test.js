// tests/unit/features/note/editViewMode.test.js

import { displayAsViewMode, displayAsEditMode, getCurrentMarkdownContent } from '../../../../src/js/features/note/editViewMode.js';

describe('Edit/View Mode Functions', () => {
  let noteContent;

  beforeEach(() => {
    // Create a mock note content element
    noteContent = document.createElement('div');
    noteContent.className = 'note-content';
    noteContent.contentEditable = true;
    document.body.appendChild(noteContent);
  });

  afterEach(() => {
    document.body.removeChild(noteContent);
  });

  describe('displayAsViewMode', () => {
    test('should render markdown heading to HTML h1', () => {
      const markdown = '# Test Header';
      
      displayAsViewMode(noteContent, markdown);
      
      expect(noteContent.innerHTML).toContain('<h1>Test Header</h1>');
      expect(noteContent.classList.contains('view-mode')).toBe(true);
    });

    test('should render bold text to HTML strong', () => {
      const markdown = '**Bold text**';
      
      displayAsViewMode(noteContent, markdown);
      
      expect(noteContent.innerHTML).toContain('<strong>Bold text</strong>');
    });

    test('should render italic text to HTML em', () => {
      const markdown = '*Italic text*';
      
      displayAsViewMode(noteContent, markdown);
      
      expect(noteContent.innerHTML).toContain('<em>Italic text</em>');
    });

    test('should render list items to HTML ul/li', () => {
      const markdown = '- List item 1\n- List item 2';
      
      displayAsViewMode(noteContent, markdown);
      
      expect(noteContent.innerHTML).toContain('<ul>');
      expect(noteContent.innerHTML).toContain('<li>List item 1</li>');
      expect(noteContent.innerHTML).toContain('<li>List item 2</li>');
      expect(noteContent.innerHTML).toContain('</ul>');
    });

    test('should handle complex markdown with multiple elements', () => {
      const markdown = '# Header\n\n**Bold** and *italic* text\n\n- Item 1\n- Item 2';
      
      displayAsViewMode(noteContent, markdown);
      
      expect(noteContent.innerHTML).toContain('<h1>Header</h1>');
      expect(noteContent.innerHTML).toContain('<strong>Bold</strong>');
      expect(noteContent.innerHTML).toContain('<em>italic</em>');
      expect(noteContent.innerHTML).toContain('<li>Item 1</li>');
    });

    test('should store raw markdown in data attribute', () => {
      const markdown = '# Test';
      
      displayAsViewMode(noteContent, markdown);
      
      expect(noteContent.getAttribute('data-markdown')).toBe('# Test');
    });
  });

  describe('displayAsEditMode', () => {
    test('should show raw markdown text for editing', () => {
      const markdown = '# Test Header\n**Bold text**';
      
      displayAsEditMode(noteContent, markdown);
      
      expect(noteContent.textContent).toBe('# Test Header\n**Bold text**');
      expect(noteContent.classList.contains('edit-mode')).toBe(true);
      expect(noteContent.contentEditable).toBe(true);
    });

    test('should retrieve markdown from data attribute if no parameter provided', () => {
      noteContent.setAttribute('data-markdown', '# Stored Header');
      
      displayAsEditMode(noteContent);
      
      expect(noteContent.textContent).toBe('# Stored Header');
    });
  });

  describe('getCurrentMarkdownContent', () => {
    test('should return raw text content in edit mode', () => {
      displayAsEditMode(noteContent, '# Test');
      
      const result = getCurrentMarkdownContent(noteContent);
      
      expect(result).toBe('# Test');
    });

    test('should return stored markdown in view mode', () => {
      displayAsViewMode(noteContent, '# Test');
      
      const result = getCurrentMarkdownContent(noteContent);
      
      expect(result).toBe('# Test');
    });
  });

  describe('Mode Switching Integration Test', () => {
    test('should switch between view and edit modes correctly', () => {
      const markdown = '# Test Header\n**Bold text**';
      
      // Start in view mode (rendered)
      displayAsViewMode(noteContent, markdown);
      expect(noteContent.innerHTML).toContain('<h1>Test Header</h1>');
      expect(noteContent.innerHTML).toContain('<strong>Bold text</strong>');
      expect(noteContent.classList.contains('view-mode')).toBe(true);
      
      // Switch to edit mode (raw markdown)
      displayAsEditMode(noteContent, markdown);
      expect(noteContent.textContent).toBe(markdown);
      expect(noteContent.classList.contains('edit-mode')).toBe(true);
      
      // Switch back to view mode
      displayAsViewMode(noteContent, markdown);
      expect(noteContent.innerHTML).toContain('<h1>Test Header</h1>');
      expect(noteContent.classList.contains('view-mode')).toBe(true);
    });
  });
});