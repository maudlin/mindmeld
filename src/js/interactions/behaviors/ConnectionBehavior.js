// src/js/interactions/behaviors/ConnectionBehavior.js

import { connectionManager } from '../../features/connection/connectionManager.js';
import { log } from '../../utils/utils.js';

export class ConnectionBehavior {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.isConnecting = false;
    this.sourceNote = null;
    this.activeConnectionGroup = null;
    this.svgContainer = null;
    this.activeGhostConnector = null;
  }

  async initialize() {
    // Don't look for SVG container here - it will be created later by InputController
    // We'll lazy-load it when needed in startDesktopDrag/startTouchDrag
    log(
      'ConnectionBehavior: Initialized (SVG container will be lazy-loaded when needed)',
    );
  }

  startDesktopDrag(sourceNote, event) {
    if (!sourceNote || this.isConnecting) {
      return;
    }

    event.preventDefault();
    // Don't stop propagation - this prevents pointer move events from reaching document listeners

    this.isConnecting = true;
    this.sourceNote = sourceNote;

    // Create temporary connection group for visual feedback
    const canvas = document.getElementById('canvas');

    // Lazy-load SVG container (created by InputController after ConnectionBehavior init)
    if (!this.svgContainer) {
      this.svgContainer = document.getElementById('svg-container');
      log(
        'ConnectionBehavior: Lazy-loaded SVG container:',
        !!this.svgContainer,
      );
    }

    if (!canvas || !this.svgContainer) {
      log('ConnectionBehavior: Canvas or SVG container not found');
      return;
    }

    this.activeConnectionGroup = connectionManager.createConnectionGroup(
      event,
      canvas,
      this.svgContainer,
    );

    console.log(
      '🎯 ConnectionBehavior: Connection group created:',
      !!this.activeConnectionGroup,
    );
    log('ConnectionBehavior: Started desktop drag from note', sourceNote.id);
  }

  startTouchDrag(sourceNote, event) {
    if (!sourceNote || this.isConnecting) {
      return;
    }

    // For touch, we don't actually drag - we enter "connection mode"
    // The user will tap another note to complete the connection
    event.preventDefault();
    // Don't stop propagation - this can interfere with subsequent touch events

    this.isConnecting = true;
    this.sourceNote = sourceNote;

    // Store the specific ghost connector that was tapped for styling
    this.activeGhostConnector = event.target?.classList?.contains(
      'ghost-connector',
    )
      ? event.target
      : event.target?.closest('.ghost-connector');

    // Show ALL ghost connectors to indicate connection mode is active
    this.showAllGhostConnectors();

    // Provide visual feedback that we're in connection mode
    sourceNote.classList.add('connection-source');

    // Add special styling to the activated ghost connector
    if (this.activeGhostConnector) {
      this.activeGhostConnector.classList.add('connector-selected');
    }

    log(
      'ConnectionBehavior: Started touch connection mode from note',
      sourceNote.id,
    );
    log(
      'ConnectionBehavior: All ghost connectors shown - tap another note to create connection',
    );
  }

  updateDrag(event, inputType) {
    if (!this.isConnecting || !this.activeConnectionGroup) {
      return;
    }

    const canvas = document.getElementById('canvas');
    if (!canvas) {
      return;
    }

    // Get current cursor/finger position
    let currentX, currentY;
    if (inputType === 'touch' && event.touches && event.touches.length > 0) {
      const touch = event.touches[0];
      const position = connectionManager.calculateOffsetPosition(canvas, {
        clientX: touch.clientX,
        clientY: touch.clientY,
      });
      currentX = position.left;
      currentY = position.top;
    } else {
      const position = connectionManager.calculateOffsetPosition(canvas, event);
      currentX = position.left;
      currentY = position.top;
    }

    // Update the path endpoint to follow cursor/finger
    connectionManager.updateConnectionPath(
      this.activeConnectionGroup.path,
      this.activeConnectionGroup.startX,
      this.activeConnectionGroup.startY,
      currentX,
      currentY,
      connectionManager.CONNECTION_TYPES.NONE,
    );
  }

  endDrag(event, inputType) {
    if (!this.isConnecting || !this.activeConnectionGroup) {
      return;
    }

    let targetElement;

    // Get the target element based on input type
    if (
      inputType === 'touch' &&
      event.changedTouches &&
      event.changedTouches.length > 0
    ) {
      const touch = event.changedTouches[0];
      targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
    } else {
      targetElement = event.target;
    }

    const endNote = targetElement?.closest('.note');

    if (endNote && endNote !== this.sourceNote) {
      // Valid connection target found
      this.createFinalConnection(this.sourceNote, endNote);
      log(
        'ConnectionBehavior: Connection created between',
        this.sourceNote.id,
        'and',
        endNote.id,
      );
    } else {
      // No valid target or same note - cancel connection
      if (this.svgContainer && this.activeConnectionGroup.group) {
        this.svgContainer.removeChild(this.activeConnectionGroup.group);
      }
      log('ConnectionBehavior: Connection cancelled - no valid target');
    }

    // Reset state
    this.cleanup();
  }

  createFinalConnection(startNote, endNote) {
    // Check if connection already exists
    if (connectionManager.connectionExists(startNote.id, endNote.id)) {
      log('ConnectionBehavior: Connection already exists between these notes');
      if (this.svgContainer && this.activeConnectionGroup?.group) {
        this.svgContainer.removeChild(this.activeConnectionGroup.group);
      }
      return;
    }

    // For desktop drag connections, we have an activeConnectionGroup to finalize
    if (this.activeConnectionGroup) {
      // Set the connection group data for permanent connection
      this.activeConnectionGroup.group.dataset.start = startNote.id;
      this.activeConnectionGroup.group.dataset.end = endNote.id;
      this.activeConnectionGroup.group.dataset.type =
        connectionManager.CONNECTION_TYPES.UNI_FORWARD;

      // Update the visual connection to connect to proper endpoints
      connectionManager.updateConnections(this.activeConnectionGroup.group);
    } else {
      // For touch tap-to-tap connections, create the connection directly
      log('ConnectionBehavior: Creating touch connection directly');
      connectionManager.createConnection(
        startNote.id,
        endNote.id,
        connectionManager.CONNECTION_TYPES.UNI_FORWARD,
      );
    }

    // Update the data store through connectionManager (for both desktop and touch)
    connectionManager.updateConnectionInDataStore(
      startNote.id,
      endNote.id,
      connectionManager.CONNECTION_TYPES.UNI_FORWARD,
    );
  }

  cancel() {
    if (this.isConnecting && this.activeConnectionGroup) {
      if (this.svgContainer && this.activeConnectionGroup.group) {
        this.svgContainer.removeChild(this.activeConnectionGroup.group);
      }
    }

    this.cleanup();
    log('ConnectionBehavior: Connection cancelled externally');
  }

  showAllGhostConnectors() {
    // Find all notes and show their ghost connectors
    const allNotes = document.querySelectorAll('.note');
    allNotes.forEach((note) => {
      const ghostConnector = note.querySelector('.ghost-connector');
      if (ghostConnector) {
        ghostConnector.style.opacity = '1';
        ghostConnector.style.visibility = 'visible';
      }
    });

    // Add connection mode class to body for additional styling
    document.body.classList.add('connection-mode');
  }

  hideAllGhostConnectors() {
    // Hide all ghost connectors (return to normal state)
    const allNotes = document.querySelectorAll('.note');
    allNotes.forEach((note) => {
      const ghostConnector = note.querySelector('.ghost-connector');
      if (ghostConnector) {
        ghostConnector.style.opacity = '';
        ghostConnector.style.visibility = '';
      }
    });

    // Remove connection mode class from body
    document.body.classList.remove('connection-mode');
  }

  handleTouchNoteTap(targetNote) {
    // This method is called when a note is tapped while in connection mode
    if (!this.isConnecting || !this.sourceNote) {
      return false; // Not in connection mode
    }

    if (targetNote === this.sourceNote) {
      // Tapped the same note - cancel connection
      this.cancel();
      return true;
    }

    // Create connection between source and target
    this.createFinalConnection(this.sourceNote, targetNote);
    this.cleanup();

    return true; // Connection handled
  }

  cleanup() {
    // Hide all ghost connectors when exiting connection mode
    this.hideAllGhostConnectors();

    // Remove visual feedback from source note
    if (this.sourceNote) {
      this.sourceNote.classList.remove('connection-source');
    }

    // Remove special styling from the activated ghost connector
    if (this.activeGhostConnector) {
      this.activeGhostConnector.classList.remove('connector-selected');
      this.activeGhostConnector = null;
    }

    this.isConnecting = false;
    this.sourceNote = null;
    this.activeConnectionGroup = null;
  }

  // Getter for external state checking
  getConnectionState() {
    return {
      isConnecting: this.isConnecting,
      sourceNote: this.sourceNote,
      hasActiveConnection: !!this.activeConnectionGroup,
    };
  }
}
