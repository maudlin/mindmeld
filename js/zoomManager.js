// zoomManager.js

import { debounce, log } from './utils.js';
import { ZOOM_LEVELS, CANVAS_DIMENSIONS } from './constants.js';

let zoomLevel = ZOOM_LEVELS.DEFAULT;
const zoomMin = ZOOM_LEVELS.MIN;
const zoomMax = ZOOM_LEVELS.MAX;

let isPanning = false;
let startX, startY;
let isInitialPositionSet = false;

export function getZoomLevel() {
  return zoomLevel;
}

export function setZoomLevel(newZoomLevel) {
  zoomLevel = Math.max(zoomMin, Math.min(zoomMax, newZoomLevel));
  //log(`Zoom level set to ${zoomLevel}`);
}

function setInitialCanvasPosition(canvasContainer, canvas) {
  //log('Setting initial canvas position');
  const containerRect = canvasContainer.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  const scale = ZOOM_LEVELS.DEFAULT / ZOOM_LEVELS.DEFAULT;

  // Calculate the desired center position
  const desiredCenterX = (containerRect.width - canvasRect.width) / 2;
  const desiredCenterY = (containerRect.height - canvasRect.height) / 2;

  // Apply the initial transform
  canvas.style.transform = `translate(${desiredCenterX}px, ${desiredCenterY}px) scale(${scale})`;

  //log(
  //  `Initial position set: translateX=${desiredCenterX}, translateY=${desiredCenterY}, scale=${scale}`,
  //);

  isInitialPositionSet = true;
  //log('Initial position set complete');
}

function positionCanvas(canvasContainer, canvas) {
  //log('Positioning canvas');
  if (!isInitialPositionSet) {
    //log('Initial position not set, calling setInitialCanvasPosition');
    setInitialCanvasPosition(canvasContainer, canvas);
    return;
  }

  const containerRect = canvasContainer.getBoundingClientRect();
  const scale = zoomLevel / ZOOM_LEVELS.DEFAULT;

  const currentTransform = new DOMMatrix(getComputedStyle(canvas).transform);
  const currentLeft = currentTransform.e;
  const currentTop = currentTransform.f;

  const scaledWidth = CANVAS_DIMENSIONS.WIDTH * scale;
  const scaledHeight = CANVAS_DIMENSIONS.HEIGHT * scale;

  let left = currentLeft;
  let top = currentTop;

  // Adjust position if canvas is smaller than container
  if (scaledWidth < containerRect.width) {
    left = (containerRect.width - scaledWidth) / 2;
  }
  if (scaledHeight < containerRect.height) {
    top = (containerRect.height - scaledHeight) / 2;
  }

  // Ensure canvas doesn't go out of bounds
  left = Math.min(Math.max(left, containerRect.width - scaledWidth), 0);
  top = Math.min(Math.max(top, containerRect.height - scaledHeight), 0);

  // Apply the initial transform
  canvas.style.transform = `translate(${left}px, ${top}px) scale(${scale})`;

  // Force a reflow to ensure the transform is applied
  canvas.offsetHeight;

  // Get the actual rendered position
  const renderedRect = canvas.getBoundingClientRect();

  // Calculate the adjustment needed
  const adjustX = left - (renderedRect.left - containerRect.left);
  const adjustY = top - (renderedRect.top - containerRect.top);

  // Apply the adjustment
  left += adjustX;
  top += adjustY;

  // Apply the final transform
  canvas.style.transform = `translate(${left}px, ${top}px) scale(${scale})`;

  //log(`Adjusted canvas position: left=${left}, top=${top}, scale=${scale}`);
}

function handleZoom(event, canvas, canvasContainer, zoomDisplay) {
  log('Handling zoom event');
  event.preventDefault();

  const oldZoom = zoomLevel;
  const rect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;

  // Calculate new zoom level
  if (event.deltaY < 0 && zoomLevel < zoomMax) {
    //log('Zoom level unchanged, returning');
    zoomLevel++;
  } else if (event.deltaY > 0 && zoomLevel > zoomMin) {
    zoomLevel--;
  }

  // If zoom level didn't change, don't proceed
  if (oldZoom === zoomLevel) {
    //log(`Zoom level changed from ${oldZoom} to ${zoomLevel}`);
    return;
  }

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

// function logResizeDetails(canvasContainer, canvas) {
//   log(`Window inner dimensions: ${window.innerWidth}x${window.innerHeight}`);
//   log(
//     `Document dimensions: ${document.documentElement.clientWidth}x${document.documentElement.clientHeight}`,
//   );
//   log(
//     `Body dimensions: ${document.body.clientWidth}x${document.body.clientHeight}`,
//   );
//   log(
//     `Canvas container dimensions: ${canvasContainer.clientWidth}x${canvasContainer.clientHeight}`,
//   );
//   log(`Canvas dimensions: ${canvas.clientWidth}x${canvas.clientHeight}`);
// }

function monitorCanvasPosition(canvas) {
  // MutationObserver to watch for style changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (
        mutation.type === 'attributes' &&
        mutation.attributeName === 'style'
      ) {
        //log(`Canvas style changed: ${canvas.style.cssText}`);
        //
      }
    });
  });

  observer.observe(canvas, { attributes: true, attributeFilter: ['style'] });

  // Periodic check of canvas position
  let checkCount = 0;
  const maxChecks = 50; // Check for 5 seconds (50 * 100ms)
  const intervalId = setInterval(() => {
    //
    checkCount++;
    if (checkCount >= maxChecks) {
      clearInterval(intervalId);
      observer.disconnect();
      //log('Extended canvas monitoring complete');
    }
  }, 100);
}

//function logCanvasPosition(canvas) {
//const rect = canvas.getBoundingClientRect();
//const style = window.getComputedStyle(canvas);
//log(
// `Canvas position: left=${rect.left}, top=${rect.top}, transform=${style.transform}`,
//);
//}

export function setupZoomAndPan(canvasContainer, canvas, zoomDisplay) {
  window.addEventListener('resize', () => {
    //log('Window resize event triggered');
    //logResizeDetails(canvasContainer, canvas);
    positionCanvas(canvasContainer, canvas);
  });

  // Log initial dimensions
  //log('Initial dimensions:');
  //logResizeDetails(canvasContainer, canvas);

  log('Setting up zoom and pan');
  const debouncedHandleZoom = debounce((event) => {
    handleZoom(event, canvas, canvasContainer, zoomDisplay);
  }, 16);

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
  //log('Setting initial canvas position');
  setInitialCanvasPosition(canvasContainer, canvas);

  // Update zoom display
  //log('Updating initial zoom display');
  updateZoomDisplay(zoomDisplay);

  // Reposition on window resize
  //log('Window resized, repositioning canvas');
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
