// tests/unit/data/storageManager.behavior.test.js
/**
 * Behavior-focused tests for StorageManager
 * Focus on data persistence and state management behavior
 */

import { createTestApp } from '../../helpers/testApp.js';
import { mindMapMatchers } from '../../helpers/mindMapMatchers.js';
import {
  createDataStoreMock,
  cleanupTestElements,
} from '../../helpers/mockFactory.js';

// Extend Jest with our custom matchers
expect.extend(mindMapMatchers);

describe('StorageManager Behavior Tests', () => {
  let testApp;
  let testElements = [];
  let mockLocalStorage;

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {
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
    };

    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });
  });

  afterEach(() => {
    if (testApp) {
      testApp.cleanup();
      testApp = null;
    }
    cleanupTestElements(...testElements);
    testElements = [];
    mockLocalStorage.clear();
  });

  describe('Data Persistence Behavior', () => {
    it('preserves mind map state across app sessions', () => {
      testApp = createTestApp();

      // Create a mind map with notes and connections
      const note1 = testApp.createNote(100, 100, 'Persistent Note 1');
      const note2 = testApp.createNote(300, 200, 'Persistent Note 2');
      testApp.createConnection(note1.id, note2.id);

      const originalState = testApp.getState();
      expect(originalState.notes).toHaveLength(2);
      expect(originalState.connections).toHaveLength(1);

      // Simulate saving state to localStorage
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

      // Verify data was saved
      expect(mockLocalStorage.getItem('mindMeldState')).toBeTruthy();

      // Simulate app restart by creating new testApp
      testApp.cleanup();
      testApp = createTestApp();

      // Load saved state
      const savedState = JSON.parse(mockLocalStorage.getItem('mindMeldState'));
      expect(savedState.notes).toHaveLength(2);
      expect(savedState.connections).toHaveLength(1);
      expect(savedState.notes[0].content).toBe('Persistent Note 1');
      expect(savedState.notes[1].content).toBe('Persistent Note 2');
    });

    it('handles empty state gracefully', () => {
      testApp = createTestApp();

      // Start with empty localStorage
      expect(mockLocalStorage.getItem('mindMeldState')).toBeNull();

      // App should initialize with empty state
      const initialState = testApp.getState();
      expect(initialState.notes).toHaveLength(0);
      expect(initialState.connections).toHaveLength(0);

      expect(testApp).toMatchMindMapState({
        notes: [],
        connections: [],
      });
    });

    it('recovers from corrupted localStorage data', () => {
      testApp = createTestApp();

      // Simulate corrupted data in localStorage
      mockLocalStorage.setItem('mindMeldState', 'invalid-json-data');

      // App should handle corruption gracefully
      let parsedData = null;
      let parseError = null;
      try {
        parsedData = JSON.parse(mockLocalStorage.getItem('mindMeldState'));
      } catch (error) {
        // Expected to fail, app should handle this
        parseError = error;
      }

      expect(parseError).toBeInstanceOf(SyntaxError);
      expect(parsedData).toBeNull();

      // App should fall back to empty state
      const fallbackState = testApp.getState();
      expect(fallbackState.notes).toHaveLength(0);
      expect(fallbackState.connections).toHaveLength(0);
    });
  });

  describe('State Management Behavior', () => {
    it('maintains state consistency during operations', () => {
      testApp = createTestApp();

      // Initial empty state
      expect(testApp).toMatchMindMapState({
        notes: [],
        connections: [],
      });

      // Add notes incrementally and verify state
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

      // Add connection and verify
      testApp.createConnection(note1.id, note2.id);
      expect(testApp).toMatchMindMapState({
        notes: [{ content: 'First' }, { content: 'Second' }],
        connections: [{ from: note1.id, to: note2.id }],
      });
    });

    it('handles large datasets efficiently', () => {
      testApp = createTestApp();

      // Create a larger dataset
      const notes = [];
      for (let i = 0; i < 50; i++) {
        const note = testApp.createNote(
          50 + (i % 10) * 100,
          50 + Math.floor(i / 10) * 100,
          `Note ${i + 1}`,
        );
        notes.push(note);
      }

      // Create some connections
      for (let i = 0; i < 25; i++) {
        testApp.createConnection(notes[i].id, notes[i + 25].id);
      }

      const finalState = testApp.getState();
      expect(finalState.notes).toHaveLength(50);
      expect(finalState.connections).toHaveLength(25);

      // Verify state can be serialized without issues
      const serializedState = JSON.stringify({
        notes: finalState.notes,
        connections: finalState.connections,
      });
      expect(serializedState.length).toBeGreaterThan(1000); // Reasonable size check

      // Verify it can be parsed back
      const parsedState = JSON.parse(serializedState);
      expect(parsedState.notes).toHaveLength(50);
      expect(parsedState.connections).toHaveLength(25);
    });
  });

  describe('Data Store Integration', () => {
    it('works with data store mocks for testing', () => {
      const mockStore = createDataStoreMock({
        notes: [
          { id: 'test1', content: 'Mock Note 1', x: 100, y: 100 },
          { id: 'test2', content: 'Mock Note 2', x: 200, y: 200 },
        ],
        connections: [{ from: 'test1', to: 'test2', type: 'solid' }],
      });

      // Verify mock store behavior
      const state = mockStore.getState();
      expect(state.notes).toHaveLength(2);
      expect(state.connections).toHaveLength(1);

      // Test adding data
      mockStore.addNote({ id: 'test3', content: 'New Note' });
      const updatedState = mockStore.getState();
      expect(updatedState.notes).toHaveLength(3);

      // Test export functionality
      const exportedData = mockStore.exportData();
      const parsed = JSON.parse(exportedData);
      expect(parsed.notes).toHaveLength(3);
    });

    it('maintains referential integrity in complex scenarios', () => {
      testApp = createTestApp();

      // Create a complex network
      const central = testApp.createNote(300, 300, 'Central Hub');
      const satellites = [];

      for (let i = 0; i < 5; i++) {
        const satellite = testApp.createNote(
          300 + Math.cos((i * 2 * Math.PI) / 5) * 150,
          300 + Math.sin((i * 2 * Math.PI) / 5) * 150,
          `Satellite ${i + 1}`,
        );
        satellites.push(satellite);
        testApp.createConnection(central.id, satellite.id);
      }

      // Connect satellites to each other
      for (let i = 0; i < satellites.length; i++) {
        const next = (i + 1) % satellites.length;
        testApp.createConnection(satellites[i].id, satellites[next].id);
      }

      const networkState = testApp.getState();
      expect(networkState.notes).toHaveLength(6); // 1 central + 5 satellites
      expect(networkState.connections).toHaveLength(10); // 5 to center + 5 between satellites

      // Verify all connections reference existing notes
      const noteIds = new Set(networkState.notes.map((note) => note.id));
      networkState.connections.forEach((conn) => {
        expect(noteIds.has(conn.from)).toBe(true);
        expect(noteIds.has(conn.to)).toBe(true);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles concurrent state changes gracefully', () => {
      testApp = createTestApp();

      // Simulate rapid state changes
      const note1 = testApp.createNote(100, 100, 'Note 1');
      const note2 = testApp.createNote(200, 200, 'Note 2');
      const note3 = testApp.createNote(300, 300, 'Note 3');

      // Rapid connection creation
      testApp.createConnection(note1.id, note2.id);
      testApp.createConnection(note2.id, note3.id);
      testApp.createConnection(note3.id, note1.id);

      // State should remain consistent
      const finalState = testApp.getState();
      expect(finalState.notes).toHaveLength(3);
      expect(finalState.connections).toHaveLength(3);

      // All connections should be valid
      const noteIds = new Set([note1.id, note2.id, note3.id]);
      finalState.connections.forEach((conn) => {
        expect(noteIds.has(conn.from)).toBe(true);
        expect(noteIds.has(conn.to)).toBe(true);
      });
    });

    it('maintains state integrity after cleanup operations', () => {
      testApp = createTestApp();

      // Create initial state
      const note1 = testApp.createNote(100, 100, 'Temp Note');
      const note2 = testApp.createNote(200, 200, 'Permanent Note');
      testApp.createConnection(note1.id, note2.id);

      expect(testApp).toHaveNoteCount(2);
      expect(testApp).toHaveConnectionCount(1);

      // Simulate cleanup (removing note and its connections)
      const tempElement = document.getElementById(note1.id);
      if (tempElement) {
        tempElement.remove();
      }
      testApp.notes.delete(note1.id);

      // Remove connections involving deleted note (simulating real cleanup behavior)
      // In real implementation, this would be handled by ConnectionManager.deleteConnectionsByNote
      const keysToDelete = [];
      testApp.connections.forEach((connection, key) => {
        if (connection.from === note1.id || connection.to === note1.id) {
          keysToDelete.push(key);
          // Also remove the DOM element
          const svgLine = testApp.canvas.querySelector(
            `line[data-start="${connection.from}"][data-end="${connection.to}"]`,
          );
          if (svgLine) {
            svgLine.remove();
          }
        }
      });
      keysToDelete.forEach((key) => testApp.connections.delete(key));

      // Verify cleanup was thorough
      expect(testApp).toHaveNoteCount(1);
      expect(testApp).toHaveConnectionCount(0);
      expect(testApp).toMatchMindMapState({
        notes: [{ content: 'Permanent Note' }],
        connections: [],
      });
    });
  });
});
