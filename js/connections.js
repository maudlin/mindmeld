import { calculateOffsetPosition } from './utils.js';
import { getZoomLevel } from './zoomManager.js';

export let isConnecting = false;

export function updateConnections(note, canvas) {
  const connections = document.querySelectorAll(
    `line[data-start="${note.id}"], line[data-end="${note.id}"]`,
  );
  const zoomLevel = getZoomLevel();
  const scale = zoomLevel / 5;

  connections.forEach((connection) => {
    const startNote = document.getElementById(connection.dataset.start);
    const endNote = document.getElementById(connection.dataset.end);
    const { x1, y1, x2, y2 } = getClosestPoints(
      startNote,
      endNote,
      canvas,
      scale,
    );
    connection.setAttribute('x1', x1);
    connection.setAttribute('y1', y1);
    connection.setAttribute('x2', x2);
    connection.setAttribute('y2', y2);
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
    if (event.target.classList.contains('ghost-connector')) {
      isConnecting = true;
      startNote = event.target.closest('.note');
      const zoomLevel = getZoomLevel();
      const scale = zoomLevel / 5;
      const { left: startX, top: startY } = calculateOffsetPosition(
        canvas,
        event,
        event.target,
      );

      const line = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'line',
      );
      line.setAttribute('x1', startX * scale);
      line.setAttribute('y1', startY * scale);
      line.setAttribute('x2', startX * scale);
      line.setAttribute('y2', startY * scale);
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
          const zoomLevel = getZoomLevel();
          const scale = zoomLevel / 5;
          const { left: currentX, top: currentY } = calculateOffsetPosition(
            canvas,
            moveEvent,
          );
          line.setAttribute('x2', currentX * scale);
          line.setAttribute('y2', currentY * scale);
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
          const zoomLevel = getZoomLevel();
          const scale = zoomLevel / 5;
          const { x1, y1, x2, y2 } = getClosestPoints(
            startNote,
            endNote,
            canvas,
            scale,
          );

          line.setAttribute('x1', x1);
          line.setAttribute('y1', y1);
          line.setAttribute('x2', x2);
          line.setAttribute('y2', y2);

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

function getClosestPoints(note1, note2, canvas, scale) {
  const rect1 = note1.getBoundingClientRect();
  const rect2 = note2.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();

  // Adjust rectangles for zoom
  const adjustedRect1 = {
    left: (rect1.left - canvasRect.left) / scale,
    top: (rect1.top - canvasRect.top) / scale,
    width: rect1.width / scale,
    height: rect1.height / scale,
    right: (rect1.right - canvasRect.left) / scale,
    bottom: (rect1.bottom - canvasRect.top) / scale,
  };

  const adjustedRect2 = {
    left: (rect2.left - canvasRect.left) / scale,
    top: (rect2.top - canvasRect.top) / scale,
    width: rect2.width / scale,
    height: rect2.height / scale,
    right: (rect2.right - canvasRect.left) / scale,
    bottom: (rect2.bottom - canvasRect.top) / scale,
  };

  const center1 = {
    x: adjustedRect1.left + adjustedRect1.width / 2,
    y: adjustedRect1.top + adjustedRect1.height / 2,
  };

  const center2 = {
    x: adjustedRect2.left + adjustedRect2.width / 2,
    y: adjustedRect2.top + adjustedRect2.height / 2,
  };

  let x1, y1, x2, y2;

  if (Math.abs(center1.x - center2.x) > Math.abs(center1.y - center2.y)) {
    // Connect horizontally
    x1 = center1.x > center2.x ? adjustedRect1.left : adjustedRect1.right;
    y1 = center1.y;
    x2 = center1.x > center2.x ? adjustedRect2.right : adjustedRect2.left;
    y2 = center2.y;
  } else {
    // Connect vertically
    x1 = center1.x;
    y1 = center1.y > center2.y ? adjustedRect1.top : adjustedRect1.bottom;
    x2 = center2.x;
    y2 = center1.y > center2.y ? adjustedRect2.bottom : adjustedRect2.top;
  }

  return { x1, y1, x2, y2 };
}

export function deleteConnectionsByNote(note) {
  const connections = document.querySelectorAll(
    `line[data-start="${note.id}"], line[data-end="${note.id}"]`,
  );
  connections.forEach((connection) => connection.remove());
}
