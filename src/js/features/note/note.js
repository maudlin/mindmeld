//note.js - Note module exports
export {
  createNote,
  createNoteAtPosition,
} from '../../factories/noteFactory.js';
export { addNoteEventListeners } from './noteEvents.js';
export { deleteNote, deleteNoteWithConnections } from './noteDeletion.js';
