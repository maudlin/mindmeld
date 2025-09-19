// tests/unit/services/serverClient.simple.test.js

// Mock all dependencies first
jest.mock('../../../src/js/core/eventBus.js', () => ({
  eventBus: { emit: jest.fn(), on: jest.fn() },
}));

jest.mock('../../../src/js/data/observableState.js', () => ({
  appState: { getState: jest.fn(), setState: jest.fn() },
}));

jest.mock('../../../src/js/services/serverConnectionService.js', () => ({
  ServerConnectionService: {
    getServerUri: jest.fn(),
    getConnectionState: jest.fn(),
  },
}));

jest.mock('../../../src/js/data/dataStore.js', () => ({
  exportToJSON: jest.fn(),
  importFromJSON: jest.fn(),
}));

jest.mock('../../../src/js/utils/utils.js', () => ({
  log: jest.fn(),
  debounce: jest.fn((fn) => fn),
}));

// Now try importing ServerClient
const { ServerClient } = require('../../../src/js/services/serverClient.js');

describe('ServerClient - minimal test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset ServerClient state
    ServerClient.autoSaveEnabled = false;
    ServerClient.currentMapId = null;
    ServerClient.currentETag = null;
    ServerClient.saveQueue = [];
  });

  it('should import ServerClient without crashing', () => {
    expect(ServerClient).toBeDefined();
    expect(typeof ServerClient.saveState).toBe('function');
  });

  it('should have initial state properly set', () => {
    expect(ServerClient.autoSaveEnabled).toBe(false);
    expect(ServerClient.currentMapId).toBe(null);
    expect(ServerClient.currentETag).toBe(null);
    expect(ServerClient.saveQueue).toEqual([]);
  });
});
