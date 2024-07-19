export let isConnecting = false;

export function createConnectionHandle(note) {
  const handle = document.createElement('div');
  handle.className = 'connection-handle';
  handle.style.position = 'absolute';
  handle.style.right = '-10px';
  handle.style.top = '50%';
  handle.style.transform = 'translateY(-50%)';
  handle.style.width = '10px';
  handle.style.height = '10px';
  handle.style.backgroundColor = '#007bff';
  handle.style.borderRadius = '50%';
  handle.style.cursor = 'pointer';
  note.appendChild(handle);
}

export function updateConnections(note, canvas) {
  const connections = document.querySelectorAll(
    `line[data-start="${note.id}"], line[data-end="${note.id}"]`,
  );
  connections.forEach((connection) => {
    const startNote = document.getElementById(connection.dataset.start);
    const endNote = document.getElementById(connection.dataset.end);
    if (connection.dataset.start === note.id) {
      const startHandle = startNote.querySelector('.connection-handle');
      connection.setAttribute(
        'x1',
        startHandle.getBoundingClientRect().left +
          startHandle.offsetWidth / 2 -
          canvas.getBoundingClientRect().left,
      );
      connection.setAttribute(
        'y1',
        startHandle.getBoundingClientRect().top +
          startHandle.offsetHeight / 2 -
          canvas.getBoundingClientRect().top,
      );
    }
    if (connection.dataset.end === note.id) {
      const endHandle = endNote.querySelector('.connection-handle');
      connection.setAttribute(
        'x2',
        endHandle.getBoundingClientRect().left +
          endHandle.offsetWidth / 2 -
          canvas.getBoundingClientRect().left,
      );
      connection.setAttribute(
        'y2',
        endHandle.getBoundingClientRect().top +
          endHandle.offsetHeight / 2 -
          canvas.getBoundingClientRect().top,
      );
    }
  });
}

export function initializeConnectionDrawing(canvas) {
  let startNote = null;
  let currentLine = null;

  let svgContainer = document.getElementById('svg-container');

  if (!svgContainer) {
    svgContainer = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg',
    );
    svgContainer.setAttribute('id', 'svg-container');
    svgContainer.setAttribute(
      'style',
      'position:absolute; top:0; left:0; width:100%; height:100%; z-index:0; pointer-events:none;',
    );
    canvas.appendChild(svgContainer);
  }

  canvas.addEventListener('mousedown', (event) => {
    if (event.target.classList.contains('connection-handle')) {
      isConnecting = true;
      startNote = event.target.closest('.note');
      const handle = event.target;
      const startX =
        handle.getBoundingClientRect().left +
        handle.offsetWidth / 2 -
        canvas.getBoundingClientRect().left;
      const startY =
        handle.getBoundingClientRect().top +
        handle.offsetHeight / 2 -
        canvas.getBoundingClientRect().top;

      const line = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'line',
      );
      line.setAttribute('x1', startX);
      line.setAttribute('y1', startY);
      line.setAttribute('x2', startX);
      line.setAttribute('y2', startY);
      line.setAttribute('stroke', '#888'); // Mid grey color
      line.setAttribute('stroke-dasharray', '5,5'); // Dashed line
      line.setAttribute('stroke-width', '2');

      // Arrow at the end
      const marker = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'marker',
      );
      marker.setAttribute('id', 'arrow');
      marker.setAttribute('markerWidth', '10');
      marker.setAttribute('markerHeight', '7');
      marker.setAttribute('refX', '10');
      marker.setAttribute('refY', '3.5');
      marker.setAttribute('orient', 'auto');
      marker.innerHTML = '<path d="M0,0 L10,3.5 L0,7" style="fill: #888;" />';
      svgContainer.appendChild(marker);

      line.setAttribute('marker-end', 'url(#arrow)');

      svgContainer.appendChild(line);
      currentLine = line;

      const moveHandler = (moveEvent) => {
        if (isConnecting) {
          line.setAttribute(
            'x2',
            moveEvent.clientX - canvas.getBoundingClientRect().left,
          );
          line.setAttribute(
            'y2',
            moveEvent.clientY - canvas.getBoundingClientRect().top,
          );
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
          const endHandle = endNote.querySelector('.connection-handle');
          const endX =
            endHandle.getBoundingClientRect().left +
            endHandle.offsetWidth / 2 -
            canvas.getBoundingClientRect().left;
          const endY =
            endHandle.getBoundingClientRect().top +
            endHandle.offsetHeight / 2 -
            canvas.getBoundingClientRect().top;

          line.setAttribute('x2', endX);
          line.setAttribute('y2', endY);

          // Ensure the line remains dashed even after connecting
          line.setAttribute('stroke-dasharray', '5,5');

          currentLine.dataset.start = startNote.id;
          currentLine.dataset.end = endNote.id;
          updateConnections(startNote, canvas);
          updateConnections(endNote, canvas);
        } else {
          svgContainer.removeChild(line);
        }

        isConnecting = false;
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

export function deleteConnectionsByNote(note) {
  const connections = document.querySelectorAll(
    `line[data-start="${note.id}"], line[data-end="${note.id}"]`,
  );
  connections.forEach((connection) => connection.remove());
}
