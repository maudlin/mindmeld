// tests/unit/features/connection/connectionUtils.test.js
// Consolidated utility tests focusing on core calculations and edge cases

describe('ConnectionUtils', () => {
  let ConnectionUtils;
  let connectionUtils;
  let mockUtils;
  let mockZoomManager;
  let mockCanvas;

  beforeEach(async () => {
    jest.resetModules();

    // Consolidated mocks setup
    mockUtils = { log: jest.fn() };
    mockZoomManager = { getZoomLevel: jest.fn().mockReturnValue(5) };
    mockCanvas = {
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
      }),
    };

    jest.spyOn(document, 'getElementById').mockReturnValue(mockCanvas);
    jest.doMock('../../../../src/js/utils/utils.js', () => mockUtils);
    jest.doMock(
      '../../../../src/js/features/zoom/viewportAdapter.js',
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

    const module = await import(
      '../../../../src/js/features/connection/connectionUtils.js'
    );
    ConnectionUtils = module.ConnectionUtils;
    connectionUtils = new ConnectionUtils();
  });

  afterEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '';
  });

  describe('Initialization and Zoom Management', () => {
    it('initializes with null zoom and manages zoom cache correctly', () => {
      expect(connectionUtils.currentZoomLevel).toBe(null);

      // Should fetch from manager when cache is null
      expect(connectionUtils.getCurrentZoomLevel()).toBe(5);
      expect(mockZoomManager.getZoomLevel).toHaveBeenCalled();

      // Should use cache when available
      connectionUtils.currentZoomLevel = 3;
      mockZoomManager.getZoomLevel.mockClear();
      expect(connectionUtils.getCurrentZoomLevel()).toBe(3);
      expect(mockZoomManager.getZoomLevel).not.toHaveBeenCalled();
    });
  });

  describe('SVG Element Creation', () => {
    it('creates SVG elements with proper namespace and attributes', () => {
      // Basic element creation
      const circle = connectionUtils.createSVGElement('circle');
      expect(circle.tagName.toLowerCase()).toBe('circle');
      expect(circle.namespaceURI).toBe('http://www.w3.org/2000/svg');
      expect(circle.attributes.length).toBe(0);

      // Element with attributes
      const path = connectionUtils.createSVGElement('path', {
        stroke: 'red',
        'stroke-width': '3',
        fill: 'none',
        d: 'M0,0 L100,100',
      });
      expect(path.getAttribute('stroke')).toBe('red');
      expect(path.getAttribute('d')).toBe('M0,0 L100,100');

      // Complex element
      const marker = connectionUtils.createSVGElement('marker', {
        id: 'arrow-end',
        markerWidth: '10',
        refX: '10',
        orient: 'auto',
      });
      expect(marker.getAttribute('id')).toBe('arrow-end');
      expect(marker.getAttribute('orient')).toBe('auto');
    });
  });

  describe('Closest Points Calculation', () => {
    const createMockNote = (left, top, width, height) => ({
      getBoundingClientRect: () => ({
        left,
        top,
        width,
        height,
        right: left + width,
        bottom: top + height,
      }),
    });

    it('calculates optimal connection points for different note alignments', () => {
      // Horizontal alignment - connects left/right edges
      const horizontal = connectionUtils.getClosestPoints(
        createMockNote(50, 100, 100, 50), // note1: x=50-150, y=100-150
        createMockNote(250, 120, 100, 50), // note2: x=250-350, y=120-170
      );
      expect(horizontal).toEqual({ x1: 150, y1: 125, x2: 250, y2: 145 });

      // Vertical alignment - connects top/bottom edges
      const vertical = connectionUtils.getClosestPoints(
        createMockNote(100, 50, 100, 50), // note1: x=100-200, y=50-100
        createMockNote(120, 200, 100, 50), // note2: x=120-220, y=200-250
      );
      expect(vertical).toEqual({ x1: 150, y1: 100, x2: 170, y2: 200 });
    });

    it('handles zoom scaling and edge cases', () => {
      // Zoom scaling
      connectionUtils.currentZoomLevel = 10;
      const zoomed = connectionUtils.getClosestPoints(
        createMockNote(100, 100, 200, 100),
        createMockNote(400, 120, 200, 100),
      );
      expect(zoomed.x1).toBe(150);
      expect(zoomed.x2).toBe(200);

      // Invalid inputs
      expect(connectionUtils.getClosestPoints(null, null)).toEqual({
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0,
      });
      expect(mockUtils.log).toHaveBeenCalledWith(
        'Invalid notes provided to getClosestPoints',
      );

      // Zero dimensions - coordinates get scaled by zoom/canvas offset
      connectionUtils.currentZoomLevel = 5; // Reset zoom
      const zero = connectionUtils.getClosestPoints(
        createMockNote(100, 100, 0, 0),
        createMockNote(200, 200, 0, 0),
      );
      expect(zero).toEqual({ x1: 100, y1: 100, x2: 200, y2: 200 });
    });
  });

  describe('Arrow Markers Creation', () => {
    it('creates properly configured start and end arrow markers', () => {
      const [startMarker, endMarker] = connectionUtils.createArrowMarkers();

      // Basic marker validation
      expect(startMarker.tagName.toLowerCase()).toBe('marker');
      expect(endMarker.tagName.toLowerCase()).toBe('marker');
      expect(startMarker.getAttribute('id')).toBe('arrow-start');
      expect(endMarker.getAttribute('id')).toBe('arrow-end');

      // Start marker attributes (points backward)
      expect(startMarker.getAttribute('refX')).toBe('0');
      expect(startMarker.innerHTML).toBe(
        '<path d="M8,0 L0,2.5 L8,5" fill="#666"></path>',
      );

      // End marker attributes (points forward)
      expect(endMarker.getAttribute('refX')).toBe('8');
      expect(endMarker.innerHTML).toBe(
        '<path d="M0,0 L8,2.5 L0,5" fill="#666"></path>',
      );

      // Common attributes
      [startMarker, endMarker].forEach((marker) => {
        expect(marker.getAttribute('markerWidth')).toBe('8');
        expect(marker.getAttribute('markerHeight')).toBe('5');
        expect(marker.getAttribute('refY')).toBe('2.5');
        expect(marker.getAttribute('orient')).toBe('auto');
      });
    });
  });

  describe('Connection Existence Check', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <svg>
          <g data-start="note1" data-end="note2"></g>
          <g data-start="note2" data-end="note3"></g>
          <g data-start="note3" data-end="note1"></g>
        </svg>`;
    });

    it('correctly identifies existing connections and handles edge cases', () => {
      // Direct and reverse connections
      expect(connectionUtils.connectionExists('note1', 'note2')).toBe(true);
      expect(connectionUtils.connectionExists('note2', 'note1')).toBe(true); // reverse
      expect(connectionUtils.connectionExists('note2', 'note3')).toBe(true);
      expect(connectionUtils.connectionExists('note3', 'note1')).toBe(true);
      expect(connectionUtils.connectionExists('note1', 'note3')).toBe(true); // reverse

      // Non-existent connections
      expect(connectionUtils.connectionExists('note1', 'note4')).toBe(false);

      // Edge cases
      expect(connectionUtils.connectionExists('note1', 'note1')).toBe(false); // self
      expect(connectionUtils.connectionExists('', 'note1')).toBe(false); // empty
      expect(connectionUtils.connectionExists(null, 'note1')).toBe(false); // null
      expect(connectionUtils.connectionExists('Note1', 'note2')).toBe(false); // case sensitive
    });
  });

  describe('Module Exports', () => {
    it('exports expected constants and types', async () => {
      const module = await import(
        '../../../../src/js/features/connection/connectionUtils.js'
      );

      // Stroke constants
      expect(module.STROKE_COLOR).toBe('#888');
      expect(module.STROKE_WIDTH).toBe('2');
      expect(module.STROKE_DASHARRAY).toBe('5,5');

      // Connection types
      expect(module.CONNECTION_TYPES).toEqual({
        NONE: 'none',
        UNI_FORWARD: 'uni-forward',
        UNI_BACKWARD: 'uni-backward',
        BI: 'bi',
      });
    });
  });
});
