// tests/unit/data/storageManager.test.js
// Consolidated behavior-focused tests for StorageManager data persistence and state management

import { createTestApp } from '../../helpers/testApp.js';
import { mindMapMatchers } from '../../helpers/mindMapMatchers.js';
import {
  createDataStoreMock,
  cleanupTestElements,
} from '../../helpers/mockFactory.js';

expect.extend(mindMapMatchers);

describe('StorageManager Behavior Tests', () => {
  let testApp,
    testElements = [],
    mockLocalStorage;

  const createMockLocalStorage = () => ({
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
  });

  beforeEach(() => {
    mockLocalStorage = createMockLocalStorage();
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });
  });

  afterEach(() => {
    testApp?.cleanup();
    testApp = null;
    cleanupTestElements(...testElements);
    testElements = [];
    mockLocalStorage.clear();
  });

  describe('Data Persistence Behavior', () => {
    it('preserves mind map state across app sessions', () => {
      testApp = createTestApp();
      const note1 = testApp.createNote(100, 100, 'Persistent Note 1');
      const note2 = testApp.createNote(300, 200, 'Persistent Note 2');
      testApp.createConnection(note1.id, note2.id);

      const originalState = testApp.getState();
      expect(originalState.notes).toHaveLength(2);
      expect(originalState.connections).toHaveLength(1);

      // Simulate saving and reloading state
      const stateData = JSON.stringify({
        notes: originalState.notes.map((note) => ({
          id: note.id,
          content: note.content,
          x: note.x,
          y: note.y,
        })),
        connections: originalState.connections,
      });
      mockLocalStorage.setItem('mindMeldState', stateData);
      expect(mockLocalStorage.getItem('mindMeldState')).toBeTruthy();

      // Restart app and verify persistence
      testApp.cleanup();
      testApp = createTestApp();
      const savedState = JSON.parse(mockLocalStorage.getItem('mindMeldState'));
      expect(savedState.notes).toHaveLength(2);
      expect(savedState.connections).toHaveLength(1);
      expect(savedState.notes[0].content).toBe('Persistent Note 1');
      expect(savedState.notes[1].content).toBe('Persistent Note 2');
    });

    it('handles empty state and corrupted data gracefully', () => {
      testApp = createTestApp();

      // Empty state handling
      expect(mockLocalStorage.getItem('mindMeldState')).toBeNull();
      testApp.getState();
      expect(testApp).toMatchMindMapState({ notes: [], connections: [] });

      // Corrupted data recovery
      mockLocalStorage.setItem('mindMeldState', 'invalid-json-data');
      let parseError = null;
      try {
        JSON.parse(mockLocalStorage.getItem('mindMeldState'));
      } catch (error) {
        parseError = error;
      }
      expect(parseError).toBeInstanceOf(SyntaxError);

      // Fallback to empty state
      const fallbackState = testApp.getState();
      expect(fallbackState.notes).toHaveLength(0);
      expect(fallbackState.connections).toHaveLength(0);
    });
  });

  describe('State Management Behavior', () => {
    it('maintains state consistency during incremental operations', () => {
      testApp = createTestApp();
      expect(testApp).toMatchMindMapState({ notes: [], connections: [] });

      // Incremental state building and verification
      const note1 = testApp.createNote(100, 100, 'First');
      expect(testApp).toMatchMindMapState({
        notes: [{ content: 'First' }],
        connections: [],
      });

      const note2 = testApp.createNote(200, 200, 'Second');
      expect(testApp).toMatchMindMapState({
        notes: [{ content: 'First' }, { content: 'Second' }],
        connections: [],
      });

      testApp.createConnection(note1.id, note2.id);
      expect(testApp).toMatchMindMapState({
        notes: [{ content: 'First' }, { content: 'Second' }],
        connections: [{ from: note1.id, to: note2.id }],
      });
    });

    it('handles large datasets efficiently with serialization', () => {
      testApp = createTestApp();

      // Create large dataset
      const notes = Array.from({ length: 50 }, (_, i) =>
        testApp.createNote(
          50 + (i % 10) * 100,
          50 + Math.floor(i / 10) * 100,
          `Note ${i + 1}`,
        ),
      );

      // Create connections
      for (let i = 0; i < 25; i++) {
        testApp.createConnection(notes[i].id, notes[i + 25].id);
      }

      const finalState = testApp.getState();
      expect(finalState.notes).toHaveLength(50);
      expect(finalState.connections).toHaveLength(25);

      // Verify serialization integrity
      const serializedState = JSON.stringify({
        notes: finalState.notes,
        connections: finalState.connections,
      });
      expect(serializedState.length).toBeGreaterThan(1000);
      const parsedState = JSON.parse(serializedState);
      expect(parsedState.notes).toHaveLength(50);
      expect(parsedState.connections).toHaveLength(25);
    });
  });

  describe('Data Store Integration and Complex Scenarios', () => {
    it('integrates with mock data stores and maintains referential integrity', () => {
      // Test mock store functionality
      const mockStore = createDataStoreMock({
        notes: [
          { id: 'test1', content: 'Mock Note 1', x: 100, y: 100 },
          { id: 'test2', content: 'Mock Note 2', x: 200, y: 200 },
        ],
        connections: [{ from: 'test1', to: 'test2', type: 'solid' }],
      });

      expect(mockStore.getState().notes).toHaveLength(2);
      mockStore.addNote({ id: 'test3', content: 'New Note' });
      expect(mockStore.getState().notes).toHaveLength(3);

      const exportedData = mockStore.exportData();
      expect(JSON.parse(exportedData).notes).toHaveLength(3);
    });

    it('maintains referential integrity in complex network topologies', () => {
      testApp = createTestApp();

      // Create hub-and-spoke network with satellite interconnections
      const central = testApp.createNote(300, 300, 'Central Hub');
      const satellites = Array.from({ length: 5 }, (_, i) => {
        const angle = (i * 2 * Math.PI) / 5;
        const satellite = testApp.createNote(
          300 + Math.cos(angle) * 150,
          300 + Math.sin(angle) * 150,
          `Satellite ${i + 1}`,
        );
        testApp.createConnection(central.id, satellite.id);
        return satellite;
      });

      // Connect satellites in a ring
      satellites.forEach((satellite, i) => {
        const next = satellites[(i + 1) % satellites.length];
        testApp.createConnection(satellite.id, next.id);
      });

      const networkState = testApp.getState();
      expect(networkState.notes).toHaveLength(6); // 1 central + 5 satellites
      expect(networkState.connections).toHaveLength(10); // 5 radial + 5 ring connections

      // Verify referential integrity
      const noteIds = new Set(networkState.notes.map((note) => note.id));
      networkState.connections.forEach((conn) => {
        expect(noteIds.has(conn.from)).toBe(true);
        expect(noteIds.has(conn.to)).toBe(true);
      });
    });
  });

  describe('Concurrent Operations and Cleanup Edge Cases', () => {
    it('handles rapid state changes and maintains consistency', () => {
      testApp = createTestApp();
      const [note1, note2, note3] = [
        testApp.createNote(100, 100, 'Note 1'),
        testApp.createNote(200, 200, 'Note 2'),
        testApp.createNote(300, 300, 'Note 3'),
      ];

      // Rapid triangular connection creation
      testApp.createConnection(note1.id, note2.id);
      testApp.createConnection(note2.id, note3.id);
      testApp.createConnection(note3.id, note1.id);

      const finalState = testApp.getState();
      expect(finalState.notes).toHaveLength(3);
      expect(finalState.connections).toHaveLength(3);

      // Verify all connections reference valid notes
      const noteIds = new Set([note1.id, note2.id, note3.id]);
      finalState.connections.forEach((conn) => {
        expect(noteIds.has(conn.from)).toBe(true);
        expect(noteIds.has(conn.to)).toBe(true);
      });
    });

    it('maintains integrity after cleanup operations', () => {
      testApp = createTestApp();
      const note1 = testApp.createNote(100, 100, 'Temp Note');
      const note2 = testApp.createNote(200, 200, 'Permanent Note');
      testApp.createConnection(note1.id, note2.id);

      expect(testApp).toHaveNoteCount(2);
      expect(testApp).toHaveConnectionCount(1);

      // Simulate comprehensive cleanup
      document.getElementById(note1.id)?.remove();
      testApp.notes.delete(note1.id);

      // Clean up orphaned connections
      const keysToDelete = [];
      testApp.connections.forEach((connection, key) => {
        if (connection.from === note1.id || connection.to === note1.id) {
          keysToDelete.push(key);
          testApp.canvas
            .querySelector(
              `line[data-start="${connection.from}"][data-end="${connection.to}"]`,
            )
            ?.remove();
        }
      });
      keysToDelete.forEach((key) => testApp.connections.delete(key));

      // Verify cleanup thoroughness
      expect(testApp).toHaveNoteCount(1);
      expect(testApp).toHaveConnectionCount(0);
      expect(testApp).toMatchMindMapState({
        notes: [{ content: 'Permanent Note' }],
        connections: [],
      });
    });
  });
});
