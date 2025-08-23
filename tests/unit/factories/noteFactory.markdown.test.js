// tests/unit/factories/noteFactory.markdown.test.js

import { createNote } from '../../../src/js/factories/noteFactory.js';

// Mock the event bus
jest.mock('../../../src/js/core/eventBus.js', () => ({
  eventBus: {
    emit: jest.fn()
  }
}));

describe('Note Factory with Markdown Integration', () => {
  let canvas;

  beforeEach(() => {
    // Create a mock canvas
    canvas = document.createElement('div');
    canvas.id = 'canvas';
    document.body.appendChild(canvas);
  });

  afterEach(() => {
    document.body.removeChild(canvas);
    // Clear all notes
    document.querySelectorAll('.note').forEach(note => note.remove());
  });

  test('should render markdown on blur and show raw text on focus', async () => {
    // Create a note using the factory (which adds the event listeners)
    const note = createNote(100, 100, canvas);
    const noteContent = note.querySelector('.note-content');
    
    expect(noteContent).toBeTruthy();
    
    // Add markdown content and focus
    noteContent.focus();
    noteContent.textContent = '# Test Header\n**Bold text**';
    
    // Simulate blur - should render markdown
    noteContent.blur();
    
    // Wait a moment for event processing
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Should now contain rendered HTML
    expect(noteContent.innerHTML).toContain('<h1>Test Header</h1>');
    expect(noteContent.innerHTML).toContain('<strong>Bold text</strong>');
    
    // Simulate focus - should show raw markdown again
    noteContent.focus();
    
    // Wait a moment for event processing
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Should now show raw markdown
    expect(noteContent.textContent).toBe('# Test Header\n**Bold text**');
  });

  test('should handle simple markdown rendering', async () => {
    const note = createNote(100, 100, canvas);
    const noteContent = note.querySelector('.note-content');
    
    // Add simple markdown
    noteContent.focus();
    noteContent.textContent = '**Bold** and *italic*';
    noteContent.blur();
    
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Check rendered output
    expect(noteContent.innerHTML).toContain('<strong>Bold</strong>');
    expect(noteContent.innerHTML).toContain('<em>italic</em>');
  });

  test('should preserve line breaks in markdown', async () => {
    const note = createNote(100, 100, canvas);
    const noteContent = note.querySelector('.note-content');
    
    // Add multiline markdown
    noteContent.focus();
    noteContent.textContent = '# Header\n\nParagraph with **bold** text\n\n- List item';
    noteContent.blur();
    
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Check that structure is preserved
    expect(noteContent.innerHTML).toContain('<h1>Header</h1>');
    expect(noteContent.innerHTML).toContain('<strong>bold</strong>');
    expect(noteContent.innerHTML).toContain('<li>List item</li>');
  });
});