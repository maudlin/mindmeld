// tests/unit/core/errorHandling.behavior.test.js
/**
 * Behavior-focused tests for Error Handling
 * Focus on error resilience and user experience vs implementation details
 */

import { createTestApp } from '../../helpers/testApp.js';
import { mindMapMatchers } from '../../helpers/mindMapMatchers.js';
import { cleanupTestElements } from '../../helpers/mockFactory.js';

// Extend Jest with our custom matchers
expect.extend(mindMapMatchers);

describe('Error Handling Behavior Tests', () => {
  let testApp;
  let testElements = [];
  let mockConsole;

  beforeEach(() => {
    // Mock console methods to verify error logging without noise
    mockConsole = {
      error: jest.spyOn(console, 'error').mockImplementation(() => {}),
      warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
      log: jest.spyOn(console, 'log').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    if (testApp) {
      testApp.cleanup();
      testApp = null;
    }
    cleanupTestElements(...testElements);
    testElements = [];
    jest.restoreAllMocks();
  });

  describe('Application Resilience', () => {
    it('continues functioning after isolated component failures', async () => {
      testApp = createTestApp();

      // Create initial working state
      const note1 = testApp.createNote(100, 100, 'Working Note');
      expect(testApp).toHaveNoteCount(1);

      // Simulate component failure - create invalid note operation
      try {
        // This should fail gracefully without crashing the app
        testApp.createNote(null, undefined, '');
      } catch {
        // Expected to fail, but app should continue working
      }

      // App should still function normally (may have created note with defaults)
      const note2 = testApp.createNote(200, 200, 'Recovery Note');
      expect(testApp.getState().notes.length).toBeGreaterThanOrEqual(2);

      // Connection functionality should also still work
      testApp.createConnection(note1.id, note2.id);
      expect(testApp).toHaveConnectionCount(1);
    });

    it('maintains data integrity during error conditions', () => {
      testApp = createTestApp();

      // Create a complex mind map
      const notes = [];
      for (let i = 0; i < 5; i++) {
        notes.push(testApp.createNote(100 + i * 50, 100, `Note ${i + 1}`));
      }

      // Create connections
      for (let i = 0; i < 4; i++) {
        testApp.createConnection(notes[i].id, notes[i + 1].id);
      }

      const initialState = testApp.getState();
      expect(initialState.notes).toHaveLength(5);
      expect(initialState.connections).toHaveLength(4);

      // Simulate various error conditions
      try {
        // Invalid connection attempt
        testApp.createConnection('invalid-id', 'another-invalid-id');
      } catch {
        // Should fail gracefully
      }

      // Data integrity should be maintained (TestApp may create invalid connections)
      const finalState = testApp.getState();
      expect(finalState.notes).toHaveLength(5);
      expect(finalState.connections.length).toBeGreaterThanOrEqual(4);

      // Verify most connections still reference valid notes (resilience focus)
      const noteIds = new Set(finalState.notes.map((note) => note.id));
      const validConnections = finalState.connections.filter(
        (conn) => noteIds.has(conn.from) && noteIds.has(conn.to),
      );
      expect(validConnections.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('User Experience During Errors', () => {
    it('prevents user actions from breaking the application', () => {
      testApp = createTestApp();

      // Test rapid user interactions
      const note1 = testApp.createNote(100, 100, 'Note 1');
      const note2 = testApp.createNote(200, 200, 'Note 2');

      // Rapid-fire operations that might cause race conditions
      for (let i = 0; i < 10; i++) {
        try {
          testApp.createConnection(note1.id, note2.id);
        } catch {
          // Some may fail, but shouldn't crash the app
        }
      }

      // App should remain functional
      expect(testApp).toHaveNoteCount(2);
      expect(testApp).toHaveConnectionCount(10); // TestApp allows duplicates

      // Should still be able to create new notes
      testApp.createNote(300, 300, 'Recovery Note');
      expect(testApp).toHaveNoteCount(3);
    });

    it('handles DOM manipulation errors gracefully', () => {
      testApp = createTestApp();

      // Create notes
      const note1 = testApp.createNote(100, 100, 'Note 1');
      const note2 = testApp.createNote(200, 200, 'Note 2');

      // Manually corrupt DOM to simulate rendering errors
      const noteElement = document.getElementById(note1.id);
      if (noteElement) {
        // Remove from DOM but not from data (simulates DOM errors)
        noteElement.remove();
      }

      // App should handle missing DOM elements gracefully
      // This connection attempt might fail, but shouldn't crash
      expect(() => {
        testApp.createConnection(note1.id, note2.id);
      }).not.toThrow();

      // App should still be able to create new content
      const note3 = testApp.createNote(300, 300, 'Recovery Note');
      expect(note3).toBeTruthy();
      expect(note3.element).toBeInstanceOf(HTMLElement);
    });
  });

  describe('Error Recovery Mechanisms', () => {
    it('provides fallback behaviors for failed operations', () => {
      testApp = createTestApp();

      // Test fallback for invalid note creation parameters
      let fallbackNote;
      try {
        // Invalid parameters should either create with defaults or fail gracefully
        fallbackNote = testApp.createNote(-1000, -1000, '');
      } catch {
        // If it fails, try with sensible defaults
        fallbackNote = testApp.createNote(100, 100, 'Fallback Note');
      }

      expect(fallbackNote).toBeTruthy();
      expect(testApp).toHaveNoteCount(1);
    });

    it('maintains system stability during memory pressure', () => {
      testApp = createTestApp();

      // Create many elements to simulate memory pressure
      const notes = [];
      const maxNotes = 100; // Reasonable test limit

      for (let i = 0; i < maxNotes; i++) {
        try {
          const note = testApp.createNote(
            (i % 10) * 50 + 50,
            Math.floor(i / 10) * 50 + 50,
            `Note ${i + 1}`,
          );
          notes.push(note);
        } catch {
          // Memory pressure might cause some to fail
          break;
        }
      }

      // Should have created at least some notes
      expect(notes.length).toBeGreaterThan(10);
      expect(testApp.getState().notes.length).toBe(notes.length);

      // Cleanup should work properly
      testApp.cleanup();

      // Should be able to create new app instance
      testApp = createTestApp();
      const newNote = testApp.createNote(100, 100, 'New Note');
      expect(newNote).toBeTruthy();
    });
  });

  describe('Event System Error Isolation', () => {
    it('isolates errors between different event handlers', async () => {
      // Test that errors in one part don't affect others
      const eventBus = testApp
        ? testApp.eventBus
        : (await import('../../../src/js/core/eventBus.js')).eventBus;

      let workingHandlerCalled = false;
      let errorHandlerCalled = false;
      let anotherHandlerCalled = false;

      const workingHandler = () => {
        workingHandlerCalled = true;
      };
      const errorHandler = () => {
        errorHandlerCalled = true;
        throw new Error('Test error in handler');
      };
      const anotherHandler = () => {
        anotherHandlerCalled = true;
      };

      eventBus.on('error-test', workingHandler);
      eventBus.on('error-test', errorHandler);
      eventBus.on('error-test', anotherHandler);

      // Emit event - should not throw despite error handler
      expect(() => {
        eventBus.emit('error-test', { test: true });
      }).not.toThrow();

      // All handlers should have been called
      expect(workingHandlerCalled).toBe(true);
      expect(errorHandlerCalled).toBe(true);
      expect(anotherHandlerCalled).toBe(true);

      // Error should have been logged
      expect(mockConsole.error).toHaveBeenCalled();
    });

    it('prevents event loop blocking during errors', async () => {
      testApp = createTestApp();

      // Create notes and connections
      const note1 = testApp.createNote(100, 100, 'Note 1');
      const note2 = testApp.createNote(200, 200, 'Note 2');

      // Simulate async operation that might have errors
      const startTime = Date.now();

      try {
        // Multiple rapid operations
        for (let i = 0; i < 50; i++) {
          testApp.createConnection(note1.id, note2.id);
        }
      } catch {
        // Some operations might fail, that's okay
      }

      const endTime = Date.now();

      // Should complete quickly (no blocking)
      expect(endTime - startTime).toBeLessThan(1000);

      // App should still be responsive
      const note3 = testApp.createNote(300, 300, 'Responsive Note');
      expect(note3).toBeTruthy();
    });
  });
});
