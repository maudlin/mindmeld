import { calculateOffsetPosition } from './utils.js';
import { getZoomLevel } from './zoomManager.js';

// Constants
const STROKE_COLOR = '#888';
const STROKE_WIDTH = '2';
const STROKE_DASHARRAY = '5,5';

export let isConnecting = false;

/**
 * Updates the position of connections for a given note.
 * @param {HTMLElement} note - The note element.
 * @param {HTMLElement} canvas - The canvas element.
 */
export function updateConnections(note, canvas) {
  requestAnimationFrame(() => {
    try {
      const connections = document.querySelectorAll(
        `line[data-start="${note.id}"], line[data-end="${note.id}"]`,
      );

      connections.forEach((connection) => {
        const startNote = document.getElementById(connection.dataset.start);
        const endNote = document.getElementById(connection.dataset.end);
        if (startNote && endNote) {
          const { x1, y1, x2, y2 } = getClosestPoints(
            startNote,
            endNote,
            canvas,
          );
          connection.setAttribute('x1', x1);
          connection.setAttribute('y1', y1);
          connection.setAttribute('x2', x2);
          connection.setAttribute('y2', y2);
        }
      });
    } catch (error) {
      console.error('Error updating connections:', error);
    }
  });
}

/**
 * Initializes the connection drawing functionality.
 * @param {HTMLElement} canvas - The canvas element.
 */
export function initializeConnectionDrawing(canvas) {
  const svgContainer = createSVGContainer(canvas);
  const marker = createArrowMarker();
  svgContainer.appendChild(marker);

  canvas.addEventListener('mousedown', (event) =>
    handleMouseDown(event, canvas, svgContainer),
  );
  document.addEventListener('click', handleLineSelection);
  document.addEventListener('keydown', handleLineDeletion);
}

/**
 * Creates an SVG container if it doesn't exist.
 * @param {HTMLElement} canvas - The canvas element.
 * @returns {SVGElement} The SVG container.
 */
function createSVGContainer(canvas) {
  let svgContainer = document.getElementById('svg-container');
  if (!svgContainer) {
    svgContainer = createSVGElement('svg', {
      id: 'svg-container',
      style:
        'position:absolute; top:0; left:0; width:100%; height:100%; z-index:0; pointer-events:none;',
    });
    canvas.appendChild(svgContainer);
  }
  return svgContainer;
}

/**
 * Creates an arrow marker for the SVG.
 * @returns {SVGMarkerElement} The arrow marker.
 */
function createArrowMarker() {
  const marker = createSVGElement('marker', {
    id: 'arrow',
    markerWidth: '10',
    markerHeight: '7',
    refX: '10',
    refY: '3.5',
    orient: 'auto',
  });
  marker.innerHTML = '<path d="M0,0 L10,3.5 L0,7" style="fill: #888;" />';
  return marker;
}

/**
 * Handles the mousedown event for connection drawing.
 * @param {MouseEvent} event - The mousedown event.
 * @param {HTMLElement} canvas - The canvas element.
 * @param {SVGElement} svgContainer - The SVG container.
 */
function handleMouseDown(event, canvas, svgContainer) {
  if (!event.target.classList.contains('ghost-connector')) return;

  event.stopPropagation(); // Stop the event from bubbling up
  event.preventDefault(); // Prevent default behavior

  isConnecting = true;
  const startNote = event.target.closest('.note');
  const line = createConnectionLine(event, canvas, svgContainer);

  const { moveHandler, upHandler } = createConnectionHandlers(
    startNote,
    line,
    canvas,
    svgContainer,
  );

  document.addEventListener('mousemove', moveHandler);
  document.addEventListener('mouseup', upHandler);
}

/**
 * Creates a connection line.
 * @param {MouseEvent} event - The mousedown event.
 * @param {HTMLElement} canvas - The canvas element.
 * @param {SVGElement} svgContainer - The SVG container.
 * @returns {SVGLineElement} The created line element.
 */
function createConnectionLine(event, canvas, svgContainer) {
  const { left: startX, top: startY } = calculateOffsetPosition(
    canvas,
    event,
    event.target,
  );

  const line = createSVGElement('line', {
    x1: startX,
    y1: startY,
    x2: startX,
    y2: startY,
    stroke: STROKE_COLOR,
    'stroke-dasharray': STROKE_DASHARRAY,
    'stroke-width': STROKE_WIDTH,
    'marker-end': 'url(#arrow)',
  });

  svgContainer.appendChild(line);
  return line;
}

/**
 * Creates handlers for the connection drawing process.
 * @param {HTMLElement} startNote - The starting note element.
 * @param {SVGLineElement} line - The line element being drawn.
 * @param {HTMLElement} canvas - The canvas element.
 * @param {SVGElement} svgContainer - The SVG container.
 * @returns {Object} An object containing the move and up handlers.
 */
function createConnectionHandlers(startNote, line, canvas, svgContainer) {
  const moveHandler = (moveEvent) => {
    if (isConnecting) {
      const { left: currentX, top: currentY } = calculateOffsetPosition(
        canvas,
        moveEvent,
      );
      line.setAttribute('x2', currentX);
      line.setAttribute('y2', currentY);
    }
  };

  const upHandler = (upEvent) => {
    document.removeEventListener('mousemove', moveHandler);
    document.removeEventListener('mouseup', upHandler);

    if (
      isConnecting &&
      upEvent.target.closest('.note') &&
      upEvent.target !== startNote
    ) {
      const endNote = upEvent.target.closest('.note');
      finalizeConnection(startNote, endNote, line, canvas);
    } else {
      svgContainer.removeChild(line);
    }

    isConnecting = false;
  };

  return { moveHandler, upHandler };
}

/**
 * Finalizes the connection between two notes.
 * @param {HTMLElement} startNote - The starting note element.
 * @param {HTMLElement} endNote - The ending note element.
 * @param {SVGLineElement} line - The line element.
 * @param {HTMLElement} canvas - The canvas element.
 */
function finalizeConnection(startNote, endNote, line, canvas) {
  const { x1, y1, x2, y2 } = getClosestPoints(startNote, endNote, canvas);

  line.setAttribute('x1', x1);
  line.setAttribute('y1', y1);
  line.setAttribute('x2', x2);
  line.setAttribute('y2', y2);

  line.dataset.start = startNote.id;
  line.dataset.end = endNote.id;
  updateConnections(startNote, canvas);
  updateConnections(endNote, canvas);
}

/**
 * Handles the line selection.
 * @param {MouseEvent} event - The click event.
 */
function handleLineSelection(event) {
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
}

/**
 * Handles the line deletion.
 * @param {KeyboardEvent} event - The keydown event.
 */
function handleLineDeletion(event) {
  if (event.key === 'Delete') {
    const selectedLine = document.querySelector('.line-selected');
    if (selectedLine) {
      selectedLine.remove();
    }
  }
}

/**
 * Calculates the closest points between two notes for connection.
 * @param {HTMLElement} note1 - The first note element.
 * @param {HTMLElement} note2 - The second note element.
 * @param {HTMLElement} canvas - The canvas element.
 * @returns {Object} An object containing the x1, y1, x2, and y2 coordinates.
 */
function getClosestPoints(note1, note2, canvas) {
  const zoomLevel = getZoomLevel();
  const scale = zoomLevel / 5;

  const rect1 = note1.getBoundingClientRect();
  const rect2 = note2.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();

  const adjustedRect1 = adjustRectForZoom(rect1, canvasRect, scale);
  const adjustedRect2 = adjustRectForZoom(rect2, canvasRect, scale);

  const center1 = getCenter(adjustedRect1);
  const center2 = getCenter(adjustedRect2);

  if (Math.abs(center1.x - center2.x) > Math.abs(center1.y - center2.y)) {
    // Connect horizontally
    return {
      x1: center1.x > center2.x ? adjustedRect1.left : adjustedRect1.right,
      y1: center1.y,
      x2: center1.x > center2.x ? adjustedRect2.right : adjustedRect2.left,
      y2: center2.y,
    };
  } else {
    // Connect vertically
    return {
      x1: center1.x,
      y1: center1.y > center2.y ? adjustedRect1.top : adjustedRect1.bottom,
      x2: center2.x,
      y2: center1.y > center2.y ? adjustedRect2.bottom : adjustedRect2.top,
    };
  }
}

/**
 * Adjusts a rectangle for the current zoom level.
 * @param {DOMRect} rect - The original rectangle.
 * @param {DOMRect} canvasRect - The canvas rectangle.
 * @param {number} scale - The current zoom scale.
 * @returns {Object} The adjusted rectangle.
 */
function adjustRectForZoom(rect, canvasRect, scale) {
  return {
    left: (rect.left - canvasRect.left) / scale,
    top: (rect.top - canvasRect.top) / scale,
    width: rect.width / scale,
    height: rect.height / scale,
    right: (rect.right - canvasRect.left) / scale,
    bottom: (rect.bottom - canvasRect.top) / scale,
  };
}

/**
 * Calculates the center of a rectangle.
 * @param {Object} rect - The rectangle object.
 * @returns {Object} An object containing the x and y coordinates of the center.
 */
function getCenter(rect) {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

/**
 * Creates an SVG element with given attributes.
 * @param {string} type - The type of SVG element to create.
 * @param {Object} attributes - An object of attributes to set on the element.
 * @returns {SVGElement} The created SVG element.
 */
function createSVGElement(type, attributes = {}) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', type);
  Object.entries(attributes).forEach(([key, value]) =>
    element.setAttribute(key, value),
  );
  return element;
}

/**
 * Deletes all connections associated with a note.
 * @param {HTMLElement} note - The note element.
 */
export function deleteConnectionsByNote(note) {
  const connections = document.querySelectorAll(
    `line[data-start="${note.id}"], line[data-end="${note.id}"]`,
  );
  connections.forEach((connection) => connection.remove());
}
