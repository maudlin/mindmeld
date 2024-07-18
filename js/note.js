let activeNote = null;
let shiftX, shiftY;

export function createNoteAtPosition(canvas, event) {
  const note = document.createElement('div');
  note.className = 'note';

  const noteContent = document.createElement('div');
  noteContent.className = 'note-content';
  noteContent.contentEditable = true;

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.innerHTML = 'x';
  deleteBtn.addEventListener('click', () => note.remove());

  note.appendChild(deleteBtn);
  note.appendChild(noteContent);
  canvas.appendChild(note);

  // Get the dimensions of the note
  const noteWidth = note.offsetWidth;
  const noteHeight = note.offsetHeight;

  // Adjust the position
  note.style.left = `${event.clientX - noteWidth / 2}px`;
  note.style.top = `${event.clientY - noteHeight / 2}px`;

  addNoteEventListeners(note);
}

function moveAt(note, pageX, pageY) {
  note.style.left = pageX - shiftX + 'px';
  note.style.top = pageY - shiftY + 'px';
}

function onMouseMove(event) {
  if (activeNote) {
    moveAt(activeNote, event.pageX, event.pageY);
  }
}

function onMouseUp() {
  if (activeNote) {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    activeNote = null;
  }
}

export function moveNote(note, event) {
  shiftX = event.clientX - note.getBoundingClientRect().left;
  shiftY = event.clientY - note.getBoundingClientRect().top;

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

export function addNoteEventListeners(note) {
  note.addEventListener('mousedown', (event) => {
    // Ensure only one note can be moved at a time
    if (!activeNote) {
      activeNote = note;
      moveNote(note, event);
      selectNote(note);
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
    selectNote(note);
    event.stopPropagation();
  });
}

export function deleteNote() {
  const selected = document.querySelector('.note.selected');
  if (selected) {
    selected.remove();
  }
}

export function selectNote(note) {
  const selected = document.querySelector('.note.selected');
  if (selected && selected !== note) {
    selected.classList.remove('selected');
  }
  note.classList.add('selected');
}

// Ensure the note is dropped on mouse up anywhere in the document
document.addEventListener('mouseup', onMouseUp);
document.addEventListener('mousemove', onMouseMove);
