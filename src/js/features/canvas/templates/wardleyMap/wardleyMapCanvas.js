import { CanvasModule } from '../../../../core/canvasModule.js';

class WardleyMapCanvas extends CanvasModule {
  constructor() {
    super(
      'Wardley Map',
      2640, // Set your desired width
      2200, // Set your desired height
      './js/features/canvas/templates/wardleyMap/wardleyMapCanvas.css',
    );
  }

  createBackgroundLayout() {
    const layout = super.createBackgroundLayout();
    layout.classList.add('wardley-map');

    // Add SVG for axes with arrows
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    layout.appendChild(svg);

    // Create x-axis with arrow
    const xAxis = document.createElementNS(svgNS, 'line');
    xAxis.setAttribute('x1', '100');
    xAxis.setAttribute('y1', '1900');
    xAxis.setAttribute('x2', '2500');
    xAxis.setAttribute('y2', '1900');
    xAxis.setAttribute('marker-end', 'url(#arrow)');
    svg.appendChild(xAxis);

    // Create y-axis with arrow
    const yAxis = document.createElementNS(svgNS, 'line');
    yAxis.setAttribute('x1', '100');
    yAxis.setAttribute('y1', '1900');
    yAxis.setAttribute('x2', '100');
    yAxis.setAttribute('y2', '100');
    yAxis.setAttribute('marker-end', 'url(#arrow)');
    svg.appendChild(yAxis);

    // Create arrow marker definition
    const defs = document.createElementNS(svgNS, 'defs');
    const marker = document.createElementNS(svgNS, 'marker');
    marker.setAttribute('id', 'arrow');
    marker.setAttribute('markerWidth', '10');
    marker.setAttribute('markerHeight', '10');
    marker.setAttribute('refX', '6');
    marker.setAttribute('refY', '3');
    marker.setAttribute('orient', 'auto');
    const arrowPath = document.createElementNS(svgNS, 'path');
    arrowPath.setAttribute('d', 'M0,0 L0,6 L9,3 z');
    arrowPath.setAttribute('fill', 'rgba(90, 90, 90)');
    marker.appendChild(arrowPath);
    defs.appendChild(marker);
    svg.appendChild(defs);

    // Add vertical dashed separators
    const separators = [700, 1400, 2000]; // X positions for separators
    separators.forEach((position) => {
      const separator = document.createElementNS(svgNS, 'line');
      separator.setAttribute('x1', position);
      separator.setAttribute('y1', '100');
      separator.setAttribute('x2', position);
      separator.setAttribute('y2', '1900');
      separator.setAttribute('style', 'stroke: #ccc; stroke-width: 4;');
      separator.setAttribute('stroke-dasharray', '10,10');
      svg.appendChild(separator);
    });

    // Add labels for the x-axis
    const xLabels = [
      { text: 'Genesis', x: 100, y: 1950 },
      { text: 'Custom Built', x: 700, y: 1950 },
      { text: 'Product (+Rental)', x: 1400, y: 1950 },
      { text: 'Commodity (+Utility)', x: 2000, y: 1950 },
    ];
    xLabels.forEach((label) => {
      const textElement = document.createElementNS(svgNS, 'text');
      textElement.setAttribute('x', label.x);
      textElement.setAttribute('y', label.y);
      textElement.textContent = label.text;
      svg.appendChild(textElement);
    });

    // Label for x-axis
    const xAxisLabel = document.createElementNS(svgNS, 'text');
    xAxisLabel.setAttribute('x', '1300');
    xAxisLabel.setAttribute('y', '2080');
    xAxisLabel.textContent = 'Evolution';
    xAxisLabel.style.fontSize = '3em';
    xAxisLabel.style.textAnchor = 'middle';
    svg.appendChild(xAxisLabel);

    // Add labels for the y-axis
    const yLabels = [
      { text: 'Invisible', x: 20, y: 1900 },
      { text: 'Visible', x: 20, y: 250 },
    ];
    yLabels.forEach((label) => {
      const textElement = document.createElementNS(svgNS, 'text');
      textElement.setAttribute('x', label.x);
      textElement.setAttribute('y', label.y);
      textElement.textContent = label.text;
      // Apply rotation
      const rotateCenterX = label.x;
      const rotateCenterY = label.y;
      textElement.setAttribute(
        'transform',
        `rotate(-70, ${rotateCenterX}, ${rotateCenterY})`,
      );

      svg.appendChild(textElement);
    });

    // Label for y-axis
    const yAxisLabel = document.createElementNS(svgNS, 'text');
    yAxisLabel.setAttribute('x', '50');
    yAxisLabel.setAttribute('y', '1000');
    yAxisLabel.setAttribute('transform', 'rotate(-90, 50, 1000)');
    yAxisLabel.textContent = 'Value Chain';
    yAxisLabel.style.fontSize = '3em';
    yAxisLabel.style.fontFamily = 'Poppins, Arial, sans-serif';
    yAxisLabel.style.textAnchor = 'middle';
    svg.appendChild(yAxisLabel);

    return layout;
  }
}

export default WardleyMapCanvas;
