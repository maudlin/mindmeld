// tests/unit/data/providers/YjsProvider.roundTrip.test.js
// Tests for export-delete-import round trips and error handling in YjsProvider

import { YjsProvider } from '../../../../src/js/data/providers/YjsProvider.js';
import { ORIGIN } from '../../../../src/js/data/providers/DataProvider.js';

describe('YjsProvider Export-Delete-Import Round Trips', () => {
  let provider;

  beforeEach(() => {
    provider = new YjsProvider();
    provider.init(null, {});
  });

  afterEach(() => {
    if (provider) {
      provider.destroy();
    }
  });

  describe('Basic Round Trip Operations', () => {
    test('should maintain data integrity through export-delete-import cycle', () => {
      // Create test data
      provider.upsertNote({
        id: 'note-1',
        content: 'First note',
        pos: [100, 200],
        color: 'yellow',
      });
      provider.upsertNote({
        id: 'note-2',
        content: 'Second note',
        pos: [300, 400],
        color: 'blue',
      });
      provider.upsertConnection({ from: 'note-1', to: 'note-2', type: 1 });
      provider.setMeta({ mapName: 'Test Map', zoomLevel: 8 });

      // Export current state
      const exported = provider.exportJSON();
      const exportedData = JSON.parse(exported);

      // Verify export contains expected data
      expect(exportedData.data.n).toHaveLength(2);
      expect(exportedData.data.c).toHaveLength(1);

      const note1 = exportedData.data.n.find((n) => n.i === 'note-1');
      const note2 = exportedData.data.n.find((n) => n.i === 'note-2');

      expect(note1).toEqual({
        i: 'note-1',
        c: 'First note',
        p: [100, 200],
        cl: 'yellow',
      });
      expect(note2).toEqual({
        i: 'note-2',
        c: 'Second note',
        p: [300, 400],
        cl: 'blue',
      });
      expect(exportedData.data.c[0]).toEqual(['note-1', 'note-2', 1]);

      // Clear all data (simulate delete)
      provider.importJSON('{"data":{"n":[],"c":[]}}');

      // Verify data is cleared
      const emptySnapshot = provider.getSnapshot();
      expect(emptySnapshot.data.n).toHaveLength(0);
      expect(emptySnapshot.data.c).toHaveLength(0);

      // Import back the exported data
      provider.importJSON(exported);

      // Verify data is restored
      const restoredSnapshot = provider.getSnapshot();
      expect(restoredSnapshot.data.n).toHaveLength(2);
      expect(restoredSnapshot.data.c).toHaveLength(1);

      const restoredNote1 = restoredSnapshot.data.n.find(
        (n) => n.i === 'note-1',
      );
      const restoredNote2 = restoredSnapshot.data.n.find(
        (n) => n.i === 'note-2',
      );

      expect(restoredNote1).toEqual({
        i: 'note-1',
        c: 'First note',
        p: [100, 200],
        cl: 'yellow',
      });
      expect(restoredNote2).toEqual({
        i: 'note-2',
        c: 'Second note',
        p: [300, 400],
        cl: 'blue',
      });
      expect(restoredSnapshot.data.c[0]).toEqual(['note-1', 'note-2', 1]);
    });

    test('should handle multiple consecutive round trips', () => {
      const originalData = {
        notes: [
          { id: 'n1', content: 'Note 1', pos: [0, 0] },
          { id: 'n2', content: 'Note 2', pos: [100, 100] },
        ],
        connections: [{ from: 'n1', to: 'n2', type: 2 }],
      };

      // Setup initial data
      originalData.notes.forEach((note) => {
        provider.upsertNote(note);
      });
      originalData.connections.forEach((conn) => {
        provider.upsertConnection(conn);
      });

      // Perform 5 round trips
      for (let i = 0; i < 5; i++) {
        const exported = provider.exportJSON();
        provider.importJSON('{"data":{"n":[],"c":[]}}'); // Clear
        provider.importJSON(exported); // Restore
      }

      // Verify data integrity after multiple round trips
      const finalSnapshot = provider.getSnapshot();
      expect(finalSnapshot.data.n).toHaveLength(2);
      expect(finalSnapshot.data.c).toHaveLength(1);

      const n1 = finalSnapshot.data.n.find((n) => n.i === 'n1');
      const n2 = finalSnapshot.data.n.find((n) => n.i === 'n2');

      expect(n1.c).toBe('Note 1');
      expect(n2.c).toBe('Note 2');
      expect(finalSnapshot.data.c[0]).toEqual(['n1', 'n2', 2]);
    });

    test('should handle round trips with empty data', () => {
      // Start with empty data
      const emptyExport = provider.exportJSON();
      expect(JSON.parse(emptyExport)).toEqual({ data: { n: [], c: [] } });

      // Import empty data (should be safe)
      provider.importJSON(emptyExport);

      // Verify still empty
      const snapshot = provider.getSnapshot();
      expect(snapshot.data.n).toHaveLength(0);
      expect(snapshot.data.c).toHaveLength(0);
    });

    test('should handle round trips with complex data structures', () => {
      // Create complex test data
      const testNotes = Array.from({ length: 10 }, (_, i) => ({
        id: `note-${i}`,
        content: `Complex note ${i} with special characters: àáâãäåæçèé`,
        pos: [i * 50, i * 100],
        color: i % 2 === 0 ? 'yellow' : 'blue',
      }));

      const testConnections = [
        { from: 'note-0', to: 'note-1', type: 1 },
        { from: 'note-1', to: 'note-2', type: 2 },
        { from: 'note-2', to: 'note-0', type: 1 }, // Creates a cycle
      ];

      // Setup data
      testNotes.forEach((note) => provider.upsertNote(note));
      testConnections.forEach((conn) => provider.upsertConnection(conn));

      // Export-delete-import cycle
      const exported = provider.exportJSON();
      provider.importJSON('{"data":{"n":[],"c":[]}}');
      provider.importJSON(exported);

      // Verify complex data is preserved
      const snapshot = provider.getSnapshot();
      expect(snapshot.data.n).toHaveLength(10);
      expect(snapshot.data.c).toHaveLength(3);

      // Verify special characters are preserved
      const complexNote = snapshot.data.n.find((n) => n.i === 'note-0');
      expect(complexNote.c).toContain('àáâãäåæçèé');
    });
  });

  describe('Error Handling in Round Trips', () => {
    test('should handle malformed JSON gracefully', () => {
      expect(() => {
        provider.importJSON('invalid json');
      }).toThrow('Invalid JSON format');

      expect(() => {
        provider.importJSON('{"incomplete": true');
      }).toThrow('Invalid JSON format');
    });

    test('should handle invalid data structures gracefully', () => {
      expect(() => {
        provider.importJSON('null');
      }).toThrow('Invalid data structure');

      // Note: [] is actually a valid object, but will be treated as having no n or c arrays
      expect(() => {
        provider.importJSON('[]');
      }).not.toThrow(); // Arrays are objects in JS, so this is handled gracefully

      expect(() => {
        provider.importJSON('"just a string"');
      }).toThrow('Invalid data structure');
    });

    test('should handle malformed notes gracefully', () => {
      const malformedData = {
        data: {
          n: [
            { i: 'valid', c: 'Valid note', p: [0, 0] },
            null, // Invalid note
            { c: 'Missing id' }, // Invalid note
            { i: 'valid2', c: 'Another valid note', p: [100, 100] },
          ],
          c: [],
        },
      };

      expect(() => {
        provider.importJSON(JSON.stringify(malformedData));
      }).not.toThrow();

      // Should only import valid notes
      const snapshot = provider.getSnapshot();
      expect(snapshot.data.n).toHaveLength(2);
      expect(snapshot.data.n.map((n) => n.i)).toEqual(['valid', 'valid2']);
    });

    test('should handle malformed connections gracefully', () => {
      const malformedData = {
        data: {
          n: [{ i: 'note1', c: 'Test', p: [0, 0] }],
          c: [
            ['note1', 'note2', 1], // Valid connection
            null, // Invalid connection
            [], // Invalid connection
            ['incomplete'], // Invalid connection
            ['note1', 'note3', 2], // Another valid connection
          ],
        },
      };

      expect(() => {
        provider.importJSON(JSON.stringify(malformedData));
      }).not.toThrow();

      // Should only import valid connections
      const snapshot = provider.getSnapshot();
      expect(snapshot.data.c).toHaveLength(2);
      expect(snapshot.data.c).toContainEqual(['note1', 'note2', 1]);
      expect(snapshot.data.c).toContainEqual(['note1', 'note3', 2]);
    });

    test('should handle export errors gracefully', () => {
      // Mock getSnapshot to throw an error
      const originalGetSnapshot = provider.getSnapshot;
      provider.getSnapshot = () => {
        throw new Error('Snapshot generation failed');
      };

      expect(() => {
        provider.exportJSON();
      }).toThrow('Export failed: Snapshot generation failed');

      // Restore original method
      provider.getSnapshot = originalGetSnapshot;
    });

    test('should handle transaction errors during import', () => {
      // Mock Y.Doc transact to throw an error
      const originalTransact = provider._ydoc.transact;
      provider._ydoc.transact = () => {
        throw new Error('Transaction failed');
      };

      expect(() => {
        provider.importJSON('{"data":{"n":[],"c":[]}}');
      }).toThrow('Import failed: Transaction failed');

      // Restore original method
      provider._ydoc.transact = originalTransact;
    });
  });

  describe('Data Consistency Verification', () => {
    test('should emit correct change events during round trips', () => {
      const onChange = jest.fn();
      provider.subscribe(onChange);

      // Clear any existing change events
      onChange.mockClear();

      // Create some data
      provider.upsertNote({ id: 'test-note', content: 'Test' });
      expect(onChange).toHaveBeenCalledWith({
        type: 'notes',
        origin: ORIGIN.USER,
        payload: { id: 'test-note' },
      });

      onChange.mockClear();

      // Export (no events should be emitted)
      const exported = provider.exportJSON();
      expect(onChange).not.toHaveBeenCalled();

      // Import (should emit snapshot event with SYSTEM origin)
      provider.importJSON(exported);
      expect(onChange).toHaveBeenCalledWith({
        type: 'snapshot',
        origin: ORIGIN.SYSTEM,
        payload: null,
      });
    });

    test('should preserve object references correctly', () => {
      const testNote = {
        id: 'ref-test',
        content: 'Reference test',
        pos: [200, 300],
        color: 'green',
      };

      provider.upsertNote(testNote);

      // Export and re-import
      const exported = provider.exportJSON();
      provider.importJSON('{"data":{"n":[],"c":[]}}');
      provider.importJSON(exported);

      // Verify the data is equivalent but not the same reference
      const snapshot = provider.getSnapshot();
      const importedNote = snapshot.data.n.find((n) => n.i === 'ref-test');

      expect(importedNote).toEqual({
        i: 'ref-test',
        c: 'Reference test',
        p: [200, 300],
        cl: 'green',
      });

      // Verify it's not the same object reference
      expect(importedNote).not.toBe(testNote);
    });

    test('should handle concurrent operations during round trips', () => {
      // This test verifies that the provider handles operations correctly
      // even if they happen during import/export operations

      provider.upsertNote({ id: 'concurrent-1', content: 'Note 1' });

      const exported = provider.exportJSON();

      // Simulate concurrent operation during import
      provider.importJSON('{"data":{"n":[],"c":[]}}');
      provider.upsertNote({ id: 'concurrent-2', content: 'Note 2' });
      provider.importJSON(exported);

      // After import, should have note from export plus the concurrent note
      const snapshot = provider.getSnapshot();
      expect(snapshot.data.n).toHaveLength(1); // Only the imported note

      const importedNote = snapshot.data.n.find((n) => n.i === 'concurrent-1');
      expect(importedNote).toBeDefined();
      expect(importedNote.c).toBe('Note 1');

      // The concurrent note should have been cleared by the import
      const concurrentNote = snapshot.data.n.find(
        (n) => n.i === 'concurrent-2',
      );
      expect(concurrentNote).toBeUndefined();
    });
  });
});
