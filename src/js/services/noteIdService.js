// src/js/services/noteIdService.js
// MM-256: Centralized note ID management with collision prevention

import { toBase62, fromBase62 } from '../utils/utils.js';
import { logger, errorHandler } from './logger.js';

/**
 * Service for managing note ID generation and preventing collisions
 * Fixes MM-256: Duplicate note IDs cause connection targeting corruption
 */
export class NoteIdService {
  static #nextId = 1;

  /**
   * Generate the next unique note ID
   * @returns {string} Base62-encoded ID
   */
  static generateNextId() {
    return toBase62(this.#nextId++);
  }

  /**
   * Ensure future generated IDs won't collide with existing notes
   * Updates internal counter to be higher than any existing ID
   * @param {Array} existingNotes - Array of notes with id property
   */
  static ensureUniqueIds(existingNotes) {
    if (!Array.isArray(existingNotes) || existingNotes.length === 0) {
      return;
    }

    let maxId = 0;

    existingNotes.forEach((note) => {
      if (note && note.id && typeof note.id === 'string') {
        try {
          const numericId = fromBase62(note.id);
          if (numericId > maxId) {
            maxId = numericId;
          }
        } catch {
          // Skip invalid IDs that can't be parsed
          console.warn(`NoteIdService: Skipping invalid ID "${note.id}"`);
        }
      }
    });

    // Set next ID to be one higher than the highest existing ID
    if (maxId >= this.#nextId) {
      this.#nextId = maxId + 1;
    }
  }

  /**
   * Check if an ID is unique among existing notes
   * @param {string} id - ID to check
   * @param {Array} existingNotes - Array of notes with id property
   * @returns {boolean} True if ID is unique
   */
  static isIdUnique(id, existingNotes) {
    if (!Array.isArray(existingNotes)) {
      return true;
    }

    return !existingNotes.some((note) => note && note.id === id);
  }

  /**
   * Reset the ID counter to 1
   * Primarily for testing purposes
   */
  static reset() {
    this.#nextId = 1;
  }

  /**
   * Get current counter value (for debugging/testing)
   * @returns {number} Current counter value
   */
  static getCurrentCounter() {
    return this.#nextId;
  }
}
