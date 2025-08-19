// noteEvents.js - Handles all note-related event listeners
import { moveNoteStart, moveNoteEnd } from '../../core/movement.js';
import { NoteManager } from '../../core/event.js';
import { connectionManager } from '../connection/connectionManager.js';

export function addNoteEventListeners(note, canvas) {
  note.addEventListener('mousedown', (event) => {
    // Don't handle mousedown if clicking on delete button
    if (event.target.closest('.shared-delete-button--note')) {
      return;
    }
    if (!event.target.classList.contains('ghost-connector')) {
      if (!event.shiftKey) {
        if (!note.classList.contains('selected')) {
          NoteManager.clearSelections();
          NoteManager.selectNote(note);
        }
      }
      moveNoteStart(note, event);
    }
  });

  note.ondragstart = () => false;

  note.addEventListener('blur', () => {
    note.removeAttribute('contenteditable');
  });

  note.addEventListener('dblclick', () => {
    note.contentEditable = true;
    note.focus();
  });

  note.addEventListener('click', (event) => {
    // Don't handle note selection if clicking on delete button
    if (event.target.closest('.shared-delete-button--note')) {
      return;
    }
    if (event.shiftKey) {
      toggleNoteSelection(note);
    } else {
      if (!note.classList.contains('selected')) {
        NoteManager.clearSelections();
        NoteManager.selectNote(note);
      }
    }
    event.stopPropagation();
  });

  note.addEventListener('mouseup', () => {
    moveNoteEnd();
    connectionManager.updateConnections(note, canvas); // Update connections after move ends
  });
}

function toggleNoteSelection(note) {
  if (note.classList.contains('selected')) {
    NoteManager.deselectNote(note);
  } else {
    NoteManager.selectNote(note);
  }
}
