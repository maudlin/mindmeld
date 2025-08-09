// tests/unit/features/connection/connectionManager.test.js

describe('ConnectionManager', () => {
  let ConnectionManager;
  let connectionManager;
  let mockConnectionCreation;
  let mockConnectionUpdate;
  let mockConnectionUtils;
  let mockContextMenu;
  let mockUtils;
  let mockZoomManager;
  let mockConstants;

  beforeEach(async () => {
    // Reset modules
    jest.resetModules();

    // Create mocks
    mockConnectionCreation = {
      createConnection: jest.fn(),
      createConnectionGroup: jest.fn(),
      initializeSVGContainer: jest.fn(),
    };

    mockConnectionUpdate = {
      updateConnections: jest.fn(),
      updateConnectionPath: jest.fn(),
    };

    mockConnectionUtils = {
      createSVGElement: jest.fn(),
      getClosestPoints: jest
        .fn()
        .mockReturnValue({ x1: 0, y1: 0, x2: 100, y2: 100 }),
      createArrowMarkers: jest
        .fn()
        .mockReturnValue([
          document.createElement('marker'),
          document.createElement('marker'),
        ]),
      connectionExists: jest.fn(),
    };

    mockContextMenu = {
      show: jest.fn(),
      hide: jest.fn(),
      createMenu: jest.fn().mockReturnValue(document.createElement('div')),
      isMouseOver: false,
    };

    mockUtils = {
      throttle: jest.fn().mockImplementation((fn) => fn),
      calculateOffsetPosition: jest.fn().mockReturnValue({ left: 50, top: 50 }),
      log: jest.fn(),
    };

    mockZoomManager = {
      getZoomLevel: jest.fn().mockReturnValue(5),
    };

    mockConstants = {
      CONNECTION_TYPES: {
        NONE: 'none',
        UNI_FORWARD: 'uni-forward',
        UNI_BACKWARD: 'uni-backward',
        BI: 'bi',
      },
    };

    // Mock dependencies before importing
    jest.doMock(
      '../../../../src/js/features/connection/connectionCreation.js',
      () => ({
        ConnectionCreation: jest
          .fn()
          .mockImplementation(() => mockConnectionCreation),
      }),
    );

    jest.doMock(
      '../../../../src/js/features/connection/connectionUpdate.js',
      () => ({
        ConnectionUpdate: jest
          .fn()
          .mockImplementation(() => mockConnectionUpdate),
      }),
    );

    jest.doMock(
      '../../../../src/js/features/connection/connectionUtils.js',
      () => ({
        ConnectionUtils: jest
          .fn()
          .mockImplementation(() => mockConnectionUtils),
        CONNECTION_TYPES: mockConstants.CONNECTION_TYPES,
        STROKE_COLOR: '#888',
        STROKE_WIDTH: '2',
        STROKE_DASHARRAY: '5,5',
      }),
    );

    jest.doMock(
      '../../../../src/js/features/connection/contextMenu.js',
      () => ({
        ContextMenu: jest.fn().mockImplementation(() => mockContextMenu),
      }),
    );

    jest.doMock('../../../../src/js/utils/utils.js', () => mockUtils);

    jest.doMock(
      '../../../../src/js/features/zoom/zoomManager.js',
      () => mockZoomManager,
    );

    // Import the module to test
    const module = await import(
      '../../../../src/js/features/connection/connectionManager.js'
    );
    ConnectionManager = module.ConnectionManager;
    connectionManager = new ConnectionManager();
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clean up DOM
    document
      .querySelectorAll('svg, .note, .connection')
      .forEach((el) => el.remove());
  });

  describe('Constructor', () => {
    it('should initialize with default values', () => {
      expect(connectionManager.isConnecting).toBe(false);
      expect(connectionManager.currentZoomLevel).toBe(null);
      expect(connectionManager.onConnectionUpdate).toBe(null);
    });

    it('should initialize with correct connection types', () => {
      expect(connectionManager.CONNECTION_TYPES).toEqual(
        mockConstants.CONNECTION_TYPES,
      );
    });

    it('should initialize with correct stroke properties', () => {
      expect(connectionManager.STROKE_COLOR).toBe('#888');
      expect(connectionManager.STROKE_WIDTH).toBe('2');
      expect(connectionManager.STROKE_DASHARRAY).toBe('5,5');
    });

    it('should create required sub-components', () => {
      expect(connectionManager.connectionCreation).toBeDefined();
      expect(connectionManager.connectionUpdate).toBeDefined();
      expect(connectionManager.connectionUtils).toBeDefined();
      expect(connectionManager.contextMenu).toBeDefined();
    });

    it('should setup throttled update connections', () => {
      expect(mockUtils.throttle).toHaveBeenCalledWith(expect.any(Function), 16);
      expect(connectionManager.throttledUpdateConnections).toBeDefined();
    });
  });

  describe('Connection Creation', () => {
    it('should delegate createConnection to ConnectionCreation', () => {
      const fromId = 'note1';
      const toId = 'note2';
      const type = mockConstants.CONNECTION_TYPES.UNI_FORWARD;

      connectionManager.createConnection(fromId, toId, type);

      expect(mockConnectionCreation.createConnection).toHaveBeenCalledWith(
        fromId,
        toId,
        type,
      );
    });

    it('should delegate createConnectionGroup to ConnectionCreation', () => {
      const mockEvent = { clientX: 100, clientY: 200 };
      const mockCanvas = document.createElement('div');
      const mockSvgContainer = document.createElement('svg');

      connectionManager.createConnectionGroup(
        mockEvent,
        mockCanvas,
        mockSvgContainer,
      );

      expect(mockConnectionCreation.createConnectionGroup).toHaveBeenCalledWith(
        mockEvent,
        mockCanvas,
        mockSvgContainer,
      );
    });

    it('should delegate initializeSVGContainer to ConnectionCreation', () => {
      const mockCanvas = document.createElement('div');

      connectionManager.initializeSVGContainer(mockCanvas);

      expect(
        mockConnectionCreation.initializeSVGContainer,
      ).toHaveBeenCalledWith(mockCanvas);
    });
  });

  describe('Connection Updates', () => {
    it('should delegate updateConnections to ConnectionUpdate', () => {
      const mockNote = document.createElement('div');

      connectionManager.updateConnections(mockNote);

      expect(mockConnectionUpdate.updateConnections).toHaveBeenCalledWith(
        mockNote,
      );
    });

    it('should delegate updateConnectionPath to ConnectionUpdate', () => {
      const mockPath = document.createElement('path');
      const coords = [10, 20, 30, 40];
      const type = mockConstants.CONNECTION_TYPES.BI;

      connectionManager.updateConnectionPath(mockPath, ...coords, type);

      expect(mockConnectionUpdate.updateConnectionPath).toHaveBeenCalledWith(
        mockPath,
        ...coords,
        type,
      );
    });
  });

  describe('Connection State Management', () => {
    it('should set connecting state', () => {
      connectionManager.setConnecting(true);
      expect(connectionManager.isConnecting).toBe(true);

      connectionManager.setConnecting(false);
      expect(connectionManager.isConnecting).toBe(false);
    });

    it('should manage zoom level', () => {
      connectionManager.setCurrentZoomLevel();
      expect(connectionManager.currentZoomLevel).toBe(5);
    });

    it('should get current zoom level from cache or zoom manager', () => {
      // Test cached value
      connectionManager.currentZoomLevel = 3;
      expect(connectionManager.getCurrentZoomLevel()).toBe(3);

      // Test fallback to zoom manager
      connectionManager.currentZoomLevel = null;
      expect(connectionManager.getCurrentZoomLevel()).toBe(5);
    });

    it('should set and trigger connection update callback', () => {
      const mockCallback = jest.fn();
      connectionManager.setConnectionUpdateCallback(mockCallback);

      connectionManager.updateConnectionInDataStore(
        'note1',
        'note2',
        'uni-forward',
      );

      expect(mockCallback).toHaveBeenCalledWith(
        'note1',
        'note2',
        'uni-forward',
      );
    });

    it('should not fail when callback is not set', () => {
      expect(() => {
        connectionManager.updateConnectionInDataStore('note1', 'note2', 'none');
      }).not.toThrow();
    });
  });

  describe('Utility Methods', () => {
    it('should delegate SVG element creation to ConnectionUtils', () => {
      const type = 'path';
      const attributes = { stroke: 'red' };

      connectionManager.createSVGElement(type, attributes);

      expect(mockConnectionUtils.createSVGElement).toHaveBeenCalledWith(
        type,
        attributes,
      );
    });

    it('should delegate getClosestPoints to ConnectionUtils', () => {
      const note1 = document.createElement('div');
      const note2 = document.createElement('div');

      connectionManager.getClosestPoints(note1, note2);

      expect(mockConnectionUtils.getClosestPoints).toHaveBeenCalledWith(
        note1,
        note2,
        5, // current zoom level
      );
    });

    it('should delegate calculateOffsetPosition to utils', () => {
      const mockCanvas = document.createElement('div');
      const mockEvent = { clientX: 100, clientY: 200 };

      connectionManager.calculateOffsetPosition(mockCanvas, mockEvent);

      expect(mockUtils.calculateOffsetPosition).toHaveBeenCalledWith(
        mockCanvas,
        mockEvent,
        null,
      );
    });

    it('should delegate createArrowMarkers to ConnectionUtils', () => {
      connectionManager.createArrowMarkers();

      expect(mockConnectionUtils.createArrowMarkers).toHaveBeenCalled();
    });

    it('should delegate connectionExists to ConnectionUtils', () => {
      connectionManager.connectionExists('note1', 'note2');

      expect(mockConnectionUtils.connectionExists).toHaveBeenCalledWith(
        'note1',
        'note2',
      );
    });
  });

  describe('Connection Management', () => {
    beforeEach(() => {
      // Mock DOM elements
      document.body.innerHTML = `
        <div id="note1" class="note"></div>
        <div id="note2" class="note"></div>
        <svg>
          <g data-start="note1" data-end="note2" data-type="uni-forward">
            <path></path>
            <circle class="connector-hotspot"></circle>
          </g>
        </svg>
      `;
    });

    it('should get connection group by IDs', () => {
      const group = connectionManager.getConnectionGroup('note1', 'note2');

      expect(group).toBeTruthy();
      expect(group.dataset.start).toBe('note1');
      expect(group.dataset.end).toBe('note2');
    });

    it('should return null when connection group does not exist', () => {
      const group = connectionManager.getConnectionGroup(
        'nonexistent1',
        'nonexistent2',
      );

      expect(group).toBeNull();
    });

    it('should update connection type', () => {
      const connectionGroup = document.querySelector('g[data-start="note1"]');
      const mockStartNote = document.getElementById('note1');
      const mockEndNote = document.getElementById('note2');

      // Mock getBoundingClientRect for notes
      mockStartNote.getBoundingClientRect = jest.fn().mockReturnValue({
        left: 0,
        top: 0,
        width: 100,
        height: 50,
        right: 100,
        bottom: 50,
      });
      mockEndNote.getBoundingClientRect = jest.fn().mockReturnValue({
        left: 200,
        top: 100,
        width: 100,
        height: 50,
        right: 300,
        bottom: 150,
      });

      // Mock canvas for getBoundingClientRect
      const mockCanvas = document.createElement('div');
      mockCanvas.id = 'canvas';
      mockCanvas.getBoundingClientRect = jest.fn().mockReturnValue({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
      });
      document.body.appendChild(mockCanvas);

      connectionManager.updateConnectionType(connectionGroup, 'bi');

      expect(connectionGroup.dataset.type).toBe('bi');
      expect(mockConnectionUpdate.updateConnectionPath).toHaveBeenCalled();
    });
  });

  describe('Connection Cleanup', () => {
    beforeEach(() => {
      // Mock DOM with multiple connections
      document.body.innerHTML = `
        <div id="note1" class="note"></div>
        <div id="note2" class="note"></div>
        <div id="note3" class="note"></div>
        <svg>
          <g data-start="note1" data-end="note2" data-type="uni-forward">
            <path></path>
          </g>
          <g data-start="note1" data-end="note3" data-type="bi">
            <path></path>
          </g>
          <g data-start="note2" data-end="note3" data-type="none">
            <path></path>
          </g>
        </svg>
      `;
    });

    it('should delete all connections for a note', () => {
      const note = document.getElementById('note1');
      const mockCallback = jest.fn();
      connectionManager.setConnectionUpdateCallback(mockCallback);

      connectionManager.deleteConnectionsByNote(note);

      // Should call callback for each deleted connection
      expect(mockCallback).toHaveBeenCalledTimes(2);
      expect(mockCallback).toHaveBeenCalledWith('note1', 'note2', null);
      expect(mockCallback).toHaveBeenCalledWith('note1', 'note3', null);
    });

    it('should remove connection DOM elements', () => {
      const note = document.getElementById('note1');
      const initialConnections = document.querySelectorAll(
        'g[data-start="note1"], g[data-end="note1"]',
      );
      expect(initialConnections).toHaveLength(2);

      connectionManager.deleteConnectionsByNote(note);

      const remainingConnections = document.querySelectorAll(
        'g[data-start="note1"], g[data-end="note1"]',
      );
      expect(remainingConnections).toHaveLength(0);
    });
  });

  describe('Event Handling', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <svg>
          <path class="line-selected"></path>
          <path></path>
          <g data-start="note1" data-end="note2">
            <path></path>
          </g>
        </svg>
      `;
    });

    it('should handle line selection on path click', () => {
      const paths = document.querySelectorAll('path');
      const targetPath = paths[1];
      const mockEvent = { target: targetPath };

      connectionManager.handleLineSelection(mockEvent);

      expect(paths[0].classList.contains('line-selected')).toBe(false);
      expect(targetPath.classList.contains('line-selected')).toBe(true);
    });

    it('should clear line selection on non-path click', () => {
      const paths = document.querySelectorAll('path');
      const mockEvent = { target: document.createElement('div') };

      connectionManager.handleLineSelection(mockEvent);

      paths.forEach((path) => {
        expect(path.classList.contains('line-selected')).toBe(false);
      });
    });

    it('should show context menu on hotspot hover', () => {
      const mockHotspot = document.createElement('div');
      mockHotspot.classList.add('connector-hotspot');
      const mockEvent = { target: mockHotspot };

      connectionManager.handleSvgMouseMove(mockEvent);

      expect(mockContextMenu.show).toHaveBeenCalledWith(mockHotspot);
    });

    it('should hide context menu when not over hotspot or menu', () => {
      const mockEvent = { target: document.createElement('div') };

      connectionManager.handleSvgMouseMove(mockEvent);

      expect(mockContextMenu.hide).toHaveBeenCalled();
    });

    it('should handle line deletion', () => {
      const mockCallback = jest.fn();
      connectionManager.setConnectionUpdateCallback(mockCallback);

      // Add the selected line to a group so closest() can find it
      const selectedLine = document.querySelector('.line-selected');
      const group = document.querySelector('g[data-start="note1"]');
      if (selectedLine && group) {
        group.appendChild(selectedLine);
      }

      connectionManager.handleLineDeletion();

      expect(mockCallback).toHaveBeenCalledWith('note1', 'note2', null);
    });

    it('should handle svg mouse leave', () => {
      mockContextMenu.isMouseOver = false;

      connectionManager.handleSvgMouseLeave();

      expect(mockContextMenu.hide).toHaveBeenCalled();
    });

    it('should not hide context menu on mouse leave when menu is hovered', () => {
      mockContextMenu.isMouseOver = true;
      mockContextMenu.hide.mockClear();

      connectionManager.handleSvgMouseLeave();

      expect(mockContextMenu.hide).not.toHaveBeenCalled();
    });
  });

  describe('Interactive Connection Creation', () => {
    let mockCanvas, mockSvgContainer, mockStartNote, mockEndNote;

    beforeEach(() => {
      mockCanvas = document.createElement('div');
      mockCanvas.id = 'canvas';
      document.body.appendChild(mockCanvas);

      mockSvgContainer = document.createElement('svg');
      mockCanvas.appendChild(mockSvgContainer);

      mockStartNote = document.createElement('div');
      mockStartNote.classList.add('note');
      mockStartNote.id = 'start-note';
      mockCanvas.appendChild(mockStartNote);

      mockEndNote = document.createElement('div');
      mockEndNote.classList.add('note');
      mockEndNote.id = 'end-note';
      mockCanvas.appendChild(mockEndNote);

      // Mock createConnectionGroup
      mockConnectionCreation.createConnectionGroup.mockReturnValue({
        group: document.createElement('g'),
        path: document.createElement('path'),
        startX: 50,
        startY: 50,
      });
    });

    it('should start connection creation on note interaction', () => {
      const mockEvent = {
        target: mockStartNote,
      };

      connectionManager.startConnectionCreation(
        mockEvent,
        mockCanvas,
        mockSvgContainer,
      );

      expect(connectionManager.isConnecting).toBe(true);
      expect(mockConnectionCreation.createConnectionGroup).toHaveBeenCalledWith(
        mockEvent,
        mockCanvas,
        mockSvgContainer,
      );
    });

    it('should not start connection if target is not a note', () => {
      const mockEvent = {
        target: document.createElement('div'),
      };

      connectionManager.startConnectionCreation(
        mockEvent,
        mockCanvas,
        mockSvgContainer,
      );

      expect(connectionManager.isConnecting).toBe(false);
      expect(
        mockConnectionCreation.createConnectionGroup,
      ).not.toHaveBeenCalled();
    });

    it('should create final connection on valid target', () => {
      const startNote = mockStartNote;
      const endNote = mockEndNote;
      const mockConnectionGroup = {
        group: document.createElement('g'),
        path: document.createElement('path'),
      };

      mockConnectionUtils.connectionExists.mockReturnValue(false);
      const mockCallback = jest.fn();
      connectionManager.setConnectionUpdateCallback(mockCallback);

      connectionManager.createFinalConnection(
        startNote,
        endNote,
        mockConnectionGroup,
      );

      expect(mockConnectionGroup.group.dataset.start).toBe('start-note');
      expect(mockConnectionGroup.group.dataset.end).toBe('end-note');
      expect(mockConnectionGroup.group.dataset.type).toBe('uni-forward');
      expect(mockCallback).toHaveBeenCalledWith(
        'start-note',
        'end-note',
        'uni-forward',
      );
    });

    it('should not create duplicate connections', () => {
      const startNote = mockStartNote;
      const endNote = mockEndNote;
      const mockConnectionGroup = {
        group: document.createElement('g'),
        path: document.createElement('path'),
      };
      mockConnectionGroup.group.remove = jest.fn();

      mockConnectionUtils.connectionExists.mockReturnValue(true);

      connectionManager.createFinalConnection(
        startNote,
        endNote,
        mockConnectionGroup,
      );

      expect(mockConnectionGroup.group.remove).toHaveBeenCalled();
      expect(mockUtils.log).toHaveBeenCalledWith(
        'Connection already exists between these notes',
      );
    });
  });
});
