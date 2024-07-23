// utils.js

/**
 * Calculates the offset position of the note relative to the canvas.
 * @param {HTMLElement} canvas - The canvas element.
 * @param {MouseEvent} event - The mouse event.
 * @param {HTMLElement} note - The note element (optional).
 * @returns {Object} - An object containing the left and top positions.
 */
export function calculateOffsetPosition(canvas, event, note = null) {
  const canvasRect = canvas.getBoundingClientRect();
  const noteWidth = note ? note.offsetWidth : 0;
  const noteHeight = note ? note.offsetHeight : 0;

  const leftPosition = event.clientX - noteWidth / 2;
  const topPosition = event.clientY - noteHeight / 2 - canvasRect.y;

  return {
    left: leftPosition,
    top: topPosition,
  };
}
