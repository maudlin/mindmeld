//src/js/utils/utils.js
import { NOTE_CONTENT_LIMIT } from '../core/constants.js';
/**
 * Debounces a function call.
 * Ensures the function is called only after a specified delay has passed since the last call.
 * Useful for limiting the rate of function execution, such as handling user input or resize events.
 *
 * @param {Function} func - The function to debounce.
 * @param {number} delay - The delay in milliseconds.
 * @returns {Function} - The debounced function.
 */
export function debounce(func, delay) {
  let timeoutId;

  const debounced = function (...args) {
    // Clear the previous timeout
    clearTimeout(timeoutId);
    // Set a new timeout
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };

  // Add cancel method to clear pending execution
  debounced.cancel = function () {
    clearTimeout(timeoutId);
    timeoutId = null;
  };

  return debounced;
}

/**
 * Throttles a function call.
 * Ensures the function is called at most once in a specified time period.
 * Useful for ensuring a function is called at regular intervals, such as handling scroll or continuous button clicks.
 *
 * @param {Function} func - The function to throttle.
 * @param {number} limit - The time limit in milliseconds.
 * @returns {Function} - The throttled function.
 */
export function throttle(func, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      // Call the function and set the throttle flag
      func.apply(this, args);
      inThrottle = true;
      // Reset the throttle flag after the limit period
      setTimeout(() => (inThrottle = false), limit);
    }
  };
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
