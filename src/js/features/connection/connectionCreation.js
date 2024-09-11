// src/js/features/connection/connectionCreation.js
import { log } from '../../utils/utils.js';

export class ConnectionCreation {
  constructor(connectionManager) {
    this.connectionManager = connectionManager;
  }

  initializeSVGContainer(canvas) {
    let svgContainer = document.getElementById('svg-container');
    if (!svgContainer) {
      svgContainer = this.connectionManager.createSVGElement('svg', {
        id: 'svg-container',
        style:
          'position:absolute; top:0; left:0; width:100%; height:100%; z-index:0; pointer-events:none;',
      });
      canvas.appendChild(svgContainer);
    }

    // Clear existing content
    svgContainer.innerHTML = '';

    // Add arrow markers
    const [startMarker, endMarker] =
      this.connectionManager.createArrowMarkers();
    svgContainer.appendChild(startMarker);
    svgContainer.appendChild(endMarker);

    return svgContainer;
  }

  createConnection(
    fromId,
    toId,
    type = this.connectionManager.CONNECTION_TYPES.NONE,
  ) {
    const svgContainer = document.getElementById('svg-container');
    const group = this.connectionManager.createSVGElement('g', {
      'data-start': fromId,
      'data-end': toId,
      'data-type': type,
    });

    const path = this.connectionManager.createSVGElement('path', {
      stroke: this.connectionManager.STROKE_COLOR,
      'stroke-width': this.connectionManager.STROKE_WIDTH,
      'stroke-dasharray': this.connectionManager.STROKE_DASHARRAY,
      fill: 'none',
    });

    const hotspot = this.connectionManager.createSVGElement('circle', {
      r: '5',
      fill: '#fff',
      stroke: this.connectionManager.STROKE_COLOR,
      'stroke-width': this.connectionManager.STROKE_WIDTH,
      class: 'connector-hotspot',
    });

    const contextMenuElement = this.connectionManager.contextMenu.createMenu();
    contextMenuElement.style.display = 'none';

    group.appendChild(path);
    group.appendChild(hotspot);
    group.appendChild(contextMenuElement);
    svgContainer.appendChild(group);

    this.connectionManager.throttledUpdateConnections(group);
    log('Connection created:', { fromId, toId, type });

    return group;
  }

  createConnectionGroup(event, canvas, svgContainer) {
    const { left: startX, top: startY } =
      this.connectionManager.calculateOffsetPosition(
        canvas,
        event,
        event.target,
      );
    const group = this.connectionManager.createSVGElement('g');

    // Add the background line
    const backgroundLine = this.connectionManager.createSVGElement('line', {
      x1: startX,
      y1: startY - 10, // Extend 10px above
      x2: startX,
      y2: startY + 10, // Extend 10px below
      stroke: '#ccc',
      'stroke-width': '1', // Fine line
      class: 'connector-background-line',
    });

    const path = this.connectionManager.createSVGElement('path', {
      stroke: this.connectionManager.STROKE_COLOR,
      'stroke-width': this.connectionManager.STROKE_WIDTH,
      'stroke-dasharray': this.connectionManager.STROKE_DASHARRAY,
      fill: 'none',
      d: `M${startX},${startY} L${startX},${startY}`,
    });

    const hotspot = this.connectionManager.createSVGElement('circle', {
      cx: startX,
      cy: startY,
      r: '4',
      fill: '#fff',
      stroke: this.connectionManager.STROKE_COLOR,
      'stroke-width': this.connectionManager.STROKE_WIDTH,
      class: 'connector-hotspot',
    });

    const contextMenuElement =
      this.connectionManager.contextMenu.createMenu(group);
    contextMenuElement.style.display = 'none';
    contextMenuElement.setAttribute(
      'transform',
      `translate(${startX}, ${startY})`,
    );

    group.appendChild(backgroundLine);
    group.appendChild(path);
    group.appendChild(hotspot);
    group.appendChild(contextMenuElement);
    svgContainer.appendChild(group);

    return {
      path,
      hotspot,
      contextMenu: contextMenuElement,
      group,
      startX,
      startY,
      backgroundLine,
    };
  }

  // ... (other creation-related methods)
}
