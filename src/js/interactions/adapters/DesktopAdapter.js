// src/js/interactions/adapters/DesktopAdapter.js

import { BaseAdapter } from './BaseAdapter.js';

/**
 * Desktop input adapter for mouse, keyboard, and trackpad interactions
 * Handles raw input detection and delegates interaction logic to behaviors
 *
 * REFACTORED: Only handles input detection, all interaction logic moved to behaviors
 */
export class DesktopAdapter extends BaseAdapter {
  constructor() {
    super();
    this.name = 'desktop';

    // Canvas reference
    this.canvas = null;

    // Bound event handlers for proper cleanup
    this.boundHandlers = {
      pointerDown: this.handlePointerDown.bind(this),
      pointerMove: this.handlePointerMove.bind(this),
      pointerUp: this.handlePointerUp.bind(this),
      wheel: this.handleWheel.bind(this),
      keyDown: this.handleKeyDown.bind(this),
      contextMenu: this.preventContextMenu.bind(this),
    };
  }

  /**
   * Initialize desktop-specific event listeners
   */
  async initializeEventListeners() {
    // Get canvas element
    this.canvas = document.getElementById('canvas');
    if (!this.canvas) {
      throw new Error('Canvas element not found');
    }

    console.log(
      'DesktopAdapter: Initializing event listeners for canvas:',
      this.canvas.id,
    );

    // Canvas-specific events
    this.canvas.addEventListener('pointerdown', this.boundHandlers.pointerDown);
    this.canvas.addEventListener('wheel', this.boundHandlers.wheel);

    // Document-level events for dragging and keyboard
    document.addEventListener('pointermove', this.boundHandlers.pointerMove);
    document.addEventListener('pointerup', this.boundHandlers.pointerUp);
    document.addEventListener('keydown', this.boundHandlers.keyDown, true); // Use capture phase for priority
    document.addEventListener('contextmenu', this.boundHandlers.contextMenu);

    console.log('DesktopAdapter: Event listeners initialized successfully');
  }

  /**
   * Clean up desktop event listeners
   */
  async destroyEventListeners() {
    if (this.canvas) {
      this.canvas.removeEventListener(
        'pointerdown',
        this.boundHandlers.pointerDown,
      );
      this.canvas.removeEventListener('wheel', this.boundHandlers.wheel);
    }

    // Remove document-level event listeners
    document.removeEventListener('pointermove', this.boundHandlers.pointerMove);
    document.removeEventListener('pointerup', this.boundHandlers.pointerUp);
    document.removeEventListener('keydown', this.boundHandlers.keyDown, true);
    document.removeEventListener('contextmenu', this.boundHandlers.contextMenu);

    // Reset state
    this.canvas = null;

    console.log('DesktopAdapter: Event listeners destroyed');
  }

  /**
   * Handle pointer down events - RAW INPUT ONLY
   * TODO: Will delegate to behaviors after behavior implementation
   */
  handlePointerDown(event) {
    // Only handle left button (primary pointer)
    if (event.button !== 0) return;

    const target = event.target;
    console.log('DesktopAdapter: Pointer down detected', {
      target: target.tagName,
      targetClass: target.className,
    });

    // TODO: Delegate to appropriate behavior based on target
    // - Note clicks → NoteBehavior
    // - Canvas clicks → SelectionBoxBehavior
    // For now, just log
  }

  /**
   * Handle pointer move events - RAW INPUT ONLY
   * TODO: Will delegate to active behavior (drag, selection box)
   */
  handlePointerMove() {
    // TODO: Delegate to active behavior
    // - If dragging → DragBehavior
    // - If selection box → SelectionBoxBehavior
    // For now, just detect movement
  }

  /**
   * Handle pointer up events - RAW INPUT ONLY
   * TODO: Will delegate to active behavior to end interaction
   */
  handlePointerUp() {
    // TODO: End current interaction via behavior
    // For now, just log
    console.log('DesktopAdapter: Pointer up detected');
  }

  /**
   * Handle wheel events for zoom (KEEP - this is input-specific)
   */
  handleWheel(event) {
    event.preventDefault();

    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const direction = event.deltaY > 0 ? 'out' : 'in';
    this.emit('canvas.zoom', { direction, x, y });
  }

  /**
   * Handle keyboard events (KEEP - this is input-specific)
   */
  handleKeyDown(event) {
    // Handle keyboard shortcuts
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'a':
          event.preventDefault();
          this.emit('notes.selectAll');
          break;
        case 'z':
          event.preventDefault();
          if (event.shiftKey) {
            this.emit('canvas.redo');
          } else {
            this.emit('canvas.undo');
          }
          break;
        case '=':
        case '+':
          event.preventDefault();
          this.emit('canvas.zoomIn');
          break;
        case '-':
          event.preventDefault();
          this.emit('canvas.zoomOut');
          break;
        case '0':
          event.preventDefault();
          this.emit('canvas.resetZoom');
          break;
      }
    }

    // Handle standalone keys
    switch (event.key) {
      case 'Delete':
      case 'Backspace':
        // Only delete if not in edit mode
        if (!document.querySelector('.note-content.edit-mode')) {
          this.emit('notes.deleteSelected');
        }
        break;
      case 'Escape':
        this.emit('interaction.cancel');
        break;
    }
  }

  /**
   * Prevent context menu (KEEP - this is input-specific)
   */
  preventContextMenu(event) {
    event.preventDefault();
  }

  /**
   * Check if click target is canvas (UTILITY - keep)
   */
  isClickOnCanvas(target) {
    return target === this.canvas;
  }
}
