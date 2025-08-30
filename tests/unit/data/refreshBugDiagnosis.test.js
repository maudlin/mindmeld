/**
 * Refresh Bug Diagnosis Test
 *
 * Simple, focused test to reproduce the exact bug reported:
 * 1) Create note with MD content (# H1)
 * 2) Exit note - heading correctly shown
 * 3) Refresh: note contains HTML elements
 * 4) Refresh again: note becomes stripped text "H1"
 */

import {
  saveNotesToStorage,
  loadNotesFromStorage,
} from '../../../src/js/data/canonicalStorage.js';
import {
  displayAsViewMode,
  getCurrentMarkdownContent,
} from '../../../src/js/features/note/editViewMode.js';
import { defangToPlainText } from '../../../src/js/features/markdown/defangPipeline.js';

// Mock localStorage
global.localStorage = {
  data: {},
  getItem: jest.fn(function (key) {
    return this.data[key] || null;
  }),
  setItem: jest.fn(function (key, value) {
    this.data[key] = value;
  }),
  removeItem: jest.fn(function (key) {
    delete this.data[key];
  }),
  clear: jest.fn(function () {
    this.data = {};
  }),
};

describe('Refresh Bug Diagnosis', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('should reproduce the exact steps from manual testing', () => {
    console.log('=== STEP 1: Create note with markdown content ===');
    const originalMarkdown = '# H1';

    // Save note with markdown content (simulates creating and saving a note)
    const notes = [
      { id: 'test-note', content: originalMarkdown, left: 100, top: 100 },
    ];
    saveNotesToStorage(notes);
    console.log('Saved to storage:', originalMarkdown);

    console.log('\n=== STEP 2: First page load - display note ===');
    // Load from storage (simulates page load)
    const loaded = loadNotesFromStorage();
    console.log('Loaded from storage:', loaded.notes[0].content);

    // Create realistic DOM element for note content
    const noteContent = {
      innerHTML: '',
      textContent: '',
      dataset: {},
      setAttribute: function (attr, value) {
        if (attr === 'data-markdown') this.dataset.markdown = value;
      },
      getAttribute: function (attr) {
        if (attr === 'data-markdown') return this.dataset.markdown || null;
        return null;
      },
      classList: {
        contains: () => false, // Not in edit mode
        add: jest.fn(),
        remove: jest.fn(),
      },
    };

    // Display note in view mode (what happens on page load)
    displayAsViewMode(noteContent, loaded.notes[0].content);
    console.log('After displayAsViewMode:');
    console.log('  innerHTML:', noteContent.innerHTML);
    console.log('  dataset.markdown:', noteContent.dataset.markdown);

    // Verify first load is correct
    expect(noteContent.innerHTML).toBe('<h1>H1</h1>');
    expect(noteContent.dataset.markdown).toBe(originalMarkdown);

    console.log('\n=== STEP 3: First refresh - what gets saved? ===');
    // The question is: what content would get saved during a refresh?
    // This would only happen if something incorrectly extracts content from DOM

    // Let's simulate what might go wrong - if someone saves the innerHTML instead of markdown
    const whatGetsExtracted = getCurrentMarkdownContent(noteContent);
    console.log('getCurrentMarkdownContent returns:', whatGetsExtracted);

    // This should return the stored markdown, not the HTML
    expect(whatGetsExtracted).toBe(originalMarkdown);

    console.log('\n=== STEP 4: Simulate if HTML accidentally gets saved ===');
    // Let's see what happens if the innerHTML accidentally gets saved instead
    const corruptedContent = noteContent.innerHTML; // This would be '<h1>H1</h1>'
    console.log('If innerHTML got saved:', corruptedContent);

    if (corruptedContent && corruptedContent.includes('<')) {
      // Save the corrupted HTML content
      const corruptedNotes = [
        { id: 'test-note', content: corruptedContent, left: 100, top: 100 },
      ];
      saveNotesToStorage(corruptedNotes);

      // Load it back - canonical storage should process it
      const reloaded = loadNotesFromStorage();
      console.log('After saving/loading HTML:', reloaded.notes[0].content);

      // This is where "H1" comes from - HTML gets processed to plain text
      // eslint-disable-next-line jest/no-conditional-expect
      expect(reloaded.notes[0].content).toBe('H1');

      console.log('\n=== ROOT CAUSE IDENTIFIED ===');
      console.log(
        'If innerHTML (HTML) accidentally gets saved instead of dataset.markdown,',
      );
      console.log('the canonical storage will defang it to plain text.');
      console.log(
        `Original: "${originalMarkdown}" -> Corrupted: "${corruptedContent}" -> Defanged: "${reloaded.notes[0].content}"`,
      );
    }
  });

  it('should test if the bug could be in note content extraction', () => {
    console.log('=== Testing content extraction scenarios ===');

    // Scenario 1: Note properly in view mode
    const viewModeNote = {
      innerHTML: '<h1>Header</h1>',
      textContent: 'Header',
      dataset: { markdown: '# Header' },
      setAttribute: function (attr, value) {
        if (attr === 'data-markdown') this.dataset.markdown = value;
      },
      getAttribute: function (attr) {
        if (attr === 'data-markdown') return this.dataset.markdown || null;
        return null;
      },
      classList: { contains: () => false },
    };

    const correctContent = getCurrentMarkdownContent(viewModeNote);
    console.log('View mode extraction:', correctContent);
    expect(correctContent).toBe('# Header');

    // Scenario 2: What if getAttribute fails or returns wrong value?
    const brokenNote = {
      innerHTML: '<h1>Header</h1>',
      textContent: 'Header',
      dataset: { markdown: '# Header' },
      setAttribute: function () {},
      getAttribute: function () {
        return null;
      }, // Always returns null
      classList: { contains: () => false },
    };

    const brokenContent = getCurrentMarkdownContent(brokenNote);
    console.log('Broken getAttribute extraction:', brokenContent);
    expect(brokenContent).toBe(''); // FIXED: No longer falls back to textContent (corruption prevention)

    // This used to be a source of corruption - if getAttribute failed,
    // we would get the stripped text instead of markdown. NOW FIXED!
  });

  it('should test the defang pipeline behavior with different inputs', () => {
    console.log('=== Testing defang pipeline ===');

    // Test with markdown (should pass through)
    const markdown = '# Header\n**Bold**';
    const defangedMarkdown = defangToPlainText(markdown, false);
    console.log('Markdown input:', markdown);
    console.log('Defanged markdown:', defangedMarkdown);
    expect(defangedMarkdown).toBe(markdown);

    // Test with HTML (should strip to text)
    const html = '<h1>Header</h1><p><strong>Bold</strong></p>';
    const defangedHtml = defangToPlainText(html, true);
    console.log('HTML input:', html);
    console.log('Defanged HTML:', defangedHtml);
    expect(defangedHtml).toBe('Header Bold');

    // This confirms: if HTML accidentally gets saved, defang will strip it to text
    console.log('CONCLUSION: HTML -> defang -> plain text explains the bug');
  });
});
