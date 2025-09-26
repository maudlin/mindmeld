// tests/unit/services/noteIdService.test.js
// Test suite for ID collision prevention service

import { NoteIdService } from '../../../src/js/services/noteIdService.js';
import { toBase62, fromBase62 } from '../../../src/js/utils/utils.js';

describe('NoteIdService - ID Collision Prevention', () => {
  beforeEach(() => {
    // Reset ID service state before each test
    NoteIdService.reset();
  });

  describe('ID Generation', () => {
    it('should generate sequential base62 IDs starting from 1', () => {
      const id1 = NoteIdService.generateNextId();
      const id2 = NoteIdService.generateNextId();
      const id3 = NoteIdService.generateNextId();

      expect(id1).toBe('1');
      expect(id2).toBe('2');
      expect(id3).toBe('3');
    });

    it('should generate proper base62 sequence including letters', () => {
      // Skip to ID 9, next should be 'a'
      for (let i = 1; i < 10; i++) {
        NoteIdService.generateNextId();
      }

      const id10 = NoteIdService.generateNextId();
      expect(id10).toBe('a');
    });

    it('should never generate duplicate IDs in sequence', () => {
      const generatedIds = new Set();

      for (let i = 0; i < 100; i++) {
        const id = NoteIdService.generateNextId();
        expect(generatedIds.has(id)).toBe(false);
        generatedIds.add(id);
      }

      expect(generatedIds.size).toBe(100);
    });
  });

  describe('Collision Prevention', () => {
    it('should update counter to prevent collisions with existing IDs', () => {
      // Simulate existing notes with IDs 1, 2, 7, a
      const existingNotes = [
        { id: '1', content: 'Note 1' },
        { id: '2', content: 'Note 2' },
        { id: '7', content: 'Note 7' },
        { id: 'a', content: 'Note a' },
      ];

      NoteIdService.ensureUniqueIds(existingNotes);

      // Next ID should be 'b' (11 in decimal) to avoid collision with 'a' (10)
      const nextId = NoteIdService.generateNextId();
      expect(nextId).toBe('b');
    });

    it('should handle highest existing ID correctly', () => {
      const existingNotes = [
        { id: 'z', content: 'Note z' }, // 35 in decimal
        { id: '5', content: 'Note 5' },
      ];

      NoteIdService.ensureUniqueIds(existingNotes);

      // Next ID should be 'A' (36 in decimal)
      const nextId = NoteIdService.generateNextId();
      expect(nextId).toBe('A');
    });

    it('should handle empty existing notes array', () => {
      NoteIdService.ensureUniqueIds([]);

      const nextId = NoteIdService.generateNextId();
      expect(nextId).toBe('1');
    });

    it('should ignore invalid existing IDs', () => {
      const existingNotes = [
        { id: '5', content: 'Valid note' },
        { id: null, content: 'Invalid note 1' },
        { id: '', content: 'Invalid note 2' },
        { id: undefined, content: 'Invalid note 3' },
      ];

      NoteIdService.ensureUniqueIds(existingNotes);

      // Should continue from 6, ignoring invalid IDs
      const nextId = NoteIdService.generateNextId();
      expect(nextId).toBe('6');
    });
  });

  describe('ID Validation', () => {
    it('should validate unique IDs against existing notes', () => {
      const existingNotes = [
        { id: '1', content: 'Note 1' },
        { id: '5', content: 'Note 5' },
      ];

      expect(NoteIdService.isIdUnique('1', existingNotes)).toBe(false);
      expect(NoteIdService.isIdUnique('5', existingNotes)).toBe(false);
      expect(NoteIdService.isIdUnique('3', existingNotes)).toBe(true);
      expect(NoteIdService.isIdUnique('a', existingNotes)).toBe(true);
    });

    it('should handle DOM elements with id property', () => {
      // Simulate DOM elements (common in actual usage)
      const existingElements = [
        { id: '1', querySelector: () => ({}) },
        { id: '7', querySelector: () => ({}) },
      ];

      expect(NoteIdService.isIdUnique('1', existingElements)).toBe(false);
      expect(NoteIdService.isIdUnique('7', existingElements)).toBe(false);
      expect(NoteIdService.isIdUnique('8', existingElements)).toBe(true);
    });
  });

  describe('Integration with Base62 Utils', () => {
    it('should properly convert between base62 and decimal', () => {
      expect(toBase62(1)).toBe('1');
      expect(toBase62(7)).toBe('7');
      expect(toBase62(10)).toBe('a');
      expect(fromBase62('1')).toBe(1);
      expect(fromBase62('7')).toBe(7);
      expect(fromBase62('a')).toBe(10);
    });

    it('should maintain consistency with existing base62 implementation', () => {
      for (let i = 1; i <= 62; i++) {
        const base62Id = toBase62(i);
        const backToDecimal = fromBase62(base62Id);
        expect(backToDecimal).toBe(i);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large ID numbers', () => {
      // Simulate a map with high IDs
      const existingNotes = [
        { id: 'ZZ', content: 'Very high ID' }, // Should be quite large in decimal
      ];

      NoteIdService.ensureUniqueIds(existingNotes);

      const nextId = NoteIdService.generateNextId();
      // Should generate an ID higher than ZZ
      expect(fromBase62(nextId)).toBeGreaterThan(fromBase62('ZZ'));
    });

    it('should handle mixed case sensitivity correctly', () => {
      const existingNotes = [
        { id: 'a', content: 'Lowercase a' },
        { id: 'A', content: 'Uppercase A' },
      ];

      NoteIdService.ensureUniqueIds(existingNotes);

      // Should not generate 'a' or 'A'
      const generatedIds = [];
      for (let i = 0; i < 5; i++) {
        generatedIds.push(NoteIdService.generateNextId());
      }

      expect(generatedIds).not.toContain('a');
      expect(generatedIds).not.toContain('A');
    });
  });

  describe('State Management', () => {
    it('should maintain counter state between calls', () => {
      NoteIdService.generateNextId(); // '1'
      NoteIdService.generateNextId(); // '2'

      const thirdId = NoteIdService.generateNextId();
      expect(thirdId).toBe('3');
    });

    it('should reset state properly', () => {
      NoteIdService.generateNextId(); // '1'
      NoteIdService.generateNextId(); // '2'

      NoteIdService.reset();

      const firstIdAfterReset = NoteIdService.generateNextId();
      expect(firstIdAfterReset).toBe('1');
    });
  });
});
