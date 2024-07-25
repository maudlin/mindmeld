// zoomManager.js
let zoomLevel = 5;
const zoomMin = 1;
const zoomMax = 5;
let isPanning = false;
let startX, startY;

export function getZoomLevel() {
  return zoomLevel;
}

export function setZoomLevel(newZoomLevel) {
  zoomLevel = Math.max(zoomMin, Math.min(zoomMax, newZoomLevel));
}

function handleZoom(event, canvas, canvasContainer, zoomDisplay) {
  event.preventDefault();

  const oldZoom = zoomLevel;
  const deltaY = event.deltaY;

  // Calculate new zoom level
  if (deltaY < 0 && zoomLevel < zoomMax) {
    zoomLevel += 1;
  } else if (deltaY > 0 && zoomLevel > zoomMin) {
    zoomLevel -= 1;
  }

  // Update the zoom display
  zoomDisplay.textContent = `${zoomLevel}x`;

  // Calculate zoom scale factor
  const scale = zoomLevel / 5;

  // Apply the new zoom scale
  canvas.style.transform = `translate(-50%, -50%) scale(${scale})`;

  // Adjust scroll position to zoom towards mouse position
  const mouseX = event.clientX - canvasContainer.offsetLeft;
  const mouseY = event.clientY - canvasContainer.offsetTop;

  const zoomFactor = scale / (oldZoom / 5);

  canvasContainer.scrollLeft =
    mouseX + (canvasContainer.scrollLeft - mouseX) * zoomFactor;
  canvasContainer.scrollTop =
    mouseY + (canvasContainer.scrollTop - mouseY) * zoomFactor;
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
    const x = event.clientX - event.currentTarget.offsetLeft;
    const y = event.clientY - event.currentTarget.offsetTop;
    event.currentTarget.scrollLeft += startX - x;
    event.currentTarget.scrollTop += startY - y;
    startX = x;
    startY = y;
  }
}

function stopPanning() {
  isPanning = false;
}

export function setupZoomAndPan(canvasContainer, canvas, zoomDisplay) {
  canvasContainer.addEventListener('wheel', (event) => {
    handleZoom(event, canvas, canvasContainer, zoomDisplay);
  });

  canvasContainer.addEventListener('mousedown', startPanning);
  canvasContainer.addEventListener('mousemove', pan);
  canvasContainer.addEventListener('mouseup', stopPanning);
  canvasContainer.addEventListener('mouseleave', stopPanning);

  canvasContainer.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });

  // Initial centering
  const scale = zoomLevel / 5;
  canvas.style.transform = `translate(-50%, -50%) scale(${scale})`;
}
