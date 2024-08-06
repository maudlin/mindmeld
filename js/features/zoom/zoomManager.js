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

export function resetZoomLevel() {
  setZoomLevel(config.zoomLevels.default);
  return getZoomLevel();
}

function positionCanvas(canvasContainer, canvas) {
  const containerRect = canvasContainer.getBoundingClientRect();
  const scale = getZoomLevel() / 5;

  let left = (containerRect.width - canvas.width * scale) / 2 / scale;
  let top = (containerRect.height - canvas.height * scale) / 2 / scale;

  canvas.style.transform = `translate(${left}px, ${top}px) scale(${scale})`;
  log('Canvas positioned:', { left, top, scale });
}

function handleZoom(event, canvas, zoomDisplay) {
  event.preventDefault();
  const oldZoom = getZoomLevel();
  const rect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;

  if (event.deltaY < 0 && getZoomLevel() < config.zoomLevels.max) {
    setZoomLevel(getZoomLevel() + 1);
  } else if (event.deltaY > 0 && getZoomLevel() > config.zoomLevels.min) {
    setZoomLevel(getZoomLevel() - 1);
  }

  if (oldZoom === getZoomLevel()) return;

  const newScale = getZoomLevel() / 5;
  const oldScale = oldZoom / 5;
  const dx = (mouseX / oldScale) * (newScale - oldScale);
  const dy = (mouseY / oldScale) * (newScale - oldScale);

  const transform = new DOMMatrix(window.getComputedStyle(canvas).transform);
  canvas.style.transform = `translate(${transform.e - dx}px, ${
    transform.f - dy
  }px) scale(${newScale})`;

  updateZoomDisplay(zoomDisplay);
  log(`Zoom level changed from ${oldZoom} to ${getZoomLevel()}`);
}

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

export function setupZoomAndPan(canvasContainer, canvas, zoomDisplay) {
  const debouncedHandleZoom = debounce(
    (event) => handleZoom(event, canvas, zoomDisplay),
    16,
  );

  canvasContainer.addEventListener('wheel', debouncedHandleZoom, {
    passive: false,
  });
  canvasContainer.addEventListener('mousedown', startPanning);
  canvasContainer.addEventListener('mousemove', pan);
  canvasContainer.addEventListener('mouseup', stopPanning);
  canvasContainer.addEventListener('mouseleave', stopPanning);
  canvasContainer.addEventListener('contextmenu', (event) =>
    event.preventDefault(),
  );

  window.addEventListener('resize', () =>
    positionCanvas(canvasContainer, canvas),
  );

  positionCanvas(canvasContainer, canvas);
  updateZoomDisplay(zoomDisplay);

  log('Zoom and pan setup complete');
}
