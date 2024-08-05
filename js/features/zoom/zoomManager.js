// zoomManager.js

import { debounce, log } from '../../utils/utils.js';
import config from '../../core/config.js';

let zoomLevel = config.zoomLevels.default;
const zoomMin = config.zoomLevels.min;
const zoomMax = config.zoomLevels.max;

let isPanning = false;
let startX, startY;
let isInitialPositionSet = false;

export function getZoomLevel() {
  return zoomLevel;
}

export function setZoomLevel(newZoomLevel) {
  zoomLevel = Math.max(zoomMin, Math.min(zoomMax, newZoomLevel));
}

function setInitialCanvasPosition(canvasContainer, canvas) {
  const containerRect = canvasContainer.getBoundingClientRect();
  const scale = zoomLevel / 5;

  // Calculate the desired center position
  const desiredCenterX =
    (containerRect.width - canvas.width * scale) / 2 / scale;
  const desiredCenterY =
    (containerRect.height - canvas.height * scale) / 2 / scale;

  console.log('Initial position calculation:', {
    containerWidth: containerRect.width,
    containerHeight: containerRect.height,
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    scale,
    desiredCenterX,
    desiredCenterY,
  });

  // Apply the initial transform
  canvas.style.transform = `translate(${desiredCenterX}px, ${desiredCenterY}px) scale(${scale})`;
  console.log('Applied initial transform:', canvas.style.transform);

  isInitialPositionSet = true;
}

function positionCanvas(canvasContainer, canvas) {
  console.log('Positioning canvas:', {
    containerWidth: canvasContainer.clientWidth,
    containerHeight: canvasContainer.clientHeight,
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    zoomLevel: zoomLevel,
  });

  const containerRect = canvasContainer.getBoundingClientRect();
  const scale = zoomLevel / 5;

  let left = (containerRect.width - canvas.width * scale) / 2 / scale;
  let top = (containerRect.height - canvas.height * scale) / 2 / scale;

  // Ensure canvas doesn't go out of bounds
  left = Math.min(
    Math.max(left, (containerRect.width - canvas.width * scale) / scale),
    0,
  );
  top = Math.min(
    Math.max(top, (containerRect.height - canvas.height * scale) / scale),
    0,
  );

  canvas.style.transform = `translate(${left}px, ${top}px) scale(${scale})`;
  console.log('New canvas position:', {
    left,
    top,
    scale,
    transform: canvas.style.transform,
  });
}

function handleZoom(event, canvas, canvasContainer, zoomDisplay) {
  log('Zoom event. Current level:', zoomLevel);
  event.preventDefault();

  const oldZoom = zoomLevel;
  const rect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;

  // Calculate new zoom level
  if (event.deltaY < 0 && zoomLevel < config.zoomLevels.max) {
    log('Zooming in');
    zoomLevel++;
  } else if (event.deltaY > 0 && zoomLevel > config.zoomLevels.min) {
    log('Zooming out');
    zoomLevel--;
  }

  // If zoom level didn't change, don't proceed
  if (oldZoom === zoomLevel) {
    log(`Zoom level unchanged: ${zoomLevel}`);
    return;
  } else if (oldZoom !== zoomLevel) {
    log(`Zoom level changed from ${oldZoom} to ${zoomLevel}`);
  }

  const newScale = zoomLevel / config.zoomLevels.default;
  const oldScale = oldZoom / config.zoomLevels.default;

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

  log(
    `New transform applied: translate(${currentX - dx}px, ${
      currentY - dy
    }px) scale(${newScale})`,
  );

  updateZoomDisplay(zoomDisplay);
}

function updateZoomDisplay(zoomDisplay) {
  zoomDisplay.textContent = `${zoomLevel}x`;
}

function startPanning(event) {
  if (event.button === 2) {
    // Right-click
    //log('Starting panning');
    event.preventDefault();
    isPanning = true;
    startX = event.clientX - event.currentTarget.offsetLeft;
    startY = event.clientY - event.currentTarget.offsetTop;
  }
}

function pan(event) {
  if (isPanning) {
    //log('Panning');
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
    //log(`Panned: dx=${dx}, dy=${dy}`);

    startX = x;
    startY = y;
  }
}

function stopPanning() {
  if (isPanning) {
    //log('Stopping panning');
    isPanning = false;
  }
}

function logResizeDetails(canvasContainer, canvas) {
  log(`Window inner dimensions: ${window.innerWidth}x${window.innerHeight}`);
  log(
    `Document dimensions: ${document.documentElement.clientWidth}x${document.documentElement.clientHeight}`,
  );
  log(
    `Body dimensions: ${document.body.clientWidth}x${document.body.clientHeight}`,
  );
  log(
    `Canvas container dimensions: ${canvasContainer.clientWidth}x${canvasContainer.clientHeight}`,
  );
  log(`Canvas dimensions: ${canvas.clientWidth}x${canvas.clientHeight}`);
}

function monitorCanvasPosition(canvas) {
  // MutationObserver to watch for style changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (
        mutation.type === 'attributes' &&
        mutation.attributeName === 'style'
      ) {
        // log(`Canvas style changed: ${canvas.style.cssText}`);
      }
    });
  });

  observer.observe(canvas, { attributes: true, attributeFilter: ['style'] });

  // Periodic check of canvas position
  let checkCount = 0;
  const maxChecks = 50; // Check for 5 seconds (50 * 100ms)
  const intervalId = setInterval(() => {
    checkCount++;
    if (checkCount >= maxChecks) {
      clearInterval(intervalId);
      observer.disconnect();
      //log('Extended canvas monitoring complete');
    }
  }, 100);
}

export function setupZoomAndPan(canvasContainer, canvas, zoomDisplay) {
  // Remove existing event listeners if any
  canvasContainer.removeEventListener('wheel', handleZoom);

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

  positionCanvas(canvasContainer, canvas);

  window.addEventListener('resize', () => {
    log('Window resize event triggered');
    positionCanvas(canvasContainer, canvas);
  });

  //Log initial dimensions
  log('Initial dimensions:');
  logResizeDetails(canvasContainer, canvas);

  log('Setting up zoom and pan');

  canvasContainer.addEventListener(
    'wheel',
    (event) => {
      log('Wheel event on canvas container');
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
        //log('Preventing scroll on document body');
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
    //log('Preventing context menu');
    event.preventDefault();
  });

  // Set initial position immediately
  log('Setting initial canvas position');
  setInitialCanvasPosition(canvasContainer, canvas);

  // Update zoom display
  log('Updating initial zoom display');
  updateZoomDisplay(zoomDisplay);

  // Reposition on window resize
  log('Window resized, repositioning canvas');
  window.addEventListener('resize', () => {
    positionCanvas(canvasContainer, canvas);
  });

  // Ensure correct positioning after all resources are loaded
  window.addEventListener('load', () => {
    log('Window loaded, ensuring correct positioning');
    positionCanvas(canvasContainer, canvas);
  });
  //log('Setting up extended canvas monitoring');
  monitorCanvasPosition(canvas, canvasContainer);

  //log('Zoom and pan setup complete');
}

export function resetZoomLevel() {
  zoomLevel = config.zoomLevels.default;
  console.log('Zoom level reset to:', zoomLevel);
}
