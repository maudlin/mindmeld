// tests/unit/data/providers/YjsProvider.contentLimit.test.js
// Tests for content size limit enforcement in YjsProvider

import { YjsProvider } from '../../../../src/js/data/providers/YjsProvider.js';
import { NOTE_CONTENT_LIMIT } from '../../../../src/js/core/constants.js';

describe('YjsProvider Content Size Limit Enforcement', () => {
  let provider;

  beforeEach(() => {
    provider = new YjsProvider();
    // Initialize in offline mode for testing
    provider.init(null, {});
  });

  afterEach(() => {
    if (provider) {
      provider.destroy();
    }
  });

  describe('Note Content Truncation', () => {
    test('should truncate note content that exceeds NOTE_CONTENT_LIMIT on upsert', () => {
      const longContent = 'a'.repeat(NOTE_CONTENT_LIMIT + 50);
      const onChange = jest.fn();
      provider.subscribe(onChange);

      provider.upsertNote({
        id: 'test-note',
        content: longContent,
        pos: [100, 200],
      });

      // Verify the change event was emitted
      expect(onChange).toHaveBeenCalledWith({
        type: 'notes',
        origin: 'user',
        payload: { id: 'test-note' },
      });

      // Get the snapshot to verify content was truncated
      const snapshot = provider.getSnapshot();
      const note = snapshot.data.n.find((n) => n.i === 'test-note');

      expect(note).toBeDefined();
      expect(note.c.length).toBe(NOTE_CONTENT_LIMIT);
      expect(note.c).toBe('a'.repeat(NOTE_CONTENT_LIMIT));
    });

    test('should preserve note content that is within NOTE_CONTENT_LIMIT', () => {
      const shortContent = 'Short content within limit';
      const onChange = jest.fn();
      provider.subscribe(onChange);

      provider.upsertNote({
        id: 'test-note',
        content: shortContent,
        pos: [100, 200],
      });

      const snapshot = provider.getSnapshot();
      const note = snapshot.data.n.find((n) => n.i === 'test-note');

      expect(note).toBeDefined();
      expect(note.c).toBe(shortContent);
      expect(note.c.length).toBeLessThanOrEqual(NOTE_CONTENT_LIMIT);
    });

    test('should handle exact NOTE_CONTENT_LIMIT length content', () => {
      const exactContent = 'a'.repeat(NOTE_CONTENT_LIMIT);

      provider.upsertNote({
        id: 'test-note',
        content: exactContent,
      });

      const snapshot = provider.getSnapshot();
      const note = snapshot.data.n.find((n) => n.i === 'test-note');

      expect(note).toBeDefined();
      expect(note.c).toBe(exactContent);
      expect(note.c.length).toBe(NOTE_CONTENT_LIMIT);
    });

    test('should handle empty content', () => {
      provider.upsertNote({
        id: 'test-note',
        content: '',
      });

      const snapshot = provider.getSnapshot();
      const note = snapshot.data.n.find((n) => n.i === 'test-note');

      expect(note).toBeDefined();
      expect(note.c).toBe('');
    });

    test('should handle undefined content', () => {
      provider.upsertNote({
        id: 'test-note',
        // content is undefined
      });

      const snapshot = provider.getSnapshot();
      const note = snapshot.data.n.find((n) => n.i === 'test-note');

      expect(note).toBeDefined();
      // Should not have content property or should be empty
    });
  });

  describe('Import JSON Content Truncation', () => {
    test('should truncate note content during JSON import', () => {
      const longContent = 'b'.repeat(NOTE_CONTENT_LIMIT + 30);
      const testData = {
        data: {
          n: [
            { i: 'note-1', c: longContent, p: [100, 200] },
            { i: 'note-2', c: 'Short content', p: [300, 400] },
          ],
          c: [],
        },
      };

      const onChange = jest.fn();
      provider.subscribe(onChange);

      provider.importJSON(JSON.stringify(testData));

      // Verify snapshot was emitted
      expect(onChange).toHaveBeenCalledWith({
        type: 'snapshot',
        origin: 'system',
        payload: null,
      });

      const snapshot = provider.getSnapshot();

      // Verify long content was truncated
      const note1 = snapshot.data.n.find((n) => n.i === 'note-1');
      expect(note1).toBeDefined();
      expect(note1.c.length).toBe(NOTE_CONTENT_LIMIT);
      expect(note1.c).toBe('b'.repeat(NOTE_CONTENT_LIMIT));

      // Verify short content was preserved
      const note2 = snapshot.data.n.find((n) => n.i === 'note-2');
      expect(note2).toBeDefined();
      expect(note2.c).toBe('Short content');
    });

    test('should handle import with multiple notes exceeding limit', () => {
      const longContent1 = 'x'.repeat(NOTE_CONTENT_LIMIT + 10);
      const longContent2 = 'y'.repeat(NOTE_CONTENT_LIMIT + 20);

      const testData = {
        data: {
          n: [
            { i: 'note-1', c: longContent1, p: [0, 0] },
            { i: 'note-2', c: longContent2, p: [100, 100] },
          ],
          c: [],
        },
      };

      provider.importJSON(JSON.stringify(testData));

      const snapshot = provider.getSnapshot();

      expect(snapshot.data.n).toHaveLength(2);

      snapshot.data.n.forEach((note) => {
        expect(note.c.length).toBeLessThanOrEqual(NOTE_CONTENT_LIMIT);
        expect(note.c.length).toBe(NOTE_CONTENT_LIMIT); // All should be truncated to exact limit
      });
    });

    test('should handle import with empty and undefined content', () => {
      const testData = {
        data: {
          n: [
            { i: 'note-1', c: '', p: [0, 0] },
            { i: 'note-2', p: [100, 100] }, // no content field
            { i: 'note-3', c: null, p: [200, 200] },
          ],
          c: [],
        },
      };

      expect(() => {
        provider.importJSON(JSON.stringify(testData));
      }).not.toThrow();

      const snapshot = provider.getSnapshot();
      expect(snapshot.data.n).toHaveLength(3);

      const note1 = snapshot.data.n.find((n) => n.i === 'note-1');
      expect(note1.c).toBe('');

      const note2 = snapshot.data.n.find((n) => n.i === 'note-2');
      expect(note2.c).toBe(''); // Should default to empty string

      const note3 = snapshot.data.n.find((n) => n.i === 'note-3');
      expect(note3.c).toBe(''); // null converted to empty string
    });
  });

  describe('Export-Import Round Trip with Content Limits', () => {
    test('should maintain content limits through export-import cycle', () => {
      const longContent = 'z'.repeat(NOTE_CONTENT_LIMIT + 40);
      const shortContent = 'Normal content';

      // Add notes with different content lengths
      provider.upsertNote({ id: 'long-note', content: longContent });
      provider.upsertNote({ id: 'short-note', content: shortContent });

      // Export current state
      const exported = provider.exportJSON();
      const exportedData = JSON.parse(exported);

      // Verify exported content is already truncated
      const longNote = exportedData.data.n.find((n) => n.i === 'long-note');
      const shortNote = exportedData.data.n.find((n) => n.i === 'short-note');

      expect(longNote.c.length).toBe(NOTE_CONTENT_LIMIT);
      expect(shortNote.c).toBe(shortContent);

      // Clear and import back
      provider.importJSON('{"data":{"n":[],"c":[]}}'); // Clear first
      provider.importJSON(exported);

      // Verify import maintained the limits
      const finalSnapshot = provider.getSnapshot();
      const finalLongNote = finalSnapshot.data.n.find(
        (n) => n.i === 'long-note',
      );
      const finalShortNote = finalSnapshot.data.n.find(
        (n) => n.i === 'short-note',
      );

      expect(finalLongNote.c.length).toBe(NOTE_CONTENT_LIMIT);
      expect(finalShortNote.c).toBe(shortContent);
    });

    test('should handle multiple export-import cycles', () => {
      const initialContent = 'a'.repeat(NOTE_CONTENT_LIMIT + 15);

      provider.upsertNote({ id: 'test-note', content: initialContent });

      // Perform multiple export-import cycles
      for (let i = 0; i < 3; i++) {
        const exported = provider.exportJSON();
        provider.importJSON('{"data":{"n":[],"c":[]}}'); // Clear
        provider.importJSON(exported); // Re-import
      }

      // Verify content is still properly limited
      const snapshot = provider.getSnapshot();
      const note = snapshot.data.n.find((n) => n.i === 'test-note');

      expect(note).toBeDefined();
      expect(note.c.length).toBe(NOTE_CONTENT_LIMIT);
      expect(note.c).toBe('a'.repeat(NOTE_CONTENT_LIMIT));
    });
  });

  describe('Content Limit Constants Verification', () => {
    test('should use NOTE_CONTENT_LIMIT constant correctly', () => {
      expect(typeof NOTE_CONTENT_LIMIT).toBe('number');
      expect(NOTE_CONTENT_LIMIT).toBeGreaterThan(0);

      // Verify limit is enforced at the exact boundary
      const exactContent = 'x'.repeat(NOTE_CONTENT_LIMIT);
      const overContent = 'x'.repeat(NOTE_CONTENT_LIMIT + 1);

      provider.upsertNote({ id: 'exact', content: exactContent });
      provider.upsertNote({ id: 'over', content: overContent });

      const snapshot = provider.getSnapshot();

      const exactNote = snapshot.data.n.find((n) => n.i === 'exact');
      const overNote = snapshot.data.n.find((n) => n.i === 'over');

      expect(exactNote.c.length).toBe(NOTE_CONTENT_LIMIT);
      expect(overNote.c.length).toBe(NOTE_CONTENT_LIMIT);
      expect(exactNote.c).toBe(exactContent);
      expect(overNote.c).toBe(exactContent); // Should be truncated to same as exact
    });
  });
});
