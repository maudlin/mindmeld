// src/js/data/canonicalStorage.js

/**
 * Canonical Markdown Storage Layer
 *
 * Enforces markdown-only storage with zero HTML persistence:
 * - All note content stored as raw markdown strings
 * - Empty notes stored as '' (never null/undefined)
 * - Legacy HTML automatically migrated to markdown
 * - All content passes through defang pipeline
 * - Comprehensive validation and error recovery
 *
 * This module provides the data layer guardrails to ensure HTML never
 * enters the storage system at any point.
 */

import { defangToPlainText } from '../features/markdown/defangPipeline.js';
import {
  detectBrowser,
  getStorageErrorMessage,
} from '../utils/browserDetection.js';

// Storage format version for migration compatibility
const STORAGE_VERSION = '1.0.0-markdown';
const STORAGE_KEY = 'mindmeld-notes';
const MAX_CONTENT_SIZE = 10000; // 10KB per note

/**
 * Process notes for storage - ensures all content is safe markdown
 * @param {Array} notes - Array of note objects
 * @returns {Array} Processed notes safe for storage
 */
export function processNotesForStorage(notes) {
  if (!Array.isArray(notes)) {
    return [];
  }

  return notes
    .filter((note) => note && typeof note === 'object')
    .map((note) => processNoteForStorage(note))
    .filter((note) => note !== null); // Remove invalid notes
}

/**
 * Process individual note for storage
 * @param {object} note - Note object to process
 * @returns {object|null} Processed note or null if invalid
 */
function processNoteForStorage(note) {
  // Validate required fields
  if (!note.id || typeof note.id !== 'string') {
    return null;
  }

  // Ensure content is a string
  let content = note.content;
  if (content == null) {
    content = '';
  } else {
    content = String(content);
  }

  // Enforce size limits
  if (content.length > MAX_CONTENT_SIZE) {
    content = content.substring(0, MAX_CONTENT_SIZE);
  }

  // Process ALL content through defang pipeline
  // Detect if content looks like HTML and process accordingly
  const looksLikeHtml =
    content.includes('<') ||
    content.includes('>') ||
    content.includes('&lt;') ||
    content.includes('&gt;') ||
    content.includes('&amp;') ||
    content.includes('&quot;');

  const processedContent = defangToPlainText(content, looksLikeHtml);

  // Validate position
  let position = note.position;
  if (!Array.isArray(position) || position.length !== 2) {
    // Try to extract from legacy formats
    if (typeof note.left === 'string' && typeof note.top === 'string') {
      position = [parseFloat(note.left), parseFloat(note.top)];
    } else if (typeof note.left === 'number' && typeof note.top === 'number') {
      position = [note.left, note.top];
    } else if (note.p && Array.isArray(note.p) && note.p.length === 2) {
      position = [parseFloat(note.p[0]), parseFloat(note.p[1])];
    } else {
      return null; // Invalid position
    }
  }

  // Ensure position values are numbers
  position = [
    typeof position[0] === 'number' ? position[0] : parseFloat(position[0]),
    typeof position[1] === 'number' ? position[1] : parseFloat(position[1]),
  ];

  if (isNaN(position[0]) || isNaN(position[1])) {
    return null; // Invalid numeric position
  }

  return {
    id: note.id,
    content: processedContent,
    position: position,
  };
}

/**
 * Validate and clean array of notes
 * @param {Array} notes - Notes to validate
 * @returns {Array} Array of valid, clean notes
 */
export function validateAndCleanNotes(notes) {
  if (!Array.isArray(notes)) {
    return [];
  }

  return processNotesForStorage(notes);
}

/**
 * Save notes to localStorage with proper formatting
 * @param {Array} notes - Notes to save
 * @returns {boolean} Success status
 */
export function saveNotesToStorage(notes) {
  try {
    const processedNotes = processNotesForStorage(notes);

    const storageData = {
      version: STORAGE_VERSION,
      timestamp: new Date().toISOString(),
      notes: processedNotes,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
    return true;
  } catch (error) {
    // Enhanced error handling with browser-specific messaging
    const browserInfo = detectBrowser();
    let isPrivateMode = false;

    // Try to detect private mode synchronously for error reporting
    try {
      const testKey = 'mindmeld-private-test';
      localStorage.setItem(testKey, 'test');
      if (localStorage.getItem(testKey) !== 'test') {
        isPrivateMode = true;
      } else {
        localStorage.removeItem(testKey);
      }
    } catch {
      isPrivateMode = true;
    }

    const userFriendlyMessage = getStorageErrorMessage(
      error,
      browserInfo,
      isPrivateMode,
    );
    console.warn('Failed to save to localStorage:', userFriendlyMessage);
    return false;
  }
}

/**
 * Load notes from localStorage with validation
 * @returns {object} {notes: Array, recovered: boolean}
 */
export function loadNotesFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { notes: [], recovered: false };
    }

    const data = JSON.parse(stored);
    if (!data || !Array.isArray(data.notes)) {
      return { notes: [], recovered: false };
    }

    // Process loaded notes through validation pipeline
    const validNotes = validateAndCleanNotes(data.notes);

    return {
      notes: validNotes,
      recovered: true,
    };
  } catch (error) {
    // Enhanced error handling with browser-specific messaging for load failures
    const browserInfo = detectBrowser();
    let isPrivateMode = false;

    // Try to detect private mode for better error context
    try {
      const testKey = 'mindmeld-load-test';
      localStorage.setItem(testKey, 'test');
      if (localStorage.getItem(testKey) !== 'test') {
        isPrivateMode = true;
      } else {
        localStorage.removeItem(testKey);
      }
    } catch {
      isPrivateMode = true;
    }

    const userFriendlyMessage = getStorageErrorMessage(
      error,
      browserInfo,
      isPrivateMode,
    );
    console.warn('Failed to load from localStorage:', userFriendlyMessage);
    return { notes: [], recovered: false };
  }
}

/**
 * Export notes to JSON format (markdown-only)
 * @param {Array} notes - Notes to export
 * @returns {string} JSON export string
 */
export function exportToJson(notes) {
  const processedNotes = processNotesForStorage(notes);

  const exportData = {
    version: STORAGE_VERSION,
    exportDate: new Date().toISOString(),
    noteCount: processedNotes.length,
    notes: processedNotes,
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Export notes to CSV format (markdown-only)
 * @param {Array} notes - Notes to export
 * @returns {string} CSV export string
 */
export function exportToCsv(notes) {
  const processedNotes = processNotesForStorage(notes);

  const headers = ['id', 'content', 'x', 'y'];
  const csvRows = [headers.join(',')];

  processedNotes.forEach((note) => {
    const row = [
      `"${note.id}"`,
      `"${note.content.replace(/"/g, '""')}"`, // Escape quotes
      note.position[0],
      note.position[1],
    ];
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
}

/**
 * Process imported data through defang pipeline
 * @param {object} importedData - Data from import (JSON/CSV)
 * @returns {object} Processed data safe for storage
 */
export function processImportedData(importedData) {
  if (!importedData || !Array.isArray(importedData.notes)) {
    return { notes: [] };
  }

  const processedNotes = processNotesForStorage(importedData.notes);

  return {
    notes: processedNotes,
    version: STORAGE_VERSION,
    importDate: new Date().toISOString(),
  };
}

/**
 * Clear all stored data
 */
export function clearStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    // Enhanced error handling for clear operation
    const browserInfo = detectBrowser();
    const userFriendlyMessage = getStorageErrorMessage(
      error,
      browserInfo,
      false,
    );
    console.warn('Failed to clear localStorage:', userFriendlyMessage);
    return false;
  }
}

/**
 * Get storage statistics
 * @returns {object} Storage stats
 */
export function getStorageStats() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { hasData: false, size: 0, noteCount: 0 };
    }

    const data = JSON.parse(stored);
    return {
      hasData: true,
      size: stored.length,
      noteCount: Array.isArray(data.notes) ? data.notes.length : 0,
      version: data.version || 'unknown',
      lastModified: data.timestamp || null,
    };
  } catch (error) {
    return { hasData: false, size: 0, noteCount: 0, error: error.message };
  }
}
