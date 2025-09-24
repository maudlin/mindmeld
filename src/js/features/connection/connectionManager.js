// src/js/features/connection/connectionManager.js
import { ConnectionCreation } from './connectionCreation.js';
import { ConnectionUpdate } from './connectionUpdate.js';
// Removed direct dataStore dependency - will use service injection
import { throttle } from '../../utils/utils.js';
import { getCoordinateTransform } from '../../core/coordinates/coordinateService.js';
import {
  ConnectionUtils,
  CONNECTION_TYPES,
  STROKE_COLOR,
  STROKE_WIDTH,
  STROKE_DASHARRAY,
} from './connectionUtils.js';
import { getZoomLevel } from '../zoom/viewportAdapter.js';
import { logger } from '../../services/logger.js';

export class ConnectionManager {
  constructor() {
    this.isConnecting = false;
    this.currentZoomLevel = null;
    this.CONNECTION_TYPES = CONNECTION_TYPES;
    this.onConnectionUpdate = null; // Callback for connection updates
    this.STROKE_COLOR = STROKE_COLOR;
    this.STROKE_WIDTH = STROKE_WIDTH;
    this.STROKE_DASHARRAY = STROKE_DASHARRAY;

    this.connectionCreation = new ConnectionCreation(this);
    this.connectionUpdate = new ConnectionUpdate(this);
    this.connectionUtils = new ConnectionUtils();

    this.throttledUpdateConnections = throttle(
      this.updateConnections.bind(this),
      16,
    );
  }

  createConnection(fromId, toId, type) {
    return this.connectionCreation.createConnection(fromId, toId, type);
  }

  createConnectionGroup(event, canvas, svgContainer) {
    return this.connectionCreation.createConnectionGroup(
      event,
      canvas,
      svgContainer,
    );
  }

  updateConnections(noteOrGroup) {
    this.connectionUpdate.updateConnections(noteOrGroup);
  }

  updateConnectionPath(path, x1, y1, x2, y2, type) {
    this.connectionUpdate.updateConnectionPath(path, x1, y1, x2, y2, type);
  }

  updateConnectionInDataStore(startId, endId, type) {
    if (this.onConnectionUpdate) {
      this.onConnectionUpdate(startId, endId, type);
    }
  }

  setConnectionUpdateCallback(callback) {
    this.onConnectionUpdate = callback;
  }

  setConnecting(value) {
    this.isConnecting = value;
  }

  setCurrentZoomLevel() {
    this.currentZoomLevel = getZoomLevel();
  }

  setDragState(isDragging) {
    this.connectionUpdate.setDragState(isDragging);
  }

  getCurrentZoomLevel() {
    return this.currentZoomLevel !== null
      ? this.currentZoomLevel
      : getZoomLevel();
  }

  createSVGElement(type, attributes = {}) {
    return this.connectionUtils.createSVGElement(type, attributes);
  }

  getClosestPoints(note1, note2) {
    return this.connectionUtils.getClosestPoints(
      note1,
      note2,
      this.getCurrentZoomLevel(),
    );
  }

  calculateOffsetPosition(canvas, event, element = null) {
    // Use shared coordinate transform service
    const coordinateTransform = getCoordinateTransform();
    const { x, y } = coordinateTransform.viewportToCanvas(
      event.clientX,
      event.clientY,
    );

    // Handle element centering if provided (maintains original API)
    if (element) {
      return {
        left: x - element.offsetWidth / 2,
        top: y - element.offsetHeight / 2,
      };
    }

    return { left: x, top: y };
  }

  createArrowMarkers() {
    return this.connectionUtils.createArrowMarkers();
  }

  connectionExists(id1, id2) {
    return this.connectionUtils.connectionExists(id1, id2);
  }

  initializeSVGContainer(canvas) {
    return this.connectionCreation.initializeSVGContainer(canvas);
  }

  getConnectionGroup(startId, endId) {
    return document.querySelector(
      `g[data-start="${startId}"][data-end="${endId}"]`,
    );
  }

  updateConnectionType(connectionGroup, newType) {
    const path = connectionGroup.querySelector('path');
    const startNote = document.getElementById(connectionGroup.dataset.start);
    const endNote = document.getElementById(connectionGroup.dataset.end);

    if (startNote && endNote && path) {
      const points = this.getClosestPoints(startNote, endNote);
      this.updateConnectionPath(
        path,
        points.x1,
        points.y1,
        points.x2,
        points.y2,
        newType,
      );
      connectionGroup.dataset.type = newType;
      this.updateConnectionInDataStore(
        connectionGroup.dataset.start,
        connectionGroup.dataset.end,
        newType,
      );
      this.throttledUpdateConnections(connectionGroup);
    }
  }

  deleteConnectionsByNote(note) {
    const connections = document.querySelectorAll(
      `g[data-start="${note.id}"], g[data-end="${note.id}"]`,
    );
    connections.forEach((connection) => {
      connection.remove();
      this.updateConnectionInDataStore(
        connection.dataset.start,
        connection.dataset.end,
        null,
      );
    });
  }

  handleLineSelection(event) {
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

  handleSvgMouseMove() {
    // Context menu functionality removed - now handled via toolbar
  }

  handleLineDeletion() {
    const selectedLine = document.querySelector('.line-selected');
    if (selectedLine) {
      const connectionGroup = selectedLine.closest('g');
      connectionGroup.remove();
      this.updateConnectionInDataStore(
        connectionGroup.dataset.start,
        connectionGroup.dataset.end,
        null,
      );
    }
  }

  startConnectionCreation(event, canvas, svgContainer) {
    const startNote = event.target.closest('.note');
    if (!startNote) return;

    this.setConnecting(true);
    const connectionGroup = this.createConnectionGroup(
      event,
      canvas,
      svgContainer,
    );

    const moveHandler = (moveEvent) => {
      if (this.isConnecting) {
        const { left: currentX, top: currentY } = this.calculateOffsetPosition(
          canvas,
          moveEvent,
        );
        this.updateConnectionPath(
          connectionGroup.path,
          connectionGroup.startX,
          connectionGroup.startY,
          currentX,
          currentY,
          this.CONNECTION_TYPES.NONE,
        );
      }
    };

    const upHandler = (upEvent) => {
      document.removeEventListener('mousemove', moveHandler);
      document.removeEventListener('mouseup', upHandler);

      if (
        this.isConnecting &&
        upEvent.target.closest('.note') &&
        upEvent.target.closest('.note') !== startNote
      ) {
        const endNote = upEvent.target.closest('.note');
        this.createFinalConnection(startNote, endNote, connectionGroup);
      } else {
        svgContainer.removeChild(connectionGroup.group);
      }

      this.setConnecting(false);
    };

    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', upHandler);
  }

  createFinalConnection(startNote, endNote, connectionGroup) {
    if (this.connectionExists(startNote.id, endNote.id)) {
      logger.info('Connection already exists between these notes');
      connectionGroup.group.remove();
      return;
    }

    connectionGroup.group.dataset.start = startNote.id;
    connectionGroup.group.dataset.end = endNote.id;
    connectionGroup.group.dataset.type = this.CONNECTION_TYPES.UNI_FORWARD;

    this.updateConnectionInDataStore(
      startNote.id,
      endNote.id,
      this.CONNECTION_TYPES.UNI_FORWARD,
    );

    this.updateConnections(connectionGroup.group);
  }
}

export const connectionManager = new ConnectionManager();
