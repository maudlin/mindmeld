import { calculateOffsetPosition } from './utils.js';
import { getZoomLevel } from './zoomManager.js';
import { updateConnectionInDataStore } from './dataStore.js';

const STROKE_COLOR = '#888';
const STROKE_WIDTH = '2';
const STROKE_DASHARRAY = '5,5';

export const CONNECTION_TYPES = {
  NONE: 'none',
  UNI_FORWARD: 'uni-forward',
  UNI_BACKWARD: 'uni-backward',
  BI: 'bi',
};

export let isConnecting = false;

export function updateConnections(note) {
  requestAnimationFrame(() => {
    try {
      const connections = document.querySelectorAll(
        `g[data-start="${note.id}"], g[data-end="${note.id}"]`,
      );

      connections.forEach((group) => {
        const path = group.querySelector('path');
        const hotspot = group.querySelector('circle');
        const contextMenu = group.querySelector('.context-menu');
        const startNote = document.getElementById(group.dataset.start);
        const endNote = document.getElementById(group.dataset.end);

        if (startNote && endNote) {
          const points = getClosestPoints(startNote, endNote);

          if (
            points &&
            typeof points.x1 === 'number' &&
            typeof points.y1 === 'number' &&
            typeof points.x2 === 'number' &&
            typeof points.y2 === 'number'
          ) {
            updateConnectionPath(
              path,
              points.x1,
              points.y1,
              points.x2,
              points.y2,
              group.dataset.type || CONNECTION_TYPES.NONE,
            );

            const hotspotX = (points.x1 + points.x2) / 2;
            const hotspotY = (points.y1 + points.y2) / 2;
            hotspot.setAttribute('cx', hotspotX);
            hotspot.setAttribute('cy', hotspotY);
            contextMenu.setAttribute(
              'transform',
              `translate(${hotspotX}, ${hotspotY})`,
            );
          } else {
            console.error(
              'Invalid points returned from getClosestPoints:',
              points,
            );
          }
        } else {
          console.warn('Missing start or end note:', { startNote, endNote });
          group.remove();
        }
      });
    } catch (error) {
      console.error('Error updating connections:', error);
    }
  });
}

export function initializeConnectionDrawing(canvas) {
  const svgContainer = createSVGContainer(canvas);
  const marker = createArrowMarker();
  svgContainer.appendChild(marker);

  canvas.addEventListener('mousedown', (event) =>
    handleMouseDown(event, canvas, svgContainer),
  );
  document.addEventListener('click', handleLineSelection);
  document.addEventListener('keydown', handleLineDeletion);
  document.addEventListener('click', handleContextMenu);

  canvas.addEventListener('mouseenter', handleHotspotHover, true);
  canvas.addEventListener('mouseleave', handleHotspotHover, true);
}

function handleHotspotHover(event) {
  const hotspot = event.target.closest('.connector-hotspot');
  if (!hotspot) return;

  const connectionGroup = hotspot.closest('g');
  const contextMenu = connectionGroup.querySelector('.context-menu');

  if (event.type === 'mouseenter') {
    contextMenu.style.display = 'block';
  } else if (event.type === 'mouseleave') {
    setTimeout(() => {
      if (!connectionGroup.querySelector('.context-menu:hover')) {
        contextMenu.style.display = 'none';
      }
    }, 100);
  }
}

function handleContextMenu(event) {
  if (event.target.closest('.menu-item')) {
    const menuItem = event.target.closest('.menu-item');
    const connectionType = menuItem.dataset.type;
    const connectionGroup = menuItem.closest('g');

    if (connectionType === 'delete') {
      connectionGroup.remove();
      updateConnectionInDataStore(
        connectionGroup.dataset.start,
        connectionGroup.dataset.end,
        null,
      );
    } else {
      const path = connectionGroup.querySelector('path');
      const startNote = document.getElementById(connectionGroup.dataset.start);
      const endNote = document.getElementById(connectionGroup.dataset.end);
      updateConnectionPath(path, startNote, endNote, connectionType);
      connectionGroup.dataset.type = connectionType;
      updateConnectionInDataStore(
        connectionGroup.dataset.start,
        connectionGroup.dataset.end,
        connectionType,
      );
    }

    const contextMenu = connectionGroup.querySelector('.context-menu');
    contextMenu.style.display = 'none';
  }
}

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

function handleMouseDown(event, canvas, svgContainer) {
  if (!event.target.classList.contains('ghost-connector')) return;

  event.stopPropagation();
  event.preventDefault();

  isConnecting = true;
  const startNote = event.target.closest('.note');
  const connectionGroup = createConnectionGroup(event, canvas, svgContainer);

  const { moveHandler, upHandler } = createConnectionHandlers(
    startNote,
    connectionGroup,
    canvas,
    svgContainer,
  );

  document.addEventListener('mousemove', moveHandler);
  document.addEventListener('mouseup', upHandler);
}

function createConnectionGroup(event, canvas, svgContainer) {
  const { left: startX, top: startY } = calculateOffsetPosition(
    canvas,
    event,
    event.target,
  );
  const group = createSVGElement('g');

  const path = createSVGElement('path', {
    stroke: STROKE_COLOR,
    'stroke-width': STROKE_WIDTH,
    'stroke-dasharray': STROKE_DASHARRAY,
    fill: 'none',
    d: `M${startX},${startY} L${startX},${startY}`,
  });

  const hotspot = createSVGElement('circle', {
    cx: startX,
    cy: startY,
    r: '5',
    fill: '#fff',
    stroke: STROKE_COLOR,
    'stroke-width': STROKE_WIDTH,
    class: 'connector-hotspot',
  });

  const contextMenu = createContextMenu();
  contextMenu.style.display = 'none';
  contextMenu.setAttribute('transform', `translate(${startX}, ${startY})`);

  group.appendChild(path);
  group.appendChild(hotspot);
  group.appendChild(contextMenu);
  svgContainer.appendChild(group);

  return { path, hotspot, contextMenu, group, startX, startY };
}

function createContextMenu() {
  const menu = createSVGElement('g', { class: 'context-menu' });

  const menuItems = [
    { type: 'delete', symbol: 'x', y: 0 },
    { type: CONNECTION_TYPES.UNI_FORWARD, symbol: '>', y: 20 },
    { type: CONNECTION_TYPES.NONE, symbol: '-', y: 40 },
    { type: CONNECTION_TYPES.UNI_BACKWARD, symbol: '<', y: 60 },
    { type: CONNECTION_TYPES.BI, symbol: '<>', y: 80 },
  ];

  menuItems.forEach((item) => {
    const button = createSVGElement('g', {
      class: 'menu-item',
      'data-type': item.type,
    });

    const circle = createSVGElement('circle', {
      r: '10',
      cx: '0',
      cy: item.y,
      fill: item.type === 'delete' ? 'pink' : 'white',
      stroke: STROKE_COLOR,
    });

    const text = createSVGElement('text', {
      x: '0',
      y: item.y,
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
      'font-size': '12',
      fill: 'black',
    });
    text.textContent = item.symbol;

    button.appendChild(circle);
    button.appendChild(text);
    menu.appendChild(button);
  });

  return menu;
}

function updateConnectionPath(path, x1, y1, x2, y2, type) {
  const startX = parseFloat(x1);
  const startY = parseFloat(y1);
  const endX = parseFloat(x2);
  const endY = parseFloat(y2);

  if (isNaN(startX) || isNaN(startY) || isNaN(endX) || isNaN(endY)) {
    console.error('Invalid coordinates for path:', { x1, y1, x2, y2 });
    return;
  }

  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;

  const dAttr = `M${startX},${startY} Q${midX},${midY} ${endX},${endY}`;
  path.setAttribute('d', dAttr);

  let markerStart = '';
  let markerEnd = '';

  switch (type) {
    case CONNECTION_TYPES.UNI_FORWARD:
      markerEnd = 'url(#arrow)';
      break;
    case CONNECTION_TYPES.UNI_BACKWARD:
      markerStart = 'url(#arrow)';
      break;
    case CONNECTION_TYPES.BI:
      markerStart = 'url(#arrow)';
      markerEnd = 'url(#arrow)';
      break;
  }

  path.setAttribute('marker-start', markerStart);
  path.setAttribute('marker-end', markerEnd);
}

function handleLineSelection(event) {
  if (event.target.tagName === 'path') {
    document
      .querySelectorAll('path')
      .forEach((path) => path.classList.remove('line-selected'));
    event.target.classList.add('line-selected');
  } else {
    document
      .querySelectorAll('path')
      .forEach((path) => path.classList.remove('line-selected'));
  }
}

function handleLineDeletion(event) {
  if (event.key === 'Delete') {
    const selectedLine = document.querySelector('.line-selected');
    if (selectedLine) {
      const connectionGroup = selectedLine.closest('g');
      connectionGroup.remove();
      updateConnectionInDataStore(
        connectionGroup.dataset.start,
        connectionGroup.dataset.end,
        null,
      );
    }
  }
}

function getClosestPoints(note1, note2) {
  if (!note1 || !note2) {
    console.error('Invalid notes provided to getClosestPoints');
    return { x1: 0, y1: 0, x2: 0, y2: 0 };
  }

  const zoomLevel = getZoomLevel();
  const scale = zoomLevel / 5;

  const rect1 = note1.getBoundingClientRect();
  const rect2 = note2.getBoundingClientRect();
  const canvasRect = document.getElementById('canvas').getBoundingClientRect();

  const adjustedRect1 = adjustRectForZoom(rect1, canvasRect, scale);
  const adjustedRect2 = adjustRectForZoom(rect2, canvasRect, scale);

  const center1 = getCenter(adjustedRect1);
  const center2 = getCenter(adjustedRect2);

  let result;
  if (Math.abs(center1.x - center2.x) > Math.abs(center1.y - center2.y)) {
    result = {
      x1: center1.x > center2.x ? adjustedRect1.left : adjustedRect1.right,
      y1: center1.y,
      x2: center1.x > center2.x ? adjustedRect2.right : adjustedRect2.left,
      y2: center2.y,
    };
  } else {
    result = {
      x1: center1.x,
      y1: center1.y > center2.y ? adjustedRect1.top : adjustedRect1.bottom,
      x2: center2.x,
      y2: center1.y > center2.y ? adjustedRect2.bottom : adjustedRect2.top,
    };
  }

  return result;
}

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

function getCenter(rect) {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function createSVGElement(type, attributes = {}) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', type);
  Object.entries(attributes).forEach(([key, value]) =>
    element.setAttribute(key, value),
  );
  return element;
}

export function deleteConnectionsByNote(note) {
  const connections = document.querySelectorAll(
    `g[data-start="${note.id}"], g[data-end="${note.id}"]`,
  );
  connections.forEach((connection) => {
    connection.remove();
    updateConnectionInDataStore(
      connection.dataset.start,
      connection.dataset.end,
      null,
    );
  });
}
/**
 * Creates handlers for the connection drawing process.
 * @param {HTMLElement} startNote - The starting note element.
 * @param {Object} connectionGroup - The connection group object.
 * @param {HTMLElement} canvas - The canvas element.
 * @param {SVGElement} svgContainer - The SVG container.
 * @returns {Object} An object containing the move and up handlers.
 */
function createConnectionHandlers(
  startNote,
  connectionGroup,
  canvas,
  svgContainer,
) {
  const moveHandler = (moveEvent) => {
    if (isConnecting) {
      const { left: currentX, top: currentY } = calculateOffsetPosition(
        canvas,
        moveEvent,
      );
      updateConnectionPath(
        connectionGroup.path,
        connectionGroup.startX,
        connectionGroup.startY,
        currentX,
        currentY,
        CONNECTION_TYPES.NONE,
      );
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
      finalizeConnection(startNote, endNote, connectionGroup);
    } else {
      svgContainer.removeChild(connectionGroup.group);
    }

    isConnecting = false;
  };

  return { moveHandler, upHandler };
}
/**
 * Finalizes the connection between two notes.
 * @param {HTMLElement} startNote - The starting note element.
 * @param {HTMLElement} endNote - The ending note element.
 * @param {Object} connectionGroup - The connection group object.
 */
function finalizeConnection(startNote, endNote, connectionGroup) {
  if (connectionExists(startNote.id, endNote.id)) {
    console.log('Connection already exists between these notes');
    connectionGroup.group.remove();
    return;
  }

  const points = getClosestPoints(startNote, endNote);
  updateConnectionPath(
    connectionGroup.path,
    points.x1,
    points.y1,
    points.x2,
    points.y2,
    CONNECTION_TYPES.NONE,
  );

  connectionGroup.group.dataset.start = startNote.id;
  connectionGroup.group.dataset.end = endNote.id;
  connectionGroup.group.dataset.type = CONNECTION_TYPES.NONE;

  const hotspotX = (points.x1 + points.x2) / 2;
  const hotspotY = (points.y1 + points.y2) / 2;
  connectionGroup.hotspot.setAttribute('cx', hotspotX);
  connectionGroup.hotspot.setAttribute('cy', hotspotY);
  connectionGroup.contextMenu.setAttribute(
    'transform',
    `translate(${hotspotX}, ${hotspotY})`,
  );

  updateConnectionInDataStore(startNote.id, endNote.id, CONNECTION_TYPES.NONE);
}

/**
 * Checks if a connection already exists between two notes.
 * @param {string} id1 - The ID of the first note.
 * @param {string} id2 - The ID of the second note.
 * @returns {boolean} True if a connection exists, false otherwise.
 */
function connectionExists(id1, id2) {
  return (
    document.querySelector(
      `g[data-start="${id1}"][data-end="${id2}"], g[data-start="${id2}"][data-end="${id1}"]`,
    ) !== null
  );
}
