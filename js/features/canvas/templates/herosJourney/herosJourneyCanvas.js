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

  createBackgroundLayout() {
    const layout = super.createBackgroundLayout();
    layout.classList.add('heros-journey');
    layout.style.backgroundColor = '#fffcf8';

    STAGES.forEach((stage, index) => {
      const box = document.createElement('div');
      box.className = 'journey-stage';
      box.style.left = `${index * 1150 + 150}px`;
      box.style.top = '100px';

      const heading = document.createElement('h3');
      heading.textContent = stage;

      box.appendChild(heading);
      layout.appendChild(box);
    });

    return layout;
  }
}

export default HerosJourneyCanvas;
