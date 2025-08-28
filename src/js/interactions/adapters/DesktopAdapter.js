// src/js/interactions/adapters/DesktopAdapter.js

import { BaseAdapter } from './BaseAdapter.js';
import { noteManager } from '../../services/noteManager.js';

/**
 * Desktop input adapter for mouse, keyboard, and trackpad interactions
 * Thin input layer that detects desktop-specific interactions and delegates to behaviors
 *
 * MM-203: Rebuilt as thin input layer with behavior delegation
 */
export class DesktopAdapter extends BaseAdapter {
  constructor(interactionController) {
    super();
    this.name = 'desktop';

    // Behavior references
    this.interactionController = interactionController;

    console.log(
      'DesktopAdapter: Constructor called with interactionController:',
      {
        hasInteractionController: !!interactionController,
        isInitialized: interactionController?.isInitialized,
        behaviorCount: interactionController?.behaviors?.size,
      },
    );
    this.noteBehavior = null;
    this.dragBehavior = null;
    this.selectionBoxBehavior = null;

    // Canvas reference
    this.canvas = null;

    // Desktop-specific interaction state
    this.isPointerDown = false;
    this.pointerDownTarget = null;
    this.pointerDownPosition = null;
    this.dragThreshold = 5; // pixels before drag starts
    this.isDoubleClickInProgress = false; // Prevent selection box during double-clicks

    // Bound event handlers for proper cleanup
    this.boundHandlers = {
      pointerDown: this.handlePointerDown.bind(this),
      pointerMove: this.handlePointerMove.bind(this),
      pointerUp: this.handlePointerUp.bind(this),
      dblclick: this.handleDoubleClick.bind(this),
      wheel: this.handleWheel.bind(this),
      keyDown: this.handleKeyDown.bind(this),
      contextMenu: this.preventContextMenu.bind(this),
    };
  }

  /**
   * Initialize adapter with behavior references and event listeners
   */
  async initialize(eventBus) {
    console.log('DesktopAdapter: initialize() called');
    await super.initialize(eventBus);

    console.log(
      'DesktopAdapter: About to get behavior references from interaction controller',
    );
    // Get behavior references from interaction controller
    if (this.interactionController) {
      console.log('DesktopAdapter: InteractionController state:', {
        isInitialized: this.interactionController.isInitialized,
        behaviorCount: this.interactionController.behaviors?.size,
        availableBehaviors: Array.from(
          this.interactionController.behaviors?.keys() || [],
        ),
      });

      this.noteBehavior = this.interactionController.getBehavior('note');
      this.dragBehavior = this.interactionController.getBehavior('drag');
      this.selectionBoxBehavior =
        this.interactionController.getBehavior('selectionBox');

      console.log('DesktopAdapter: Behavior references initialized', {
        hasNoteBehavior: !!this.noteBehavior,
        hasDragBehavior: !!this.dragBehavior,
        hasSelectionBoxBehavior: !!this.selectionBoxBehavior,
      });
    } else {
      console.warn('DesktopAdapter: No InteractionController provided!');
    }

    await this.initializeEventListeners();
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
    this.canvas.addEventListener('dblclick', this.boundHandlers.dblclick);
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
      this.canvas.removeEventListener('dblclick', this.boundHandlers.dblclick);
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
   * Handle pointer down events - detect interaction type and delegate to behaviors
   */
  handlePointerDown(event) {
    // Only handle left button (primary pointer)
    if (event.button !== 0) return;

    // Store pointer state for drag detection
    this.isPointerDown = true;
    this.pointerDownTarget = event.target;
    this.pointerDownPosition = { x: event.clientX, y: event.clientY };

    const target = event.target;
    console.log('DesktopAdapter: Pointer down detected', {
      target: target.tagName,
      targetClass: target.className,
      x: event.clientX,
      y: event.clientY,
    });

    // Detect interaction type and delegate to appropriate behavior
    this.detectInteractionStart(event);
  }

  /**
   * Detect what type of interaction is starting and delegate to appropriate behavior
   */
  detectInteractionStart(event) {
    const target = event.target;

    // Check for note interaction
    const noteElement = target.closest('.note');
    if (noteElement) {
      this.handleNoteInteractionStart(noteElement, event);
      return;
    }

    // Check for canvas interaction (selection box)
    if (target.id === 'canvas' || target.closest('#canvas')) {
      this.handleCanvasInteractionStart();
      return;
    }

    console.log('DesktopAdapter: No recognized interaction target');
  }

  /**
   * Handle note interaction start - delegate to NoteBehavior
   */
  handleNoteInteractionStart(noteElement, event) {
    if (!this.noteBehavior) {
      console.warn('DesktopAdapter: NoteBehavior not available');
      return;
    }

    const target = event.target;
    const isSelected = noteElement.classList.contains('selected');

    // Check if clicking on note content (editable area)
    if (
      target.classList.contains('note-content') ||
      target.closest('.note-content')
    ) {
      // Handle as note click for edit mode
      console.log(
        'DesktopAdapter: Note content click detected, delegating to NoteBehavior for edit mode',
      );
      this.noteBehavior.handleNoteClick(noteElement, event, 'desktop');
    } else {
      // Handle as note border/non-content click for selection (like working implementation)
      console.log(
        'DesktopAdapter: Note border click detected, handling selection',
      );

      // Handle selection using noteManager service
      if (event.shiftKey) {
        // Multi-select mode - toggle selection
        if (isSelected) {
          noteManager.deselectNote(noteElement);
        } else {
          noteManager.selectNote(noteElement);
        }
      } else {
        // Single select mode
        if (!isSelected) {
          noteManager.clearSelections();
          noteManager.selectNote(noteElement);
        }
      }
    }
  }

  /**
   * Handle canvas interaction start - prepare for selection box
   */
  handleCanvasInteractionStart() {
    // Don't start selection during double-click
    if (this.isDoubleClickInProgress) {
      console.log(
        'DesktopAdapter: Skipping selection box - double-click in progress',
      );
      return;
    }

    if (!this.selectionBoxBehavior) {
      console.warn('DesktopAdapter: SelectionBoxBehavior not available');
      return;
    }

    console.log(
      'DesktopAdapter: Canvas click detected, preparing selection box',
    );

    // Clear existing selections immediately on canvas click (like working implementation)
    noteManager.clearSelections();

    // Emit canvas.clicked for edit mode handling
    this.emit('canvas.clicked');

    // Don't start selection box immediately - wait for drag movement
    // This prevents accidental selection boxes on single clicks
  }

  /**
   * Handle pointer move events - detect drags and delegate to behaviors
   */
  handlePointerMove(event) {
    if (!this.isPointerDown || !this.pointerDownPosition) return;

    // Check if we already have active interactions
    if (this.dragBehavior && this.dragBehavior.isDragging) {
      this.dragBehavior.updateDrag(event, 'desktop');
      return;
    }

    if (
      this.selectionBoxBehavior &&
      this.selectionBoxBehavior.isDrawingSelectionBox
    ) {
      this.selectionBoxBehavior.updateSelectionBox(event, 'desktop');
      return;
    }

    // Check if we've exceeded the drag threshold to start new interaction
    const deltaX = event.clientX - this.pointerDownPosition.x;
    const deltaY = event.clientY - this.pointerDownPosition.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance < this.dragThreshold) return;

    // Determine what type of drag this is
    this.handleDragStart(event);
  }

  /**
   * Handle drag start detection - delegate to appropriate behavior
   */
  handleDragStart(event) {
    const target = this.pointerDownTarget;

    // Check for note drag
    const noteElement = target.closest('.note');
    if (noteElement) {
      this.handleNoteDragStart(noteElement, event);
      return;
    }

    // Check for canvas selection box
    if (target.id === 'canvas' || target.closest('#canvas')) {
      this.handleSelectionBoxStart(event);
      return;
    }
  }

  /**
   * Handle note drag start - delegate to DragBehavior
   */
  handleNoteDragStart(noteElement, event) {
    if (!this.dragBehavior) {
      console.warn('DesktopAdapter: DragBehavior not available');
      return;
    }

    console.log(
      'DesktopAdapter: Note drag detected, delegating to DragBehavior',
    );

    // Create synthetic start event with original position
    const startEvent = {
      ...this.pointerDownPosition,
      clientX: this.pointerDownPosition.x,
      clientY: this.pointerDownPosition.y,
      preventDefault: () => {},
    };

    this.dragBehavior.startDrag(noteElement, startEvent, 'desktop');

    // Continue with current position
    this.dragBehavior.updateDrag(event, 'desktop');
  }

  /**
   * Handle selection box start - delegate to SelectionBoxBehavior
   */
  handleSelectionBoxStart(event) {
    // Don't start selection during double-click
    if (this.isDoubleClickInProgress) {
      console.log(
        'DesktopAdapter: Skipping selection box start - double-click in progress',
      );
      return;
    }

    if (!this.selectionBoxBehavior) {
      console.warn('DesktopAdapter: SelectionBoxBehavior not available');
      return;
    }

    console.log(
      'DesktopAdapter: Selection box detected, delegating to SelectionBoxBehavior',
    );

    // Create synthetic start event with original position
    const startEvent = {
      ...this.pointerDownPosition,
      clientX: this.pointerDownPosition.x,
      clientY: this.pointerDownPosition.y,
      preventDefault: () => {},
    };

    this.selectionBoxBehavior.startSelectionBox(startEvent, 'desktop');

    // Continue with current position
    this.selectionBoxBehavior.updateSelectionBox(event, 'desktop');
  }

  /**
   * Handle pointer up events - end interactions and delegate to behaviors
   */
  handlePointerUp(event) {
    if (!this.isPointerDown) return;

    console.log('DesktopAdapter: Pointer up detected');

    // End any active interactions
    this.handleInteractionEnd(event);

    // Reset pointer state
    this.isPointerDown = false;
    this.pointerDownTarget = null;
    this.pointerDownPosition = null;
  }

  /**
   * Handle interaction end - delegate to active behaviors
   */
  handleInteractionEnd(event) {
    // Check if we have an active drag behavior
    if (this.dragBehavior && this.dragBehavior.isDragging) {
      console.log('DesktopAdapter: Ending drag interaction');
      this.dragBehavior.endDrag(event, 'desktop');
      return;
    }

    // Check if we have an active selection box
    if (
      this.selectionBoxBehavior &&
      this.selectionBoxBehavior.isDrawingSelectionBox
    ) {
      console.log('DesktopAdapter: Ending selection box interaction');
      this.selectionBoxBehavior.endSelectionBox(event, 'desktop');
      return;
    }

    // If no active interactions, this was just a click - already handled in pointer down
  }

  /**
   * Handle double-click events for note creation
   */
  handleDoubleClick(event) {
    event.preventDefault();

    console.log('DesktopAdapter: Double-click detected', {
      x: event.clientX,
      y: event.clientY,
      target: event.target?.id,
    });

    // Set flag to prevent selection box interference
    this.isDoubleClickInProgress = true;

    // Clear the flag after a short delay
    setTimeout(() => {
      this.isDoubleClickInProgress = false;
    }, 100);

    // Only create notes when double-clicking on canvas (not on existing notes)
    // Handle clicks on canvas or its children (like .background-layout)
    if (event.target === this.canvas || event.target.closest('#canvas')) {
      this.emit('note.createAtPosition', {
        canvas: this.canvas,
        event: {
          clientX: event.clientX,
          clientY: event.clientY,
          type: 'dblclick',
        },
      });
    }
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
        // Always clear selections when Escape is pressed (regardless of active interaction)
        noteManager.clearSelections();
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
