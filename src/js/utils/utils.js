//src/js/utils/utils.js

import { getZoomLevel } from '../features/zoom/zoomManager.js';
import {
  NOTE_CONTENT_LIMIT,
  LOGGING as defaultLogging,
} from '../core/constants.js';

/**
 * Calculates the offset position of the note or connector handle relative to the canvas,
 * taking into account the current zoom level.
 * @param {HTMLElement} canvas - The canvas element.
 * @param {MouseEvent} event - The mouse event.
 * @param {HTMLElement} element - The note or connector handle element (optional).
 * @returns {Object} - An object containing the left and top positions.
 */
export function calculateOffsetPosition(canvas, event, element = null) {
  const zoomLevel = getZoomLevel();
  const scale = zoomLevel / 5;

  const canvasRect = canvas.getBoundingClientRect();
  const elementWidth = element ? element.offsetWidth : 0;
  const elementHeight = element ? element.offsetHeight : 0;

  const leftPosition =
    (event.clientX - canvasRect.left) / scale - elementWidth / 2;
  const topPosition =
    (event.clientY - canvasRect.top) / scale - elementHeight / 2;

  return {
    left: leftPosition,
    top: topPosition,
  };
}

/**
 * Debounces a function call.
 * @param {Function} func - The function to debounce.
 * @param {number} delay - The delay in milliseconds.
 * @returns {Function} - The debounced function.
 */
export function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

/**
 * Throttles a function call.
 * @param {Function} func - The function to throttle.
 * @param {number} limit - The time limit in milliseconds.
 * @returns {Function} - The throttled function.
 */
export function throttle(func, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function log(message, LOGGING = defaultLogging) {
  if (LOGGING) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }
}

export function truncateNoteContent(content) {
  return content.length > NOTE_CONTENT_LIMIT
    ? content.substring(0, NOTE_CONTENT_LIMIT)
    : content;
}

// Base62 encoding functions
const BASE62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const toBase62 = (num) => {
  if (num === 0) return BASE62[0];
  let encoded = '';
  while (num > 0) {
    encoded = BASE62[num % 62] + encoded;
    num = Math.floor(num / 62);
  }
  return encoded;
};

export const fromBase62 = (str) => {
  return str
    .split('')
    .reduce((acc, char) => acc * 62 + BASE62.indexOf(char), 0);
};
