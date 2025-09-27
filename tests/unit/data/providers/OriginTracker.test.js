// tests/unit/data/providers/OriginTracker.test.js
// TDD Tests for Origin Marking System - Prevents feedback loops in collaborative scenarios

import { jest } from '@jest/globals';

describe('Origin Marking System TDD', () => {
  let OriginTracker;
  let mockTransaction;
  let mockProvider;

  beforeEach(async () => {
    // Reset modules to avoid cached imports
    jest.resetModules();

    // Mock transaction object (Y.js transaction structure)
    mockTransaction = {
      origin: null,
      changed: new Map(),
      afterState: new Map(),
      beforeState: new Map(),
    };

    // Mock provider with origin tracking
    mockProvider = {
      handleUpdate: jest.fn(),
      shouldTriggerUILogic: jest.fn(),
      subscribers: [],
      notifySubscribers: jest.fn(),
    };

    // Import real implementation (GREEN phase)
    const module = await import(
      '../../../../src/js/data/providers/OriginTracker.js'
    );
    OriginTracker = module.OriginTracker;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Origin Classification', () => {
    test('should mark user interactions with origin=user', () => {
      const tracker = new OriginTracker(mockProvider);
      const userTransaction = { ...mockTransaction };

      tracker.markOrigin(userTransaction, OriginTracker.ORIGINS.USER);

      expect(userTransaction.origin).toBe('user');
      expect(tracker.shouldTriggerUILogic(userTransaction)).toBe(true);
    });

    test('should mark server updates with origin=system', () => {
      const tracker = new OriginTracker(mockProvider);
      const serverTransaction = { ...mockTransaction };

      tracker.markOrigin(serverTransaction, OriginTracker.ORIGINS.SYSTEM);

      expect(serverTransaction.origin).toBe('system');
      expect(tracker.shouldTriggerUILogic(serverTransaction)).toBe(false);
    });

    test('should mark collaboration updates with origin=collaboration', () => {
      const tracker = new OriginTracker(mockProvider);
      const collabTransaction = { ...mockTransaction };

      tracker.markOrigin(
        collabTransaction,
        OriginTracker.ORIGINS.COLLABORATION,
      );

      expect(collabTransaction.origin).toBe('collaboration');
      expect(tracker.shouldTriggerUILogic(collabTransaction)).toBe(false);
    });
  });

  describe('Feedback Loop Prevention', () => {
    test('should prevent UI logic for system-originated updates', () => {
      const tracker = new OriginTracker(mockProvider);
      const systemUpdate = { ...mockTransaction, origin: 'system' };

      const shouldTrigger = tracker.shouldTriggerUILogic(systemUpdate);

      expect(shouldTrigger).toBe(false);
    });

    test('should allow UI logic for user-originated updates', () => {
      const tracker = new OriginTracker(mockProvider);
      const userUpdate = { ...mockTransaction, origin: 'user' };

      const shouldTrigger = tracker.shouldTriggerUILogic(userUpdate);

      expect(shouldTrigger).toBe(true);
    });

    test('should handle mixed transaction scenarios', () => {
      const tracker = new OriginTracker(mockProvider);

      // Sequence: user action → system sync → collaboration update
      const userAction = { ...mockTransaction, origin: 'user' };
      const systemSync = { ...mockTransaction, origin: 'system' };
      const collabUpdate = { ...mockTransaction, origin: 'collaboration' };

      expect(tracker.shouldTriggerUILogic(userAction)).toBe(true);
      expect(tracker.shouldTriggerUILogic(systemSync)).toBe(false);
      expect(tracker.shouldTriggerUILogic(collabUpdate)).toBe(false);
    });
  });

  describe('Transaction Processing', () => {
    test('should process updates with origin marking and filtering', () => {
      const tracker = new OriginTracker(mockProvider);
      const rawTransaction = { ...mockTransaction };

      tracker.processUpdate(rawTransaction, OriginTracker.ORIGINS.SYSTEM);

      expect(rawTransaction.origin).toBe('system');
      expect(mockProvider.handleUpdate).toHaveBeenCalledWith(rawTransaction);
    });

    test('should handle queue overflow protection', () => {
      const tracker = new OriginTracker(mockProvider);

      // Configure small queue for testing (minimum is 100)
      tracker.configureQueue({ maxSize: 100 });

      const queueStatus = tracker.getQueueStatus();
      expect(queueStatus.maxSize).toBe(100);
      expect(queueStatus.length).toBe(0);
    });
  });

  describe('Performance Monitoring', () => {
    test('should track origin distribution metrics', () => {
      const tracker = new OriginTracker(mockProvider);

      tracker.markOrigin({ ...mockTransaction }, OriginTracker.ORIGINS.USER);
      tracker.markOrigin({ ...mockTransaction }, OriginTracker.ORIGINS.SYSTEM);
      tracker.markOrigin({ ...mockTransaction }, OriginTracker.ORIGINS.SYSTEM);

      const metrics = tracker.getOriginMetrics();
      expect(metrics.user).toBe(1);
      expect(metrics.system).toBe(2);
      expect(metrics.total).toBe(3);
    });

    test('should provide performance metrics', () => {
      const tracker = new OriginTracker(mockProvider);

      tracker.processUpdate({ ...mockTransaction }, OriginTracker.ORIGINS.USER);

      const perfMetrics = tracker.getPerformanceMetrics();
      expect(perfMetrics.totalProcessed).toBe(1);
      expect(perfMetrics.averageProcessingTime).toBeGreaterThan(0);
    });

    test('should detect high frequency system updates', () => {
      const tracker = new OriginTracker(mockProvider);

      // Configure sensitive detection for testing
      tracker.configureQueue({
        maxSystemUpdatesPerWindow: 3,
        systemUpdateWindow: 1000,
      });

      // Trigger many system updates rapidly
      for (let i = 0; i < 5; i++) {
        tracker.processUpdate(
          { ...mockTransaction },
          OriginTracker.ORIGINS.SYSTEM,
        );
      }

      const warnings = tracker.getWarnings();
      expect(warnings).toContain('High frequency system updates detected');
    });
  });

  describe('WebSocket Integration', () => {
    test('should handle WebSocket updates correctly', () => {
      const tracker = new OriginTracker(mockProvider);
      const wsTransaction = { ...mockTransaction };

      tracker.handleWebSocketUpdate(wsTransaction);

      expect(wsTransaction.origin).toBe('system');
      expect(mockProvider.handleUpdate).toHaveBeenCalledWith(wsTransaction);
    });

    test('should handle user interactions correctly', () => {
      const tracker = new OriginTracker(mockProvider);
      const userTransaction = { ...mockTransaction };

      tracker.handleUserInteraction(userTransaction);

      expect(userTransaction.origin).toBe('user');
      expect(mockProvider.handleUpdate).toHaveBeenCalledWith(userTransaction);
    });

    test('should handle collaborative updates correctly', () => {
      const tracker = new OriginTracker(mockProvider);
      const collabTransaction = { ...mockTransaction };

      tracker.handleCollaborativeUpdate(collabTransaction);

      expect(collabTransaction.origin).toBe('collaboration');
      expect(mockProvider.handleUpdate).toHaveBeenCalledWith(collabTransaction);
    });
  });

  describe('Cleanup and Management', () => {
    test('should support metrics reset', () => {
      const tracker = new OriginTracker(mockProvider);

      tracker.markOrigin({ ...mockTransaction }, OriginTracker.ORIGINS.USER);
      tracker.resetMetrics();

      const metrics = tracker.getOriginMetrics();
      expect(metrics.total).toBe(0);
      expect(metrics.user).toBe(0);
    });

    test('should support queue configuration', () => {
      const tracker = new OriginTracker(mockProvider);

      tracker.configureQueue({
        maxSize: 500,
        systemUpdateWindow: 2000,
        maxSystemUpdatesPerWindow: 10,
      });

      const queueStatus = tracker.getQueueStatus();
      expect(queueStatus.maxSize).toBe(500);
    });

    test('should cleanup properly on destroy', () => {
      const tracker = new OriginTracker(mockProvider);

      tracker.markOrigin({ ...mockTransaction }, OriginTracker.ORIGINS.USER);
      tracker.destroy();

      const queueStatus = tracker.getQueueStatus();
      expect(queueStatus.length).toBe(0);
      expect(tracker.provider).toBeNull();
    });
  });
});
