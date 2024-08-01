// connections.js
import { calculateOffsetPosition, log } from './utils.js';
import { getZoomLevel } from './zoomManager.js';
import { updateConnectionInDataStore } from './dataStore.js';
import { ContextMenu } from './contextMenu.js';
import { throttle } from './utils.js';

const STROKE_COLOR = '#888';
const STROKE_WIDTH = '2';
const STROKE_DASHARRAY = '5,5';

const throttledUpdateConnections = throttle(updateConnections, 16);

export const CONNECTION_TYPES = {
  NONE: 'none',
  UNI_FORWARD: 'uni-forward',
  UNI_BACKWARD: 'uni-backward',
  BI: 'bi',
};

export let isConnecting = false;

const contextMenu = new ContextMenu(
  CONNECTION_TYPES,
  STROKE_COLOR,
  STROKE_WIDTH,
);

let currentZoomLevel = null;

function getCurrentZoomLevel() {
  return currentZoomLevel !== null ? currentZoomLevel : getZoomLevel();
}

export function startDragging() {
  currentZoomLevel = getZoomLevel();
}

// Set up callbacks
contextMenu.setDeleteCallback((startId, endId, connectionGroup) => {
  log('Delete callback triggered', { startId, endId });

  if (connectionGroup) {
    log('Connection group found, removing');
    connectionGroup.remove();
    updateConnectionInDataStore(startId, endId, null);
  } else {
    log('Connection group not found for deletion');
  }
});

contextMenu.setTypeChangeCallback((startId, endId, newType) => {
  log('Type change callback called with:', startId, endId, newType);
  const query = `g[data-start="${startId}"][data-end="${endId}"]`;
  log('Searching for connection group with query:', query);
  const connectionGroup = document.querySelector(query);
  if (connectionGroup) {
    log('Connection group found, updating type');
    const path = connectionGroup.querySelector('path');
    const startNote = document.getElementById(startId);
    const endNote = document.getElementById(endId);

    if (startNote && endNote && path) {
      log('Start and end notes found, updating connection');
      const points = getClosestPoints(startNote, endNote);
      log('Closest points:', points);

      // Immediately update the visual representation
      updateConnectionPath(
        path,
        points.x1,
        points.y1,
        points.x2,
        points.y2,
        newType,
      );
      connectionGroup.dataset.type = newType;

      // Queue the data store update (this call is now debounced)
      updateConnectionInDataStore(startId, endId, newType);

      // Force a re-render of the connection
      log('Forcing re-render of connection');
      requestAnimationFrame(() => {
        throttledUpdateConnections(connectionGroup);
      });
    } else {
      log('Missing elements for update:', {
        startNote: !!startNote,
        endNote: !!endNote,
        path: !!path,
      });
    }
  } else {
    log('Connection group not found for type change');
  }
});

export function initializeConnectionDrawing(canvas) {
  const svgContainer = createSVGContainer(canvas);
  const [startMarker, endMarker] = createArrowMarkers();
  svgContainer.appendChild(startMarker);
  svgContainer.appendChild(endMarker);

  canvas.addEventListener('mousedown', (event) => {
    if (event.target.classList.contains('ghost-connector')) {
      handleMouseDown(event, canvas, svgContainer);
    }
  });

  svgContainer.addEventListener('click', handleSvgClick);
  svgContainer.addEventListener('mousemove', handleSvgMouseMove);
  svgContainer.addEventListener('mouseleave', handleSvgMouseLeave);

  document.addEventListener('keydown', handleKeyDown);

  contextMenu.attachClickHandler(svgContainer);

  return svgContainer;
}

export function updateConnections(noteOrGroup) {
  const updateSingle = (group) => {
    const [startNote, endNote, path, hotspot, contextMenuElement] = [
      document.getElementById(group.dataset.start),
      document.getElementById(group.dataset.end),
      group.querySelector('path'),
      group.querySelector('circle'),
      group.querySelector('.context-menu'),
    ];

    if (startNote && endNote && path && hotspot && contextMenuElement) {
      const points = getClosestPoints(startNote, endNote);
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

      // 3. Batch DOM updates
      requestAnimationFrame(() => {
        hotspot.setAttribute('cx', hotspotX);
        hotspot.setAttribute('cy', hotspotY);
        contextMenuElement.setAttribute(
          'transform',
          `translate(${hotspotX}, ${hotspotY})`,
        );

        const backgroundLine = group.querySelector(
          '.connector-background-line',
        );
        if (backgroundLine) {
          backgroundLine.setAttribute('x1', hotspotX);
          backgroundLine.setAttribute('y1', hotspotY - 10);
          backgroundLine.setAttribute('x2', hotspotX);
          backgroundLine.setAttribute('y2', hotspotY + 10);
        }
      });

      group.appendChild(contextMenuElement);
    } else {
      if (group.parentNode) {
        group.remove();
      }
    }
  };

  // Use more efficient selectors and avoid unnecessary updates
  if (noteOrGroup instanceof Element) {
    if (noteOrGroup.classList.contains('note')) {
      const connections = document.querySelectorAll(
        `g[data-start="${noteOrGroup.id}"], g[data-end="${noteOrGroup.id}"]`,
      );
      connections.forEach(updateSingle);
    } else if (noteOrGroup.tagName.toLowerCase() === 'g') {
      updateSingle(noteOrGroup);
    }
  } else {
    const connections = document.querySelectorAll('g[data-start]');
    connections.forEach(updateSingle);
  }
}

export function createConnection(fromId, toId, type) {
  const svgContainer = document.getElementById('svg-container');
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  group.setAttribute('data-start', fromId);
  group.setAttribute('data-end', toId);
  group.setAttribute('data-type', type);

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('stroke', STROKE_COLOR);
  path.setAttribute('stroke-width', STROKE_WIDTH);
  path.setAttribute('stroke-dasharray', STROKE_DASHARRAY);
  path.setAttribute('fill', 'none');

  const hotspot = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'circle',
  );
  hotspot.setAttribute('r', '5');
  hotspot.setAttribute('fill', '#fff');
  hotspot.setAttribute('stroke', STROKE_COLOR);
  hotspot.setAttribute('stroke-width', STROKE_WIDTH);
  hotspot.classList.add('connector-hotspot');

  const contextMenuElement = contextMenu.createMenu();
  contextMenuElement.style.display = 'none';

  group.appendChild(path);
  group.appendChild(hotspot);
  group.appendChild(contextMenuElement);
  svgContainer.appendChild(group);

  throttledUpdateConnections(group);
  log('Connection created:', { fromId, toId, type });
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

function createConnectionGroup(event, canvas, svgContainer) {
  const { left: startX, top: startY } = calculateOffsetPosition(
    canvas,
    event,
    event.target,
  );
  const group = createSVGElement('g');

  // Add the background line
  const backgroundLine = createSVGElement('line', {
    x1: startX,
    y1: startY - 10, // Extend 10px above
    x2: startX,
    y2: startY + 10, // Extend 10px below
    stroke: '#ccc',
    'stroke-width': '1', // Fine line
    class: 'connector-background-line',
  });

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
    r: '4',
    fill: '#fff',
    stroke: STROKE_COLOR,
    'stroke-width': STROKE_WIDTH,
    class: 'connector-hotspot',
  });

  const contextMenuElement = contextMenu.createMenu(group); // Pass the group to createMenu
  contextMenuElement.style.display = 'none';
  contextMenuElement.setAttribute(
    'transform',
    `translate(${startX}, ${startY})`,
  );

  group.appendChild(backgroundLine); // Add the background line first
  group.appendChild(path);
  group.appendChild(hotspot);
  group.appendChild(contextMenuElement);
  svgContainer.appendChild(group);

  return {
    path,
    hotspot,
    contextMenu: contextMenuElement,
    group,
    startX,
    startY,
    backgroundLine,
  };
}

function updateConnectionPath(path, x1, y1, x2, y2, type) {
  //log('Updating connection path:', { x1, y1, x2, y2, type });

  if (
    typeof x1 !== 'number' ||
    typeof y1 !== 'number' ||
    typeof x2 !== 'number' ||
    typeof y2 !== 'number'
  ) {
    log('Invalid coordinates for path:', { x1, y1, x2, y2 });
    return;
  }

  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  const dAttr = `M${x1},${y1} Q${midX},${midY} ${x2},${y2}`;
  path.setAttribute('d', dAttr);
  //log('Path d attribute set to:', dAttr);

  let markerStart = '';
  let markerEnd = '';

  switch (type) {
    case CONNECTION_TYPES.UNI_FORWARD:
      markerEnd = 'url(#arrow-end)';
      break;
    case CONNECTION_TYPES.UNI_BACKWARD:
      markerStart = 'url(#arrow-start)';
      break;
    case CONNECTION_TYPES.BI:
      markerStart = 'url(#arrow-start)';
      markerEnd = 'url(#arrow-end)';
      break;
    case CONNECTION_TYPES.NONE:
      // No markers for non-directional
      break;
  }

  path.setAttribute('marker-start', markerStart);
  path.setAttribute('marker-end', markerEnd);
  //log('Markers set:', { markerStart, markerEnd });
}

function handleSvgClick(event) {
  handleLineSelection(event);
}

function handleSvgMouseMove(event) {
  const hotspot = event.target.closest('.connector-hotspot');
  const contextMenuElement = event.target.closest('.context-menu');

  if (hotspot) {
    contextMenu.show(hotspot);
  } else if (!contextMenuElement && !contextMenu.isMouseOver) {
    contextMenu.hide();
  }
}

function handleSvgMouseLeave() {
  if (!contextMenu.isMouseOver) {
    contextMenu.hide();
  }
}

function handleKeyDown(event) {
  if (event.key === 'Delete') {
    handleLineDeletion(event);
  }
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
    log('Invalid notes provided to getClosestPoints');
    return { x1: 0, y1: 0, x2: 0, y2: 0 };
  }

  const scale = getCurrentZoomLevel() / 5;
  const canvasRect = document.getElementById('canvas').getBoundingClientRect();

  const [rect1, rect2] = [note1, note2].map((note) => {
    const rect = note.getBoundingClientRect();
    return {
      left: (rect.left - canvasRect.left) / scale,
      top: (rect.top - canvasRect.top) / scale,
      width: rect.width / scale,
      height: rect.height / scale,
      right: (rect.right - canvasRect.left) / scale,
      bottom: (rect.bottom - canvasRect.top) / scale,
    };
  });

  const [center1, center2] = [rect1, rect2].map((rect) => ({
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  }));

  if (Math.abs(center1.x - center2.x) > Math.abs(center1.y - center2.y)) {
    return {
      x1: center1.x > center2.x ? rect1.left : rect1.right,
      y1: center1.y,
      x2: center1.x > center2.x ? rect2.right : rect2.left,
      y2: center2.y,
    };
  } else {
    return {
      x1: center1.x,
      y1: center1.y > center2.y ? rect1.top : rect1.bottom,
      x2: center2.x,
      y2: center1.y > center2.y ? rect2.bottom : rect2.top,
    };
  }
}

// function adjustRectForZoom(rect, canvasRect, scale) {
//   return {
//     left: (rect.left - canvasRect.left) / scale,
//     top: (rect.top - canvasRect.top) / scale,
//     width: rect.width / scale,
//     height: rect.height / scale,
//     right: (rect.right - canvasRect.left) / scale,
//     bottom: (rect.bottom - canvasRect.top) / scale,
//   };
// }

// function getCenter(rect) {
//   return {
//     x: rect.left + rect.width / 2,
//     y: rect.top + rect.height / 2,
//   };
// }

function createSVGElement(type, attributes = {}) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', type);
  Object.entries(attributes).forEach(([key, value]) =>
    element.setAttribute(key, value),
  );
  return element;
}

function createArrowMarkers() {
  const startMarker = createSVGElement('marker', {
    id: 'arrow-start',
    markerWidth: '10',
    markerHeight: '7',
    refX: '0',
    refY: '3.5',
    orient: 'auto',
  });
  startMarker.innerHTML = '<path d="M10,0 L0,3.5 L10,7" fill="#888" />';

  const endMarker = createSVGElement('marker', {
    id: 'arrow-end',
    markerWidth: '10',
    markerHeight: '7',
    refX: '10',
    refY: '3.5',
    orient: 'auto',
  });
  endMarker.innerHTML = '<path d="M0,0 L10,3.5 L0,7" fill="#888" />';

  return [startMarker, endMarker];
}

function handleMouseDown(event, canvas, svgContainer) {
  event.preventDefault();
  event.stopPropagation();

  const startNote = event.target.closest('.note');
  if (!startNote) return;

  isConnecting = true;
  const connectionGroup = createConnectionGroup(event, canvas, svgContainer);

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

  document.addEventListener('mousemove', moveHandler);
  document.addEventListener('mouseup', upHandler);
}

function finalizeConnection(startNote, endNote, connectionGroup) {
  if (connectionExists(startNote.id, endNote.id)) {
    log('Connection already exists between these notes');
    connectionGroup.group.remove();
    return;
  }

  connectionGroup.group.dataset.start = startNote.id;
  connectionGroup.group.dataset.end = endNote.id;
  connectionGroup.group.dataset.type = CONNECTION_TYPES.NONE;

  connectionGroup.contextMenu.connectionGroup = connectionGroup.group;

  throttledUpdateConnections(connectionGroup.group);

  updateConnectionInDataStore(startNote.id, endNote.id, CONNECTION_TYPES.NONE);
}

function connectionExists(id1, id2) {
  return (
    document.querySelector(
      `g[data-start="${id1}"][data-end="${id2}"], g[data-start="${id2}"][data-end="${id1}"]`,
    ) !== null
  );
}
