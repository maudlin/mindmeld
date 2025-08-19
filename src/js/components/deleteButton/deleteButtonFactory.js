// src/js/components/deleteButton/deleteButtonFactory.js - Delete button factory functions

import { DELETE_BUTTON_CLASSES } from './deleteButtonStyles.js';

/**
 * Creates an HTML delete button for notes
 * @param {Object} options - Configuration options
 * @param {string} options.ariaLabel - Accessibility label
 * @param {Function} options.onClick - Click handler function
 * @param {Function} options.onKeyDown - Optional keyboard handler
 * @returns {HTMLButtonElement} The created button element
 */
export function createHTMLDeleteButton({
  ariaLabel = 'Delete note',
  onClick,
  onKeyDown,
}) {
  const button = document.createElement('button');
  button.className = `${DELETE_BUTTON_CLASSES.BASE} ${DELETE_BUTTON_CLASSES.NOTE}`;
  button.setAttribute('aria-label', ariaLabel);

  // Create SVG element manually for better browser compatibility
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 20 20');
  svg.setAttribute('aria-hidden', 'true');

  // Create the cross lines
  const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line1.setAttribute('x1', '3');
  line1.setAttribute('y1', '3');
  line1.setAttribute('x2', '17');
  line1.setAttribute('y2', '17');

  const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line2.setAttribute('x1', '17');
  line2.setAttribute('y1', '3');
  line2.setAttribute('x2', '3');
  line2.setAttribute('y2', '17');

  svg.appendChild(line1);
  svg.appendChild(line2);
  button.appendChild(svg);

  // Add click handler
  if (onClick) {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick(event);
    });
  }

  // Add keyboard handler
  if (onKeyDown) {
    button.addEventListener('keydown', onKeyDown);
  } else {
    // Default keyboard handler
    button.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        button.click();
      }
    });
  }

  return button;
}

/**
 * Creates SVG delete button elements for connections
 * @param {Object} options - Configuration options
 * @param {number} options.x - X coordinate
 * @param {number} options.y - Y coordinate
 * @param {Function} options.onClick - Click handler function
 * @returns {Object} Object with circle and cross elements
 */
export function createSVGDeleteButton({ x = 0, y = 0, onClick }) {
  // Create container group
  const container = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  container.setAttribute(
    'class',
    `${DELETE_BUTTON_CLASSES.BASE} ${DELETE_BUTTON_CLASSES.CONNECTION}`,
  );
  container.setAttribute('data-type', 'delete');

  // Create background circle
  const circle = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'circle',
  );
  circle.setAttribute('r', '9');
  circle.setAttribute('cx', x);
  circle.setAttribute('cy', y);
  circle.setAttribute('class', 'shared-delete-button-background');

  // Create nested SVG matching note button size (8px x 8px)
  const nestedSvg = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'svg',
  );
  nestedSvg.setAttribute('x', x - 4); // Center the 8px SVG on the circle
  nestedSvg.setAttribute('y', y - 4);
  nestedSvg.setAttribute('width', '8');
  nestedSvg.setAttribute('height', '8');
  nestedSvg.setAttribute('viewBox', '0 0 20 20');

  // Use exact same coordinates as note button
  const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line1.setAttribute('x1', '3');
  line1.setAttribute('y1', '3');
  line1.setAttribute('x2', '17');
  line1.setAttribute('y2', '17');
  line1.setAttribute('class', 'shared-delete-button-cross');

  const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line2.setAttribute('x1', '17');
  line2.setAttribute('y1', '3');
  line2.setAttribute('x2', '3');
  line2.setAttribute('y2', '17');
  line2.setAttribute('class', 'shared-delete-button-cross');

  nestedSvg.appendChild(line1);
  nestedSvg.appendChild(line2);

  // Add elements to container
  container.appendChild(circle);
  container.appendChild(nestedSvg);

  // Add click handler only if provided
  if (onClick) {
    container.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick(event);
    });
  }

  return {
    container,
    circle,
    cross: nestedSvg,
  };
}
