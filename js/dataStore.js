//datastore.js
const notes = [];

export function addNote(note) {
  notes.push(note);
}

export function updateNote(id, updatedNote) {
  const index = notes.findIndex((note) => note.id === id);
  if (index !== -1) {
    notes[index] = { ...notes[index], ...updatedNote };
  }
}

export function deleteNoteById(id) {
  const index = notes.findIndex((note) => note.id === id);
  if (index !== -1) {
    notes.splice(index, 1);
  }
}

export function getNotes() {
  return notes;
}

export function exportToJSON() {
  return JSON.stringify(notes, null, 2);
}
