// dataStore.js
import { createNote, addNoteEventListeners } from '../features/note/note.js';
import {
  createConnection,
  updateConnections,
  initializeConnectionDrawing,
} from '../features/connection/connection.js';
import { debounce, log, truncateNoteContent } from '../utils/utils.js';
import { appState } from './observableState.js';
import { NOTE_CONTENT_LIMIT } from '../core/constants.js';

export function addNote(note) {
  const currentNotes = appState.getState().notes;
  appState.setState({ notes: [...currentNotes, note] });
  return note;
}

export function updateNote(id, updatedNote, silent = false) {
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

export function updateNotesAndConnections(state) {
  const canvas = document.querySelector('#canvas');

  // Clear existing notes and connections
  document.querySelectorAll('.note').forEach((note) => note.remove());
  document.querySelectorAll('g[data-start]').forEach((conn) => conn.remove());

  // Create notes
  state.notes.forEach((noteData) => {
    const note = createNote(
      parseFloat(noteData.left),
      parseFloat(noteData.top),
      canvas,
    );
    note.id = noteData.id;
    const noteContent = note.querySelector('.note-content');
    noteContent.textContent = noteData.content;
    addNoteEventListeners(note, canvas);
  });

  // Create connections
  state.connections.forEach((conn) => {
    createConnection(conn.from, conn.to, conn.type);
  });

  // Update all connections
  updateConnections();

  console.log(
    `Updated ${state.notes.length} notes and ${state.connections.length} connections`,
  );
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
      log(`Removed connection: ${startId} - ${endId}`);
    } else {
      log(`No connection found to remove: ${startId} - ${endId}`);
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
  log('Updated connections:', updatedConnections);
}, 300);

export function updateConnectionInDataStore(startId, endId, type) {
  log('Queueing connection update:', { startId, endId, type });
  debouncedUpdateConnection(startId, endId, type);
}

export function getCurrentState() {
  const notes = Array.from(document.querySelectorAll('.note')).map(
    (noteElement) => ({
      id: noteElement.id,
      content: noteElement.querySelector('.note-content').innerHTML,
      left: noteElement.style.left,
      top: noteElement.style.top,
    }),
  );

  const connections = Array.from(
    document.querySelectorAll('g[data-start]'),
  ).map((connElement) => ({
    from: connElement.dataset.start,
    to: connElement.dataset.end,
    type: connElement.dataset.type,
  }));

  return { notes, connections, zoomLevel: appState.getState().zoomLevel };
}

export function exportToJSON() {
  const { notes, connections } = appState.getState();
  const compressedData = {
    n: notes.map((note) => ({
      i: note.id,
      p: [Math.round(parseFloat(note.left)), Math.round(parseFloat(note.top))],
      c: truncateNoteContent(note.content || '', NOTE_CONTENT_LIMIT),
    })),
    c: connections.map((conn) => [
      conn.from,
      conn.to,
      conn.type === 'bi' ? 0 : 1,
    ]),
  };
  return JSON.stringify({ data: compressedData }, null, 2);
}

export function importFromJSON(jsonData, canvas) {
  try {
    const { data } = JSON.parse(jsonData);
    log('Parsed JSON data:', {
      noteCount: data.n.length,
      connectionCount: data.c.length,
    });

    // Clear existing notes and connections
    document.querySelectorAll('.note').forEach((note) => note.remove());
    document.querySelectorAll('g[data-start]').forEach((conn) => conn.remove());

    // Create notes
    const notes = data.n.map((noteData) => {
      const note = createNote(noteData.p[0], noteData.p[1], canvas);
      note.id = noteData.i;
      note.querySelector('.note-content').textContent = truncateNoteContent(
        noteData.c,
        NOTE_CONTENT_LIMIT,
      );
      addNoteEventListeners(note, canvas);
      return {
        id: note.id,
        content: truncateNoteContent(noteData.c, NOTE_CONTENT_LIMIT),
        left: noteData.p[0],
        top: noteData.p[1],
      };
    });

    log('Notes created:', notes.length);

    // Ensure SVG container exists
    let svgContainer = document.getElementById('svg-container');
    if (!svgContainer) {
      log('SVG container not found, initializing connection drawing');
      svgContainer = initializeConnectionDrawing(canvas);
    }

    // Create connections
    const connections = data.c.map((conn) => {
      const [fromId, toId, typeNum] = conn;
      const type = typeNum === 0 ? 'bi' : 'uni-forward';
      createConnection(fromId, toId, type);
      return { from: fromId, to: toId, type };
    });

    // Update appState
    appState.setState({ notes, connections });

    // Update all connections
    log('Updating all connections');
    updateConnections();

    log('Import complete');
  } catch (error) {
    console.error('Error importing data:', error);
    throw new Error('Invalid JSON data');
  }
}

export function clearAllNotesAndConnections() {
  // Remove all notes from the DOM
  document.querySelectorAll('.note').forEach((note) => note.remove());

  // Remove all connections from the DOM
  document.querySelectorAll('g[data-start]').forEach((conn) => conn.remove());

  // Clear the state
  appState.setState({ notes: [], connections: [], zoomLevel: 5 });

  console.log('All notes and connections cleared');
}
