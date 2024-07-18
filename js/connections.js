export let isConnecting = false;

export function createConnectionHandle(note) {
  const handle = document.createElement('div');
  handle.className = 'connection-handle';
  note.appendChild(handle);
}

export function updateConnections(note) {
  const connections = document.querySelectorAll(
    `line[data-start="${note.id}"], line[data-end="${note.id}"]`,
  );
  connections.forEach((connection) => {
    const startNote = document.getElementById(connection.dataset.start);
    const endNote = document.getElementById(connection.dataset.end);
    if (connection.dataset.start === note.id) {
      connection.setAttribute(
        'x1',
        parseFloat(startNote.style.left) + startNote.offsetWidth,
      );
      connection.setAttribute(
        'y1',
        parseFloat(startNote.style.top) + startNote.offsetHeight / 2,
      );
    }
    if (connection.dataset.end === note.id) {
      connection.setAttribute(
        'x2',
        parseFloat(endNote.style.left) + endNote.offsetWidth / 2,
      );
      connection.setAttribute(
        'y2',
        parseFloat(endNote.style.top) + endNote.offsetHeight / 2,
      );
    }
  });
}

export function initializeConnectionDrawing(canvas) {
  let startNote = null;
  let currentLine = null;

  canvas.addEventListener('mousedown', (event) => {
    if (event.target.classList.contains('connection-handle')) {
      isConnecting = true; // Set the connecting flag
      startNote = event.target.closest('.note');
      const startX = parseFloat(startNote.style.left) + startNote.offsetWidth;
      const startY =
        parseFloat(startNote.style.top) + startNote.offsetHeight / 2;

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'connection-line');
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      svg.setAttribute(
        'style',
        'position:absolute; top:0; left:0; z-index: 0; pointer-events:none;',
      );

      const line = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'line',
      );
      line.setAttribute('x1', startX);
      line.setAttribute('y1', startY);
      line.setAttribute('x2', startX);
      line.setAttribute('y2', startY);
      line.setAttribute('stroke', '#000');
      line.setAttribute('stroke-dasharray', '5,5');
      line.setAttribute('stroke-width', '2');
      svg.appendChild(line);
      canvas.appendChild(svg);
      currentLine = line;

      const moveHandler = (moveEvent) => {
        if (isConnecting) {
          line.setAttribute('x2', moveEvent.clientX);
          line.setAttribute('y2', moveEvent.clientY);
        }
      };

      const upHandler = (upEvent) => {
        document.removeEventListener('mousemove', moveHandler);
        document.removeEventListener('mouseup', upHandler);

        if (
          isConnecting &&
          upEvent.target.closest('.note') &&
          upEvent.target !== event.target
        ) {
          const endNote = upEvent.target.closest('.note');
          const endX = parseFloat(endNote.style.left) + endNote.offsetWidth / 2;
          const endY = parseFloat(endNote.style.top) + endNote.offsetHeight / 2;

          line.setAttribute('x2', endX);
          line.setAttribute('y2', endY);
          line.setAttribute('stroke-dasharray', '');

          currentLine.dataset.start = startNote.id;
          currentLine.dataset.end = endNote.id;
        } else {
          canvas.removeChild(svg);
        }

        isConnecting = false; // Reset the connecting flag
        startNote = null;
        currentLine = null;
      };

      document.addEventListener('mousemove', moveHandler);
      document.addEventListener('mouseup', upHandler);
    }
  });

  document.addEventListener('click', (event) => {
    if (event.target.tagName === 'line') {
      document
        .querySelectorAll('line')
        .forEach((line) => line.classList.remove('line-selected'));
      event.target.classList.add('line-selected');
    } else {
      document
        .querySelectorAll('line')
        .forEach((line) => line.classList.remove('line-selected'));
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Delete') {
      const selectedLine = document.querySelector('.line-selected');
      if (selectedLine) {
        selectedLine.remove();
      }
    }
  });
}
