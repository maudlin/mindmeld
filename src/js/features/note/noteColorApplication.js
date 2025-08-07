// src/js/features/note/noteColorApplication.js
import { ColorService } from '../../services/colorService.js';
import { eventBus } from '../../core/eventBus.js';
import { log } from '../../utils/utils.js';

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
      log('Note color application already initialized');
      return;
    }

    this.subscribeToEvents();
    this.isInitialized = true;
    log('Note color application system initialized');
  }

  /**
   * Subscribe to relevant events
   */
  static subscribeToEvents() {
    // Apply color when note is created
    eventBus.on('note.created', (noteData) => {
      this.applyColorToNewNote(noteData.id);
    });

    // Apply colors when notes are imported/loaded
    eventBus.on('notes.loaded', () => {
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
    const currentColor = ColorService.getCurrentColor();
    const noteElement = document.getElementById(noteId);

    if (!noteElement) {
      log(`Note element not found: ${noteId}`);
      return;
    }

    // Set color in service state
    ColorService.setNoteColor(noteId, currentColor);

    // Apply visual styling
    this.applyColorClassesToNote(noteElement, currentColor);

    log(`Applied color ${currentColor} to new note ${noteId}`);
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
      log(`Invalid note element or color: ${color}`);
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

    log(`Applied color class color-${color} to note ${noteElement.id}`);
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
    const allNotes = document.querySelectorAll('.note');
    const allNoteColors = ColorService.getAllNoteColors();

    allNotes.forEach((noteElement) => {
      const noteId = noteElement.id;

      const noteColor =
        allNoteColors[noteId]?.colorScheme || ColorService.getCurrentColor();
      this.applyColorClassesToNote(noteElement, noteColor);
    });

    log('Applied colors to all notes');
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

    log(`Applied color ${color} to ${noteIds.length} selected notes`);
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
    log('Note color application cleaned up');
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
