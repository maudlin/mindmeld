// src/js/features/connection/connectionUtils.js
import { log } from '../../utils/utils.js';
import { getZoomLevel } from '../zoom/viewportAdapter.js';
import { CONNECTION_TYPES } from '../../core/constants.js';
import { getScaleFromZoomLevel } from '../../core/coordinates/CoordinateConfig.js';
import { getCoordinateTransform } from '../../core/coordinates/coordinateService.js';

export const STROKE_COLOR = '#888';
export const STROKE_WIDTH = '2';
export const STROKE_DASHARRAY = '5,5';

export { CONNECTION_TYPES };

export class ConnectionUtils {
  constructor() {
    this.currentZoomLevel = null;
  }

  getCurrentZoomLevel() {
    return this.currentZoomLevel !== null
      ? this.currentZoomLevel
      : getZoomLevel();
  }

  createSVGElement(type, attributes = {}) {
    const element = document.createElementNS(
      'http://www.w3.org/2000/svg',
      type,
    );
    Object.entries(attributes).forEach(([key, value]) =>
      element.setAttribute(key, value),
    );
    return element;
  }

  getClosestPoints(note1, note2) {
    if (!note1 || !note2) {
      log('Invalid notes provided to getClosestPoints');
      return { x1: 0, y1: 0, x2: 0, y2: 0 };
    }

    const scale = getScaleFromZoomLevel(this.getCurrentZoomLevel());

    // Use cached canvas rect from coordinate service
    const coordinateTransform = getCoordinateTransform();
    const canvasRect = coordinateTransform.cache.getCanvasRect();

    const [rect1, rect2] = [note1, note2].map((note) => {
      const rect = note.getBoundingClientRect();
      return {
        left: (rect.left - canvasRect.left) / scale,
        top: (rect.top - canvasRect.top) / scale,
        width: rect.width / scale,
        height: rect.height / scale,
        right: (rect.right - canvasRect.left) / scale,
        bottom: (rect.bottom - canvasRect.top) / scale,
      };
    });

    const [center1, center2] = [rect1, rect2].map((rect) => ({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    }));

    if (Math.abs(center1.x - center2.x) > Math.abs(center1.y - center2.y)) {
      return {
        x1: center1.x > center2.x ? rect1.left : rect1.right,
        y1: center1.y,
        x2: center1.x > center2.x ? rect2.right : rect2.left,
        y2: center2.y,
      };
    } else {
      return {
        x1: center1.x,
        y1: center1.y > center2.y ? rect1.top : rect1.bottom,
        x2: center2.x,
        y2: center1.y > center2.y ? rect2.bottom : rect2.top,
      };
    }
  }

  createArrowMarkers() {
    const startMarker = this.createSVGElement('marker', {
      id: 'arrow-start',
      markerWidth: '8',
      markerHeight: '5',
      refX: '0',
      refY: '2.5',
      orient: 'auto',
    });
    startMarker.innerHTML = '<path d="M8,0 L0,2.5 L8,5" fill="#666" />';

    const endMarker = this.createSVGElement('marker', {
      id: 'arrow-end',
      markerWidth: '8',
      markerHeight: '5',
      refX: '8',
      refY: '2.5',
      orient: 'auto',
    });
    endMarker.innerHTML = '<path d="M0,0 L8,2.5 L0,5" fill="#666" />';

    return [startMarker, endMarker];
  }

  connectionExists(id1, id2) {
    return (
      document.querySelector(
        `g[data-start="${id1}"][data-end="${id2}"], g[data-start="${id2}"][data-end="${id1}"]`,
      ) !== null
    );
  }
}
