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
      path: '../features/canvas/templates/standardCanvas/standardCanvas.js',
    },
    herosJourney: {
      name: "Hero's Journey",
      path: '../features/canvas/templates/herosJourney/herosJourneyCanvas.js',
    },
    nowNextFuture: {
      name: 'Now/Next/Future',
      path: '../features/canvas/templates/nowNextFuture/nowNextFutureCanvas.js',
    },
    wardleyMap: {
      name: 'Wardley Map',
      path: '../features/canvas/templates/wardleyMap/wardleyMapCanvas.js',
    },
    // Add other canvas types here
  },
};
