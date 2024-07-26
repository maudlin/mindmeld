// zoomManager.js

import { debounce } from './utils.js';
import { ZOOM_LEVELS, CANVAS_DIMENSIONS } from './constants.js';

let zoomLevel = ZOOM_LEVELS.DEFAULT;
const zoomMin = ZOOM_LEVELS.MIN;
const zoomMax = ZOOM_LEVELS.MAX;

let isPanning = false;
let startX, startY;
let initialPositionApplied = false;

export function getZoomLevel() {
  return zoomLevel;
}

export function setZoomLevel(newZoomLevel) {
  zoomLevel = Math.max(zoomMin, Math.min(zoomMax, newZoomLevel));
}

function positionCanvas(canvasContainer, canvas) {
  const containerRect = canvasContainer.getBoundingClientRect();
  const scale = zoomLevel / ZOOM_LEVELS.DEFAULT;

  const canvasWidth = CANVAS_DIMENSIONS.WIDTH;
  const canvasHeight = CANVAS_DIMENSIONS.HEIGHT;

  const scaledWidth = canvasWidth * scale;
  const scaledHeight = canvasHeight * scale;

  let left = (containerRect.width - scaledWidth) / 2;
  let top = (containerRect.height - scaledHeight) / 2;

  // Ensure the canvas doesn't position beyond the top-left corner
  left = Math.max(0, left);
  top = Math.max(0, top);

  canvas.style.transform = `translate(${left}px, ${top}px) scale(${scale})`;
  canvas.style.transformOrigin = 'top left';

  if (!initialPositionApplied) {
    // Force a reflow to ensure the positioning is applied immediately
    canvas.offsetHeight;
    initialPositionApplied = true;
  }
}

function handleZoom(event, canvas, canvasContainer, zoomDisplay) {
  event.preventDefault();

  const oldZoom = zoomLevel;
  const rect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;

  // Calculate new zoom level
  if (event.deltaY < 0 && zoomLevel < zoomMax) {
    zoomLevel++;
  } else if (event.deltaY > 0 && zoomLevel > zoomMin) {
    zoomLevel--;
  }

  // If zoom level didn't change, don't proceed
  if (oldZoom === zoomLevel) return;

  const newScale = zoomLevel / ZOOM_LEVELS.DEFAULT;
  const oldScale = oldZoom / ZOOM_LEVELS.DEFAULT;

  // Calculate how much the canvas should move to keep the mouse point stable
  const dx = (mouseX / oldScale) * (newScale - oldScale);
  const dy = (mouseY / oldScale) * (newScale - oldScale);

  // Get current transform values
  const transform = new DOMMatrix(window.getComputedStyle(canvas).transform);
  const currentX = transform.e;
  const currentY = transform.f;

  // Apply new transform
  canvas.style.transform = `translate(${currentX - dx}px, ${
    currentY - dy
  }px) scale(${newScale})`;
  canvas.style.transformOrigin = 'top left';

  updateZoomDisplay(zoomDisplay);
}

function updateZoomDisplay(zoomDisplay) {
  zoomDisplay.textContent = `${zoomLevel}x`;
}

function startPanning(event) {
  if (event.button === 2) {
    // Right-click
    event.preventDefault();
    isPanning = true;
    startX = event.clientX - event.currentTarget.offsetLeft;
    startY = event.clientY - event.currentTarget.offsetTop;
  }
}

function pan(event) {
  if (isPanning) {
    event.preventDefault();
    const canvas = event.currentTarget.querySelector('#canvas');
    const x = event.clientX - event.currentTarget.offsetLeft;
    const y = event.clientY - event.currentTarget.offsetTop;
    const dx = x - startX;
    const dy = y - startY;

    const transform = new DOMMatrix(window.getComputedStyle(canvas).transform);
    canvas.style.transform = `translate(${transform.e + dx}px, ${
      transform.f + dy
    }px) scale(${transform.a})`;

    startX = x;
    startY = y;
  }
}

function stopPanning() {
  isPanning = false;
}

export function setupZoomAndPan(canvasContainer, canvas, zoomDisplay) {
  const debouncedHandleZoom = debounce((event) => {
    handleZoom(event, canvas, canvasContainer, zoomDisplay);
  }, 16);

  canvasContainer.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      debouncedHandleZoom(event);
    },
    { passive: false },
  );

  // Prevent scrolling on the document when the mouse is over the canvas
  document.body.addEventListener(
    'wheel',
    (event) => {
      if (
        event.target === canvasContainer ||
        canvasContainer.contains(event.target)
      ) {
        event.preventDefault();
      }
    },
    { passive: false },
  );

  // Panning functionality
  canvasContainer.addEventListener('mousedown', startPanning);
  canvasContainer.addEventListener('mousemove', pan);
  canvasContainer.addEventListener('mouseup', stopPanning);
  canvasContainer.addEventListener('mouseleave', stopPanning);

  // Prevent default context menu
  canvasContainer.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });

  function initialPosition() {
    if (!initialPositionApplied) {
      zoomLevel = ZOOM_LEVELS.DEFAULT;
      positionCanvas(canvasContainer, canvas);
      updateZoomDisplay(zoomDisplay);
    }
  }

  // Call initial positioning immediately
  initialPosition();

  // Also call it when the window has fully loaded
  window.addEventListener('load', initialPosition);

  // Reposition on window resize
  window.addEventListener('resize', () => {
    positionCanvas(canvasContainer, canvas);
  });
}
