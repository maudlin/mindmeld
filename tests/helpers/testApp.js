// tests/helpers/testApp.js
/**
 * Lightweight application simulation for integration testing
 * Provides minimal real app functionality without full complexity
 */

import { eventBus } from '../../src/js/core/eventBus.js';

export class TestApp {
  constructor() {
    this.canvas = null;
    this.eventBus = eventBus;
    this.storage = new Map(); // Simple in-memory storage for tests
    this.notes = new Map();
    this.connections = new Map();
  }

  /**
   * Initialize minimal app structure for testing
   */
  initialize() {
    // Create basic DOM structure
    this.canvas = document.createElement('div');
    this.canvas.id = 'canvas';
    this.canvas.style.width = '800px';
    this.canvas.style.height = '600px';
    this.canvas.style.position = 'relative';
    document.body.appendChild(this.canvas);

    // Set up basic event handling
    this.setupEventHandling();

    return this;
  }

  setupEventHandling() {
    // Listen to note creation events
    this.eventBus.on('note.created', (noteData) => {
      this.notes.set(noteData.id, noteData);
      this.storage.set('notes', Array.from(this.notes.values()));
    });

    // Listen to connection events
    this.eventBus.on('connection.created', (connectionData) => {
      const key = `${connectionData.from}-${connectionData.to}`;
      this.connections.set(key, connectionData);
      this.storage.set('connections', Array.from(this.connections.values()));
    });
  }

  /**
   * Simulate note creation at position
   */
  createNote(x, y, content = 'Test Note') {
    const id = `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const noteElement = document.createElement('div');
    noteElement.className = 'note';
    noteElement.id = id;
    noteElement.style.left = `${x}px`;
    noteElement.style.top = `${y}px`;
    noteElement.style.position = 'absolute';
    noteElement.style.padding = '10px';
    noteElement.style.border = '1px solid #ccc';
    noteElement.style.backgroundColor = 'white';
    noteElement.textContent = content;

    this.canvas.appendChild(noteElement);

    const noteData = { id, x, y, content, element: noteElement };
    this.eventBus.emit('note.created', noteData);

    return noteData;
  }

  /**
   * Simulate connection creation between two notes
   */
  createConnection(fromId, toId, type = 'solid') {
    const connectionData = {
      from: fromId,
      to: toId,
      type,
      id: `${fromId}-${toId}`,
    };

    // Create simple SVG line representation
    const svg = this.canvas.querySelector('svg') || this.createSVGContainer();
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');

    const fromNote = document.getElementById(fromId);
    const toNote = document.getElementById(toId);

    if (fromNote && toNote) {
      const fromRect = fromNote.getBoundingClientRect();
      const toRect = toNote.getBoundingClientRect();
      const canvasRect = this.canvas.getBoundingClientRect();

      line.setAttribute(
        'x1',
        fromRect.left - canvasRect.left + fromRect.width / 2,
      );
      line.setAttribute(
        'y1',
        fromRect.top - canvasRect.top + fromRect.height / 2,
      );
      line.setAttribute('x2', toRect.left - canvasRect.left + toRect.width / 2);
      line.setAttribute('y2', toRect.top - canvasRect.top + toRect.height / 2);
      line.setAttribute('stroke', '#333');
      line.setAttribute('stroke-width', '2');
      line.setAttribute('data-start', fromId);
      line.setAttribute('data-end', toId);

      svg.appendChild(line);
    }

    this.eventBus.emit('connection.created', connectionData);
    return connectionData;
  }

  createSVGContainer() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'svg-container';
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none';
    this.canvas.appendChild(svg);
    return svg;
  }

  /**
   * Get current app state for verification
   */
  getState() {
    return {
      notes: Array.from(this.notes.values()),
      connections: Array.from(this.connections.values()),
      noteElements: this.canvas.querySelectorAll('.note'),
      connectionElements: this.canvas.querySelectorAll('line[data-start]'),
    };
  }

  /**
   * Cleanup for test isolation
   */
  cleanup() {
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    this.notes.clear();
    this.connections.clear();
    this.storage.clear();

    // Clear event listeners if available
    if (this.eventBus && typeof this.eventBus.events === 'object') {
      this.eventBus.events = {};
    }
  }
}

/**
 * Factory function for easy test app creation
 */
export function createTestApp() {
  return new TestApp().initialize();
}
