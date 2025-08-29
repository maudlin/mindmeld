/**
 * CanvasBehavior - Handles all canvas interaction logic
 *
 * Unified behavior for canvas interactions across desktop and touch.
 * Receives input from both DesktopAdapter and TouchAdapter.
 *
 * Responsibilities:
 * - Canvas double-click/tap → Note creation
 * - Canvas single-click/tap → Clear selections
 * - Coordinate with other behaviors for complex interactions
 */

import { noteManager } from '../../services/noteManager.js';

export class CanvasBehavior {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.isInitialized = false;
    this.name = 'CanvasBehavior';

    console.log('CanvasBehavior: Created');
  }

  /**
   * Initialize the behavior
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    // Set up canvas interaction coordination
    // Direct adapter-to-behavior communication means no global listeners needed here
    // Each adapter will call our methods directly based on input detection

    this.isInitialized = true;
    console.log('CanvasBehavior: Initialized');
  }

  /**
   * Handle canvas double-click/tap for note creation
   * Single source of truth for note creation business logic
   */
  handleCanvasDoubleClick(event, inputType) {
    if (!event) {
      console.warn('CanvasBehavior: No event provided for note creation');
      return;
    }

    console.log('CanvasBehavior: Canvas double-click/tap detected', {
      inputType,
      coordinates: { x: event.clientX, y: event.clientY },
    });

    // Business logic: Create note at position
    this.eventBus.emit('note.createAtPosition', {
      canvas: document.getElementById('canvas'),
      event: {
        clientX: event.clientX,
        clientY: event.clientY,
        type: inputType === 'desktop' ? 'dblclick' : 'doubletap',
      },
      inputType,
      behavior: this,
    });

    console.log('CanvasBehavior: Note creation request emitted');
  }

  /**
   * Handle canvas single-click/tap for clearing selections
   * Single source of truth for selection clearing business logic
   */
  handleCanvasSingleClick(event, inputType) {
    console.log('CanvasBehavior: Canvas single-click/tap detected', {
      inputType,
      coordinates: { x: event.clientX, y: event.clientY },
    });

    // Business logic: Clear all selections
    noteManager.clearSelections();

    // Emit event for other systems that need to know about selection clearing
    this.eventBus.emit('canvas.clicked', {
      event,
      inputType,
      behavior: this,
      _gesture: inputType === 'desktop' ? 'click' : 'tap',
    });

    console.log('CanvasBehavior: Selections cleared and canvas click emitted');
  }

  /**
   * Get current behavior state for debugging
   */
  getState() {
    return {
      name: this.name,
      isInitialized: this.isInitialized,
    };
  }

  /**
   * Clean up behavior resources
   */
  async destroy() {
    this.isInitialized = false;
    this.eventBus = null;
    console.log('CanvasBehavior: Destroyed');
  }
}
