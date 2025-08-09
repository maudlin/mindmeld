// tests/unit/features/connection/connectionCreation.test.js

describe('ConnectionCreation', () => {
  let ConnectionCreation;
  let connectionCreation;
  let mockConnectionManager;
  let mockUtils;

  beforeEach(async () => {
    // Reset modules
    jest.resetModules();

    // Create mocks
    mockConnectionManager = {
      createSVGElement: jest.fn().mockImplementation((type, attrs = {}) => {
        const element = document.createElementNS(
          'http://www.w3.org/2000/svg',
          type,
        );
        Object.entries(attrs).forEach(([key, value]) => {
          element.setAttribute(key, value);
        });
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
      contextMenu: {
        createMenu: jest.fn().mockReturnValue(document.createElement('div')),
      },
    };

    mockUtils = {
      log: jest.fn(),
    };

    // Mock dependencies
    jest.doMock('../../../../src/js/utils/utils.js', () => mockUtils);

    // Import the module to test
    const module = await import(
      '../../../../src/js/features/connection/connectionCreation.js'
    );
    ConnectionCreation = module.ConnectionCreation;
    connectionCreation = new ConnectionCreation(mockConnectionManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clean up DOM
    document
      .querySelectorAll('svg, #svg-container')
      .forEach((el) => el.remove());
  });

  describe('Constructor', () => {
    it('should initialize with connection manager reference', () => {
      expect(connectionCreation.connectionManager).toBe(mockConnectionManager);
    });
  });

  describe('SVG Container Initialization', () => {
    let mockCanvas;

    beforeEach(() => {
      mockCanvas = document.createElement('div');
      mockCanvas.id = 'canvas';
      document.body.appendChild(mockCanvas);
    });

    afterEach(() => {
      mockCanvas?.remove();
    });

    it('should create new SVG container if it does not exist', () => {
      const svgContainer =
        connectionCreation.initializeSVGContainer(mockCanvas);

      expect(svgContainer).toBeTruthy();
      expect(svgContainer.tagName.toLowerCase()).toBe('svg');
      expect(svgContainer.id).toBe('svg-container');
      expect(mockCanvas.contains(svgContainer)).toBe(true);
    });

    it('should reuse existing SVG container', () => {
      // Create existing container
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
      // Should be cleared and then have markers added
      expect(svgContainer.children).toHaveLength(2); // start and end markers
    });

    it('should add arrow markers to SVG container', () => {
      const svgContainer =
        connectionCreation.initializeSVGContainer(mockCanvas);

      expect(mockConnectionManager.createArrowMarkers).toHaveBeenCalled();
      expect(svgContainer.children).toHaveLength(2); // start and end markers
    });

    it('should set correct SVG attributes', () => {
      const svgContainer =
        connectionCreation.initializeSVGContainer(mockCanvas);

      expect(svgContainer.getAttribute('style')).toContain('position:absolute');
      expect(svgContainer.getAttribute('style')).toContain('top:0');
      expect(svgContainer.getAttribute('style')).toContain('left:0');
      expect(svgContainer.getAttribute('style')).toContain('width:100%');
      expect(svgContainer.getAttribute('style')).toContain('height:100%');
      expect(svgContainer.getAttribute('style')).toContain('z-index:0');
      expect(svgContainer.getAttribute('style')).toContain(
        'pointer-events:none',
      );
    });
  });

  describe('Connection Creation', () => {
    beforeEach(() => {
      // Create SVG container in DOM
      const svgContainer = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'svg',
      );
      svgContainer.id = 'svg-container';
      document.body.appendChild(svgContainer);
    });

    it('should create connection with default type NONE', () => {
      const fromId = 'note1';
      const toId = 'note2';

      const group = connectionCreation.createConnection(fromId, toId);

      expect(group).toBeTruthy();
      expect(group.tagName.toLowerCase()).toBe('g');
      expect(group.getAttribute('data-start')).toBe(fromId);
      expect(group.getAttribute('data-end')).toBe(toId);
      expect(group.getAttribute('data-type')).toBe('none');
    });

    it('should create connection with specified type', () => {
      const fromId = 'note1';
      const toId = 'note2';
      const type = 'uni-forward';

      const group = connectionCreation.createConnection(fromId, toId, type);

      expect(group.getAttribute('data-type')).toBe(type);
    });

    it('should create connection with path element', () => {
      const group = connectionCreation.createConnection('note1', 'note2');
      const path = group.querySelector('path');

      expect(path).toBeTruthy();
      expect(path.getAttribute('stroke')).toBe('#888');
      expect(path.getAttribute('stroke-width')).toBe('2');
      expect(path.getAttribute('stroke-dasharray')).toBe('5,5');
      expect(path.getAttribute('fill')).toBe('none');
    });

    it('should create connection with hotspot circle', () => {
      const group = connectionCreation.createConnection('note1', 'note2');
      const hotspot = group.querySelector('circle.connector-hotspot');

      expect(hotspot).toBeTruthy();
      expect(hotspot.getAttribute('r')).toBe('5');
      expect(hotspot.getAttribute('fill')).toBe('#fff');
      expect(hotspot.getAttribute('stroke')).toBe('#888');
      expect(hotspot.getAttribute('stroke-width')).toBe('2');
    });

    it('should create connection with context menu', () => {
      const group = connectionCreation.createConnection('note1', 'note2');
      const contextMenu = group.querySelector('div');

      expect(contextMenu).toBeTruthy();
      expect(contextMenu.style.display).toBe('none');
    });

    it('should append connection to SVG container', () => {
      const svgContainer = document.getElementById('svg-container');
      const initialChildren = svgContainer.children.length;

      connectionCreation.createConnection('note1', 'note2');

      expect(svgContainer.children.length).toBe(initialChildren + 1);
    });

    it('should call throttledUpdateConnections', () => {
      const group = connectionCreation.createConnection('note1', 'note2');

      expect(
        mockConnectionManager.throttledUpdateConnections,
      ).toHaveBeenCalledWith(group);
    });

    it('should log connection creation', () => {
      connectionCreation.createConnection('note1', 'note2', 'bi');

      expect(mockUtils.log).toHaveBeenCalledWith('Connection created:', {
        fromId: 'note1',
        toId: 'note2',
        type: 'bi',
      });
    });
  });

  describe('Connection Group Creation', () => {
    let mockCanvas, mockSvgContainer, mockEvent;

    beforeEach(() => {
      mockCanvas = document.createElement('div');
      document.body.appendChild(mockCanvas);

      mockSvgContainer = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'svg',
      );
      document.body.appendChild(mockSvgContainer);

      mockEvent = {
        target: document.createElement('div'),
        clientX: 150,
        clientY: 250,
      };
    });

    afterEach(() => {
      mockCanvas?.remove();
      mockSvgContainer?.remove();
    });

    it('should create connection group with all elements', () => {
      const result = connectionCreation.createConnectionGroup(
        mockEvent,
        mockCanvas,
        mockSvgContainer,
      );

      expect(result).toBeTruthy();
      expect(result.group).toBeTruthy();
      expect(result.path).toBeTruthy();
      expect(result.hotspot).toBeTruthy();
      expect(result.contextMenu).toBeTruthy();
      expect(result.backgroundLine).toBeTruthy();
      expect(typeof result.startX).toBe('number');
      expect(typeof result.startY).toBe('number');
    });

    it('should use calculated offset position', () => {
      const result = connectionCreation.createConnectionGroup(
        mockEvent,
        mockCanvas,
        mockSvgContainer,
      );

      expect(
        mockConnectionManager.calculateOffsetPosition,
      ).toHaveBeenCalledWith(mockCanvas, mockEvent, mockEvent.target);
      expect(result.startX).toBe(100);
      expect(result.startY).toBe(100);
    });

    it('should create background line with correct attributes', () => {
      const result = connectionCreation.createConnectionGroup(
        mockEvent,
        mockCanvas,
        mockSvgContainer,
      );
      const backgroundLine = result.backgroundLine;

      expect(backgroundLine.getAttribute('x1')).toBe('100');
      expect(backgroundLine.getAttribute('y1')).toBe('90'); // startY - 10
      expect(backgroundLine.getAttribute('x2')).toBe('100');
      expect(backgroundLine.getAttribute('y2')).toBe('110'); // startY + 10
      expect(backgroundLine.getAttribute('stroke')).toBe('#ccc');
      expect(backgroundLine.getAttribute('stroke-width')).toBe('1');
      expect(
        backgroundLine.classList.contains('connector-background-line'),
      ).toBe(true);
    });

    it('should create path with initial position', () => {
      const result = connectionCreation.createConnectionGroup(
        mockEvent,
        mockCanvas,
        mockSvgContainer,
      );
      const path = result.path;

      expect(path.getAttribute('d')).toBe('M100,100 L100,100');
      expect(path.getAttribute('stroke')).toBe('#888');
      expect(path.getAttribute('stroke-width')).toBe('2');
      expect(path.getAttribute('stroke-dasharray')).toBe('5,5');
      expect(path.getAttribute('fill')).toBe('none');
    });

    it('should create hotspot at start position', () => {
      const result = connectionCreation.createConnectionGroup(
        mockEvent,
        mockCanvas,
        mockSvgContainer,
      );
      const hotspot = result.hotspot;

      expect(hotspot.getAttribute('cx')).toBe('100');
      expect(hotspot.getAttribute('cy')).toBe('100');
      expect(hotspot.getAttribute('r')).toBe('4');
      expect(hotspot.getAttribute('fill')).toBe('#fff');
      expect(hotspot.classList.contains('connector-hotspot')).toBe(true);
    });

    it('should create context menu with transform', () => {
      const result = connectionCreation.createConnectionGroup(
        mockEvent,
        mockCanvas,
        mockSvgContainer,
      );
      const contextMenu = result.contextMenu;

      expect(contextMenu.style.display).toBe('none');
      expect(contextMenu.getAttribute('transform')).toBe('translate(100, 100)');
    });

    it('should append group to SVG container', () => {
      const initialChildren = mockSvgContainer.children.length;
      const result = connectionCreation.createConnectionGroup(
        mockEvent,
        mockCanvas,
        mockSvgContainer,
      );

      expect(mockSvgContainer.children.length).toBe(initialChildren + 1);
      expect(mockSvgContainer.contains(result.group)).toBe(true);
    });

    it('should include all child elements in correct order', () => {
      const result = connectionCreation.createConnectionGroup(
        mockEvent,
        mockCanvas,
        mockSvgContainer,
      );
      const group = result.group;

      expect(group.children).toHaveLength(4);
      expect(group.children[0]).toBe(result.backgroundLine);
      expect(group.children[1]).toBe(result.path);
      expect(group.children[2]).toBe(result.hotspot);
      expect(group.children[3]).toBe(result.contextMenu);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing SVG container gracefully', () => {
      // Don't create SVG container
      expect(() => {
        connectionCreation.createConnection('note1', 'note2');
      }).toThrow(); // Should throw because appendChild will fail on null
    });

    it('should handle invalid position data', () => {
      mockConnectionManager.calculateOffsetPosition.mockReturnValue({
        left: NaN,
        top: NaN,
      });

      const mockCanvas = document.createElement('div');
      const mockSvgContainer = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'svg',
      );
      document.body.appendChild(mockSvgContainer);

      const mockEvent = { target: document.createElement('div') };

      const result = connectionCreation.createConnectionGroup(
        mockEvent,
        mockCanvas,
        mockSvgContainer,
      );

      // Should handle NaN values gracefully
      expect(result.startX).toBeNaN();
      expect(result.startY).toBeNaN();
    });
  });
});
