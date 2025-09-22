/**
 * ToolbarBehavior - Handles all toolbar interaction logic
 *
 * Unified behavior for color picker and context-sensitive actions.
 * Receives input from both DesktopAdapter and TouchAdapter.
 * Consolidates color selection, delete actions, and connector type switching.
 */

import { ColorService } from '../../services/colorService.js';
import { noteManager } from '../../services/noteManager.js';
import { log } from '../../utils/utils.js';

export class ToolbarBehavior {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.isInitialized = false;
    this.name = 'ToolbarBehavior';
    this.currentContext = { type: 'canvas', data: null };

    console.log('ToolbarBehavior: Created');
  }

  /**
   * Initialize the behavior
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    // Subscribe to selection changes to update context
    this.eventBus.on('selection.changed', (data) => {
      this.updateContext(this.mapSelectionToContext(data));
    });

    // Subscribe to connector hover/active states
    this.eventBus.on('connector.hovered', (data) => {
      this.updateContext({ type: 'connectorActive', data });
    });

    this.eventBus.on('connector.unhovered', () => {
      this.updateContext({ type: 'canvas', data: null });
    });

    // Initialize context state
    this.updateContext({ type: 'canvas', data: null });

    this.isInitialized = true;
    console.log('ToolbarBehavior: Initialized');
  }

  /**
   * Handle color swatch selection from any adapter
   */
  handleColorSelection(color, inputType) {
    if (!color) {
      log('ToolbarBehavior: No color provided for selection');
      return;
    }

    log(`ToolbarBehavior: Color selection ${color} via ${inputType}`);

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
    log(`ToolbarBehavior: Delete action via ${inputType}`);

    const context = this.currentContext;

    if (
      context.type === 'noteSelected' ||
      context.type === 'multiNoteSelected'
    ) {
      // Delete selected notes
      const selectedNotes = noteManager.getSelectedNotes();

      if (selectedNotes.length > 1) {
        // Multiple notes selected
        this.eventBus.emit('notes.deleteSelected');
        this.announceMultiDelete(selectedNotes.length);
      } else if (selectedNotes.length === 1) {
        // Single note selected
        const canvas = document.getElementById('canvas');
        this.eventBus.emit('note.deleteWithConnections', {
          note: selectedNotes[0],
          canvas: canvas,
        });
        this.announceDelete();
      }
    } else if (context.type === 'connectorActive' && context.data) {
      // Delete connector
      const { connectionId, startId, endId } = context.data;
      this.eventBus.emit('connection.delete', { startId, endId, connectionId });
      this.announceDelete();
    }
  }

  /**
   * Handle connector type switch action from toolbar
   */
  handleConnectorTypeSwitch(inputType) {
    log(`ToolbarBehavior: Connector type switch via ${inputType}`);

    const context = this.currentContext;

    if (context.type === 'connectorActive' && context.data) {
      const { startId, endId, currentType } = context.data;
      const newType = this.getNextConnectionType(currentType);

      this.eventBus.emit('connection.typeChange', { startId, endId, newType });
      log(
        `ToolbarBehavior: Switched connector from ${currentType} to ${newType}`,
      );
    }
  }

  /**
   * Update the current context state and visual appearance
   */
  updateContext(newContext) {
    this.currentContext = newContext;
    this.applyContextState(newContext);
    log(`ToolbarBehavior: Context updated to ${newContext.type}`);
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
    if (!selectionData || !selectionData.selectedNotes) {
      return { type: 'canvas', data: null };
    }

    const selectedCount = selectionData.selectedNotes.length;

    if (selectedCount === 0) {
      return { type: 'canvas', data: null };
    } else if (selectedCount === 1) {
      return {
        type: 'noteSelected',
        data: { noteIds: selectionData.selectedNotes, count: 1 },
      };
    } else {
      return {
        type: 'multiNoteSelected',
        data: { noteIds: selectionData.selectedNotes, count: selectedCount },
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
   * Get next connection type in sequence
   */
  getNextConnectionType(currentType) {
    // Import connection types from connection service if available
    // For now, use basic cycling: 0 -> 1 -> 2 -> 3 -> 0
    const types = [0, 1, 2, 3]; // none, from->to, to->from, bidirectional
    const currentIndex = types.indexOf(parseInt(currentType));
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
    this.eventBus.off('selection.changed');
    this.eventBus.off('connector.hovered');
    this.eventBus.off('connector.unhovered');

    this.isInitialized = false;
    console.log('ToolbarBehavior: Cleaned up');
  }
}
