// tests/unit/features/connection/connectionUtils.test.js

describe('ConnectionUtils', () => {
  let ConnectionUtils;
  let connectionUtils;
  let mockUtils;
  let mockZoomManager;

  beforeEach(async () => {
    // Reset modules
    jest.resetModules();

    // Create mocks
    mockUtils = {
      log: jest.fn(),
    };

    mockZoomManager = {
      getZoomLevel: jest.fn().mockReturnValue(5),
    };

    // Mock dependencies
    jest.doMock('../../../../src/js/utils/utils.js', () => mockUtils);
    jest.doMock(
      '../../../../src/js/features/zoom/zoomManager.js',
      () => mockZoomManager,
    );
    jest.doMock('../../../../src/js/core/constants.js', () => ({
      CONNECTION_TYPES: {
        NONE: 'none',
        UNI_FORWARD: 'uni-forward',
        UNI_BACKWARD: 'uni-backward',
        BI: 'bi',
      },
    }));

    // Import the module to test
    const module = await import(
      '../../../../src/js/features/connection/connectionUtils.js'
    );
    ConnectionUtils = module.ConnectionUtils;
    connectionUtils = new ConnectionUtils();
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clean up DOM
    document.body.innerHTML = '';
  });

  describe('Constructor', () => {
    it('should initialize with null zoom level', () => {
      expect(connectionUtils.currentZoomLevel).toBe(null);
    });
  });

  describe('Zoom Level Management', () => {
    it('should get zoom level from cache when available', () => {
      connectionUtils.currentZoomLevel = 3;
      expect(connectionUtils.getCurrentZoomLevel()).toBe(3);
      expect(mockZoomManager.getZoomLevel).not.toHaveBeenCalled();
    });

    it('should get zoom level from zoom manager when cache is null', () => {
      connectionUtils.currentZoomLevel = null;
      expect(connectionUtils.getCurrentZoomLevel()).toBe(5);
      expect(mockZoomManager.getZoomLevel).toHaveBeenCalled();
    });
  });

  describe('SVG Element Creation', () => {
    it('should create SVG element with correct namespace', () => {
      const element = connectionUtils.createSVGElement('path');

      expect(element.tagName.toLowerCase()).toBe('path');
      expect(element.namespaceURI).toBe('http://www.w3.org/2000/svg');
    });

    it('should set attributes on SVG element', () => {
      const attributes = {
        stroke: 'red',
        'stroke-width': '3',
        fill: 'none',
        d: 'M0,0 L100,100',
      };

      const element = connectionUtils.createSVGElement('path', attributes);

      Object.entries(attributes).forEach(([key, value]) => {
        expect(element.getAttribute(key)).toBe(value);
      });
    });

    it('should create element without attributes', () => {
      const element = connectionUtils.createSVGElement('circle');

      expect(element.tagName.toLowerCase()).toBe('circle');
      expect(element.attributes.length).toBe(0);
    });

    it('should handle complex SVG elements', () => {
      const element = connectionUtils.createSVGElement('marker', {
        id: 'arrow-end',
        markerWidth: '10',
        markerHeight: '7',
        refX: '10',
        refY: '3.5',
        orient: 'auto',
      });

      expect(element.tagName.toLowerCase()).toBe('marker');
      expect(element.getAttribute('id')).toBe('arrow-end');
      expect(element.getAttribute('markerWidth')).toBe('10');
      expect(element.getAttribute('orient')).toBe('auto');
    });
  });

  describe('Closest Points Calculation', () => {
    beforeEach(() => {
      // Mock canvas element
      const mockCanvas = {
        getBoundingClientRect: jest.fn().mockReturnValue({
          left: 0,
          top: 0,
          width: 800,
          height: 600,
        }),
      };

      // Mock getElementById to return the mock canvas
      jest.spyOn(document, 'getElementById').mockReturnValue(mockCanvas);
    });

    it('should calculate closest points for horizontally aligned notes', () => {
      const note1 = {
        getBoundingClientRect: jest.fn().mockReturnValue({
          left: 50,
          top: 100,
          width: 100,
          height: 50,
          right: 150,
          bottom: 150,
        }),
      };

      const note2 = {
        getBoundingClientRect: jest.fn().mockReturnValue({
          left: 250,
          top: 120,
          width: 100,
          height: 50,
          right: 350,
          bottom: 170,
        }),
      };

      const points = connectionUtils.getClosestPoints(note1, note2);

      // For horizontally aligned notes, should connect left/right edges
      expect(points.x1).toBe(150); // note1.right
      expect(points.y1).toBe(125); // note1 center Y
      expect(points.x2).toBe(250); // note2.left
      expect(points.y2).toBe(145); // note2 center Y
    });

    it('should calculate closest points for vertically aligned notes', () => {
      const note1 = {
        getBoundingClientRect: jest.fn().mockReturnValue({
          left: 100,
          top: 50,
          width: 100,
          height: 50,
          right: 200,
          bottom: 100,
        }),
      };

      const note2 = {
        getBoundingClientRect: jest.fn().mockReturnValue({
          left: 120,
          top: 200,
          width: 100,
          height: 50,
          right: 220,
          bottom: 250,
        }),
      };

      const points = connectionUtils.getClosestPoints(note1, note2);

      // For vertically aligned notes, should connect top/bottom edges
      expect(points.x1).toBe(150); // note1 center X
      expect(points.y1).toBe(100); // note1.bottom
      expect(points.x2).toBe(170); // note2 center X
      expect(points.y2).toBe(200); // note2.top
    });

    it('should handle zoom level scaling', () => {
      connectionUtils.currentZoomLevel = 10; // Double the default

      const note1 = {
        getBoundingClientRect: jest.fn().mockReturnValue({
          left: 100,
          top: 100,
          width: 200,
          height: 100,
          right: 300,
          bottom: 200,
        }),
      };

      const note2 = {
        getBoundingClientRect: jest.fn().mockReturnValue({
          left: 400,
          top: 120,
          width: 200,
          height: 100,
          right: 600,
          bottom: 220,
        }),
      };

      const points = connectionUtils.getClosestPoints(note1, note2);

      // With zoom level 10, scale = 10/5 = 2, so coordinates should be halved
      expect(points.x1).toBe(150); // (300 - 0) / 2 = 150
      expect(points.x2).toBe(200); // (400 - 0) / 2 = 200
    });

    it('should return default coordinates for invalid notes', () => {
      const points = connectionUtils.getClosestPoints(null, null);

      expect(points).toEqual({ x1: 0, y1: 0, x2: 0, y2: 0 });
      expect(mockUtils.log).toHaveBeenCalledWith(
        'Invalid notes provided to getClosestPoints',
      );
    });

    it('should handle missing first note', () => {
      const note2 = {
        getBoundingClientRect: jest.fn().mockReturnValue({
          left: 100,
          top: 100,
          width: 100,
          height: 50,
          right: 200,
          bottom: 150,
        }),
      };

      const points = connectionUtils.getClosestPoints(null, note2);

      expect(points).toEqual({ x1: 0, y1: 0, x2: 0, y2: 0 });
    });

    it('should handle missing second note', () => {
      const note1 = {
        getBoundingClientRect: jest.fn().mockReturnValue({
          left: 100,
          top: 100,
          width: 100,
          height: 50,
          right: 200,
          bottom: 150,
        }),
      };

      const points = connectionUtils.getClosestPoints(note1, null);

      expect(points).toEqual({ x1: 0, y1: 0, x2: 0, y2: 0 });
    });

    it('should choose shortest connection path', () => {
      // Test note positioned diagonally to create ambiguity
      const note1 = {
        getBoundingClientRect: jest.fn().mockReturnValue({
          left: 100,
          top: 100,
          width: 100,
          height: 100,
          right: 200,
          bottom: 200,
        }),
      };

      const note2 = {
        getBoundingClientRect: jest.fn().mockReturnValue({
          left: 250,
          top: 120,
          width: 100,
          height: 100,
          right: 350,
          bottom: 220,
        }),
      };

      const points = connectionUtils.getClosestPoints(note1, note2);

      // Horizontal distance: |150 - 300| = 150
      // Vertical distance: |150 - 170| = 20
      // Since horizontal > vertical, should connect horizontally
      expect(points.x1).toBe(200); // note1.right
      expect(points.x2).toBe(250); // note2.left
    });
  });

  describe('Arrow Markers Creation', () => {
    it('should create start and end markers', () => {
      const [startMarker, endMarker] = connectionUtils.createArrowMarkers();

      expect(startMarker.tagName.toLowerCase()).toBe('marker');
      expect(endMarker.tagName.toLowerCase()).toBe('marker');
      expect(startMarker.getAttribute('id')).toBe('arrow-start');
      expect(endMarker.getAttribute('id')).toBe('arrow-end');
    });

    it('should set correct attributes for start marker', () => {
      const [startMarker] = connectionUtils.createArrowMarkers();

      expect(startMarker.getAttribute('markerWidth')).toBe('10');
      expect(startMarker.getAttribute('markerHeight')).toBe('7');
      expect(startMarker.getAttribute('refX')).toBe('0');
      expect(startMarker.getAttribute('refY')).toBe('3.5');
      expect(startMarker.getAttribute('orient')).toBe('auto');
    });

    it('should set correct attributes for end marker', () => {
      const [, endMarker] = connectionUtils.createArrowMarkers();

      expect(endMarker.getAttribute('markerWidth')).toBe('10');
      expect(endMarker.getAttribute('markerHeight')).toBe('7');
      expect(endMarker.getAttribute('refX')).toBe('10');
      expect(endMarker.getAttribute('refY')).toBe('3.5');
      expect(endMarker.getAttribute('orient')).toBe('auto');
    });

    it('should create path elements inside markers', () => {
      const [startMarker, endMarker] = connectionUtils.createArrowMarkers();

      expect(startMarker.innerHTML).toBe(
        '<path d="M10,0 L0,3.5 L10,7" fill="#888"></path>',
      );
      expect(endMarker.innerHTML).toBe(
        '<path d="M0,0 L10,3.5 L0,7" fill="#888"></path>',
      );
    });
  });

  describe('Connection Existence Check', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <svg>
          <g data-start="note1" data-end="note2"></g>
          <g data-start="note2" data-end="note3"></g>
          <g data-start="note3" data-end="note1"></g>
        </svg>
      `;
    });

    it('should return true when direct connection exists', () => {
      const exists = connectionUtils.connectionExists('note1', 'note2');
      expect(exists).toBe(true);
    });

    it('should return true when reverse connection exists', () => {
      const exists = connectionUtils.connectionExists('note2', 'note1');
      expect(exists).toBe(true);
    });

    it('should return false when connection does not exist', () => {
      const exists = connectionUtils.connectionExists('note1', 'note4');
      expect(exists).toBe(false);
    });

    it('should return false for same note connection', () => {
      const exists = connectionUtils.connectionExists('note1', 'note1');
      expect(exists).toBe(false);
    });

    it('should handle empty note IDs', () => {
      const exists = connectionUtils.connectionExists('', 'note1');
      expect(exists).toBe(false);
    });

    it('should handle null note IDs', () => {
      const exists = connectionUtils.connectionExists(null, 'note1');
      expect(exists).toBe(false);
    });

    it('should be case sensitive', () => {
      const exists = connectionUtils.connectionExists('Note1', 'note2');
      expect(exists).toBe(false);
    });

    it('should check all existing connections', () => {
      expect(connectionUtils.connectionExists('note1', 'note2')).toBe(true);
      expect(connectionUtils.connectionExists('note2', 'note3')).toBe(true);
      expect(connectionUtils.connectionExists('note3', 'note1')).toBe(true);
      expect(connectionUtils.connectionExists('note1', 'note3')).toBe(true); // reverse
      expect(connectionUtils.connectionExists('note2', 'note4')).toBe(false);
    });
  });

  describe('Constants Export', () => {
    it('should export stroke constants', async () => {
      const module = await import(
        '../../../../src/js/features/connection/connectionUtils.js'
      );

      expect(module.STROKE_COLOR).toBe('#888');
      expect(module.STROKE_WIDTH).toBe('2');
      expect(module.STROKE_DASHARRAY).toBe('5,5');
    });

    it('should re-export CONNECTION_TYPES', async () => {
      const module = await import(
        '../../../../src/js/features/connection/connectionUtils.js'
      );

      expect(module.CONNECTION_TYPES).toEqual({
        NONE: 'none',
        UNI_FORWARD: 'uni-forward',
        UNI_BACKWARD: 'uni-backward',
        BI: 'bi',
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle notes with zero dimensions', () => {
      const mockCanvas = {
        getBoundingClientRect: jest.fn().mockReturnValue({
          left: 0,
          top: 0,
          width: 800,
          height: 600,
        }),
      };
      jest.spyOn(document, 'getElementById').mockReturnValue(mockCanvas);

      const note1 = {
        getBoundingClientRect: jest.fn().mockReturnValue({
          left: 100,
          top: 100,
          width: 0,
          height: 0,
          right: 100,
          bottom: 100,
        }),
      };

      const note2 = {
        getBoundingClientRect: jest.fn().mockReturnValue({
          left: 200,
          top: 200,
          width: 0,
          height: 0,
          right: 200,
          bottom: 200,
        }),
      };

      const points = connectionUtils.getClosestPoints(note1, note2);

      expect(points.x1).toBe(100); // Should still calculate center points
      expect(points.y1).toBe(100);
      expect(points.x2).toBe(200);
      expect(points.y2).toBe(200);
    });

    it('should handle overlapping notes', () => {
      const mockCanvas = {
        getBoundingClientRect: jest.fn().mockReturnValue({
          left: 0,
          top: 0,
          width: 800,
          height: 600,
        }),
      };
      jest.spyOn(document, 'getElementById').mockReturnValue(mockCanvas);

      const overlappingRect = {
        left: 100,
        top: 100,
        width: 100,
        height: 50,
        right: 200,
        bottom: 150,
      };

      const note1 = {
        getBoundingClientRect: jest.fn().mockReturnValue(overlappingRect),
      };

      const note2 = {
        getBoundingClientRect: jest.fn().mockReturnValue(overlappingRect),
      };

      const points = connectionUtils.getClosestPoints(note1, note2);

      // When notes overlap completely, should still return valid points
      expect(typeof points.x1).toBe('number');
      expect(typeof points.y1).toBe('number');
      expect(typeof points.x2).toBe('number');
      expect(typeof points.y2).toBe('number');
    });
  });
});
