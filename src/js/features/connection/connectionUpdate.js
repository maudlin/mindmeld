// src/js/features/connection/connectionUpdate.js

export class ConnectionUpdate {
  constructor(connectionManager) {
    this.connectionManager = connectionManager;
  }

  updateConnections(noteOrGroup) {
    const updateSingle = (group) => {
      const [startNote, endNote, path, hotspot, contextMenuElement] = [
        document.getElementById(group.dataset.start),
        document.getElementById(group.dataset.end),
        group.querySelector('path'),
        group.querySelector('circle'),
        group.querySelector('.context-menu'),
      ];

      if (startNote && endNote && path && hotspot && contextMenuElement) {
        const points = this.connectionManager.getClosestPoints(
          startNote,
          endNote,
        );
        this.updateConnectionPath(
          path,
          points.x1,
          points.y1,
          points.x2,
          points.y2,
          group.dataset.type || this.connectionManager.CONNECTION_TYPES.NONE,
        );

        const hotspotX = (points.x1 + points.x2) / 2;
        const hotspotY = (points.y1 + points.y2) / 2;

        // Batch DOM updates
        requestAnimationFrame(() => {
          hotspot.setAttribute('cx', hotspotX);
          hotspot.setAttribute('cy', hotspotY);
          contextMenuElement.setAttribute(
            'transform',
            `translate(${hotspotX}, ${hotspotY})`,
          );

          const backgroundLine = group.querySelector(
            '.connector-background-line',
          );
          if (backgroundLine) {
            backgroundLine.setAttribute('x1', hotspotX);
            backgroundLine.setAttribute('y1', hotspotY - 10);
            backgroundLine.setAttribute('x2', hotspotX);
            backgroundLine.setAttribute('y2', hotspotY + 10);
          }
        });

        group.appendChild(contextMenuElement);
      } else {
        if (group.parentNode) {
          group.remove();
        }
      }
    };

    // Use more efficient selectors and avoid unnecessary updates
    if (noteOrGroup instanceof Element) {
      if (noteOrGroup.classList.contains('note')) {
        const connections = document.querySelectorAll(
          `g[data-start="${noteOrGroup.id}"], g[data-end="${noteOrGroup.id}"]`,
        );
        connections.forEach(updateSingle);
      } else if (noteOrGroup.tagName.toLowerCase() === 'g') {
        updateSingle(noteOrGroup);
      }
    } else {
      const connections = document.querySelectorAll('g[data-start]');
      connections.forEach(updateSingle);
    }
  }

  updateConnectionPath(path, x1, y1, x2, y2, type) {
    if (
      typeof x1 !== 'number' ||
      typeof y1 !== 'number' ||
      typeof x2 !== 'number' ||
      typeof y2 !== 'number'
    ) {
      console.log('Invalid coordinates for path:', { x1, y1, x2, y2 });
      return;
    }

    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    const dAttr = `M${x1},${y1} Q${midX},${midY} ${x2},${y2}`;
    path.setAttribute('d', dAttr);

    let markerStart = '';
    let markerEnd = '';

    switch (type) {
      case this.connectionManager.CONNECTION_TYPES.UNI_FORWARD:
        markerEnd = 'url(#arrow-end)';
        break;
      case this.connectionManager.CONNECTION_TYPES.UNI_BACKWARD:
        markerStart = 'url(#arrow-start)';
        break;
      case this.connectionManager.CONNECTION_TYPES.BI:
        markerStart = 'url(#arrow-start)';
        markerEnd = 'url(#arrow-end)';
        break;
      case this.connectionManager.CONNECTION_TYPES.NONE:
        // No markers for non-directional
        break;
    }

    path.setAttribute('marker-start', markerStart);
    path.setAttribute('marker-end', markerEnd);
  }
}
