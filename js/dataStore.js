// dataStore.js
import { appState } from './observableState.js';
import { createNote, addNoteEventListeners } from './note.js';
import {
  initializeConnectionDrawing,
  updateConnections,
} from './connections.js';

export function addNote(note) {
  const currentNotes = appState.getState().notes;
  appState.setState({ notes: [...currentNotes, note] });
}

export function updateNote(id, updatedNote) {
  const currentNotes = appState.getState().notes;
  const index = currentNotes.findIndex((note) => note.id === id);
  if (index !== -1) {
    const updatedNotes = [...currentNotes];
    updatedNotes[index] = { ...updatedNotes[index], ...updatedNote };
    appState.setState({ notes: updatedNotes });
  }
}

export function deleteNoteById(id) {
  const currentNotes = appState.getState().notes;
  const updatedNotes = currentNotes.filter((note) => note.id !== id);
  appState.setState({ notes: updatedNotes });
}

export function getNotes() {
  return appState.getState().notes;
}

export function exportToJSON() {
  const { notes } = appState.getState();
  const connections = Array.from(document.querySelectorAll('line')).map(
    (line) => ({
      from: line.dataset.start,
      to: line.dataset.end,
      type: 'uni-directional', // Assuming all connections are uni-directional for now
    }),
  );
  return JSON.stringify({ notes, connections }, null, 2);
}

export function importFromJSON(jsonData, canvas) {
  try {
    const { notes, connections } = JSON.parse(jsonData);

    // Clear existing notes and connections
    document.querySelectorAll('.note').forEach((note) => note.remove());
    document.querySelectorAll('line').forEach((line) => line.remove());

    // Create notes
    notes.forEach((noteData) => {
      const note = createNote(
        parseFloat(noteData.left),
        parseFloat(noteData.top),
        canvas,
      );
      note.id = noteData.id;
      note.querySelector('.note-content').textContent = noteData.content;
      addNoteEventListeners(note, canvas);
    });

    // Create connections
    const svgContainer = document.getElementById('svg-container');
    connections.forEach((conn) => {
      const line = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'line',
      );
      line.setAttribute('data-start', conn.from);
      line.setAttribute('data-end', conn.to);
      line.setAttribute('stroke', '#888');
      line.setAttribute('stroke-width', '2');
      line.setAttribute('marker-end', 'url(#arrow)');
      svgContainer.appendChild(line);
    });

    // Update appState
    appState.setState({ notes, connections });

    // Reinitialize connection drawing
    initializeConnectionDrawing(canvas);

    // Update connections
    notes.forEach((noteData) => {
      const note = document.getElementById(noteData.id);
      if (note) {
        updateConnections(note, canvas);
      }
    });
  } catch (error) {
    console.error('Error importing data:', error);
    throw new Error('Invalid JSON data');
  }
}
