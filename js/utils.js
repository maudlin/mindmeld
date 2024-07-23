// utils.js

/**
 * Calculates the offset position of the note or connector handle relative to the canvas.
 * @param {HTMLElement} canvas - The canvas element.
 * @param {MouseEvent} event - The mouse event.
 * @param {HTMLElement} element - The note or connector handle element (optional).
 * @returns {Object} - An object containing the left and top positions.
 */
export function calculateOffsetPosition(canvas, event, element = null) {
  const canvasRect = canvas.getBoundingClientRect();
  const elementWidth = element ? element.offsetWidth : 0;
  const elementHeight = element ? element.offsetHeight : 0;

  const leftPosition =
    event.clientX - canvasRect.left + (element ? elementWidth / 2 : 0);
  const topPosition =
    event.clientY - canvasRect.top + (element ? elementHeight / 2 : 0);

  return {
    left: leftPosition,
    top: topPosition,
  };
}
