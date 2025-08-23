//note.js - Note module exports
export {
  createNote,
  createNoteAtPosition,
} from '../../factories/noteFactory.js';
// MM-172: Legacy noteEvents.js disabled - using EditModeController system
// export { addNoteEventListeners } from './noteEvents.js';
export { deleteNote, deleteNoteWithConnections } from './noteDeletion.js';
