// tests/unit/features/connection/connectionCreation.test.js
// Consolidated tests for connection creation functionality

describe('ConnectionCreation', () => {
  let ConnectionCreation, connectionCreation, mockConnectionManager, mockUtils;

  const setupMocks = () => {
    mockConnectionManager = {
      createSVGElement: jest.fn().mockImplementation((type, attrs = {}) => {
        const element = document.createElementNS(
          'http://www.w3.org/2000/svg',
          type,
        );
        Object.entries(attrs).forEach(([key, value]) =>
          element.setAttribute(key, value),
        );
        return element;
      }),
      createArrowMarkers: jest
        .fn()
        .mockReturnValue([
          document.createElementNS('http://www.w3.org/2000/svg', 'marker'),
          document.createElementNS('http://www.w3.org/2000/svg', 'marker'),
        ]),
      calculateOffsetPosition: jest
        .fn()
        .mockReturnValue({ left: 100, top: 100 }),
      throttledUpdateConnections: jest.fn(),
      CONNECTION_TYPES: {
        NONE: 'none',
        UNI_FORWARD: 'uni-forward',
        UNI_BACKWARD: 'uni-backward',
        BI: 'bi',
      },
      STROKE_COLOR: '#888',
      STROKE_WIDTH: '2',
      STROKE_DASHARRAY: '5,5',
    };
    mockUtils = { log: jest.fn() };
  };

  beforeEach(async () => {
    jest.resetModules();
    setupMocks();
    jest.doMock('../../../../src/js/utils/utils.js', () => mockUtils);

    const module = await import(
      '../../../../src/js/features/connection/connectionCreation.js'
    );
    ConnectionCreation = module.ConnectionCreation;
    connectionCreation = new ConnectionCreation(mockConnectionManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
    document
      .querySelectorAll('svg, #svg-container')
      .forEach((el) => el.remove());
  });

  it('initializes with connection manager reference', () => {
    expect(connectionCreation.connectionManager).toBe(mockConnectionManager);
  });

  describe('SVG Container Management', () => {
    let mockCanvas;

    beforeEach(() => {
      mockCanvas = document.createElement('div');
      mockCanvas.id = 'canvas';
      document.body.appendChild(mockCanvas);
    });

    afterEach(() => mockCanvas?.remove());

    it('creates new SVG container with correct properties', () => {
      const svgContainer =
        connectionCreation.initializeSVGContainer(mockCanvas);

      expect(svgContainer.tagName.toLowerCase()).toBe('svg');
      expect(svgContainer.id).toBe('svg-container');
      expect(mockCanvas.contains(svgContainer)).toBe(true);
      expect(svgContainer.children).toHaveLength(2); // arrow markers
      expect(mockConnectionManager.createArrowMarkers).toHaveBeenCalled();
    });

    it('reuses existing SVG container and clears previous content', () => {
      const existingContainer = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'svg',
      );
      existingContainer.id = 'svg-container';
      existingContainer.innerHTML = '<g>existing content</g>';
      mockCanvas.appendChild(existingContainer);

      const svgContainer =
        connectionCreation.initializeSVGContainer(mockCanvas);

      expect(svgContainer).toBe(existingContainer);
      expect(svgContainer.children).toHaveLength(2); // cleared and markers added
    });

    it('applies correct styling attributes', () => {
      const svgContainer =
        connectionCreation.initializeSVGContainer(mockCanvas);
      const expectedStyles = [
        'position:absolute',
        'top:0',
        'left:0',
        'width:100%',
        'height:100%',
        'z-index:0',
        'pointer-events:none',
      ];

      expectedStyles.forEach((style) => {
        expect(svgContainer.getAttribute('style')).toContain(style);
      });
    });
  });

  describe('Connection Creation', () => {
    beforeEach(() => {
      const svgContainer = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'svg',
      );
      svgContainer.id = 'svg-container';
      document.body.appendChild(svgContainer);
    });

    const connectionTestCases = [
      { fromId: 'note1', toId: 'note2', type: undefined, expectedType: 'none' },
      {
        fromId: 'note3',
        toId: 'note4',
        type: 'uni-forward',
        expectedType: 'uni-forward',
      },
      { fromId: 'note5', toId: 'note6', type: 'bi', expectedType: 'bi' },
    ];

    it.each(connectionTestCases)(
      'creates connection with correct type and elements ($fromId -> $toId, type: $expectedType)',
      ({ fromId, toId, type, expectedType }) => {
        const svgContainer = document.getElementById('svg-container');
        const initialChildren = svgContainer.children.length;

        const group = type
          ? connectionCreation.createConnection(fromId, toId, type)
          : connectionCreation.createConnection(fromId, toId);

        // Basic group properties
        expect(group.tagName.toLowerCase()).toBe('g');
        expect(group.getAttribute('data-start')).toBe(fromId);
        expect(group.getAttribute('data-end')).toBe(toId);
        expect(group.getAttribute('data-type')).toBe(expectedType);

        // Path element with styling
        const path = group.querySelector('path');
        expect(path.getAttribute('stroke')).toBe('#888');
        expect(path.getAttribute('stroke-width')).toBe('2');
        expect(path.getAttribute('stroke-dasharray')).toBe('5,5');
        expect(path.getAttribute('fill')).toBe('none');

        // Hotspot circle
        const hotspot = group.querySelector('circle.connector-hotspot');
        expect(hotspot.getAttribute('r')).toBe('5');
        expect(hotspot.getAttribute('fill')).toBe('#fff');
        expect(hotspot.getAttribute('stroke')).toBe('#888');

        // DOM integration
        expect(svgContainer.children.length).toBe(initialChildren + 1);
        expect(
          mockConnectionManager.throttledUpdateConnections,
        ).toHaveBeenCalledWith(group);
      },
    );

    it('logs connection creation with correct parameters', () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      connectionCreation.createConnection('note1', 'note2', 'bi');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] INFO: Connection created:/),
      );

      logSpy.mockRestore();
    });
  });

  describe('Connection Group Creation', () => {
    let mockCanvas, mockSvgContainer, mockEvent;

    beforeEach(() => {
      mockCanvas = document.createElement('div');
      mockSvgContainer = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'svg',
      );
      mockEvent = {
        target: document.createElement('div'),
        clientX: 150,
        clientY: 250,
      };
      document.body.appendChild(mockCanvas);
      document.body.appendChild(mockSvgContainer);
    });

    afterEach(() => {
      mockCanvas?.remove();
      mockSvgContainer?.remove();
    });

    it('creates complete connection group with all elements and correct positioning', () => {
      const initialChildren = mockSvgContainer.children.length;
      const result = connectionCreation.createConnectionGroup(
        mockEvent,
        mockCanvas,
        mockSvgContainer,
      );

      // Basic structure validation
      expect(result.group).toBeTruthy();
      expect(result.path).toBeTruthy();
      expect(result.hotspot).toBeTruthy();
      expect(result.backgroundLine).toBeTruthy();
      expect(typeof result.startX).toBe('number');
      expect(typeof result.startY).toBe('number');

      // Position calculation
      expect(
        mockConnectionManager.calculateOffsetPosition,
      ).toHaveBeenCalledWith(mockCanvas, mockEvent, mockEvent.target);
      expect(result.startX).toBe(100);
      expect(result.startY).toBe(100);

      // DOM integration and structure
      expect(mockSvgContainer.children.length).toBe(initialChildren + 1);
      expect(mockSvgContainer.contains(result.group)).toBe(true);
      expect(result.group.children).toHaveLength(3);
      expect(result.group.children[0]).toBe(result.backgroundLine);
      expect(result.group.children[1]).toBe(result.path);
      expect(result.group.children[2]).toBe(result.hotspot);
    });

    it('creates elements with correct attributes and styling', () => {
      const result = connectionCreation.createConnectionGroup(
        mockEvent,
        mockCanvas,
        mockSvgContainer,
      );

      // Background line attributes
      expect(result.backgroundLine.getAttribute('x1')).toBe('100');
      expect(result.backgroundLine.getAttribute('y1')).toBe('90'); // startY - 10
      expect(result.backgroundLine.getAttribute('x2')).toBe('100');
      expect(result.backgroundLine.getAttribute('y2')).toBe('110'); // startY + 10
      expect(result.backgroundLine.getAttribute('stroke')).toBe('#ccc');
      expect(
        result.backgroundLine.classList.contains('connector-background-line'),
      ).toBe(true);

      // Path attributes
      expect(result.path.getAttribute('d')).toBe('M100,100 L100,100');
      expect(result.path.getAttribute('stroke')).toBe('#888');
      expect(result.path.getAttribute('stroke-width')).toBe('2');
      expect(result.path.getAttribute('stroke-dasharray')).toBe('5,5');

      // Hotspot attributes
      expect(result.hotspot.getAttribute('cx')).toBe('100');
      expect(result.hotspot.getAttribute('cy')).toBe('100');
      expect(result.hotspot.getAttribute('r')).toBe('4');
      expect(result.hotspot.classList.contains('connector-hotspot')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('handles missing SVG container and invalid position data', () => {
      // Missing SVG container should throw
      expect(() =>
        connectionCreation.createConnection('note1', 'note2'),
      ).toThrow();

      // Invalid position data should be handled gracefully
      mockConnectionManager.calculateOffsetPosition.mockReturnValue({
        left: NaN,
        top: NaN,
      });

      const mockCanvas = document.createElement('div');
      const mockSvgContainer = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'svg',
      );
      const mockEvent = { target: document.createElement('div') };
      document.body.appendChild(mockSvgContainer);

      const result = connectionCreation.createConnectionGroup(
        mockEvent,
        mockCanvas,
        mockSvgContainer,
      );
      expect(result.startX).toBeNaN();
      expect(result.startY).toBeNaN();
    });
  });
});
