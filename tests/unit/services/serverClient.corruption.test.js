// tests/unit/services/serverClient.corruption.test.js

describe('ServerClient - Data Corruption Handling', () => {
  let ServerClient;
  let mockEventBus;
  let mockServerConnectionService;
  let mockDataStore;

  beforeEach(async () => {
    // Reset modules
    jest.resetModules();

    // Create mock objects
    mockEventBus = {
      emit: jest.fn(),
    };

    mockServerConnectionService = {
      getServerUri: jest.fn(),
      setConnectionStatus: jest.fn(),
    };

    mockDataStore = {
      importFromJSON: jest.fn(),
    };

    // Mock dependencies before importing
    jest.doMock('../../../src/js/core/eventBus.js', () => ({
      eventBus: mockEventBus,
    }));

    jest.doMock('../../../src/js/services/serverConnectionService.js', () => ({
      ServerConnectionService: mockServerConnectionService,
    }));

    jest.doMock('../../../src/js/data/dataStore.js', () => mockDataStore);

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

  describe('repairCorruptData', () => {
    it('should auto-repair double-wrapped data', () => {
      const corruptData = {
        data: {
          n: [{ i: 'note1', p: [100, 200], c: 'Test Note' }],
          c: [['note1', 'note2', 0]],
        },
      };

      const result = ServerClient.repairCorruptData(corruptData, 'test-map-id');

      expect(result).toEqual({
        n: [{ i: 'note1', p: [100, 200], c: 'Test Note' }],
        c: [['note1', 'note2', 0]],
      });

      expect(mockEventBus.emit).toHaveBeenCalledWith('server.data.repaired', {
        mapId: 'test-map-id',
        repairType: 'double-wrapped',
        message: 'Automatically repaired double-wrapped data from server',
      });
    });

    it('should handle valid data without changes', () => {
      const validData = {
        n: [{ i: 'note1', p: [100, 200], c: 'Test Note' }],
        c: [['note1', 'note2', 0]],
      };

      const result = ServerClient.repairCorruptData(validData, 'test-map-id');

      expect(result).toEqual(validData);
      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });

    it('should repair data found in state.data wrapper', () => {
      const corruptData = {
        state: {
          data: {
            n: [{ i: 'note1', p: [100, 200], c: 'Test Note' }],
            c: [],
          },
        },
      };

      const result = ServerClient.repairCorruptData(corruptData, 'test-map-id');

      expect(result).toEqual({
        n: [{ i: 'note1', p: [100, 200], c: 'Test Note' }],
        c: [],
      });

      expect(mockEventBus.emit).toHaveBeenCalledWith('server.data.repaired', {
        mapId: 'test-map-id',
        repairType: 'structure-mismatch',
        message: 'Found and extracted data from unexpected structure',
      });
    });

    it('should repair data in expanded format', () => {
      const corruptData = {
        notes: [{ i: 'note1', p: [100, 200], c: 'Test Note' }],
        connections: [['note1', 'note2', 0]],
      };

      const result = ServerClient.repairCorruptData(corruptData, 'test-map-id');

      expect(result).toEqual({
        n: [{ i: 'note1', p: [100, 200], c: 'Test Note' }],
        c: [['note1', 'note2', 0]],
      });

      expect(mockEventBus.emit).toHaveBeenCalledWith('server.data.repaired', {
        mapId: 'test-map-id',
        repairType: 'structure-mismatch',
        message: 'Found and extracted data from unexpected structure',
      });
    });

    it('should emit corrupt data event for unrecoverable data', () => {
      const corruptData = {
        invalidStructure: 'totally broken',
        randomField: 123,
      };

      const result = ServerClient.repairCorruptData(corruptData, 'test-map-id');

      expect(result).toEqual({ n: [], c: [] });

      expect(mockEventBus.emit).toHaveBeenCalledWith('server.data.corrupt', {
        mapId: 'test-map-id',
        rawData: JSON.stringify(corruptData, null, 2),
        error: 'Could not find valid note or connection data',
      });
    });

    it('should handle empty data gracefully', () => {
      const emptyData = {};

      const result = ServerClient.repairCorruptData(emptyData, 'test-map-id');

      expect(result).toEqual({ n: [], c: [] });

      expect(mockEventBus.emit).toHaveBeenCalledWith('server.data.corrupt', {
        mapId: 'test-map-id',
        rawData: JSON.stringify(emptyData, null, 2),
        error: 'Could not find valid note or connection data',
      });
    });

    it('should normalize non-array fields to arrays', () => {
      const badData = {
        n: 'not an array',
        c: null,
      };

      const result = ServerClient.repairCorruptData(badData, 'test-map-id');

      expect(result).toEqual({ n: [], c: [] });
    });

    it('should handle exceptions during repair', () => {
      // Create data that will cause JSON.stringify to throw
      const cyclicData = {};
      cyclicData.self = cyclicData;

      const result = ServerClient.repairCorruptData(cyclicData, 'test-map-id');

      expect(result).toEqual({ n: [], c: [] });

      expect(mockEventBus.emit).toHaveBeenCalledWith('server.data.corrupt', {
        mapId: 'test-map-id',
        rawData: expect.stringContaining('Unable to serialize data'),
        error: 'Could not find valid note or connection data',
      });
    });
  });

  describe('findDataInCorruptStructure', () => {
    it('should find data in state.data pattern', () => {
      const data = {
        state: {
          data: {
            n: [{ i: 'note1' }],
            c: [],
          },
        },
      };

      const result = ServerClient.findDataInCorruptStructure(data);

      expect(result).toEqual({
        n: [{ i: 'note1' }],
        c: [],
      });
    });

    it('should find data in map.data pattern', () => {
      const data = {
        map: {
          data: {
            n: [],
            c: [['a', 'b', 0]],
          },
        },
      };

      const result = ServerClient.findDataInCorruptStructure(data);

      expect(result).toEqual({
        n: [],
        c: [['a', 'b', 0]],
      });
    });

    it('should find data in content field', () => {
      const data = {
        content: {
          n: [{ i: 'note1' }],
          c: [],
        },
      };

      const result = ServerClient.findDataInCorruptStructure(data);

      expect(result).toEqual({
        n: [{ i: 'note1' }],
        c: [],
      });
    });

    it('should convert expanded format', () => {
      const data = {
        notes: [{ i: 'note1' }],
        connections: [['a', 'b', 0]],
      };

      const result = ServerClient.findDataInCorruptStructure(data);

      expect(result).toEqual({
        n: [{ i: 'note1' }],
        c: [['a', 'b', 0]],
      });
    });

    it('should return null for unrecognizable patterns', () => {
      const data = {
        randomField: 'value',
        anotherField: 123,
      };

      const result = ServerClient.findDataInCorruptStructure(data);

      expect(result).toBeNull();
    });

    it('should handle exceptions gracefully', () => {
      // Create data with getter that throws
      const data = {};
      Object.defineProperty(data, 'state', {
        get() {
          throw new Error('Access denied');
        },
      });

      const result = ServerClient.findDataInCorruptStructure(data);

      expect(result).toBeNull();
    });
  });
});
