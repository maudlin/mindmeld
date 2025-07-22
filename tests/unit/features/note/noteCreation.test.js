// noteCreation.test.js - Test note creation event flow
/**
 * @jest-environment jsdom
 */

import { eventBus } from '../../../../src/js/core/eventBus.js';
import { NoteEventService } from '../../../../src/js/services/noteEventService.js';
import { initializeDataStore } from '../../../../src/js/data/dataStore.js';

// Mock DOM elements
beforeEach(() => {
  document.body.innerHTML = `
    <div id="canvas" style="width: 800px; height: 600px;"></div>
  `;

  // Initialize services
  initializeDataStore();
  NoteEventService.initialize();
});

afterEach(() => {
  // Clean up event listeners
  eventBus.events = {};
  document.body.innerHTML = '';
});

describe('Note Creation Event Flow', () => {
  test('should create note when note.createAtPosition event is emitted', async () => {
    const canvas = document.getElementById('canvas');

    // Mock event object similar to what would come from a real double-click
    const mockEvent = {
      clientX: 400,
      clientY: 300,
      target: canvas,
    };

    // Emit the event that should create a note
    eventBus.emit('note.createAtPosition', { canvas, event: mockEvent });

    // Wait a bit for async operations
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check if a note was created in the DOM
    const notes = document.querySelectorAll('.note');
    expect(notes.length).toBe(1);

    // Check if note has proper structure
    const note = notes[0];
    expect(note).toBeTruthy();
    expect(note.classList.contains('note')).toBe(true);
    expect(note.querySelector('.note-content')).toBeTruthy();
  });

  test('should emit note.created event when note is created', async () => {
    const canvas = document.getElementById('canvas');
    const mockEvent = {
      clientX: 400,
      clientY: 300,
      target: canvas,
    };

    // Listen for the note.created event
    const noteCreatedPromise = new Promise((resolve) => {
      eventBus.on('note.created', (noteData) => {
        expect(noteData).toBeTruthy();
        expect(noteData.id).toBeTruthy();
        expect(noteData.content).toBe('');
        resolve();
      });
    });

    // Emit the event that should create a note
    eventBus.emit('note.createAtPosition', { canvas, event: mockEvent });

    await noteCreatedPromise;
  });
});
