/**
 * Application Bootstrap Behavior Tests
 *
 * Tests the main bootstrap orchestrator that coordinates initialization
 * of all system components in proper order with error handling.
 * Focus on initialization sequence, error recovery, and system integration.
 */

import { AppBootstrap } from '../../../../src/js/core/bootstrap/AppBootstrap.js';

// Mock all bootstrap dependencies
jest.mock('../../../../src/js/core/bootstrap/DataBootstrap.js');
jest.mock('../../../../src/js/core/bootstrap/ServiceBootstrap.js');
jest.mock('../../../../src/js/core/bootstrap/UIBootstrap.js');
jest.mock('../../../../src/js/core/bootstrap/InteractionBootstrap.js');

describe('Application Bootstrap Behavior', () => {
  let appBootstrap;
  let mockConsole;

  beforeEach(() => {
    // Mock console methods to prevent test noise
    mockConsole = {
      error: jest.spyOn(console, 'error').mockImplementation(() => {}),
      log: jest.spyOn(console, 'log').mockImplementation(() => {}),
    };

    appBootstrap = new AppBootstrap();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('Initialization Orchestration', () => {
    it('initializes all bootstrap modules in correct dependency order', async () => {
      // Mock successful initialization for all modules
      appBootstrap.dataBootstrap.safeInitialize = jest
        .fn()
        .mockResolvedValue({ eventBus: {}, dataStoreInitialized: true });
      appBootstrap.serviceBootstrap.safeInitialize = jest
        .fn()
        .mockResolvedValue({ noteServiceReady: true });
      appBootstrap.uiBootstrap.safeInitialize = jest.fn().mockResolvedValue({
        elements: { canvas: document.createElement('canvas') },
        canvasSystemReady: true,
      });
      appBootstrap.interactionBootstrap.safeInitialize = jest
        .fn()
        .mockResolvedValue({ inputSystemReady: true });
      appBootstrap.dataBootstrap.restoreState = jest.fn().mockResolvedValue();

      const result = await appBootstrap.initialize();

      // Verify all modules were initialized
      expect(appBootstrap.dataBootstrap.safeInitialize).toHaveBeenCalledTimes(
        1,
      );
      expect(
        appBootstrap.serviceBootstrap.safeInitialize,
      ).toHaveBeenCalledTimes(1);
      expect(appBootstrap.uiBootstrap.safeInitialize).toHaveBeenCalledTimes(1);
      expect(
        appBootstrap.interactionBootstrap.safeInitialize,
      ).toHaveBeenCalledTimes(1);
      expect(appBootstrap.dataBootstrap.restoreState).toHaveBeenCalledTimes(1);

      expect(result.success).toBe(true);
      expect(appBootstrap.initialized).toBe(true);
    });

    it('prevents duplicate initialization attempts', async () => {
      appBootstrap.initialized = true;

      const result = await appBootstrap.initialize();

      expect(appBootstrap.dataBootstrap.safeInitialize).not.toHaveBeenCalled();
      expect(result).toBeUndefined(); // Returns early
    });
  });

  describe('Error Handling and Recovery', () => {
    it('handles data bootstrap failures gracefully', async () => {
      appBootstrap.dataBootstrap.safeInitialize = jest
        .fn()
        .mockRejectedValue(new Error('Data initialization failed'));
      appBootstrap.handleInitializationFailure = jest.fn().mockResolvedValue();

      await expect(appBootstrap.initialize()).rejects.toThrow(
        'Data initialization failed',
      );

      expect(appBootstrap.handleInitializationFailure).toHaveBeenCalledWith(
        expect.any(Error),
      );
      expect(appBootstrap.initialized).toBe(false);
    });

    it('handles service bootstrap failures with proper cleanup', async () => {
      appBootstrap.dataBootstrap.safeInitialize = jest
        .fn()
        .mockResolvedValue({});
      appBootstrap.serviceBootstrap.safeInitialize = jest
        .fn()
        .mockRejectedValue(new Error('Service failed'));
      appBootstrap.handleInitializationFailure = jest.fn().mockResolvedValue();

      await expect(appBootstrap.initialize()).rejects.toThrow('Service failed');

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] ERROR: AppBootstrap error in initialize/),
      );
    });

    it('attempts graceful degradation when initialization fails', async () => {
      const initError = new Error('Critical system failure');
      appBootstrap.dataBootstrap.safeInitialize = jest
        .fn()
        .mockRejectedValue(initError);

      await expect(appBootstrap.initialize()).rejects.toThrow(
        'Critical system failure',
      );

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] ERROR: AppBootstrap error in initialize/),
      );
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('cleans up all modules in reverse initialization order', async () => {
      appBootstrap.initialized = true;

      // Mock cleanup methods
      appBootstrap.dataBootstrap.cleanup = jest.fn().mockResolvedValue();
      appBootstrap.serviceBootstrap.cleanup = jest.fn().mockResolvedValue();
      appBootstrap.uiBootstrap.cleanup = jest.fn().mockResolvedValue();
      appBootstrap.interactionBootstrap.cleanup = jest.fn().mockResolvedValue();

      await appBootstrap.cleanup();

      // Verify all cleanup methods were called
      expect(appBootstrap.interactionBootstrap.cleanup).toHaveBeenCalledTimes(
        1,
      );
      expect(appBootstrap.uiBootstrap.cleanup).toHaveBeenCalledTimes(1);
      expect(appBootstrap.serviceBootstrap.cleanup).toHaveBeenCalledTimes(1);
      expect(appBootstrap.dataBootstrap.cleanup).toHaveBeenCalledTimes(1);

      expect(appBootstrap.initialized).toBe(false);
    });

    it('handles cleanup errors without failing completely', async () => {
      appBootstrap.initialized = true;

      appBootstrap.interactionBootstrap.cleanup = jest
        .fn()
        .mockRejectedValue(new Error('Cleanup failed'));
      appBootstrap.uiBootstrap.cleanup = jest.fn().mockResolvedValue();
      appBootstrap.serviceBootstrap.cleanup = jest.fn().mockResolvedValue();
      appBootstrap.dataBootstrap.cleanup = jest.fn().mockResolvedValue();

      // Should complete despite cleanup failure
      await appBootstrap.cleanup();

      // Other cleanup methods should still be called
      expect(appBootstrap.dataBootstrap.cleanup).toHaveBeenCalled();
      expect(appBootstrap.initialized).toBe(false);
    });
  });

  describe('Dependency Management', () => {
    it('sets up dependency chains correctly', () => {
      // Mock the dependencies since they come from the BaseBootstrap class
      appBootstrap.serviceBootstrap.dependencies = new Set([
        appBootstrap.dataBootstrap,
      ]);
      appBootstrap.uiBootstrap.dependencies = new Set([
        appBootstrap.serviceBootstrap,
      ]);
      appBootstrap.interactionBootstrap.dependencies = new Set([
        appBootstrap.uiBootstrap,
      ]);

      expect(
        appBootstrap.serviceBootstrap.dependencies.has(
          appBootstrap.dataBootstrap,
        ),
      ).toBe(true);
      expect(
        appBootstrap.uiBootstrap.dependencies.has(
          appBootstrap.serviceBootstrap,
        ),
      ).toBe(true);
      expect(
        appBootstrap.interactionBootstrap.dependencies.has(
          appBootstrap.uiBootstrap,
        ),
      ).toBe(true);
    });

    it('passes correct parameters between bootstrap phases', async () => {
      const mockElements = { canvas: document.createElement('canvas') };

      appBootstrap.dataBootstrap.safeInitialize = jest
        .fn()
        .mockResolvedValue({});
      appBootstrap.serviceBootstrap.safeInitialize = jest
        .fn()
        .mockResolvedValue({});
      appBootstrap.uiBootstrap.safeInitialize = jest
        .fn()
        .mockResolvedValue({ elements: mockElements });
      appBootstrap.interactionBootstrap.safeInitialize = jest
        .fn()
        .mockResolvedValue({});
      appBootstrap.dataBootstrap.restoreState = jest.fn().mockResolvedValue();

      await appBootstrap.initialize();

      // Verify interaction bootstrap is called (elements no longer needed)
      expect(
        appBootstrap.interactionBootstrap.safeInitialize,
      ).toHaveBeenCalledWith();

      // Verify canvas is passed to state restoration
      expect(appBootstrap.dataBootstrap.restoreState).toHaveBeenCalledWith(
        mockElements.canvas,
      );
    });
  });
});
