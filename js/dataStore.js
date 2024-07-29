// dataStore.js
import { appState } from './observableState.js';
import { createNote, addNoteEventListeners } from './note.js';
import {
  initializeConnectionDrawing,
  updateConnections,
  CONNECTION_TYPES,
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

export function updateConnectionInDataStore(startId, endId, type) {
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
    }
  } else {
    // Update or add connection
    const connection = {
      from: startId,
      to: endId,
      type: type,
    };

    if (existingConnectionIndex !== -1) {
      updatedConnections[existingConnectionIndex] = connection;
    } else {
      updatedConnections.push(connection);
    }
  }

  appState.setState({ connections: updatedConnections });
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
    const svgContainer = document.getElementById('svg-container');
    connections.forEach((conn) => {
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.setAttribute('data-start', conn.from);
      group.setAttribute('data-end', conn.to);
      group.setAttribute('data-type', conn.type);

      const path = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'path',
      );
      path.setAttribute('stroke', '#888');
      path.setAttribute('stroke-width', '2');
      path.setAttribute('fill', 'none');

      // Set markers based on connection type
      switch (conn.type) {
        case CONNECTION_TYPES.UNI_FORWARD:
          path.setAttribute('marker-end', 'url(#arrow)');
          break;
        case CONNECTION_TYPES.UNI_BACKWARD:
          path.setAttribute('marker-start', 'url(#arrow)');
          break;
        case CONNECTION_TYPES.BI:
          path.setAttribute('marker-start', 'url(#arrow)');
          path.setAttribute('marker-end', 'url(#arrow)');
          break;
      }

      group.appendChild(path);
      svgContainer.appendChild(group);
    });

    // Update appState
    appState.setState({ notes, connections });

    // Reinitialize connection drawing
    initializeConnectionDrawing(canvas);

    // Update connections
    notes.forEach((noteData) => {
      const note = document.getElementById(noteData.id);
      if (note) {
        updateConnections(note);
      }
    });
  } catch (error) {
    console.error('Error importing data:', error);
    throw new Error('Invalid JSON data');
  }
}
