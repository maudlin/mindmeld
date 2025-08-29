// src/js/features/connection/connections.js
import { connectionManager } from './connectionManager.js';
import { log } from '../../utils/utils.js';
// import { saveStateToStorage } from '../../data/storageManager.js';

export function startDragging() {
  connectionManager.setCurrentZoomLevel();
}

// Set up callbacks
connectionManager.contextMenu.setDeleteCallback(
  (startId, endId, connectionGroup) => {
    log('Delete callback triggered', { startId, endId });

    if (connectionGroup) {
      log('Connection group found, removing');
      connectionGroup.remove();
      connectionManager.updateConnectionInDataStore(startId, endId, null);
    } else {
      log('Connection group not found for deletion');
    }
  },
);

connectionManager.contextMenu.setTypeChangeCallback(
  (startId, endId, newType) => {
    log('Type change callback called with:', startId, endId, newType);
    const connectionGroup = connectionManager.getConnectionGroup(
      startId,
      endId,
    );
    if (connectionGroup) {
      log('Connection group found, updating type');
      connectionManager.updateConnectionType(connectionGroup, newType);
    } else {
      log('Connection group not found for type change');
    }
  },
);

export function initializeConnectionDrawing(canvas) {
  const svgContainer = connectionManager.initializeSVGContainer(canvas);

  // Remove existing event listeners
  svgContainer.removeEventListener('click', handleSvgClick);
  svgContainer.removeEventListener('mousemove', handleSvgMouseMove);
  svgContainer.removeEventListener('mouseleave', handleSvgMouseLeave);
  document.removeEventListener('keydown', handleKeyDown);

  // Add event listeners (NO canvas mousedown - handled by adapters now)
  svgContainer.addEventListener('click', handleSvgClick);
  svgContainer.addEventListener('mousemove', handleSvgMouseMove);
  svgContainer.addEventListener('mouseleave', handleSvgMouseLeave);
  document.addEventListener('keydown', handleKeyDown);

  // Attach context menu click handler
  connectionManager.contextMenu.attachClickHandler(svgContainer);

  return svgContainer;
}

export function deleteConnectionsByNote(note) {
  connectionManager.deleteConnectionsByNote(note);
}

function handleSvgClick(event) {
  connectionManager.handleLineSelection(event);
}

function handleSvgMouseMove(event) {
  connectionManager.handleSvgMouseMove(event);
}

function handleSvgMouseLeave() {
  connectionManager.handleSvgMouseLeave();
}

function handleKeyDown(event) {
  if (event.key === 'Delete') {
    connectionManager.handleLineDeletion();
  }
}

function handleMouseDown(event, canvas, svgContainer) {
  event.preventDefault();
  event.stopPropagation();

  const startNote = event.target.closest('.note');
  if (!startNote) return;

  connectionManager.startConnectionCreation(event, canvas, svgContainer);
}
