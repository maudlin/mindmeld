/**
 * Test for getCurrentState fix - ensures markdown is preserved instead of HTML
 */

import { getCurrentState } from '../../../src/js/data/dataStore.js';

// Mock getCurrentMarkdownContent
jest.mock('../../../src/js/features/note/editViewMode.js', () => ({
  getCurrentMarkdownContent: jest.fn(),
}));

import { getCurrentMarkdownContent } from '../../../src/js/features/note/editViewMode.js';

// Mock appState
jest.mock('../../../src/js/data/observableState.js', () => ({
  appState: {
    getState: jest.fn(() => ({ zoomLevel: 5 })),
  },
}));

describe('getCurrentState Fix', () => {
  beforeEach(() => {
    // Clear DOM
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('should extract markdown content instead of HTML from notes', () => {
    // Create a mock note element with both HTML and markdown
    const noteElement = document.createElement('div');
    noteElement.id = 'note-123';
    noteElement.className = 'note';
    noteElement.style.left = '100px';
    noteElement.style.top = '200px';

    const noteContent = document.createElement('div');
    noteContent.className = 'note-content';
    noteContent.innerHTML = '<h1>Header</h1><p><strong>Bold</strong></p>'; // HTML content
    noteContent.dataset.markdown = '# Header\n**Bold**'; // Stored markdown

    noteElement.appendChild(noteContent);
    document.body.appendChild(noteElement);

    // Mock getCurrentMarkdownContent to return the markdown (simulating proper function)
    getCurrentMarkdownContent.mockReturnValue('# Header\n**Bold**');

    // Call getCurrentState
    const result = getCurrentState();

    // Should return markdown, not HTML
    expect(result.notes).toHaveLength(1);
    expect(result.notes[0]).toEqual({
      id: 'note-123',
      content: '# Header\n**Bold**', // Should be markdown, not HTML
      left: '100px',
      top: '200px',
    });

    // Verify getCurrentMarkdownContent was called
    expect(getCurrentMarkdownContent).toHaveBeenCalledWith(noteContent);
  });

  it('should fall back to dataset.markdown if getCurrentMarkdownContent returns empty', () => {
    // Create mock note
    const noteElement = document.createElement('div');
    noteElement.id = 'note-456';
    noteElement.className = 'note';
    noteElement.style.left = '50px';
    noteElement.style.top = '100px';

    const noteContent = document.createElement('div');
    noteContent.className = 'note-content';
    noteContent.innerHTML = '<p>Plain text</p>';
    noteContent.dataset.markdown = 'Plain markdown text';

    noteElement.appendChild(noteContent);
    document.body.appendChild(noteElement);

    // Mock getCurrentMarkdownContent to return empty string (fallback scenario)
    getCurrentMarkdownContent.mockReturnValue('');

    const result = getCurrentState();

    expect(result.notes[0].content).toBe('Plain markdown text');
  });

  it('should handle multiple notes correctly', () => {
    // Create two notes
    const note1 = document.createElement('div');
    note1.id = 'note-1';
    note1.className = 'note';
    note1.style.left = '0px';
    note1.style.top = '0px';

    const content1 = document.createElement('div');
    content1.className = 'note-content';
    note1.appendChild(content1);
    document.body.appendChild(note1);

    const note2 = document.createElement('div');
    note2.id = 'note-2';
    note2.className = 'note';
    note2.style.left = '100px';
    note2.style.top = '100px';

    const content2 = document.createElement('div');
    content2.className = 'note-content';
    note2.appendChild(content2);
    document.body.appendChild(note2);

    // Mock different markdown content for each note
    getCurrentMarkdownContent
      .mockReturnValueOnce('# First Note')
      .mockReturnValueOnce('## Second Note');

    const result = getCurrentState();

    expect(result.notes).toHaveLength(2);
    expect(result.notes[0].content).toBe('# First Note');
    expect(result.notes[1].content).toBe('## Second Note');
  });

  it('should handle notes without markdown content', () => {
    const noteElement = document.createElement('div');
    noteElement.id = 'note-empty';
    noteElement.className = 'note';
    noteElement.style.left = '0px';
    noteElement.style.top = '0px';

    const noteContent = document.createElement('div');
    noteContent.className = 'note-content';
    // Instead of relying on textContent fallback (which corrupts content),
    // properly set the data-markdown attribute
    noteContent.setAttribute('data-markdown', 'Plain text fallback');
    noteContent.textContent = 'Plain text fallback';

    noteElement.appendChild(noteContent);
    document.body.appendChild(noteElement);

    // Mock getCurrentMarkdownContent to return null to test fallback to data-markdown
    getCurrentMarkdownContent.mockReturnValue(null);

    const result = getCurrentState();

    // Should use data-markdown attribute as fallback (prevents corruption)
    expect(result.notes[0].content).toBe('Plain text fallback');
  });
});
