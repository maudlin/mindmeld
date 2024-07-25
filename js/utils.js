import { getZoomLevel } from './zoomManager.js';

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

  // Apply scaling to the cursor position relative to the canvas
  const leftPosition =
    (event.clientX - canvasRect.left) / scale - elementWidth / 2;
  const topPosition =
    (event.clientY - canvasRect.top) / scale - elementHeight / 2;

  console.log({
    eventClientX: event.clientX,
    eventClientY: event.clientY,
    canvasRectLeft: canvasRect.left,
    canvasRectTop: canvasRect.top,
    zoomLevel,
    scale,
    leftPosition,
    topPosition,
  });

  return {
    left: leftPosition,
    top: topPosition,
  };
}
