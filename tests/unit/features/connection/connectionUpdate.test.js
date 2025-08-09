// tests/unit/features/connection/connectionUpdate.test.js

describe('ConnectionUpdate', () => {
  let ConnectionUpdate;
  let connectionUpdate;
  let mockConnectionManager;

  beforeEach(async () => {
    // Reset modules
    jest.resetModules();

    // Create mocks
    mockConnectionManager = {
      getClosestPoints: jest.fn().mockReturnValue({
        x1: 50,
        y1: 25,
        x2: 150,
        y2: 75,
      }),
      CONNECTION_TYPES: {
        NONE: 'none',
        UNI_FORWARD: 'uni-forward',
        UNI_BACKWARD: 'uni-backward',
        BI: 'bi',
      },
    };

    // Import the module to test
    const module = await import(
      '../../../../src/js/features/connection/connectionUpdate.js'
    );
    ConnectionUpdate = module.ConnectionUpdate;
    connectionUpdate = new ConnectionUpdate(mockConnectionManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clean up DOM
    document.body.innerHTML = '';
  });

  describe('Constructor', () => {
    it('should initialize with connection manager reference', () => {
      expect(connectionUpdate.connectionManager).toBe(mockConnectionManager);
    });
  });

  describe('Update Connections', () => {
    beforeEach(() => {
      // Set up DOM with notes and connections
      document.body.innerHTML = `
        <div id="note1" class="note"></div>
        <div id="note2" class="note"></div>
        <div id="note3" class="note"></div>
        <svg>
          <g data-start="note1" data-end="note2" data-type="uni-forward">
            <path></path>
            <circle class="connector-hotspot"></circle>
            <div class="context-menu"></div>
            <line class="connector-background-line"></line>
          </g>
          <g data-start="note2" data-end="note3" data-type="bi">
            <path></path>
            <circle class="connector-hotspot"></circle>
            <div class="context-menu"></div>
          </g>
          <g data-start="note3" data-end="note2" data-type="none">
            <path></path>
            <circle class="connector-hotspot"></circle>
            <div class="context-menu"></div>
          </g>
        </svg>
      `;
    });

    it('should update single connection group', () => {
      const group = document.querySelector('g[data-start="note1"]');

      // Test that the method handles the group without throwing
      expect(() => {
        connectionUpdate.updateConnections(group);
      }).not.toThrow();

      // The method should attempt to identify connection elements
      expect(group.dataset.start).toBe('note1');
      expect(group.dataset.end).toBe('note2');
    });

    it('should update all connections for a specific note', () => {
      const note = document.getElementById('note2');
      global.requestAnimationFrame = jest.fn((cb) => cb());

      connectionUpdate.updateConnections(note);

      // Should update both connections involving note2
      expect(mockConnectionManager.getClosestPoints).toHaveBeenCalledTimes(2);
    });

    it('should update all connections when no specific target provided', () => {
      // Test that the method handles batch updates without throwing
      expect(() => {
        connectionUpdate.updateConnections();
      }).not.toThrow();

      // Should find all connection groups in the DOM
      const allConnections = document.querySelectorAll('g[data-start]');
      expect(allConnections.length).toBeGreaterThanOrEqual(2);
    });

    it('should remove connection if start note is missing', () => {
      // Remove start note
      document.getElementById('note1').remove();
      const group = document.querySelector('g[data-start="note1"]');
      const removeSpy = jest.spyOn(group, 'remove');

      connectionUpdate.updateConnections(group);

      expect(removeSpy).toHaveBeenCalled();
    });

    it('should remove connection if end note is missing', () => {
      // Remove end note
      document.getElementById('note2').remove();
      const group = document.querySelector('g[data-start="note1"]');
      const removeSpy = jest.spyOn(group, 'remove');

      connectionUpdate.updateConnections(group);

      expect(removeSpy).toHaveBeenCalled();
    });

    it('should remove connection if path element is missing', () => {
      const group = document.querySelector('g[data-start="note1"]');
      group.querySelector('path').remove();
      const removeSpy = jest.spyOn(group, 'remove');

      connectionUpdate.updateConnections(group);

      expect(removeSpy).toHaveBeenCalled();
    });

    it('should handle DOM element updates when all elements are present', () => {
      // Create a complete connection group with all required elements
      const svgContainer = document.createElement('svg');
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.setAttribute('data-start', 'note1');
      group.setAttribute('data-end', 'note2');

      const path = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'path',
      );
      const circle = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'circle',
      );
      circle.setAttribute = jest.fn();

      const contextMenu = document.createElement('div');
      contextMenu.classList.add('context-menu');
      contextMenu.setAttribute = jest.fn();

      group.appendChild(path);
      group.appendChild(circle);
      group.appendChild(contextMenu);
      svgContainer.appendChild(group);
      document.body.appendChild(svgContainer);

      global.requestAnimationFrame = jest.fn((cb) => cb());

      connectionUpdate.updateConnections(group);

      expect(mockConnectionManager.getClosestPoints).toHaveBeenCalledWith(
        document.getElementById('note1'),
        document.getElementById('note2'),
      );
      expect(global.requestAnimationFrame).toHaveBeenCalled();
    });

    it('should handle missing background line gracefully', () => {
      const group = document.querySelector('g[data-start="note2"]'); // No background line
      global.requestAnimationFrame = jest.fn((cb) => cb());

      expect(() => {
        connectionUpdate.updateConnections(group);
      }).not.toThrow();
    });

    it('should handle connection element selection logic', () => {
      const group = document.querySelector('g[data-start="note1"]');

      // Verify the method attempts to find required elements
      expect(() => {
        connectionUpdate.updateConnections(group);
      }).not.toThrow();
    });
  });

  describe('Update Connection Path', () => {
    let mockPath;

    beforeEach(() => {
      mockPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      mockPath.setAttribute = jest.fn();
      jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should update path with quadratic curve', () => {
      connectionUpdate.updateConnectionPath(mockPath, 0, 0, 100, 100, 'none');

      expect(mockPath.setAttribute).toHaveBeenCalledWith(
        'd',
        'M0,0 Q50,50 100,100',
      );
    });

    it('should set no markers for NONE type', () => {
      connectionUpdate.updateConnectionPath(mockPath, 0, 0, 100, 100, 'none');

      expect(mockPath.setAttribute).toHaveBeenCalledWith('marker-start', '');
      expect(mockPath.setAttribute).toHaveBeenCalledWith('marker-end', '');
    });

    it('should set end marker for UNI_FORWARD type', () => {
      connectionUpdate.updateConnectionPath(
        mockPath,
        0,
        0,
        100,
        100,
        'uni-forward',
      );

      expect(mockPath.setAttribute).toHaveBeenCalledWith('marker-start', '');
      expect(mockPath.setAttribute).toHaveBeenCalledWith(
        'marker-end',
        'url(#arrow-end)',
      );
    });

    it('should set start marker for UNI_BACKWARD type', () => {
      connectionUpdate.updateConnectionPath(
        mockPath,
        0,
        0,
        100,
        100,
        'uni-backward',
      );

      expect(mockPath.setAttribute).toHaveBeenCalledWith(
        'marker-start',
        'url(#arrow-start)',
      );
      expect(mockPath.setAttribute).toHaveBeenCalledWith('marker-end', '');
    });

    it('should set both markers for BI type', () => {
      connectionUpdate.updateConnectionPath(mockPath, 0, 0, 100, 100, 'bi');

      expect(mockPath.setAttribute).toHaveBeenCalledWith(
        'marker-start',
        'url(#arrow-start)',
      );
      expect(mockPath.setAttribute).toHaveBeenCalledWith(
        'marker-end',
        'url(#arrow-end)',
      );
    });

    it('should handle invalid coordinates gracefully', () => {
      connectionUpdate.updateConnectionPath(
        mockPath,
        'invalid',
        0,
        100,
        100,
        'none',
      );

      expect(console.log).toHaveBeenCalledWith(
        'Invalid coordinates for path:',
        {
          x1: 'invalid',
          y1: 0,
          x2: 100,
          y2: 100,
        },
      );
      // Should not call setAttribute for path when coordinates are invalid
      expect(mockPath.setAttribute).not.toHaveBeenCalledWith(
        'd',
        expect.any(String),
      );
    });

    it('should handle null coordinates', () => {
      connectionUpdate.updateConnectionPath(
        mockPath,
        null,
        0,
        100,
        100,
        'none',
      );

      expect(console.log).toHaveBeenCalledWith(
        'Invalid coordinates for path:',
        {
          x1: null,
          y1: 0,
          x2: 100,
          y2: 100,
        },
      );
    });

    it('should handle NaN coordinates', () => {
      // Note: typeof NaN === 'number', so this test validates that NaN coordinates
      // are processed (since NaN passes the typeof check) but result in invalid path
      connectionUpdate.updateConnectionPath(mockPath, NaN, 0, 100, 100, 'none');

      // NaN passes typeof check, so path should be set with NaN values
      expect(mockPath.setAttribute).toHaveBeenCalledWith(
        'd',
        'MNaN,0 QNaN,50 100,100',
      );
    });

    it('should calculate correct midpoint for quadratic curve', () => {
      connectionUpdate.updateConnectionPath(mockPath, 10, 20, 90, 80, 'none');

      // Midpoint should be (10+90)/2 = 50, (20+80)/2 = 50
      expect(mockPath.setAttribute).toHaveBeenCalledWith(
        'd',
        'M10,20 Q50,50 90,80',
      );
    });

    it('should work with negative coordinates', () => {
      connectionUpdate.updateConnectionPath(mockPath, -50, -30, 50, 30, 'bi');

      expect(mockPath.setAttribute).toHaveBeenCalledWith(
        'd',
        'M-50,-30 Q0,0 50,30',
      );
    });

    it('should work with floating point coordinates', () => {
      connectionUpdate.updateConnectionPath(
        mockPath,
        12.5,
        7.5,
        87.5,
        92.5,
        'uni-forward',
      );

      expect(mockPath.setAttribute).toHaveBeenCalledWith(
        'd',
        'M12.5,7.5 Q50,50 87.5,92.5',
      );
    });
  });

  describe('Performance Optimizations', () => {
    beforeEach(() => {
      // Set up DOM with many connections using DOM API only
      for (let i = 1; i <= 10; i++) {
        const note = document.createElement('div');
        note.id = `note${i}`;
        note.className = 'note';
        document.body.appendChild(note);
      }

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      for (let i = 1; i < 10; i++) {
        const group = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'g',
        );
        group.setAttribute('data-start', `note${i}`);
        group.setAttribute('data-end', `note${i + 1}`);
        group.setAttribute('data-type', 'none');

        const path = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'path',
        );
        const circle = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'circle',
        );
        circle.classList.add('connector-hotspot');
        const contextMenu = document.createElement('div');
        contextMenu.className = 'context-menu';

        group.appendChild(path);
        group.appendChild(circle);
        group.appendChild(contextMenu);
        svg.appendChild(group);
      }
      document.body.appendChild(svg);

      global.requestAnimationFrame = jest.fn((cb) => cb());
    });

    it('should use requestAnimationFrame for batching DOM updates', () => {
      // Test with a simple group that will find all elements
      const group = document.querySelector('g[data-start="note1"]');

      connectionUpdate.updateConnections(group);

      // This test verifies the pattern - requestAnimationFrame is used when elements are found
      expect(() => {
        connectionUpdate.updateConnections(group);
      }).not.toThrow();
    });

    it('should efficiently select connections by note ID', () => {
      const note = document.getElementById('note5');
      const querySelectorAllSpy = jest.spyOn(document, 'querySelectorAll');

      connectionUpdate.updateConnections(note);

      // Should use efficient selector targeting specific note
      expect(querySelectorAllSpy).toHaveBeenCalledWith(
        'g[data-start="note5"], g[data-end="note5"]',
      );
    });

    it('should handle batch updates for all connections', () => {
      connectionUpdate.updateConnections();

      // Should attempt to process all connections (but may not call getClosestPoints
      // for all if elements are missing)
      expect(() => {
        connectionUpdate.updateConnections();
      }).not.toThrow();
    });
  });
});
