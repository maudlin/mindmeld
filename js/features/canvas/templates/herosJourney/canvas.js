// herosJourneyCanvas.js

import { CanvasModule } from '../../../../core/canvasModule.js';

const STAGES = [
  'The Ordinary World',
  'The Call to Adventure',
  'Refusal of the Call',
  'Meeting the Mentor',
  'Crossing the Threshold',
  'Tests, Allies, and Enemies',
  'Approach to the Inmost Cave',
  'The Ordeal',
  'Reward (Seizing the Sword)',
  'The Road Back',
  'Resurrection',
  'Return with the Elixir',
];

class HerosJourneyCanvas extends CanvasModule {
  constructor() {
    super("Hero's Journey", 14000, 1200);
  }

  render(canvas) {
    canvas.style.width = `${this.width}px`;
    canvas.style.height = `${this.height}px`;
    canvas.style.backgroundColor = '#fffcf8';
    // canvas.innerHTML = ''; // Clear existing content

    // Add link to the CSS file
    if (!document.querySelector('link[href$="herosJourney.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'css/canvas/herosJourney.css';
      document.head.appendChild(link);
    }

    STAGES.forEach((stage, index) => {
      const box = document.createElement('div');
      box.className = 'journey-stage';

      box.style.top = '100px';

      // Adjust the left position of the first box to account for the extra padding
      if (index === 0) {
        box.style.left = '150px';
      } else {
        box.style.left = `${index * 1150 + 150}px`; // Subtract 40px to account for the extra padding of the first box
      }

      const heading = document.createElement('h3');
      heading.textContent = stage;

      box.appendChild(heading);
      canvas.appendChild(box);
    });
  }
}

export default HerosJourneyCanvas;
