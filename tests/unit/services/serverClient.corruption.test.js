// tests/unit/services/serverClient.corruption.test.js

describe('ServerClient - Data Validation', () => {
  let ServerClient;

  beforeEach(async () => {
    // Reset modules
    jest.resetModules();

    // Mock dependencies before importing
    jest.doMock('../../../src/js/core/eventBus.js', () => ({
      eventBus: {
        emit: jest.fn(),
      },
    }));

    jest.doMock('../../../src/js/services/serverConnectionService.js', () => ({
      ServerConnectionService: {
        getServerUri: jest.fn(),
        setConnectionStatus: jest.fn(),
      },
    }));

    jest.doMock('../../../src/js/data/dataStore.js', () => ({
      importFromJSON: jest.fn(),
    }));

    jest.doMock('../../../src/js/utils/utils.js', () => ({
      log: jest.fn(),
      debounce: jest.fn((fn, delay) => {
        const debouncedFn = fn;
        debouncedFn._delay = delay;
        return debouncedFn;
      }),
    }));

    // Import the module to test
    const module = await import('../../../src/js/services/serverClient.js');
    ServerClient = module.ServerClient;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateStateData', () => {
    it('should accept valid data with notes and connections', () => {
      const validData = {
        n: [{ i: 'note1', p: [100, 200], c: 'Test Note' }],
        c: [['note1', 'note2', 0]],
      };

      expect(() => {
        ServerClient.validateStateData(validData, 'test-map-id');
      }).not.toThrow();
    });

    it('should accept data with only notes', () => {
      const validData = {
        n: [{ i: 'note1', p: [100, 200], c: 'Test Note' }],
        c: [],
      };

      expect(() => {
        ServerClient.validateStateData(validData, 'test-map-id');
      }).not.toThrow();
    });

    it('should accept data with only connections', () => {
      const validData = {
        n: [],
        c: [['note1', 'note2', 0]],
      };

      expect(() => {
        ServerClient.validateStateData(validData, 'test-map-id');
      }).not.toThrow();
    });

    it('should throw error for null data', () => {
      expect(() => {
        ServerClient.validateStateData(null, 'test-map-id');
      }).toThrow('Invalid state data for map test-map-id: not an object');
    });

    it('should throw error for undefined data', () => {
      expect(() => {
        ServerClient.validateStateData(undefined, 'test-map-id');
      }).toThrow('Invalid state data for map test-map-id: not an object');
    });

    it('should throw error for non-object data', () => {
      expect(() => {
        ServerClient.validateStateData('string data', 'test-map-id');
      }).toThrow('Invalid state data for map test-map-id: not an object');
    });

    it('should throw error for double-wrapped data', () => {
      const corruptData = {
        data: {
          n: [{ i: 'note1', p: [100, 200], c: 'Test Note' }],
          c: [['note1', 'note2', 0]],
        },
      };

      expect(() => {
        ServerClient.validateStateData(corruptData, 'test-map-id');
      }).toThrow(
        'Corrupt state data for map test-map-id: double-wrapped data detected',
      );
    });

    it('should throw error for missing both n and c arrays', () => {
      const corruptData = {
        invalidStructure: 'totally broken',
        randomField: 123,
      };

      expect(() => {
        ServerClient.validateStateData(corruptData, 'test-map-id');
      }).toThrow(
        "Invalid state data for map test-map-id: missing 'n' (notes) and 'c' (connections) arrays",
      );
    });

    it('should throw error for non-array notes', () => {
      const corruptData = {
        n: 'not an array',
        c: [],
      };

      expect(() => {
        ServerClient.validateStateData(corruptData, 'test-map-id');
      }).toThrow(
        "Invalid state data for map test-map-id: 'n' (notes) is not an array",
      );
    });

    it('should throw error for non-array connections', () => {
      const corruptData = {
        n: [],
        c: 'not an array',
      };

      expect(() => {
        ServerClient.validateStateData(corruptData, 'test-map-id');
      }).toThrow(
        "Invalid state data for map test-map-id: 'c' (connections) is not an array",
      );
    });

    it('should throw error for both non-array notes and connections', () => {
      const corruptData = {
        n: 'not an array',
        c: null,
      };

      expect(() => {
        ServerClient.validateStateData(corruptData, 'test-map-id');
      }).toThrow(
        "Invalid state data for map test-map-id: 'n' (notes) is not an array",
      );
    });

    it('should accept empty arrays', () => {
      const emptyData = {
        n: [],
        c: [],
      };

      expect(() => {
        ServerClient.validateStateData(emptyData, 'test-map-id');
      }).not.toThrow();
    });

    it('should accept data with missing c if n is present', () => {
      const dataWithoutConnections = {
        n: [{ i: 'note1' }],
      };

      expect(() => {
        ServerClient.validateStateData(dataWithoutConnections, 'test-map-id');
      }).not.toThrow();
    });

    it('should accept data with missing n if c is present', () => {
      const dataWithoutNotes = {
        c: [['a', 'b', 0]],
      };

      expect(() => {
        ServerClient.validateStateData(dataWithoutNotes, 'test-map-id');
      }).not.toThrow();
    });
  });

  describe('loadState with corrupt data validation', () => {
    let mockCanvas;
    let originalFetch;

    beforeEach(() => {
      // Reset mocks
      jest.clearAllMocks();

      mockCanvas = { id: 'canvas' };

      // Mock DOM
      const mockGetElementById = jest.fn().mockReturnValue(mockCanvas);
      Object.defineProperty(document, 'getElementById', {
        value: mockGetElementById,
        writable: true,
      });

      // Store original fetch and mock it
      originalFetch = global.fetch;
      global.fetch = jest.fn();

      // Reset ServerClient state
      ServerClient.currentMapId = null;
      ServerClient.currentETag = null;
    });

    afterEach(() => {
      // Restore original fetch
      if (originalFetch) {
        global.fetch = originalFetch;
      } else {
        delete global.fetch;
      }
    });

    it('should demonstrate that validation prevents corrupt data from being processed', () => {
      // Test that validateStateData throws for double-wrapped data
      const corruptDoubleWrappedData = {
        data: {
          n: [{ i: 'note1', c: 'Test Note', p: [100, 200] }],
          c: [],
        },
      };

      expect(() => {
        ServerClient.validateStateData(corruptDoubleWrappedData, 'test-map-id');
      }).toThrow(
        'Corrupt state data for map test-map-id: double-wrapped data detected',
      );
    });

    it('should demonstrate that validation prevents invalid data structures from being processed', () => {
      // Test that validateStateData throws for missing required arrays
      const invalidStructureData = {
        invalidField: 'some data',
        anotherField: 123,
      };

      expect(() => {
        ServerClient.validateStateData(invalidStructureData, 'test-map-id');
      }).toThrow(
        "Invalid state data for map test-map-id: missing 'n' (notes) and 'c' (connections) arrays",
      );
    });
  });
});
