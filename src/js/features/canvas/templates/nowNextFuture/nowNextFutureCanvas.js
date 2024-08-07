import { CanvasModule } from '../../../../core/canvasModule.js';

class NowNextFutureCanvas extends CanvasModule {
  constructor() {
    super(
      'Now/Next/Future',
      800, // width: 3 columns * 150px + padding
      1200, // height: 20 notes * 100px height + padding
      './js/features/canvas/templates/nowNextFuture/nowNextFutureCanvas.css',
    );
  }

  createBackgroundLayout() {
    const layout = super.createBackgroundLayout();
    layout.classList.add('now-next-future');

    // Create columns
    const columns = ['Now', 'Next', 'Future'];
    columns.forEach((col) => {
      const columnElement = document.createElement('div');
      columnElement.className = `column ${col.toLowerCase()}`;

      const heading = document.createElement('h3');
      heading.textContent = col;
      columnElement.appendChild(heading);

      layout.appendChild(columnElement);
    });

    return layout;
  }
}

export default NowNextFutureCanvas;
