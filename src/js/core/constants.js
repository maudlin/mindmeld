// src/js/core/constants.js
export const LOGGING = true; // Default value for logging

export const DOM_SELECTORS = {
  CANVAS: '#canvas',
  CANVAS_CONTAINER: '#canvas-container',
  SVG_CONTAINER: '#svg-container',
  NOTE: '.note',
  SELECTED_NOTE: '.note.selected',
  GHOST_CONNECTOR: '.ghost-connector',
};

export const EVENT_TYPES = {
  NOTE_CREATED: 'noteCreated',
  NOTE_MOVED: 'noteMoved',
  NOTE_DELETED: 'noteDeleted',
};

export const NOTE_CONTENT_LIMIT = 200;

export const STORAGE_KEY = 'mindmeld_state';
export const BACKUP_INTERVAL = 60000; // 1 minute
