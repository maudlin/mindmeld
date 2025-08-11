// tests/unit/helpers/infrastructure.test.js
/**
 * Test the new test infrastructure components
 * Validates Phase 1 foundation before moving to Phase 2
 */

import { createTestApp } from '../../helpers/testApp.js';
import { mindMapMatchers } from '../../helpers/mindMapMatchers.js';
import {
  createConnectionManagerMock,
  createEventBusMock,
  createTestCanvas,
  createTestNote,
  cleanupTestElements,
} from '../../helpers/mockFactory.js';

// Extend Jest with our custom matchers
expect.extend(mindMapMatchers);

describe('Test Infrastructure Foundation', () => {
  let testApp;
  let testElements = [];

  afterEach(() => {
    if (testApp) {
      testApp.cleanup();
      testApp = null;
    }
    cleanupTestElements(...testElements);
    testElements = [];
  });

  describe('TestApp', () => {
    it('should create a lightweight app simulation', () => {
      testApp = createTestApp();

      expect(testApp.canvas).toBeInstanceOf(HTMLElement);
      expect(testApp.canvas.id).toBe('canvas');
      expect(testApp.eventBus).toBeDefined();
      expect(testApp.storage).toBeInstanceOf(Map);
    });

    it('should create and track notes', () => {
      testApp = createTestApp();

      const note1 = testApp.createNote(100, 200, 'First Note');
      testApp.createNote(300, 400, 'Second Note');

      expect(note1.id).toBeDefined();
      expect(note1.content).toBe('First Note');
      expect(testApp.notes.size).toBe(2);

      const state = testApp.getState();
      expect(state.notes).toHaveLength(2);
      expect(state.noteElements).toHaveLength(2);
    });

    it('should create and track connections', () => {
      testApp = createTestApp();

      const note1 = testApp.createNote(100, 200, 'Note 1');
      const note2 = testApp.createNote(300, 400, 'Note 2');

      const connection = testApp.createConnection(note1.id, note2.id, 'solid');

      expect(connection.from).toBe(note1.id);
      expect(connection.to).toBe(note2.id);
      expect(testApp.connections.size).toBe(1);

      const state = testApp.getState();
      expect(state.connections).toHaveLength(1);
      expect(state.connectionElements).toHaveLength(1);
    });
  });

  describe('Custom Matchers', () => {
    it('should validate mind map state with toMatchMindMapState', () => {
      testApp = createTestApp();

      testApp.createNote(100, 200, 'Note 1');
      testApp.createNote(300, 400, 'Note 2');

      expect(testApp).toMatchMindMapState({
        notes: [{ content: 'Note 1' }, { content: 'Note 2' }],
      });
    });

    it('should count notes with toHaveNoteCount', () => {
      const canvas = createTestCanvas();
      testElements.push(canvas);

      const note1 = createTestNote({ id: 'test1' });
      const note2 = createTestNote({ id: 'test2' });
      canvas.appendChild(note1);
      canvas.appendChild(note2);
      testElements.push(note1, note2);

      expect(canvas).toHaveNoteCount(2);
    });

    it('should validate connections with toHaveConnections', () => {
      testApp = createTestApp();

      const note1 = testApp.createNote(100, 200, 'Note 1');
      const note2 = testApp.createNote(300, 400, 'Note 2');
      testApp.createConnection(note1.id, note2.id, 'solid');

      expect(testApp).toHaveConnections([{ from: note1.id, to: note2.id }]);
    });
  });

  describe('Mock Factory', () => {
    it('should create consistent connection manager mocks', () => {
      const mockManager1 = createConnectionManagerMock();
      const mockManager2 = createConnectionManagerMock({
        createConnection: jest.fn().mockReturnValue('custom'),
      });

      expect(typeof mockManager1.createConnection).toBe('function');
      expect(mockManager1.CONNECTION_TYPES).toBeDefined();
      expect(mockManager2.createConnection()).toBe('custom');
    });

    it('should create functional event bus mocks', () => {
      const mockBus = createEventBusMock();
      const callback = jest.fn();

      mockBus.on('test.event', callback);
      mockBus.emit('test.event', { data: 'test' });

      expect(mockBus.on).toHaveBeenCalledWith('test.event', callback);
      expect(mockBus.emit).toHaveBeenCalledWith('test.event', { data: 'test' });
      expect(callback).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should create test DOM elements with proper structure', () => {
      const canvas = createTestCanvas({
        style: { backgroundColor: 'red' },
        appendToDocument: false,
      });

      const note = createTestNote({
        id: 'test-note',
        content: 'Test Content',
        color: 'green',
        x: 150,
        y: 250,
      });

      expect(canvas.id).toBe('canvas');
      expect(canvas.style.backgroundColor).toBe('red');
      expect(note.id).toBe('test-note');
      expect(note.textContent).toBe('Test Content');
      expect(note.classList.contains('color-green')).toBe(true);
      expect(note.style.left).toBe('150px');
      expect(note.style.top).toBe('250px');

      testElements.push(canvas, note);
    });
  });

  describe('Integration with Existing Utilities', () => {
    it('should work with existing colorTestUtils patterns', async () => {
      // Import existing utilities
      const { createTestNote: oldCreateTestNote } = await import(
        '../../unit/helpers/colorTestUtils.js'
      );

      // Test compatibility
      const oldNote = oldCreateTestNote('old-note', 'pink');
      const newNote = createTestNote({ id: 'new-note', color: 'pink' });

      expect(oldNote.classList.contains('color-pink')).toBe(true);
      expect(newNote.classList.contains('color-pink')).toBe(true);

      testElements.push(oldNote, newNote);
    });
  });
});

describe('Phase 1 Infrastructure Validation', () => {
  it('should provide foundation for Phase 2 E2E improvements', () => {
    // Verify all expected utilities exist
    expect(createTestApp).toBeInstanceOf(Function);
    expect(mindMapMatchers.toMatchMindMapState).toBeInstanceOf(Function);
    expect(createConnectionManagerMock).toBeInstanceOf(Function);

    // Verify infrastructure supports behavior testing
    const testApp = createTestApp();
    testApp.createNote(100, 100, 'Test');

    expect(testApp).toHaveNoteCount(1);
    expect(testApp).toMatchMindMapState({
      notes: [{ content: 'Test' }],
    });

    testApp.cleanup();
  });

  it('should enable state-based testing patterns', () => {
    const mockEventBus = createEventBusMock();
    const callback = jest.fn();

    mockEventBus.on('state.change', callback);
    mockEventBus.emit('state.change', { ready: true });

    expect(callback).toHaveBeenCalledWith({ ready: true });

    // This pattern will enable Phase 2 state-based waiting
    expect(callback.mock.calls[0][0].ready).toBe(true);
  });
});
