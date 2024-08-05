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
  defaultCanvasType: 'Standard Canvas',
  canvasTypes: {
    standardCanvas: {
      name: 'Standard Canvas',
      path: '/js/features/canvas/templates/standardCanvas/canvas.js',
    },
    herosJourney: {
      name: "Hero's Journey",
      path: '/js/features/canvas/templates/herosJourney/canvas.js',
    },
    // Add other canvas types here
  },
};