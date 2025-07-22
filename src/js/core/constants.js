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

// Connection type constants - extracted to break circular dependency
export const CONNECTION_TYPES = {
  NONE: 'none',
  UNI_FORWARD: 'uni-forward',
  UNI_BACKWARD: 'uni-backward',
  BI: 'bi',
};

export const CONNECTION_TYPE_MAP = {
  [CONNECTION_TYPES.NONE]: 0,
  [CONNECTION_TYPES.UNI_FORWARD]: 1,
  [CONNECTION_TYPES.UNI_BACKWARD]: 2,
  [CONNECTION_TYPES.BI]: 3,
};

export const CONNECTION_TYPE_MAP_REVERSE = new Map([
  [0, CONNECTION_TYPES.NONE],
  [1, CONNECTION_TYPES.UNI_FORWARD],
  [2, CONNECTION_TYPES.UNI_BACKWARD],
  [3, CONNECTION_TYPES.BI],
]);
