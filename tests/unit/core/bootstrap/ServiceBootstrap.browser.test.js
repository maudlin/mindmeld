// tests/unit/core/bootstrap/ServiceBootstrap.browser.test.js
// Test ServiceBootstrap in browser-like environment

import { jest } from '@jest/globals';

describe('ServiceBootstrap Browser Compatibility', () => {
  let ServiceBootstrap;
  let mockDataProviderService;

  beforeEach(async () => {
    // Reset modules
    jest.resetModules();

    // Ensure process is undefined to simulate browser environment
    delete global.process;

    // Mock DataProviderService
    mockDataProviderService = {
      getInstance: jest.fn(() => ({
        init: jest.fn(() => jest.fn()), // returns cleanup function
        isInitialized: jest.fn(() => true),
      })),
    };

    // Mock the DataProviderService import
    jest.doMock('../../../../src/js/services/DataProviderService.js', () => ({
      DataProviderService: mockDataProviderService,
    }));

    // Mock window object
    global.window = {};

    // Import ServiceBootstrap after mocking
    const module = await import(
      '../../../../src/js/core/bootstrap/ServiceBootstrap.js'
    );
    ServiceBootstrap = module.ServiceBootstrap;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete global.window;
  });

  test('should initialize DataProviderService without process.env errors', async () => {
    const bootstrap = new ServiceBootstrap();

    // This should not throw due to process.env.NODE_ENV being undefined
    await expect(
      bootstrap.initializeDataProviderService(),
    ).resolves.not.toThrow();

    // Verify service was initialized
    expect(mockDataProviderService.getInstance).toHaveBeenCalled();
  });

  test('should expose debug object globally in browser environment', async () => {
    const bootstrap = new ServiceBootstrap();

    await bootstrap.initializeDataProviderService();

    // Verify debug object is exposed globally
    expect(global.window.dataProviderServiceDebug).toBeDefined();
  });

  test('should handle missing window object gracefully', async () => {
    delete global.window;

    const bootstrap = new ServiceBootstrap();

    // Should not throw even without window object
    await expect(
      bootstrap.initializeDataProviderService(),
    ).resolves.not.toThrow();
  });
});
