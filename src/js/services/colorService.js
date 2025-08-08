// src/js/services/colorService.js
import { appState } from '../data/observableState.js';
import { eventBus } from '../core/eventBus.js';
import { log } from '../utils/utils.js';

/**
 * Color State Management Service
 * Handles color selection, application, and persistence
 */
export class ColorService {
  static VALID_COLORS = ['yellow', 'pink', 'green', 'blue'];

  /**
   * Set the global color state for new notes
   * @param {string} color - Color scheme name
   */
  static setCurrentColor(color) {
    if (!this.VALID_COLORS.includes(color)) {
      log(
        `Invalid color: ${color}. Valid colors: ${this.VALID_COLORS.join(', ')}`,
      );
      return false;
    }

    const currentState = appState.getState();
    appState.setState({
      colorState: {
        ...currentState.colorState,
        currentColor: color,
      },
    });

    eventBus.emit('color.changed', { color });
    log(`Current color set to: ${color}`);
    return true;
  }

  /**
   * Get the current global color
   * @returns {string} Current color scheme
   */
  static getCurrentColor() {
    const state = appState.getState();
    // Backward compatibility: ensure colorState exists
    if (!state.colorState) {
      return 'yellow'; // Default color
    }
    return state.colorState.currentColor;
  }

  /**
   * Set color for specific note(s)
   * @param {string|string[]} noteIds - Single note ID or array of note IDs
   * @param {string} color - Color scheme name
   */
  static setNoteColor(noteIds, color) {
    if (!this.VALID_COLORS.includes(color)) {
      log(
        `Invalid color: ${color}. Valid colors: ${this.VALID_COLORS.join(', ')}`,
      );
      return false;
    }

    const ids = Array.isArray(noteIds) ? noteIds : [noteIds];
    const currentState = appState.getState();
    const updatedNoteColors = { ...currentState.colorState.notes };

    ids.forEach((noteId) => {
      // eslint-disable-next-line security/detect-object-injection
      updatedNoteColors[noteId] = { colorScheme: color };
    });

    appState.setState({
      colorState: {
        ...currentState.colorState,
        notes: updatedNoteColors,
      },
    });

    eventBus.emit('note.color.changed', { noteIds: ids, color });
    log(`Color ${color} applied to notes:`, ids);
    return true;
  }

  /**
   * Get color for a specific note
   * @param {string} noteId - Note ID
   * @returns {string} Color scheme or default
   */
  static getNoteColor(noteId) {
    const state = appState.getState();
    // Backward compatibility: ensure colorState exists
    if (!state.colorState) {
      return 'yellow'; // Default color
    }

    return (
      state.colorState.notes[noteId]?.colorScheme || this.getCurrentColor()
    );
  }

  /**
   * Remove color information for a note
   * @param {string} noteId - Note ID
   */
  static removeNoteColor(noteId) {
    const currentState = appState.getState();
    const updatedNoteColors = { ...currentState.colorState.notes };
    // eslint-disable-next-line security/detect-object-injection
    delete updatedNoteColors[noteId];

    appState.setState({
      colorState: {
        ...currentState.colorState,
        notes: updatedNoteColors,
      },
    });

    eventBus.emit('note.color.removed', { noteId });
    log(`Color removed from note: ${noteId}`);
  }

  /**
   * Apply color to currently selected notes
   * @param {string} color - Color scheme name
   */
  static applyColorToSelectedNotes(color) {
    const selectedNotes = document.querySelectorAll('.note.selected');
    const selectedIds = Array.from(selectedNotes).map((note) => note.id);

    if (selectedIds.length > 0) {
      this.setNoteColor(selectedIds, color);
    }

    // Also set as current color for new notes
    this.setCurrentColor(color);
  }

  /**
   * Get all note colors for export
   * @returns {Object} Note colors mapping
   */
  static getAllNoteColors() {
    const state = appState.getState();
    // Backward compatibility: ensure colorState exists
    if (!state.colorState) {
      return {};
    }
    return state.colorState.notes;
  }

  /**
   * Set note colors from import data
   * @param {Object} noteColors - Note colors mapping
   */
  static setAllNoteColors(noteColors) {
    const currentState = appState.getState();
    appState.setState({
      colorState: {
        ...currentState.colorState,
        notes: noteColors || {},
      },
    });

    eventBus.emit('note.colors.imported', { noteColors });
    log('Note colors imported:', noteColors);
  }

  /**
   * Reset all color state to defaults
   */
  static resetColorState() {
    appState.setState({
      colorState: {
        currentColor: 'yellow',
        notes: {},
      },
    });

    eventBus.emit('color.state.reset');
    log('Color state reset to defaults');
  }

  /**
   * Validate color scheme exists
   * @param {string} color - Color scheme name
   * @returns {boolean} True if valid
   */
  static isValidColor(color) {
    return this.VALID_COLORS.includes(color);
  }
}
