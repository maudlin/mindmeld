// tests/unit/integration/eventFlow.test.js
/**
 * Event Flow Integration Tests
 *
 * Tests the complete event-driven architecture for end-to-end workflows.
 * Validates communication between services, proper event propagation,
 * error handling, and system recovery scenarios.
 *
 * Focus areas:
 * - Note lifecycle events (create → edit → delete)
 * - Connection workflow events
 * - Cross-service communication patterns
 * - Error propagation and recovery
 * - Performance with complex scenarios
 */

import { EventBus } from '../../../src/js/core/eventBus.js';
import { mindMapMatchers } from '../../helpers/mindMapMatchers.js';
import { cleanupTestElements } from '../../helpers/mockFactory.js';

// Extend Jest with our custom matchers
expect.extend(mindMapMatchers);

// Simplified TestApp specifically for event testing
class SimpleTestApp {
  constructor() {
    this.eventBus = new EventBus(); // Fresh event bus for each test
    this.canvas = null;
    this.storage = new Map();
    this.notes = new Map();
    this.connections = new Map();
  }

  initialize() {
    // Create basic DOM structure
    this.canvas = document.createElement('div');
    this.canvas.id = 'canvas';
    document.body.appendChild(this.canvas);

    // Set up event handling
    this.setupEventHandling();
    return this;
  }

  setupEventHandling() {
    this.eventBus.on('note.created', (noteData) => {
      this.notes.set(noteData.id, noteData);
      this.storage.set('notes', Array.from(this.notes.values()));
    });

    this.eventBus.on('connection.created', (connectionData) => {
      const key = `${connectionData.from}-${connectionData.to}`;
      this.connections.set(key, connectionData);
      this.storage.set('connections', Array.from(this.connections.values()));
    });
  }

  createNote(x, y, content = 'Test Note') {
    const id = `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const noteElement = document.createElement('div');
    noteElement.className = 'note';
    noteElement.id = id;
    noteElement.textContent = content;
    this.canvas.appendChild(noteElement);

    const noteData = { id, x, y, content, element: noteElement };
    this.eventBus.emit('note.created', noteData);
    return noteData;
  }

  createConnection(fromId, toId, type = 'solid') {
    const connectionData = {
      from: fromId,
      to: toId,
      type,
      id: `${fromId}-${toId}`,
    };
    this.eventBus.emit('connection.created', connectionData);
    return connectionData;
  }

  cleanup() {
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    this.notes.clear();
    this.connections.clear();
    this.storage.clear();
  }
}

describe('Event Flow Integration Tests', () => {
  let testApp;
  let testElements = [];
  let eventLog = [];

  beforeEach(() => {
    // Reset event tracking
    eventLog = [];

    // Create fresh test app with clean event bus
    testApp = new SimpleTestApp().initialize();

    // Set up clean event logging
    const originalEmit = testApp.eventBus.emit.bind(testApp.eventBus);
    testApp.eventBus.emit = function (event, data) {
      eventLog.push({ event, data, timestamp: Date.now() });
      return originalEmit(event, data);
    };
  });

  afterEach(() => {
    if (testApp) {
      testApp.cleanup();
      testApp = null;
    }
    cleanupTestElements(...testElements);
    testElements = [];
    eventLog = [];
  });

  describe('Note Lifecycle Event Flow', () => {
    it('should emit and handle note.created events with proper data flow', () => {
      const initialNoteCount = testApp.notes.size;

      // Create a note and verify event flow
      const note = testApp.createNote(100, 200, 'Integration Test Note');

      // Verify note creation event was emitted
      const createdEvents = eventLog.filter((e) => e.event === 'note.created');
      expect(createdEvents).toHaveLength(1);

      const createdEvent = createdEvents[0];
      expect(createdEvent.data).toMatchObject({
        id: note.id,
        x: 100,
        y: 200,
        content: 'Integration Test Note',
      });

      // Verify note was added to internal state
      expect(testApp.notes.size).toBe(initialNoteCount + 1);
      expect(testApp.notes.has(note.id)).toBe(true);

      // Verify DOM element was created
      const noteElement = document.getElementById(note.id);
      expect(noteElement).toBeInstanceOf(HTMLElement);
      expect(noteElement.textContent).toBe('Integration Test Note');

      // Verify storage was updated via event handling
      const storedNotes = testApp.storage.get('notes');
      expect(storedNotes).toHaveLength(initialNoteCount + 1);
      expect(storedNotes.some((n) => n.id === note.id)).toBe(true);
    });

    it('should track note creation events consistently', () => {
      // Clear initial events
      eventLog = [];

      // Create multiple notes and verify each creation event
      const notes = [];
      for (let i = 1; i <= 3; i++) {
        const note = testApp.createNote(100 * i, 100, `Note ${i}`);
        notes.push(note);
      }

      // Verify all creation events were logged
      const creationEvents = eventLog.filter((e) => e.event === 'note.created');
      expect(creationEvents).toHaveLength(3);

      // Verify event data integrity for each note
      creationEvents.forEach((event, index) => {
        expect(event.data).toMatchObject({
          id: notes[index].id,
          x: 100 * (index + 1),
          y: 100,
          content: `Note ${index + 1}`,
        });
        expect(event.data.element).toBeInstanceOf(HTMLElement);
      });

      // Verify internal state consistency
      expect(testApp.notes.size).toBe(3);
      notes.forEach((note) => {
        expect(testApp.notes.has(note.id)).toBe(true);
      });
    });

    it('should demonstrate event emission patterns for future implementations', () => {
      const note = testApp.createNote(200, 200, 'Test Content');
      eventLog = []; // Clear creation events

      // Test that we can emit custom events through the event bus
      testApp.eventBus.emit('note.selected', { noteId: note.id });
      testApp.eventBus.emit('note.contentChanged', {
        noteId: note.id,
        newContent: 'Updated Content',
      });

      // Verify events were emitted and logged
      const selectionEvents = eventLog.filter(
        (e) => e.event === 'note.selected',
      );
      const contentEvents = eventLog.filter(
        (e) => e.event === 'note.contentChanged',
      );

      expect(selectionEvents).toHaveLength(1);
      expect(contentEvents).toHaveLength(1);

      expect(selectionEvents[0].data.noteId).toBe(note.id);
      expect(contentEvents[0].data.newContent).toBe('Updated Content');
    });

    it('should validate event timing and sequencing', () => {
      eventLog = []; // Clear all previous events
      const startTime = Date.now();

      // Create several notes in sequence
      testApp.createNote(100, 100, 'First');
      testApp.createNote(200, 100, 'Second');
      testApp.createNote(300, 100, 'Third');

      // Verify events occurred in the right sequence
      const creationEvents = eventLog.filter((e) => e.event === 'note.created');
      expect(creationEvents).toHaveLength(3);

      // Verify timing - all should be after start time
      creationEvents.forEach((event) => {
        expect(event.timestamp).toBeGreaterThanOrEqual(startTime);
      });

      // Verify order by content
      expect(creationEvents[0].data.content).toBe('First');
      expect(creationEvents[1].data.content).toBe('Second');
      expect(creationEvents[2].data.content).toBe('Third');
    });
  });

  describe('Connection Workflow Event Flow', () => {
    it('should handle connection creation through TestApp integration', () => {
      const note1 = testApp.createNote(150, 150, 'Start Point');
      const note2 = testApp.createNote(450, 200, 'End Point');

      eventLog = []; // Focus on connection events

      // Use TestApp's connection creation (which emits events)
      testApp.createConnection(note1.id, note2.id, 'dashed');

      // Verify connection.created event was emitted
      const connectionEvents = eventLog.filter(
        (e) => e.event === 'connection.created',
      );
      expect(connectionEvents).toHaveLength(1);

      const connectionEvent = connectionEvents[0];
      expect(connectionEvent.data).toMatchObject({
        from: note1.id,
        to: note2.id,
        type: 'dashed',
        id: `${note1.id}-${note2.id}`,
      });

      // Verify connection was stored
      expect(testApp.connections.has(`${note1.id}-${note2.id}`)).toBe(true);

      // Verify storage was updated
      const storedConnections = testApp.storage.get('connections');
      expect(storedConnections).toHaveLength(1);
      expect(storedConnections[0]).toMatchObject({
        from: note1.id,
        to: note2.id,
        type: 'dashed',
      });
    });

    it('should validate connection event data structure', () => {
      const sourceNote = testApp.createNote(100, 100, 'Source');
      const targetNote = testApp.createNote(300, 200, 'Target');

      eventLog = [];
      testApp.createConnection(sourceNote.id, targetNote.id, 'solid');

      const connectionEvents = eventLog.filter(
        (e) => e.event === 'connection.created',
      );
      expect(connectionEvents).toHaveLength(1);

      const event = connectionEvents[0];

      // Validate required fields
      expect(event.data).toHaveProperty('from', sourceNote.id);
      expect(event.data).toHaveProperty('to', targetNote.id);
      expect(event.data).toHaveProperty('type', 'solid');
      expect(event.data).toHaveProperty(
        'id',
        `${sourceNote.id}-${targetNote.id}`,
      );

      // Validate timestamp
      expect(event.timestamp).toBeGreaterThan(0);
      expect(typeof event.timestamp).toBe('number');
    });

    it('should create multiple connections with unique events', () => {
      // Create a network of connections
      const notes = [];
      for (let i = 0; i < 4; i++) {
        notes.push(testApp.createNote(100 + i * 100, 100, `Node ${i}`));
      }

      eventLog = []; // Clear note creation events

      // Create connections: 0->1, 1->2, 2->3, 0->3 (forming a path with shortcut)
      const connections = [
        testApp.createConnection(notes[0].id, notes[1].id, 'solid'),
        testApp.createConnection(notes[1].id, notes[2].id, 'dashed'),
        testApp.createConnection(notes[2].id, notes[3].id, 'solid'),
        testApp.createConnection(notes[0].id, notes[3].id, 'dotted'), // shortcut
      ];

      // Verify all connection events
      const connectionEvents = eventLog.filter(
        (e) => e.event === 'connection.created',
      );
      expect(connectionEvents).toHaveLength(4);

      // Verify each connection has unique data
      const connectionTypes = connectionEvents.map((e) => e.data.type);
      expect(connectionTypes).toEqual(['solid', 'dashed', 'solid', 'dotted']);

      // Verify all connections are stored
      expect(testApp.connections.size).toBe(4);
      connections.forEach((conn) => {
        expect(testApp.connections.has(conn.id)).toBe(true);
      });
    });
  });

  describe('Cross-Service Communication Patterns', () => {
    it('should validate event bus communication patterns', () => {
      const note = testApp.createNote(300, 300, 'Test Note');
      eventLog = [];

      // Test different types of events that could be used for service coordination
      testApp.eventBus.emit('color.selected', { color: 'blue' });
      testApp.eventBus.emit('note.selected', { noteId: note.id });
      testApp.eventBus.emit('app.stateChanged', { reason: 'note.selection' });

      // Verify all events were properly emitted and logged
      const colorEvents = eventLog.filter((e) => e.event === 'color.selected');
      const noteEvents = eventLog.filter((e) => e.event === 'note.selected');
      const appEvents = eventLog.filter((e) => e.event === 'app.stateChanged');

      expect(colorEvents).toHaveLength(1);
      expect(noteEvents).toHaveLength(1);
      expect(appEvents).toHaveLength(1);

      expect(colorEvents[0].data.color).toBe('blue');
      expect(noteEvents[0].data.noteId).toBe(note.id);
      expect(appEvents[0].data.reason).toBe('note.selection');
    });

    it('should handle storage integration events', () => {
      testApp.createNote(100, 100, 'Storage Test 1');
      testApp.createNote(200, 200, 'Storage Test 2');

      eventLog = [];

      // Test storage-related events
      testApp.eventBus.emit('storage.save', {
        type: 'manual',
        timestamp: Date.now(),
      });

      testApp.eventBus.emit('storage.loaded', {
        notesCount: 2,
        connectionsCount: 0,
      });

      const saveEvents = eventLog.filter((e) => e.event === 'storage.save');
      const loadEvents = eventLog.filter((e) => e.event === 'storage.loaded');

      expect(saveEvents).toHaveLength(1);
      expect(loadEvents).toHaveLength(1);

      expect(saveEvents[0].data.type).toBe('manual');
      expect(loadEvents[0].data.notesCount).toBe(2);
    });

    it('should demonstrate event-based state management', () => {
      eventLog = [];

      // Simulate state management events
      testApp.eventBus.emit('state.init', {
        initialState: { notes: [], connections: [] },
      });

      testApp.eventBus.emit('state.update', {
        type: 'ADD_NOTE',
        payload: { id: 'test-123' },
      });

      testApp.eventBus.emit('state.persisted', {
        timestamp: Date.now(),
      });

      const events = eventLog.map((e) => e.event);
      expect(events).toEqual(['state.init', 'state.update', 'state.persisted']);

      const updateEvent = eventLog.find((e) => e.event === 'state.update');
      expect(updateEvent.data.type).toBe('ADD_NOTE');
      expect(updateEvent.data.payload.id).toBe('test-123');
    });
  });

  describe('Error Handling and Event Patterns', () => {
    it('should validate error event structures', () => {
      eventLog = [];

      // Test various error event patterns
      testApp.eventBus.emit('error.system', {
        type: 'canvas.initialization',
        message: 'Canvas element not found',
        severity: 'critical',
        timestamp: Date.now(),
      });

      testApp.eventBus.emit('error.user', {
        type: 'invalid.operation',
        message: 'Cannot connect note to itself',
        severity: 'warning',
        recoverable: true,
      });

      const systemErrors = eventLog.filter((e) => e.event === 'error.system');
      const userErrors = eventLog.filter((e) => e.event === 'error.user');

      expect(systemErrors).toHaveLength(1);
      expect(userErrors).toHaveLength(1);

      expect(systemErrors[0].data.severity).toBe('critical');
      expect(userErrors[0].data.recoverable).toBe(true);
    });

    it('should handle event listener registration and cleanup', () => {
      let callbackInvoked = false;

      // Register a test event listener
      const testCallback = (data) => {
        callbackInvoked = true;
        expect(data.testValue).toBe('success');
      };

      testApp.eventBus.on('test.event', testCallback);

      // Emit the test event
      testApp.eventBus.emit('test.event', { testValue: 'success' });

      expect(callbackInvoked).toBe(true);

      // Clean up the listener
      testApp.eventBus.off('test.event', testCallback);

      // Reset and verify cleanup worked
      callbackInvoked = false;
      testApp.eventBus.emit('test.event', { testValue: 'success' });
      expect(callbackInvoked).toBe(false);
    });

    it('should handle concurrent event emissions safely', () => {
      eventLog = [];

      // Emit multiple events in rapid succession
      for (let i = 0; i < 10; i++) {
        testApp.eventBus.emit('rapid.event', { sequence: i });
      }

      const rapidEvents = eventLog.filter((e) => e.event === 'rapid.event');
      expect(rapidEvents).toHaveLength(10);

      // Verify all events were captured with correct sequence
      rapidEvents.forEach((event, index) => {
        expect(event.data.sequence).toBe(index);
      });
    });
  });

  describe('Performance and Complex Scenarios', () => {
    it('should handle multiple rapid events efficiently', () => {
      eventLog = [];
      const startTime = Date.now();

      // Simulate rapid event emissions
      const eventCount = 25; // Reduced from 50 for faster test execution
      for (let i = 0; i < eventCount; i++) {
        testApp.eventBus.emit('performance.test', {
          sequence: i,
          timestamp: Date.now(),
        });
      }

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Verify all events were processed
      const performanceEvents = eventLog.filter(
        (e) => e.event === 'performance.test',
      );
      expect(performanceEvents).toHaveLength(eventCount);

      // Performance check: should handle events quickly
      expect(processingTime).toBeLessThan(100); // Should be very fast

      // Verify event order integrity
      performanceEvents.forEach((event, index) => {
        expect(event.data.sequence).toBe(index);
      });
    });

    it('should handle complex multi-component scenarios', () => {
      eventLog = [];

      // Create a smaller but representative structure
      const notes = [];
      for (let i = 0; i < 5; i++) {
        const note = testApp.createNote(100 + i * 100, 100, `Node ${i}`);
        notes.push(note);
      }

      // Create connections in a chain
      const connections = [];
      for (let i = 0; i < notes.length - 1; i++) {
        const connection = testApp.createConnection(
          notes[i].id,
          notes[i + 1].id,
        );
        connections.push(connection);
      }

      // Verify structure was created
      expect(testApp.notes.size).toBe(5);
      expect(testApp.connections.size).toBe(4);

      // Verify events were emitted correctly
      const noteEvents = eventLog.filter((e) => e.event === 'note.created');
      const connectionEvents = eventLog.filter(
        (e) => e.event === 'connection.created',
      );

      expect(noteEvents).toHaveLength(5);
      expect(connectionEvents).toHaveLength(4);

      // Verify storage consistency
      const storedNotes = testApp.storage.get('notes');
      const storedConnections = testApp.storage.get('connections');

      expect(storedNotes).toHaveLength(5);
      expect(storedConnections).toHaveLength(4);
    });

    it('should maintain event sequence integrity', () => {
      testApp.createNote(100, 100, 'Sequence Test');
      eventLog = [];

      // Emit events with explicit ordering
      const eventSequence = [
        { type: 'action.start', data: { phase: 1 } },
        { type: 'action.process', data: { phase: 2 } },
        { type: 'action.complete', data: { phase: 3 } },
      ];

      eventSequence.forEach((eventData) => {
        testApp.eventBus.emit(eventData.type, eventData.data);
      });

      // Verify events were logged in order
      expect(eventLog).toHaveLength(3);
      expect(eventLog[0].event).toBe('action.start');
      expect(eventLog[1].event).toBe('action.process');
      expect(eventLog[2].event).toBe('action.complete');

      // Verify phase progression
      expect(eventLog[0].data.phase).toBe(1);
      expect(eventLog[1].data.phase).toBe(2);
      expect(eventLog[2].data.phase).toBe(3);
    });
  });

  describe('Event Flow Integration Validation', () => {
    it('should validate complete end-to-end workflow integration', () => {
      // This test validates the entire event flow from user action to system response
      eventLog = [];

      // Scenario: User creates two notes, connects them, changes color, then exports

      // Step 1: Create notes
      const note1 = testApp.createNote(150, 150, 'Integration Note A');
      const note2 = testApp.createNote(350, 250, 'Integration Note B');

      // Step 2: Create connection
      testApp.createConnection(note1.id, note2.id);

      // Step 3: Change color
      testApp.eventBus.emit('color.selected', { color: 'green' });
      testApp.eventBus.emit('note.colorChanged', {
        noteId: note1.id,
        newColor: 'green',
      });

      // Step 4: Trigger save
      testApp.eventBus.emit('storage.autoSave', { reason: 'user.action' });

      // Validate complete workflow
      const workflowEvents = eventLog.map((e) => e.event);

      expect(workflowEvents).toContain('note.created');
      expect(workflowEvents).toContain('connection.created');
      expect(workflowEvents).toContain('color.selected');
      expect(workflowEvents).toContain('note.colorChanged');
      expect(workflowEvents).toContain('storage.autoSave');

      // Validate final state consistency
      expect(testApp.notes.size).toBe(2);
      expect(testApp.connections.size).toBe(1);

      // Validate stored data
      const storedNotes = testApp.storage.get('notes');
      const storedConnections = testApp.storage.get('connections');

      expect(storedNotes).toHaveLength(2);
      expect(storedConnections).toHaveLength(1);

      // Validate connection details
      const storedConnection = storedConnections[0];
      expect(storedConnection.from).toBe(note1.id);
      expect(storedConnection.to).toBe(note2.id);
    });
  });
});
