// src/js/data/dataStore.js
import { debounce, log, truncateNoteContent } from '../utils/utils.js';
import { appState } from './observableState.js';
import {
  NOTE_CONTENT_LIMIT,
  CONNECTION_TYPE_MAP,
  CONNECTION_TYPE_MAP_REVERSE,
  CONNECTION_TYPES,
} from '../core/constants.js';
import { NoteService } from '../services/noteService.js';
import { ConnectionService } from '../services/connectionService.js';
import { ColorService } from '../services/colorService.js';
import { CanvasStateService } from '../services/canvasStateService.js';
import { eventBus } from '../core/eventBus.js';

export function addNote(note) {
  const currentNotes = appState.getState().notes;

  // Prevent duplicate notes during state restoration
  const existingNote = currentNotes.find((n) => n.id === note.id);
  if (existingNote) {
    log(`Note ${note.id} already exists in state, skipping duplicate addition`);
    return note;
  }

  appState.setState({ notes: [...currentNotes, note] });
  return note;
}

export function updateNote(id, updatedNote) {
  const currentNotes = appState.getState().notes;
  const index = currentNotes.findIndex((note) => note.id === id);
  if (index !== -1) {
    const updatedNotes = [...currentNotes];
    // eslint-disable-next-line security/detect-object-injection
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

  // Clear existing notes and connections from DOM only
  NoteService.clearAllNotes();
  document.querySelectorAll('g[data-start]').forEach((conn) => conn.remove());

  // Preserve the loaded colorState during restoration
  const loadedColorState = state.colorState || {
    currentColor: 'yellow',
    notes: {},
  };

  // Temporarily disable color application during restoration
  window.noteRestorationInProgress = true;

  // Create notes
  state.notes.forEach((noteData) => {
    NoteService.createNoteFromData(noteData, canvas);
  });

  // Re-enable color application
  window.noteRestorationInProgress = false;

  // Create connections
  state.connections.forEach((conn) => {
    ConnectionService.createConnection(conn.from, conn.to, conn.type);
  });

  // Update all connections
  ConnectionService.updateConnections();

  // Ensure colorState and connections are preserved in appState after all operations
  const currentState = appState.getState();
  appState.setState({
    ...currentState,
    connections: state.connections, // Preserve loaded connections
    colorState: loadedColorState,
  });

  // Emit notes.loaded event for color application (same as import process)
  eventBus.emit('notes.loaded');
  console.log(
    'Emitted notes.loaded event for color application with colorState:',
    loadedColorState,
  );

  log(
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
    // Ensure type is valid
    const validType = Object.values(CONNECTION_TYPES).includes(type)
      ? type
      : CONNECTION_TYPES.NONE;

    // Update or add connection
    const connection = { from: startId, to: endId, type: validType };
    if (existingConnectionIndex !== -1) {
      // eslint-disable-next-line security/detect-object-injection
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
  const { notes, connections, canvasType } = appState.getState();
  const allNoteColors = ColorService.getAllNoteColors();

  const compressedData = {
    n: notes.map((note) => {
      const baseNote = {
        i: note.id,
        p: [
          Math.round(parseFloat(note.left)),
          Math.round(parseFloat(note.top)),
        ],
        c: truncateNoteContent(note.content || '', NOTE_CONTENT_LIMIT),
      };

      // Add color data if not default (yellow)
      const noteColor = allNoteColors[note.id]?.colorScheme;
      if (noteColor && noteColor !== 'yellow') {
        baseNote.cl = noteColor;
      }

      return baseNote;
    }),
    c: connections.map((conn) => [
      conn.from,
      conn.to,
      CONNECTION_TYPE_MAP[conn.type] || 0,
    ]),
  };

  // Add canvas type if not default (Standard Canvas)
  if (canvasType && canvasType !== 'Standard Canvas') {
    compressedData.ct = canvasType;
  }

  return JSON.stringify({ data: compressedData }, null, 2);
}

export async function importFromJSON(jsonData, canvas) {
  try {
    const { data } = JSON.parse(jsonData);
    log('Parsed JSON data:', {
      noteCount: data.n.length,
      connectionCount: data.c.length,
    });

    // Clear existing notes and connections
    NoteService.clearAllNotes();
    document.querySelectorAll('g[data-start]').forEach((conn) => conn.remove());

    // Extract color data for import
    const noteColors = {};
    data.n.forEach((noteData) => {
      if (noteData.cl && ColorService.isValidColor(noteData.cl)) {
        noteColors[noteData.i] = { colorScheme: noteData.cl };
      }
    });

    // Import colors if any exist
    if (Object.keys(noteColors).length > 0) {
      ColorService.setAllNoteColors(noteColors);
    }

    // Handle canvas type import
    let importedCanvasType = 'Standard Canvas'; // Default
    if (data.ct && CanvasStateService.isValidCanvasType(data.ct)) {
      importedCanvasType = data.ct;
      log('Importing canvas type:', importedCanvasType);
    } else if (data.ct) {
      log(
        'Invalid canvas type in import, defaulting to Standard Canvas:',
        data.ct,
      );
    }

    // Create notes
    const notes = data.n.map((noteData) => {
      const note = NoteService.createNoteFromData(
        {
          i: noteData.i,
          c: noteData.c,
          p: noteData.p,
        },
        canvas,
      );
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
      svgContainer = ConnectionService.initializeConnectionDrawing(canvas);
    }

    // Create connections
    const connections = data.c.map((conn) => {
      const [fromId, toId, typeNum] = conn;
      const type =
        CONNECTION_TYPE_MAP_REVERSE.get(typeNum) || CONNECTION_TYPES.NONE;
      ConnectionService.createConnection(fromId, toId, type);
      return { from: fromId, to: toId, type };
    });

    // Update appState with imported canvas type
    appState.setState({ notes, connections, canvasType: importedCanvasType });

    // Apply imported canvas type to the canvas
    await CanvasStateService.setCanvasType(importedCanvasType, canvas);

    // Update all connections
    log('Updating all connections');
    ConnectionService.updateConnections();

    // Apply imported colors to notes
    eventBus.emit('notes.loaded');
    log('Emitted notes.loaded event for color application');

    log('Import complete');
  } catch (error) {
    console.error('Error importing data:', error);
    throw new Error('Invalid JSON data');
  }
}

// Initialize dataStore event listeners
export function initializeDataStore() {
  eventBus.on('note.created', addNote);
  eventBus.on('note.updated', ({ id, content, left, top }) => {
    const updateData = {};
    if (content !== undefined) updateData.content = content;
    if (left !== undefined) updateData.left = left;
    if (top !== undefined) updateData.top = top;
    updateNote(id, updateData);
  });

  // Listen for color change events to trigger state saves
  eventBus.on('note.color.changed', () => {
    // observableState automatically saves when appState.setState is called
    // This listener ensures any additional color-related state is preserved
    log('Color change detected, state will be saved automatically');
  });

  eventBus.on('note.color.removed', () => {
    log('Color removal detected, state will be saved automatically');
  });

  log('DataStore event listeners initialized');
}

export function clearAllNotesAndConnections() {
  // Remove all notes from the DOM
  document.querySelectorAll('.note').forEach((note) => note.remove());

  // Remove all connections from the DOM
  document.querySelectorAll('g[data-start]').forEach((conn) => conn.remove());

  // Get current state to preserve colorState during restoration
  const currentState = appState.getState();

  // Clear notes and connections but preserve colorState if it exists
  appState.setState({
    notes: [],
    connections: [],
    zoomLevel: 5,
    colorState: currentState.colorState || {
      currentColor: 'yellow',
      notes: {},
    },
  });

  log('All notes and connections cleared, colorState preserved');
}
