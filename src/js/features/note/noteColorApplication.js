// src/js/features/note/noteColorApplication.js
import { ColorService } from '../../services/colorService.js';
import { eventBus } from '../../core/eventBus.js';
import { logger } from '../../services/logger.js';

/**
 * Note Color Application System
 * Handles applying colors to notes and managing visual states
 */
export class NoteColorApplication {
  static isInitialized = false;

  /**
   * Initialize the note color application system
   */
  static initialize() {
    if (this.isInitialized) {
      logger.info('Note color application already initialized');
      return;
    }

    this.subscribeToEvents();
    this.isInitialized = true;
    logger.info('Note color application system initialized');
  }

  /**
   * Subscribe to relevant events
   */
  static subscribeToEvents() {
    // Apply color when note is created - handle both old and new event systems
    // Legacy: note.created from noteFactory fallback
    eventBus.on('note.created', (noteData) => {
      this.applyColorToNewNote(noteData.id);
    });

    // New: note.updated from LocalJSONProvider (for new notes)
    eventBus.on('note.updated', (noteData) => {
      // Only apply color to new notes (empty content indicates new note)
      if (!noteData.content || noteData.content.trim() === '') {
        this.applyColorToNewNote(noteData.id);
      }
    });

    // Apply colors when notes are imported/loaded
    eventBus.on('notes.loaded', () => {
      logger.info('NoteColorApplication: Received notes.loaded event');
      this.applyColorsToAllNotes();
    });

    // Handle color changes
    eventBus.on('note.color.changed', (data) => {
      this.applyColorToNotes(data.noteIds, data.color);
    });

    // Handle color removal
    eventBus.on('note.color.removed', (data) => {
      this.resetNoteToDefaultColor(data.noteId);
    });

    // Handle selection state changes to maintain colors
    eventBus.on('note.selected', (data) => {
      this.updateNoteSelectionState(data.noteId, true);
    });

    eventBus.on('note.deselected', (data) => {
      this.updateNoteSelectionState(data.noteId, false);
    });
  }

  /**
   * Apply current color to a newly created note
   * @param {string} noteId - Note ID
   */
  static applyColorToNewNote(noteId) {
    // Skip color application during note restoration to preserve stored colors
    if (window.noteRestorationInProgress) {
      return;
    }

    const noteElement = document.getElementById(noteId);
    if (!noteElement) {
      logger.info(`Note element not found: ${noteId}`);
      return;
    }

    // Check if note already has color applied (from optimized note creation)
    const hasColorClass = ColorService.VALID_COLORS.some((color) =>
      noteElement.classList.contains(`color-${color}`),
    );

    if (hasColorClass) {
      // Note was created with color already applied, no need for additional processing
      logger.debug(`Note ${noteId} already has color applied during creation`);
      return;
    }

    // Fallback: Apply color to notes created through legacy paths
    const currentColor = ColorService.getCurrentColor();
    ColorService.setNoteColor(noteId, currentColor);
    logger.info(`Applied fallback color ${currentColor} to note ${noteId}`);
  }

  /**
   * Apply colors to specific notes
   * @param {string[]} noteIds - Array of note IDs
   * @param {string} color - Color scheme name
   */
  static applyColorToNotes(noteIds, color) {
    noteIds.forEach((noteId) => {
      const noteElement = document.getElementById(noteId);
      if (noteElement) {
        this.applyColorClassesToNote(noteElement, color);
      }
    });
  }

  /**
   * Apply color classes to a note element
   * @param {HTMLElement} noteElement - Note DOM element
   * @param {string} color - Color scheme name
   */
  static applyColorClassesToNote(noteElement, color) {
    if (!noteElement || !ColorService.isValidColor(color)) {
      logger.info(`Invalid note element or color: ${color}`);
      return;
    }

    // Remove all existing color classes
    ColorService.VALID_COLORS.forEach((colorName) => {
      noteElement.classList.remove(`color-${colorName}`);
    });

    // Add new color class
    noteElement.classList.add(`color-${color}`);

    // Trigger a layout update to ensure CSS transitions work
    requestAnimationFrame(() => {
      // Force style recalculation
      noteElement.offsetHeight;
    });

    logger.debug(
      `Applied color class color-${color} to note ${noteElement.id}`,
    );
  }

  /**
   * Reset note to default color
   * @param {string} noteId - Note ID
   */
  static resetNoteToDefaultColor(noteId) {
    const noteElement = document.getElementById(noteId);
    if (noteElement) {
      this.applyColorClassesToNote(noteElement, 'yellow'); // Default color
    }
  }

  /**
   * Update note selection state while preserving color
   * @param {string} noteId - Note ID
   * @param {boolean} isSelected - Selection state
   */
  static updateNoteSelectionState(noteId, isSelected) {
    const noteElement = document.getElementById(noteId);
    if (!noteElement) return;

    if (isSelected) {
      noteElement.classList.add('selected');
    } else {
      noteElement.classList.remove('selected');
    }

    // Color classes are preserved automatically by CSS specificity
  }

  /**
   * Apply colors to all existing notes (used on load/import)
   */
  static applyColorsToAllNotes() {
    logger.info('NoteColorApplication.applyColorsToAllNotes called');
    const allNotes = document.querySelectorAll('.note');
    const allNoteColors = ColorService.getAllNoteColors();

    logger.info('Found notes for color application:', allNotes.length);
    logger.info('Available note colors:', allNoteColors);

    allNotes.forEach((noteElement) => {
      const noteId = noteElement.id;

      const noteColor =
        // eslint-disable-next-line security/detect-object-injection
        allNoteColors[noteId]?.colorScheme || ColorService.getCurrentColor();
      logger.info(`Applying color ${noteColor} to note ${noteId}`);
      this.applyColorClassesToNote(noteElement, noteColor);
    });

    logger.info('Applied colors to all notes');
  }

  /**
   * Get current color class applied to a note
   * @param {HTMLElement} noteElement - Note DOM element
   * @returns {string|null} Color name or null if none found
   */
  static getCurrentNoteColor(noteElement) {
    for (const color of ColorService.VALID_COLORS) {
      if (noteElement.classList.contains(`color-${color}`)) {
        return color;
      }
    }
    return null;
  }

  /**
   * Bulk apply color to multiple selected notes
   * @param {string} color - Color scheme name
   */
  static applyColorToBulkSelection(color) {
    const selectedNotes = document.querySelectorAll('.note.selected');
    const noteIds = Array.from(selectedNotes).map((note) => note.id);

    if (noteIds.length > 0) {
      ColorService.setNoteColor(noteIds, color);
      // Color application is handled by the event listener
    }

    logger.info(`Applied color ${color} to ${noteIds.length} selected notes`);
  }

  /**
   * Initialize colors for imported notes from JSON data
   * @param {Object} importedNotes - Note data with potential color info
   */
  static initializeImportedNoteColors(importedNotes) {
    const noteColors = {};

    importedNotes.forEach((noteData) => {
      if (noteData.cl) {
        // Color field from JSON
        noteColors[noteData.i] = { colorScheme: noteData.cl };
      }
    });

    if (Object.keys(noteColors).length > 0) {
      ColorService.setAllNoteColors(noteColors);
      // Apply colors after notes are created
      setTimeout(() => {
        this.applyColorsToAllNotes();
      }, 100);
    }
  }

  /**
   * Get color data for JSON export
   * @param {Array} notes - Notes array
   * @returns {Array} Notes with color data
   */
  static addColorDataToExport(notes) {
    const allNoteColors = ColorService.getAllNoteColors();

    return notes.map((note) => {
      const noteColor = allNoteColors[note.i]?.colorScheme;
      if (noteColor && noteColor !== 'yellow') {
        // Don't export default color
        return { ...note, cl: noteColor };
      }
      return note;
    });
  }

  /**
   * Clean up (for testing or reset)
   */
  static cleanup() {
    this.isInitialized = false;
    logger.info('Note color application cleaned up');
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    NoteColorApplication.initialize();
  });
} else {
  NoteColorApplication.initialize();
}
