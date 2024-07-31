// dataStore.js

import { createNote, addNoteEventListeners } from './note.js';
import {
  createConnection,
  updateConnections,
  initializeConnectionDrawing,
} from './connections.js';
import { debounce } from './utils.js';
import { appState } from './observableState.js';

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

const debouncedUpdateConnection = debounce((startId, endId, type) => {
  const { connections } = appState.getState();
  let updatedConnections = [...connections];

  const existingConnectionIndex = connections.findIndex(
    (conn) =>
      (conn.from === startId && conn.to === endId) ||
      (conn.from === endId && conn.to === startId),
  );

  if (type === null) {
    // Remove connection
    if (existingConnectionIndex !== -1) {
      updatedConnections.splice(existingConnectionIndex, 1);
      console.log(`Removed connection: ${startId} - ${endId}`);
    } else {
      console.warn(`No connection found to remove: ${startId} - ${endId}`);
    }
  } else {
    // Update or add connection
    const connection = { from: startId, to: endId, type };
    if (existingConnectionIndex !== -1) {
      updatedConnections[existingConnectionIndex] = connection;
    } else {
      updatedConnections.push(connection);
    }
  }

  appState.setState({ connections: updatedConnections });
  console.log('Updated connections:', updatedConnections);
}, 300); // 300ms debounce time

// Export the debounced function
export function updateConnectionInDataStore(startId, endId, type) {
  console.log('Queueing connection update:', { startId, endId, type });
  debouncedUpdateConnection(startId, endId, type);
}

export function exportToJSON() {
  const { notes, connections } = appState.getState();
  return JSON.stringify({ notes, connections }, null, 2);
}

export function importFromJSON(jsonData, canvas) {
  try {
    const { notes, connections } = JSON.parse(jsonData);

    // Clear existing notes and connections
    document.querySelectorAll('.note').forEach((note) => note.remove());
    document.querySelectorAll('g[data-start]').forEach((conn) => conn.remove());

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
    connections.forEach((conn) => {
      createConnection(conn.from, conn.to, conn.type);
    });

    // Update appState
    appState.setState({ notes, connections });

    // Reinitialize connection drawing
    initializeConnectionDrawing(canvas);

    // Update all connections
    updateConnections();
  } catch (error) {
    console.error('Error importing data:', error);
    throw new Error('Invalid JSON data');
  }
}
