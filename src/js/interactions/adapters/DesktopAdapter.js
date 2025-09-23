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
    this.canvasBehavior = null;
    this.connectionBehavior = null;
    this.viewportBehavior = null;
    this.menuBehavior = null;
    this.toolbarBehavior = null;

    // Canvas and container references
    this.canvas = null;
    this.canvasContainer = null;

    // Desktop-specific interaction state
    this.isPointerDown = false;
    this.pointerDownTarget = null;
    this.pointerDownPosition = null;
    this.dragThreshold = 5; // pixels before drag starts
    this.isDoubleClickInProgress = false; // Prevent selection box during double-clicks

    // Desktop connection drag state
    this.isConnectionDragging = false;
    this.connectionStartNote = null;

    // Desktop pan state
    this.isPanning = false;
    this.panStartPosition = null;

    // Bound event handlers for proper cleanup
    this.boundHandlers = {
      pointerDown: this.handlePointerDown.bind(this),
      pointerMove: this.handlePointerMove.bind(this),
      pointerUp: this.handlePointerUp.bind(this),
      dblclick: this.handleDoubleClick.bind(this),
      wheel: this.handleWheel.bind(this),
      keyDown: this.handleKeyDown.bind(this),
      svgClick: this.handleSvgClick.bind(this),
      svgMouseMove: this.handleSvgMouseMove.bind(this),
      svgMouseLeave: this.handleSvgMouseLeave.bind(this),
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
      this.canvasBehavior = this.interactionController.getBehavior('canvas');
      this.connectionBehavior =
        this.interactionController.getBehavior('connection');
      this.viewportBehavior =
        this.interactionController.getBehavior('viewport');
      this.menuBehavior = this.interactionController.getBehavior('menu');
      this.toolbarBehavior = this.interactionController.getBehavior('toolbar');

      console.log('DesktopAdapter: Behavior references initialized', {
        hasNoteBehavior: !!this.noteBehavior,
        hasDragBehavior: !!this.dragBehavior,
        hasSelectionBoxBehavior: !!this.selectionBoxBehavior,
        hasCanvasBehavior: !!this.canvasBehavior,
        hasConnectionBehavior: !!this.connectionBehavior,
        hasViewportBehavior: !!this.viewportBehavior,
        hasToolbarBehavior: !!this.toolbarBehavior,
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
    // Get canvas and container elements
    this.canvas = document.getElementById('canvas');
    this.canvasContainer = document.getElementById('canvas-container');

    if (!this.canvas || !this.canvasContainer) {
      throw new Error('Canvas or canvas-container element not found');
    }

    console.log(
      'DesktopAdapter: Initializing event listeners for canvas:',
      this.canvas.id,
    );

    // Container-specific events (like old zoomManager)
    this.canvasContainer.addEventListener(
      'pointerdown',
      this.boundHandlers.pointerDown,
    );

    // Canvas-specific events
    this.canvas.addEventListener('dblclick', this.boundHandlers.dblclick);
    this.canvas.addEventListener('wheel', this.boundHandlers.wheel);

    // SVG container events for connection line interaction
    const svgContainer = document.getElementById('svg-container');
    if (svgContainer) {
      svgContainer.addEventListener('click', this.boundHandlers.svgClick);
      svgContainer.addEventListener(
        'mousemove',
        this.boundHandlers.svgMouseMove,
      );
      svgContainer.addEventListener(
        'mouseleave',
        this.boundHandlers.svgMouseLeave,
      );
    }

    // Document-level events for dragging and keyboard
    document.addEventListener('pointermove', this.boundHandlers.pointerMove);
    document.addEventListener('pointerup', this.boundHandlers.pointerUp);
    document.addEventListener('keydown', this.boundHandlers.keyDown, true); // Use capture phase for priority
    // Note: contextmenu prevention is handled by ViewportBehavior.setupZoomAndPan on canvasContainer

    // Add toolbar button event listeners
    this.setupToolbarEventListeners();

    console.log('DesktopAdapter: Event listeners initialized successfully');
  }

  /**
   * Set up toolbar button event listeners
   */
  setupToolbarEventListeners() {
    // Find all toolbar action buttons
    const toolbarButtons = document.querySelectorAll('[data-toolbar-action]');

    toolbarButtons.forEach((button) => {
      // Store bound handler for cleanup
      const boundHandler = (event) => {
        console.log(
          '🔧 DesktopAdapter: Toolbar button clicked:',
          button.dataset.toolbarAction,
        );
        this.handleToolbarButtonInteraction(
          event,
          button.dataset.toolbarAction,
        );
      };

      // Store for cleanup
      button._desktopAdapterHandler = boundHandler;

      // Add click listener
      button.addEventListener('click', boundHandler);
    });

    console.log(
      'DesktopAdapter: Toolbar button listeners added for',
      toolbarButtons.length,
      'buttons',
    );
  }

  /**
   * Clean up toolbar button event listeners
   */
  cleanupToolbarEventListeners() {
    const toolbarButtons = document.querySelectorAll('[data-toolbar-action]');

    toolbarButtons.forEach((button) => {
      if (button._desktopAdapterHandler) {
        button.removeEventListener('click', button._desktopAdapterHandler);
        delete button._desktopAdapterHandler;
      }
    });

    console.log('DesktopAdapter: Toolbar button listeners cleaned up');
  }

  /**
   * Clean up desktop event listeners
   */
  async destroyEventListeners() {
    if (this.canvasContainer) {
      this.canvasContainer.removeEventListener(
        'pointerdown',
        this.boundHandlers.pointerDown,
      );
    }

    if (this.canvas) {
      this.canvas.removeEventListener('dblclick', this.boundHandlers.dblclick);
      this.canvas.removeEventListener('wheel', this.boundHandlers.wheel);
    }

    // Remove document-level event listeners
    document.removeEventListener('pointermove', this.boundHandlers.pointerMove);
    document.removeEventListener('pointerup', this.boundHandlers.pointerUp);
    document.removeEventListener('keydown', this.boundHandlers.keyDown, true);

    // Remove toolbar button listeners
    this.cleanupToolbarEventListeners();

    // Reset state
    this.canvas = null;
    this.canvasContainer = null;

    console.log('DesktopAdapter: Event listeners destroyed');
  }

  /**
   * Handle pointer down events - detect interaction type and delegate to behaviors
   */
  handlePointerDown(event) {
    // Handle right button for canvas panning
    if (event.button === 2 && this.isClickOnCanvas(event.target)) {
      event.preventDefault();
      this.isPanning = true;

      // Store viewport coordinates for panning - ViewportBehavior handles coordinate transformation
      this.panStartPosition = {
        x: event.clientX,
        y: event.clientY,
      };

      console.log('DesktopAdapter: Right-click pan started');
      return;
    }

    // Only handle left button for normal interactions
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

    // Menu interactions are handled by pageInteractions.js since menu is outside canvas

    // Check for toolbar button interactions
    if (target.dataset && target.dataset.toolbarAction) {
      console.log(
        `DesktopAdapter: Toolbar button click detected: ${target.dataset.toolbarAction}`,
      );
      this.handleToolbarButtonInteraction(event, target.dataset.toolbarAction);
      return;
    }

    // Check for connector central circle (hotspot) interactions
    if (target.classList && target.classList.contains('connector-hotspot')) {
      console.log('🔗 DesktopAdapter: Connector hotspot clicked');
      this.handleConnectorSelection(event, target);
      return;
    }

    // Check for ghost connector interaction (CRITICAL - missing from refactor!)
    if (target.classList.contains('ghost-connector')) {
      console.log(
        'DesktopAdapter: Ghost connector click detected, delegating to connection system',
      );
      this.handleGhostConnectorInteraction(event);
      return;
    }

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

  // Menu interaction methods removed - now handled by pageInteractions.js

  /**
   * Handle ghost connector interaction - delegate to ConnectionBehavior
   */
  handleGhostConnectorInteraction(event) {
    console.log(
      'DesktopAdapter: Ghost connector click detected - delegating to ConnectionBehavior',
    );

    if (!this.connectionBehavior) {
      console.warn('DesktopAdapter: ConnectionBehavior not available');
      return;
    }

    const sourceNote = event.target.closest('.note');
    if (!sourceNote) {
      console.warn('DesktopAdapter: No source note found for ghost connector');
      return;
    }

    // Set our state to prevent other interactions during connection drag
    this.isConnectionDragging = true;
    this.connectionStartNote = sourceNote;

    // Delegate to ConnectionBehavior for unified desktop connection handling
    this.connectionBehavior.startDesktopDrag(sourceNote, event, 'desktop');
  }

  /**
   * Handle toolbar button interactions - delegate to ToolbarBehavior
   */
  handleToolbarButtonInteraction(event, action) {
    console.log(`DesktopAdapter: Handling toolbar button action: ${action}`);

    if (!this.toolbarBehavior) {
      console.warn('DesktopAdapter: ToolbarBehavior not available');
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    // Delegate to ToolbarBehavior based on action type
    switch (action) {
      case 'delete':
        this.toolbarBehavior.handleDeleteAction('desktop');
        break;
      case 'switch-type':
        this.toolbarBehavior.handleConnectorTypeSwitch('desktop');
        break;
      default:
        console.warn(`DesktopAdapter: Unknown toolbar action: ${action}`);
    }
  }

  /**
   * Handle connector hotspot selection - placeholder for unified selection system
   */
  handleConnectorSelection(event, hotspotElement) {
    console.log('🔗 DesktopAdapter: Handling connector selection');

    event.preventDefault();
    event.stopPropagation();

    // Get the connector group element (parent of the hotspot circle)
    const connectorGroup = hotspotElement.closest('g[data-start][data-end]');
    if (!connectorGroup) {
      console.warn('DesktopAdapter: Could not find connector group');
      return;
    }

    const startId = connectorGroup.dataset.start;
    const endId = connectorGroup.dataset.end;
    const connectionType = connectorGroup.dataset.type;

    console.log('🔗 DesktopAdapter: Connector selected:', {
      startId,
      endId,
      connectionType,
    });

    // Clear previous connector selections
    this.clearConnectorSelections();

    // Apply visual selection state
    this.applyConnectorSelection(connectorGroup);

    // Emit selection event
    if (this.eventBus) {
      this.eventBus.emit('connector.selected', {
        startId,
        endId,
        connectionType,
        connectorGroup,
        inputType: 'desktop',
      });
    }
  }

  /**
   * Clear all connector selections
   */
  clearConnectorSelections() {
    const hadSelection =
      document.querySelector('.connector-hotspot.selected') !== null;

    // Remove selected class from all connector hotspots
    document
      .querySelectorAll('.connector-hotspot.selected')
      .forEach((hotspot) => {
        hotspot.classList.remove('selected');
      });

    // Remove selected class from all connection paths
    document.querySelectorAll('path.selected').forEach((path) => {
      path.classList.remove('selected');
    });

    // Emit deselection event if there was a selection
    if (hadSelection && this.eventBus) {
      this.eventBus.emit('connector.deselected', { inputType: 'desktop' });
    }
  }

  /**
   * Apply visual selection state to a connector
   */
  applyConnectorSelection(connectorGroup) {
    // Add selected class to the hotspot (central circle)
    const hotspot = connectorGroup.querySelector('.connector-hotspot');
    if (hotspot) {
      hotspot.classList.add('selected');
    }

    // Add selected class to the connection path
    const connectionPath = connectorGroup.querySelector('path');
    if (connectionPath) {
      connectionPath.classList.add('selected');
    }

    console.log('🔗 DesktopAdapter: Applied selection visual state');
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
          // Clear connector selections when selecting notes
          this.clearConnectorSelections();
          noteManager.selectNote(noteElement);
        }
      } else {
        // Single select mode
        if (!isSelected) {
          // Clear connector selections when selecting notes
          this.clearConnectorSelections();
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
    this.clearConnectorSelections();

    // Emit canvas.clicked for edit mode handling
    this.emit('canvas.clicked');

    // Don't start selection box immediately - wait for drag movement
    // This prevents accidental selection boxes on single clicks
  }

  /**
   * Handle pointer move events - detect drags and delegate to behaviors
   */
  handlePointerMove(event) {
    // Handle right-click pan drag
    if (this.isPanning && this.panStartPosition && this.viewportBehavior) {
      event.preventDefault();

      // Calculate viewport coordinate delta from start position
      const deltaX = event.clientX - this.panStartPosition.x;
      const deltaY = event.clientY - this.panStartPosition.y;

      // Delegate pan to ViewportBehavior with viewport coordinate deltas
      this.viewportBehavior.handleDesktopPan(deltaX, deltaY);

      // Update pan position for next delta calculation
      this.panStartPosition = { x: event.clientX, y: event.clientY };
      return;
    }

    if (!this.isPointerDown || !this.pointerDownPosition) return;

    // Check if we're dragging a connection (desktop behavior)
    if (this.isConnectionDragging && this.connectionBehavior) {
      // Delegate to ConnectionBehavior for drag updates
      this.connectionBehavior.updateDrag(event, 'desktop');
      return;
    }

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
    // Handle right-click pan end
    if (this.isPanning) {
      console.log('DesktopAdapter: Right-click pan ended');
      this.isPanning = false;
      this.panStartPosition = null;
      return;
    }

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
    // Check if we're ending a connection drag (desktop behavior)
    if (this.isConnectionDragging && this.connectionBehavior) {
      console.log('DesktopAdapter: Connection drag ended');
      // Delegate to ConnectionBehavior to complete/cancel connection
      this.connectionBehavior.endDrag(event, 'desktop');
      // Reset our state
      this.isConnectionDragging = false;
      this.connectionStartNote = null;
      return;
    }

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

    // Determine interaction type and delegate to behaviors
    const noteElement = event.target.closest('.note');

    if (noteElement) {
      // Note double-click → NoteBehavior for edit mode
      if (this.noteBehavior) {
        console.log(
          'DesktopAdapter: Note double-click detected, delegating to NoteBehavior',
        );
        this.noteBehavior.handleNoteDoubleClick(noteElement, event, 'desktop');
      }
    } else if (
      event.target === this.canvas ||
      event.target.closest('#canvas')
    ) {
      // Canvas double-click → CanvasBehavior for note creation
      if (this.canvasBehavior) {
        console.log(
          'DesktopAdapter: Canvas double-click detected, delegating to CanvasBehavior',
        );
        this.canvasBehavior.handleCanvasDoubleClick(event, 'desktop');
      } else {
        console.warn(
          'DesktopAdapter: CanvasBehavior not available for note creation',
        );
      }
    }
  }

  /**
   * Handle wheel events for zoom - delegate to ViewportBehavior
   */
  handleWheel(event) {
    event.preventDefault();

    if (!this.viewportBehavior) {
      console.warn(
        'DesktopAdapter: ViewportBehavior not available for wheel zoom',
      );
      return;
    }

    const direction = event.deltaY > 0 ? 'out' : 'in';

    console.log(
      'DesktopAdapter: Wheel zoom detected, delegating to ViewportBehavior',
      { direction },
    );

    // Pass viewport coordinates - ViewportBehavior handles coordinate transformation
    this.viewportBehavior.handleWheelZoom(
      direction,
      event.clientX,
      event.clientY,
      'desktop',
    );
  }

  /**
   * Handle keyboard events (KEEP - this is input-specific)
   */
  handleKeyDown(event) {
    // Menu keyboard shortcuts are handled by pageInteractions.js

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
          if (this.viewportBehavior) {
            this.viewportBehavior.zoomIn();
          }
          break;
        case '-':
          event.preventDefault();
          if (this.viewportBehavior) {
            this.viewportBehavior.zoomOut();
          }
          break;
        case '0':
          event.preventDefault();
          if (this.viewportBehavior) {
            this.viewportBehavior.resetZoom();
          }
          break;
      }
    }

    // Handle standalone keys
    switch (event.key) {
      case 'Delete':
      case 'Backspace':
        // Only delete if not in edit mode
        if (!document.querySelector('.note-content.edit-mode')) {
          // Check for connection deletion first, then note deletion
          if (this.connectionBehavior) {
            this.connectionBehavior.handleConnectionDeletion();
          }
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
   * Handle SVG click events for connection line selection
   */
  handleSvgClick(event) {
    if (!this.connectionBehavior) {
      console.warn(
        'DesktopAdapter: ConnectionBehavior not available for line selection',
      );
      return;
    }

    console.log(
      'DesktopAdapter: SVG click detected, delegating to ConnectionBehavior',
    );
    this.connectionBehavior.handleLineSelection(event, 'desktop');
  }

  /**
   * Handle SVG mousemove events for connection line hover effects
   */
  handleSvgMouseMove(event) {
    if (!this.connectionBehavior) {
      return;
    }

    this.connectionBehavior.handleLineHover(event, 'desktop');
  }

  /**
   * Handle SVG mouseleave events for connection line cleanup
   */
  handleSvgMouseLeave(event) {
    if (!this.connectionBehavior) {
      return;
    }

    this.connectionBehavior.handleLineHoverEnd(event, 'desktop');
  }

  /**
   * Check if click target is canvas (UTILITY - keep)
   */
  isClickOnCanvas(target) {
    return target === this.canvas || this.canvas.contains(target);
  }
}
