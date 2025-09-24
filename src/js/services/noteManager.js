/**
 * Note Manager Service
 *
 * Centralized service for managing note selection state across the application.
 * Extracted from legacy event.js to provide a clean, reusable service.
 */

import { eventBus } from '../core/eventBus.js';
import { logger, errorHandler } from './logger.js';

export class NoteManager {
  constructor() {
    this.selectedNotes = new Set();
  }

  /**
   * Select a note and emit selection changed event
   * @param {HTMLElement} note - The note element to select
   */
  selectNote(note) {
    if (!note || !note.classList) {
      logger.warn('Invalid note element provided to selectNote');
      return;
    }

    note.classList.add('selected');
    this.selectedNotes.add(note);
    eventBus.emit('note.selection.changed', {
      type: 'selected',
      note: note,
      selectedCount: this.selectedNotes.size,
    });
  }

  /**
   * Deselect a note and emit selection changed event
   * @param {HTMLElement} note - The note element to deselect
   */
  deselectNote(note) {
    if (!note || !note.classList) {
      console.warn(
        'NoteManager: Invalid note element provided to deselectNote',
      );
      return;
    }

    note.classList.remove('selected');
    this.selectedNotes.delete(note);
    eventBus.emit('note.selection.changed', {
      type: 'deselected',
      note: note,
      selectedCount: this.selectedNotes.size,
    });
  }

  /**
   * Clear all note selections
   */
  clearSelections() {
    const previousCount = this.selectedNotes.size;

    this.selectedNotes.forEach((note) => {
      if (note && note.classList) {
        note.classList.remove('selected');
      }
    });

    this.selectedNotes.clear();

    if (previousCount > 0) {
      eventBus.emit('note.selection.changed', {
        type: 'cleared',
        selectedCount: 0,
        previousCount: previousCount,
      });
    }
  }

  /**
   * Get all currently selected notes
   * @returns {Array<HTMLElement>} Array of selected note elements
   */
  getSelectedNotes() {
    // Filter out any invalid notes that might have been removed from DOM
    const validNotes = Array.from(this.selectedNotes).filter(
      (note) => note && note.classList && document.contains(note),
    );

    // Clean up our internal set if we found invalid notes
    if (validNotes.length !== this.selectedNotes.size) {
      this.selectedNotes.clear();
      validNotes.forEach((note) => this.selectedNotes.add(note));
    }

    return validNotes;
  }

  /**
   * Check if a note is currently selected
   * @param {HTMLElement} note - The note element to check
   * @returns {boolean} True if the note is selected
   */
  isSelected(note) {
    return note && note.classList && note.classList.contains('selected');
  }

  /**
   * Get the count of currently selected notes
   * @returns {number} Number of selected notes
   */
  getSelectedCount() {
    return this.getSelectedNotes().length;
  }

  /**
   * Toggle selection state of a note
   * @param {HTMLElement} note - The note element to toggle
   */
  toggleSelection(note) {
    if (this.isSelected(note)) {
      this.deselectNote(note);
    } else {
      this.selectNote(note);
    }
  }

  /**
   * Select multiple notes at once
   * @param {Array<HTMLElement>} notes - Array of note elements to select
   */
  selectMultiple(notes) {
    if (!Array.isArray(notes)) {
      logger.warn('selectMultiple expects an array of notes');
      return;
    }

    notes.forEach((note) => this.selectNote(note));
  }

  /**
   * Clean up any orphaned selections (notes that no longer exist in DOM)
   */
  cleanupOrphanedSelections() {
    const validNotes = this.getSelectedNotes(); // This already filters and cleans up
    return this.selectedNotes.size - validNotes.length; // Return count of cleaned up notes
  }
}

// Export singleton instance for use across the application
export const noteManager = new NoteManager();

// For backward compatibility, also export the class
export { NoteManager as NoteManagerClass };
