// tests/helpers/mindMapMatchers.js
/**
 * Custom Jest matchers for behavior-focused MindMeld testing
 * Focus on user-observable outcomes rather than implementation details
 */

import { expect } from '@jest/globals';

export const mindMapMatchers = {
  /**
   * Verify that a mind map contains expected notes with properties
   * @param {Object} received - The test app or DOM container
   * @param {Array} expectedNotes - Array of expected note objects
   */
  toContainNotes(received, expectedNotes) {
    const container = received.canvas || received;
    const noteElements = container.querySelectorAll('.note');
    const actualNotes = Array.from(noteElements).map((el) => ({
      id: el.id,
      content: el.textContent.trim(),
      position: [parseInt(el.style.left), parseInt(el.style.top)],
      color:
        Array.from(el.classList)
          .find((cls) => cls.startsWith('color-'))
          ?.replace('color-', '') || null,
    }));

    const pass = expectedNotes.every((expectedNote) => {
      return actualNotes.some((actualNote) => {
        const matchesId = !expectedNote.id || actualNote.id === expectedNote.id;
        const matchesContent =
          !expectedNote.content || actualNote.content === expectedNote.content;
        const matchesPosition =
          !expectedNote.position ||
          (Math.abs(actualNote.position[0] - expectedNote.position[0]) <= 5 &&
            Math.abs(actualNote.position[1] - expectedNote.position[1]) <= 5);
        const matchesColor =
          !expectedNote.color || actualNote.color === expectedNote.color;

        return matchesId && matchesContent && matchesPosition && matchesColor;
      });
    });

    if (pass) {
      return {
        message: () =>
          `Expected mind map not to contain notes ${JSON.stringify(expectedNotes)}, but it does`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `Expected mind map to contain notes ${JSON.stringify(expectedNotes)}, but found ${JSON.stringify(actualNotes)}`,
        pass: false,
      };
    }
  },

  /**
   * Verify that connections exist between notes
   * @param {Object} received - The test app or DOM container
   * @param {Array} expectedConnections - Array of connection objects
   */
  toHaveConnections(received, expectedConnections) {
    const container = received.canvas || received;
    const connectionElements = container.querySelectorAll(
      'line[data-start], path[data-start]',
    );
    const actualConnections = Array.from(connectionElements).map((el) => ({
      from: el.getAttribute('data-start'),
      to: el.getAttribute('data-end'),
      type: el.getAttribute('data-type') || 'line',
    }));

    const pass = expectedConnections.every((expectedConn) => {
      return actualConnections.some(
        (actualConn) =>
          actualConn.from === expectedConn.from &&
          actualConn.to === expectedConn.to &&
          (!expectedConn.type || actualConn.type === expectedConn.type),
      );
    });

    if (pass) {
      return {
        message: () =>
          `Expected mind map not to have connections ${JSON.stringify(expectedConnections)}, but it does`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `Expected mind map to have connections ${JSON.stringify(expectedConnections)}, but found ${JSON.stringify(actualConnections)}`,
        pass: false,
      };
    }
  },

  /**
   * Verify mind map state matches expected structure
   * @param {Object} received - The test app
   * @param {Object} expectedState - Expected state with notes and connections
   */
  toMatchMindMapState(received, expectedState) {
    const state = received.getState ? received.getState() : received;

    let failures = [];

    // Check note count
    if (expectedState.notes) {
      const expectedNoteCount = expectedState.notes.length;
      const actualNoteCount = state.noteElements
        ? state.noteElements.length
        : state.notes?.length || 0;

      if (actualNoteCount !== expectedNoteCount) {
        failures.push(
          `Expected ${expectedNoteCount} notes, but found ${actualNoteCount}`,
        );
      }
    }

    // Check connection count
    if (expectedState.connections) {
      const expectedConnCount = expectedState.connections.length;
      const actualConnCount = state.connectionElements
        ? state.connectionElements.length
        : state.connections?.length || 0;

      if (actualConnCount !== expectedConnCount) {
        failures.push(
          `Expected ${expectedConnCount} connections, but found ${actualConnCount}`,
        );
      }
    }

    // Check specific note properties
    if (expectedState.notes && state.notes) {
      expectedState.notes.forEach((expectedNote, index) => {
        const actualNote = state.notes[index];
        if (!actualNote) {
          failures.push(`Expected note at index ${index}, but not found`);
          return;
        }

        if (
          expectedNote.content &&
          actualNote.content !== expectedNote.content
        ) {
          failures.push(
            `Expected note ${index} content "${expectedNote.content}", but got "${actualNote.content}"`,
          );
        }
      });
    }

    const pass = failures.length === 0;

    return {
      message: () =>
        pass
          ? `Expected mind map state not to match ${JSON.stringify(expectedState)}`
          : `Mind map state validation failed:\n${failures.join('\n')}`,
      pass,
    };
  },

  /**
   * Verify that note count matches expected value
   * @param {Object} received - The test app or container
   * @param {number} expectedCount - Expected number of notes
   */
  toHaveNoteCount(received, expectedCount) {
    const container = received.canvas || received;
    const noteElements = container.querySelectorAll('.note');
    const actualCount = noteElements.length;

    const pass = actualCount === expectedCount;

    return {
      message: () =>
        pass
          ? `Expected not to have ${expectedCount} notes, but found ${actualCount}`
          : `Expected ${expectedCount} notes, but found ${actualCount}`,
      pass,
    };
  },

  /**
   * Verify that connection count matches expected value
   * @param {Object} received - The test app or container
   * @param {number} expectedCount - Expected number of connections
   */
  toHaveConnectionCount(received, expectedCount) {
    const container = received.canvas || received;
    const connectionElements = container.querySelectorAll(
      'line[data-start], path[data-start]',
    );
    const actualCount = connectionElements.length;

    const pass = actualCount === expectedCount;

    return {
      message: () =>
        pass
          ? `Expected not to have ${expectedCount} connections, but found ${actualCount}`
          : `Expected ${expectedCount} connections, but found ${actualCount}`,
      pass,
    };
  },
};

// Extend Jest's expect with our custom matchers
if (typeof expect !== 'undefined' && expect.extend) {
  expect.extend(mindMapMatchers);
}
