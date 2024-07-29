import { calculateOffsetPosition, log } from './utils.js';
import { getZoomLevel } from './zoomManager.js';

// Constants
const STROKE_COLOR = '#888';
const STROKE_WIDTH = '2';
const STROKE_DASHARRAY = '5,5';

export let isConnecting = false;

let globalCanvas = null;

/**
 * Updates the position of connections for a given note.
 * @param {HTMLElement} note - The note element.
 * @param {HTMLElement} canvas - The canvas element.
 */
// Update this function to position the hotspot
export function updateConnections(note) {
  if (!globalCanvas) {
    log('Global canvas is not initialized');
    return;
  }

  requestAnimationFrame(() => {
    try {
      const connections = document.querySelectorAll(
        `g[data-start="${note.id}"], g[data-end="${note.id}"]`,
      );

      connections.forEach((group) => {
        const line = group.querySelector('line');
        const hotspot = group.querySelector('circle');
        const startNoteId = group.dataset.start;
        const endNoteId = group.dataset.end;
        const startNote = document.getElementById(startNoteId);
        const endNote = document.getElementById(endNoteId);

        if (startNote && endNote) {
          updateConnectionPositions(startNote, endNote, line, hotspot);
        } else {
          log(
            `Missing note(s) for connection: start=${startNoteId}, end=${endNoteId}`,
          );
          group.dataset.toRemove = 'true';
        }
      });

      // Remove marked connections after the loop
      document.querySelectorAll('g[data-to-remove="true"]').forEach((group) => {
        group.remove();
        log('Removed a connection with missing note(s)');
      });
    } catch (error) {
      log('Error updating connections:', error);
    }
  });
}

function updateConnectionPositions(startNote, endNote, line, hotspot) {
  const result = getClosestPoints(startNote, endNote);
  if (result.error) {
    log(result.error);
    return;
  }
  const { x1, y1, x2, y2 } = result;
  line.setAttribute('x1', x1);
  line.setAttribute('y1', y1);
  line.setAttribute('x2', x2);
  line.setAttribute('y2', y2);

  // Position hotspot at the middle of the line
  const hotspotX = (parseFloat(x1) + parseFloat(x2)) / 2;
  const hotspotY = (parseFloat(y1) + parseFloat(y2)) / 2;
  hotspot.setAttribute('cx', hotspotX);
  hotspot.setAttribute('cy', hotspotY);
}

/**
 * Initializes the connection drawing functionality.
 * @param {HTMLElement} canvas - The canvas element.
 */
export function initializeConnectionDrawing(canvas) {
  globalCanvas = canvas;
  const svgContainer = createSVGContainer(canvas);
  const marker = createArrowMarker();
  svgContainer.appendChild(marker);

  canvas.addEventListener('mousedown', (event) =>
    handleMouseDown(event, canvas, svgContainer),
  );
  document.addEventListener('click', handleLineSelection);
  document.addEventListener('keydown', handleLineDeletion);
  document.addEventListener('click', handleHotspotClick);
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

  event.stopPropagation();
  event.preventDefault();

  isConnecting = true;
  const startNote = event.target.closest('.note');
  const lineGroup = createConnectionLine(event, canvas, svgContainer);

  const { moveHandler, upHandler } = createConnectionHandlers(
    startNote,
    lineGroup,
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
  const group = createSVGElement('g');

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

  const hotspot = createSVGElement('circle', {
    r: '5',
    fill: '#fff',
    stroke: STROKE_COLOR,
    'stroke-width': STROKE_WIDTH,
    class: 'connector-hotspot',
  });

  group.appendChild(line);
  group.appendChild(hotspot);
  svgContainer.appendChild(group);

  return { line, hotspot, group };
}

/**
 * Creates handlers for the connection drawing process.
 * @param {HTMLElement} startNote - The starting note element.
 * @param {SVGLineElement} line - The line element being drawn.
 * @param {HTMLElement} canvas - The canvas element.
 * @param {SVGElement} svgContainer - The SVG container.
 * @returns {Object} An object containing the move and up handlers.
 */
function createConnectionHandlers(startNote, lineGroup, svgContainer) {
  const moveHandler = (moveEvent) => {
    if (isConnecting) {
      const { left: currentX, top: currentY } = calculateOffsetPosition(
        globalCanvas,
        moveEvent,
      );
      lineGroup.line.setAttribute('x2', currentX);
      lineGroup.line.setAttribute('y2', currentY);
    }
  };

  const upHandler = (upEvent) => {
    document.removeEventListener('mousemove', moveHandler);
    document.removeEventListener('mouseup', upHandler);

    if (
      isConnecting &&
      upEvent.target.closest('.note') &&
      upEvent.target.closest('.note') !== startNote
    ) {
      const endNote = upEvent.target.closest('.note');
      finalizeConnection(startNote, endNote, lineGroup);
    } else {
      svgContainer.removeChild(lineGroup.group);
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
function finalizeConnection(startNote, endNote, lineGroup) {
  // Check if a connection already exists between these notes
  if (connectionExists(startNote.id, endNote.id)) {
    log('Connection already exists between these notes');
    lineGroup.group.remove(); // Remove the temporary line
    return;
  }

  const { x1, y1, x2, y2 } = getClosestPoints(startNote, endNote);

  lineGroup.line.setAttribute('x1', x1);
  lineGroup.line.setAttribute('y1', y1);
  lineGroup.line.setAttribute('x2', x2);
  lineGroup.line.setAttribute('y2', y2);

  lineGroup.group.dataset.start = startNote.id;
  lineGroup.group.dataset.end = endNote.id;

  // Position hotspot at the middle of the line
  const hotspotX = (parseFloat(x1) + parseFloat(x2)) / 2;
  const hotspotY = (parseFloat(y1) + parseFloat(y2)) / 2;
  lineGroup.hotspot.setAttribute('cx', hotspotX);
  lineGroup.hotspot.setAttribute('cy', hotspotY);

  updateConnections(startNote);
  updateConnections(endNote);
}

function connectionExists(id1, id2) {
  return (
    document.querySelector(
      `g[data-start="${id1}"][data-end="${id2}"], g[data-start="${id2}"][data-end="${id1}"]`,
    ) !== null
  );
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
function getClosestPoints(note1, note2) {
  if (!note1 || !note2 || !globalCanvas) {
    return {
      error: `Invalid input: note1=${!!note1}, note2=${!!note2}, globalCanvas=${!!globalCanvas}`,
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 0,
    };
  }

  const zoomLevel = getZoomLevel();
  const scale = zoomLevel / 5;

  try {
    const rect1 = note1.getBoundingClientRect();
    const rect2 = note2.getBoundingClientRect();
    const canvasRect = globalCanvas.getBoundingClientRect();

    if (
      !isValidRect(rect1) ||
      !isValidRect(rect2) ||
      !isValidRect(canvasRect)
    ) {
      return {
        error: `Invalid rectangle: rect1=${JSON.stringify(
          rect1,
        )}, rect2=${JSON.stringify(rect2)}, canvasRect=${JSON.stringify(
          canvasRect,
        )}`,
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0,
      };
    }

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
  } catch (error) {
    log('Error in getClosestPoints:', error);
    return {
      error: 'Exception in getClosestPoints',
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 0,
    };
  }
}

function isValidRect(rect) {
  return (
    rect &&
    typeof rect.left === 'number' &&
    !isNaN(rect.left) &&
    typeof rect.top === 'number' &&
    !isNaN(rect.top) &&
    typeof rect.right === 'number' &&
    !isNaN(rect.right) &&
    typeof rect.bottom === 'number' &&
    !isNaN(rect.bottom)
  );
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
    `g[data-start="${note.id}"], g[data-end="${note.id}"]`,
  );
  connections.forEach((connection) => connection.remove());
}

function handleHotspotClick(event) {
  if (event.target.classList.contains('connector-hotspot')) {
    log('Hotspot clicked - implement context menu here');
    // Implement your context menu logic here
  }
}
