// config.js
export default {
  canvasSize: {
    width: 7680,
    height: 4320,
  },
  zoomLevels: {
    min: 1,
    max: 5,
    default: 5,
  },
  noteSize: {
    width: 150,
    padding: 10,
  },
  // Canvas templates temporarily disabled for V1 simplification
  // See CANVAS_TEMPLATES_REMOVAL.md for restoration instructions
  defaultCanvasType: 'Standard Canvas',
};
