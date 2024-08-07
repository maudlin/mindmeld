import { debounce, log } from '../../utils/utils.js';
import config from '../../core/config.js';

let zoomLevel = config.zoomLevels.default;
let isPanning = false;
let startX, startY;

export const getZoomLevel = () => zoomLevel;
export const setZoomLevel = (newLevel) => {
  zoomLevel = Math.max(
    config.zoomLevels.min,
    Math.min(config.zoomLevels.max, newLevel),
  );
};

export function setFixedZoom(level, canvas, zoomDisplay, centerX, centerY) {
  const oldZoom = getZoomLevel();
  setZoomLevel(level);
  const newZoom = getZoomLevel();

  console.log('Setting fixed zoom:', {
    level,
    centerX,
    centerY,
    oldZoom,
    newZoom,
  });

  const containerRect = canvas.parentElement.getBoundingClientRect();
  const newScale = newZoom / 5;

  // Use default center if centerX or centerY are NaN
  centerX = isNaN(centerX) ? canvas.width / 2 : centerX;
  centerY = isNaN(centerY) ? canvas.height / 2 : centerY;

  // Calculate the position to keep the center point (centerX, centerY) fixed
  const offsetX = containerRect.width / 2 - centerX * newScale;
  const offsetY = containerRect.height / 2 - centerY * newScale;

  canvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${newScale})`;

  if (zoomDisplay) {
    updateZoomDisplay(zoomDisplay);
  }

  console.log(
    `Zoom level set from ${oldZoom} to ${newZoom}, centered at (${centerX}, ${centerY})`,
  );
  console.log('New transform:', canvas.style.transform);
}

export function resetZoomLevel() {
  setZoomLevel(config.zoomLevels.min); // Set to minimum zoom (fully zoomed out)
  return getZoomLevel();
}

function positionCanvas(canvasContainer, canvas) {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  console.log('Positioning canvas:', {
    centerX,
    centerY,
    width: canvas.width,
    height: canvas.height,
  });
  setFixedZoom(getZoomLevel(), canvas, null, centerX, centerY);
}

function handleZoom(event, canvas, zoomDisplay) {
  event.preventDefault();
  const oldZoom = getZoomLevel();
  const rect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;

  // Determine new zoom level
  let newZoom;
  if (event.deltaY < 0 && oldZoom < config.zoomLevels.max) {
    newZoom = oldZoom + 1;
  } else if (event.deltaY > 0 && oldZoom > config.zoomLevels.min) {
    newZoom = oldZoom - 1;
  } else {
    newZoom = oldZoom;
  }

  if (oldZoom === newZoom) return;

  setZoomLevel(newZoom);

  const newScale = newZoom / 5;
  const oldScale = oldZoom / 5;
  const dx = (mouseX / oldScale) * (newScale - oldScale);
  const dy = (mouseY / oldScale) * (newScale - oldScale);

  const transform = new DOMMatrix(window.getComputedStyle(canvas).transform);
  const newTransform = `translate(${transform.e - dx}px, ${
    transform.f - dy
  }px) scale(${newScale})`;
  canvas.style.transform = newTransform;

  updateZoomDisplay(zoomDisplay);
  console.log(`Zoom level changed from ${oldZoom} to ${newZoom}`);
  console.log('New transform:', newTransform);
}

// function handleZoom(event, canvas, zoomDisplay) {
//   event.preventDefault();
//   const oldZoom = getZoomLevel();
//   const rect = canvas.getBoundingClientRect();
//   const mouseX = event.clientX - rect.left;
//   const mouseY = event.clientY - rect.top;

//   if (event.deltaY < 0 && getZoomLevel() < config.zoomLevels.max) {
//     setZoomLevel(getZoomLevel() + 1);
//   } else if (event.deltaY > 0 && getZoomLevel() > config.zoomLevels.min) {
//     setZoomLevel(getZoomLevel() - 1);
//   }

//   if (oldZoom === getZoomLevel()) return;

//   const newScale = getZoomLevel() / 5;
//   const oldScale = oldZoom / 5;
//   const dx = (mouseX / oldScale) * (newScale - oldScale);
//   const dy = (mouseY / oldScale) * (newScale - oldScale);

//   const transform = new DOMMatrix(window.getComputedStyle(canvas).transform);
//   canvas.style.transform = `translate(${transform.e - dx}px, ${
//     transform.f - dy
//   }px) scale(${newScale})`;

//   updateZoomDisplay(zoomDisplay);
//   console.log(`Zoom level changed from ${oldZoom} to ${getZoomLevel()}`);
// }

// function handleZoom(event, canvas, zoomDisplay) {
//   const oldZoom = getZoomLevel();
//   const zoomDirection = event.deltaY < 0 ? 1 : -1;
//   const newZoom = Math.max(
//     config.zoomLevels.min,
//     Math.min(config.zoomLevels.max, oldZoom + zoomDirection),
//   );

//   if (oldZoom !== newZoom) {
//     setZoomLevel(newZoom);
//     const rect = canvas.getBoundingClientRect();
//     const mouseX = event.clientX - rect.left;
//     const mouseY = event.clientY - rect.top;
//     setFixedZoom(newZoom, canvas, zoomDisplay, mouseX, mouseY);
//     console.log(`Zoom level changed from ${oldZoom} to ${newZoom}`);
//   }
// }

function updateZoomDisplay(zoomDisplay) {
  if (zoomDisplay) {
    zoomDisplay.textContent = `${getZoomLevel()}x`;
  }
}

function startPanning(event) {
  if (event.button === 2) {
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

let currentZoomListener = null;

export function setupZoom(canvasContainer, canvas, zoomDisplay) {
  // Remove existing zoom listener if there is one
  if (currentZoomListener) {
    canvasContainer.removeEventListener('wheel', currentZoomListener);
  }

  currentZoomListener = (event) => {
    event.preventDefault();
    handleZoom(event, canvas, zoomDisplay);
  };

  canvasContainer.addEventListener('wheel', currentZoomListener, {
    passive: false,
  });
}

export function setupPan(canvasContainer, canvas) {
  canvasContainer.addEventListener('mousedown', (event) =>
    startPanning(event, canvas),
  );
  canvasContainer.addEventListener('mousemove', (event) => pan(event, canvas));
  canvasContainer.addEventListener('mouseup', stopPanning);
  canvasContainer.addEventListener('mouseleave', stopPanning);
}

export function setupZoomAndPan(canvasContainer, canvas, zoomDisplay) {
  setupZoom(canvasContainer, canvas, zoomDisplay);
  setupPan(canvasContainer, canvas);

  // Prevent default context menu
  canvasContainer.addEventListener('contextmenu', (event) =>
    event.preventDefault(),
  );

  // Initial positioning
  positionCanvas(canvasContainer, canvas);
  updateZoomDisplay(zoomDisplay);

  // Set up window resize event
  window.addEventListener('resize', () =>
    positionCanvas(canvasContainer, canvas),
  );
}

export function removeZoomAndPan(canvasContainer) {
  if (currentZoomListener) {
    canvasContainer.removeEventListener('wheel', currentZoomListener);
    currentZoomListener = null;
  }

  // Remove pan event listeners
  canvasContainer.removeEventListener('mousedown', startPanning);
  canvasContainer.removeEventListener('mousemove', pan);
  canvasContainer.removeEventListener('mouseup', stopPanning);
  canvasContainer.removeEventListener('mouseleave', stopPanning);
}
