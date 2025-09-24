/**
 * ToolbarBehavior - Handles all toolbar interaction logic
 *
 * Unified behavior for color picker and context-sensitive actions.
 * Receives input from both DesktopAdapter and TouchAdapter.
 * Consolidates color selection, delete actions, and connector type switching.
 */

import { ColorService } from '../../services/colorService.js';
import { noteManager } from '../../services/noteManager.js';
import { logger } from '../../services/logger.js';

export class ToolbarBehavior {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.isInitialized = false;
    this.name = 'ToolbarBehavior';
    this.currentContext = { type: 'canvas', data: null };

    logger.debug('ToolbarBehavior created');
  }

  /**
   * Initialize the behavior
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    // Subscribe to selection changes to update context
    this.eventBus.on('note.selection.changed', (data) => {
      this.updateContext(this.mapSelectionToContext(data));
    });

    // Subscribe to connector hover/active states
    this.eventBus.on('connector.hovered', (data) => {
      this.updateContext({ type: 'connectorActive', data });
    });

    this.eventBus.on('connector.unhovered', () => {
      this.updateContext({ type: 'canvas', data: null });
    });

    // Subscribe to connector deselection
    this.eventBus.on('connector.deselected', () => {
      this.updateContext({ type: 'canvas', data: null });
    });

    // TODO: Temporary - listen for connector selection to test click detection
    this.eventBus.on('connector.selected', (data) => {
      logger.info('🔗 ToolbarBehavior: Connector selected!', data);
      this.updateContext({
        type: 'connectorActive',
        data: {
          startId: data.startId,
          endId: data.endId,
          currentType: data.connectionType,
          connectionId: `${data.startId}-${data.endId}`, // Temporary ID format
        },
      });
    });

    // Initialize context state
    this.updateContext({ type: 'canvas', data: null });

    this.isInitialized = true;
    logger.debug('ToolbarBehavior initialized');
  }

  /**
   * Handle color swatch selection from any adapter
   */
  handleColorSelection(color, inputType) {
    if (!color) {
      logger.info('ToolbarBehavior: No color provided for selection');
      return;
    }

    logger.info(`ToolbarBehavior: Color selection ${color} via ${inputType}`);

    // Update visual state
    this.updateActiveColorSwatch(color);

    // Apply color logic based on current state
    ColorService.applyColorToSelectedNotes(color);

    // Emit selection event
    this.eventBus.emit('colorPicker.selection', { color, inputType });
  }

  /**
   * Handle delete action from toolbar
   */
  handleDeleteAction(inputType) {
    logger.info(`🗑️ ToolbarBehavior: Delete action via ${inputType}`);
    logger.info('🗑️ ToolbarBehavior: Current context:', this.currentContext);

    const context = this.currentContext;

    if (
      context.type === 'noteSelected' ||
      context.type === 'multiNoteSelected'
    ) {
      // Delete selected notes
      const selectedNotes = noteManager.getSelectedNotes();
      logger.info('🗑️ ToolbarBehavior: Selected notes:', selectedNotes);

      if (selectedNotes.length > 1) {
        // Multiple notes selected
        logger.info('🗑️ ToolbarBehavior: Emitting notes.deleteSelected');
        this.eventBus.emit('notes.deleteSelected');
        this.announceMultiDelete(selectedNotes.length);
      } else if (selectedNotes.length === 1) {
        // Single note selected
        const canvas = document.getElementById('canvas');
        logger.info(
          '🗑️ ToolbarBehavior: Emitting note.deleteWithConnections for:',
          selectedNotes[0],
        );
        this.eventBus.emit('note.deleteWithConnections', {
          note: selectedNotes[0],
          canvas: canvas,
        });
        this.announceDelete();
      } else {
        logger.info(
          '🗑️ ToolbarBehavior: No notes selected, length:',
          selectedNotes.length,
        );
      }
    } else if (context.type === 'connectorActive' && context.data) {
      // Delete connector
      const { connectionId, startId, endId } = context.data;
      logger.info('Deleting connector:', {
        startId,
        endId,
        connectionId,
      });

      // Remove the connector element from DOM
      const connectorGroup = document.querySelector(
        `g[data-start="${startId}"][data-end="${endId}"]`,
      );
      if (connectorGroup) {
        connectorGroup.remove();
        logger.info('🗑️ ToolbarBehavior: Connector removed from DOM');

        // Emit the standard connection.deleted event for data persistence
        this.eventBus.emit('connection.deleted', { startId, endId });
        this.announceDelete();
      } else {
        logger.warn(
          '🗑️ ToolbarBehavior: Connector group not found for deletion',
        );
      }
    }
  }

  /**
   * Handle connector type switch action from toolbar
   */
  handleConnectorTypeSwitch(inputType) {
    logger.info(`ToolbarBehavior: Connector type switch via ${inputType}`);

    const context = this.currentContext;

    if (context.type === 'connectorActive' && context.data) {
      const { startId, endId, currentType } = context.data;
      const newType = this.getNextConnectionType(currentType);

      // Find the connector group and update it directly
      const connectorGroup = document.querySelector(
        `g[data-start="${startId}"][data-end="${endId}"]`,
      );
      if (connectorGroup) {
        // Import the connectionManager to update the connection type
        import('../../features/connection/connectionManager.js').then(
          ({ connectionManager }) => {
            connectionManager.updateConnectionType(connectorGroup, newType);
            logger.info(
              `ToolbarBehavior: Switched connector from ${currentType} to ${newType}`,
            );

            // Update our context with the new type
            this.currentContext.data.currentType = newType;
          },
        );
      } else {
        logger.warn(
          'ToolbarBehavior: Connector group not found for type change',
        );
      }
    }
  }

  /**
   * Update the current context state and visual appearance
   */
  updateContext(newContext) {
    this.currentContext = newContext;
    this.applyContextState(newContext);
    logger.info(`ToolbarBehavior: Context updated to ${newContext.type}`);
  }

  /**
   * Apply visual state changes based on context
   */
  applyContextState(context) {
    const deleteButton = document.querySelector(
      '[data-toolbar-action="delete"]',
    );
    const switchButton = document.querySelector(
      '[data-toolbar-action="switch-type"]',
    );

    if (!deleteButton || !switchButton) {
      return; // Buttons not yet in DOM
    }

    switch (context.type) {
      case 'canvas':
        this.setActionState(deleteButton, { enabled: false, opacity: 0.2 });
        this.setActionState(switchButton, { enabled: false, opacity: 0.2 });
        break;

      case 'noteSelected':
        this.setActionState(deleteButton, { enabled: true, opacity: 1.0 });
        this.setActionState(switchButton, { enabled: false, opacity: 0.2 });
        break;

      case 'multiNoteSelected':
        this.setActionState(deleteButton, { enabled: true, opacity: 1.0 });
        this.setActionState(switchButton, { enabled: false, opacity: 0.2 });
        break;

      case 'connectorActive':
        this.setActionState(deleteButton, { enabled: true, opacity: 1.0 });
        this.setActionState(switchButton, { enabled: true, opacity: 1.0 });
        break;

      default:
        this.setActionState(deleteButton, { enabled: false, opacity: 0.2 });
        this.setActionState(switchButton, { enabled: false, opacity: 0.2 });
    }
  }

  /**
   * Set the visual and interaction state of an action button
   */
  setActionState(button, { enabled, opacity }) {
    if (!button) return; // Graceful handling when button doesn't exist
    button.disabled = !enabled;
    button.style.opacity = opacity;
  }

  /**
   * Map selection state to context state
   */
  mapSelectionToContext(selectionData) {
    // For note.selection.changed events, we get the selectedCount directly
    // Event data format: { type: 'selected'|'deselected'|'cleared', note: HTMLElement, selectedCount: number }
    if (!selectionData || typeof selectionData.selectedCount !== 'number') {
      return { type: 'canvas', data: null };
    }

    const selectedCount = selectionData.selectedCount;

    if (selectedCount === 0) {
      return { type: 'canvas', data: null };
    } else if (selectedCount === 1) {
      return {
        type: 'noteSelected',
        data: { noteIds: [selectionData.note], count: 1 },
      };
    } else {
      return {
        type: 'multiNoteSelected',
        data: { noteIds: [], count: selectedCount }, // We don't have full array, just count
      };
    }
  }

  /**
   * Update which color swatch appears active
   */
  updateActiveColorSwatch(color) {
    // Remove active class from all swatches
    document.querySelectorAll('.color-swatch').forEach((swatch) => {
      swatch.classList.remove('active');
    });

    // Add active class to selected swatch
    const activeSwatch = document.querySelector(`[data-color="${color}"]`);
    if (activeSwatch) {
      activeSwatch.classList.add('active');
    }
  }

  /**
   * Get next connection type in sequence using CONNECTION_TYPES constants
   */
  getNextConnectionType(currentType) {
    // Use the same logic as the context menu
    const CONNECTION_TYPES = {
      NONE: 'none',
      UNI_FORWARD: 'uni-forward',
      UNI_BACKWARD: 'uni-backward',
      BI: 'bi',
    };

    const types = Object.values(CONNECTION_TYPES);
    const currentIndex = types.indexOf(currentType);
    const nextIndex = (currentIndex + 1) % types.length;
    // eslint-disable-next-line security/detect-object-injection
    return types[nextIndex];
  }

  /**
   * Announce deletion to screen readers
   */
  announceDelete() {
    this.announce('Item deleted');
  }

  /**
   * Announce multiple note deletion to screen readers
   */
  announceMultiDelete(count) {
    this.announce(`${count} notes deleted`);
  }

  /**
   * Generic announce function for screen readers
   */
  announce(message) {
    // Find or create screen reader announcer
    let announcer = document.getElementById('sr-announcer');
    if (!announcer) {
      announcer = document.createElement('div');
      announcer.id = 'sr-announcer';
      announcer.setAttribute('aria-live', 'polite');
      announcer.className = 'sr-only';
      document.body.appendChild(announcer);
    }

    announcer.textContent = message;
    setTimeout(() => (announcer.textContent = ''), 1000);
  }

  /**
   * Handle keyboard navigation for accessibility
   */
  handleKeyboardNavigation(event, element) {
    switch (event.key) {
      case 'Enter':
      case ' ': // Spacebar
        event.preventDefault();
        element.click();
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        this.focusNextToolbarElement(element);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        this.focusPreviousToolbarElement(element);
        break;
    }
  }

  /**
   * Focus next toolbar element in sequence
   */
  focusNextToolbarElement(currentElement) {
    const toolbarElements = Array.from(
      document.querySelectorAll(
        '.color-swatch, .toolbar-action:not(:disabled), .kebab-menu-button',
      ),
    );
    const currentIndex = toolbarElements.indexOf(currentElement);
    const nextIndex = (currentIndex + 1) % toolbarElements.length;
    // eslint-disable-next-line security/detect-object-injection
    toolbarElements[nextIndex].focus();
  }

  /**
   * Focus previous toolbar element in sequence
   */
  focusPreviousToolbarElement(currentElement) {
    const toolbarElements = Array.from(
      document.querySelectorAll(
        '.color-swatch, .toolbar-action:not(:disabled), .kebab-menu-button',
      ),
    );
    const currentIndex = toolbarElements.indexOf(currentElement);
    const prevIndex =
      currentIndex === 0 ? toolbarElements.length - 1 : currentIndex - 1;
    // eslint-disable-next-line security/detect-object-injection
    toolbarElements[prevIndex].focus();
  }

  /**
   * Clean up event handlers (for testing or reset)
   */
  cleanup() {
    // Remove event bus listeners
    this.eventBus.off('note.selection.changed');
    this.eventBus.off('connector.hovered');
    this.eventBus.off('connector.unhovered');
    this.eventBus.off('connector.deselected');
    this.eventBus.off('connector.selected');

    this.isInitialized = false;
    logger.info('ToolbarBehavior: Cleaned up');
  }
}
