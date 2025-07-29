/**
 * Event Bus Core Functionality Tests
 *
 * Tests the central event communication system that enables
 * decoupled communication between MindMeld components.
 */

import { EventBus, eventBus } from '../../../src/js/core/eventBus.js';

describe('EventBus Core Functionality', () => {
  let testEventBus;

  beforeEach(() => {
    testEventBus = new EventBus();
  });

  afterEach(() => {
    // Clean up global event bus between tests to prevent interference
    eventBus.events = {};
  });

  describe('Basic Event Operations', () => {
    test('should emit and receive events correctly', () => {
      const mockCallback = jest.fn();
      testEventBus.on('test.event', mockCallback);

      testEventBus.emit('test.event', { data: 'test' });

      expect(mockCallback).toHaveBeenCalledWith({ data: 'test' });
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    test('should handle multiple listeners for same event', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const callback3 = jest.fn();

      testEventBus.on('multi.test', callback1);
      testEventBus.on('multi.test', callback2);
      testEventBus.on('multi.test', callback3);

      testEventBus.emit('multi.test', 'shared-data');

      expect(callback1).toHaveBeenCalledWith('shared-data');
      expect(callback2).toHaveBeenCalledWith('shared-data');
      expect(callback3).toHaveBeenCalledWith('shared-data');
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
      expect(callback3).toHaveBeenCalledTimes(1);
    });

    test('should not fail when emitting events with no listeners', () => {
      expect(() => {
        testEventBus.emit('nonexistent.event', 'data');
      }).not.toThrow();
    });

    test('should handle events with no data payload', () => {
      const mockCallback = jest.fn();
      testEventBus.on('no.data.event', mockCallback);

      testEventBus.emit('no.data.event');

      expect(mockCallback).toHaveBeenCalledWith(undefined);
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Event Listener Management', () => {
    test('should successfully remove specific event listeners', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      testEventBus.on('remove.test', callback1);
      testEventBus.on('remove.test', callback2);

      // Remove only callback1
      testEventBus.off('remove.test', callback1);
      testEventBus.emit('remove.test', 'data');

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledWith('data');
    });

    test('should handle removing listeners from non-existent events', () => {
      const callback = jest.fn();

      expect(() => {
        testEventBus.off('nonexistent.event', callback);
      }).not.toThrow();
    });

    test('should handle removing non-existent callbacks', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      testEventBus.on('test.event', callback1);

      expect(() => {
        testEventBus.off('test.event', callback2); // callback2 was never added
      }).not.toThrow();

      // Verify callback1 still works
      testEventBus.emit('test.event', 'data');
      expect(callback1).toHaveBeenCalledWith('data');
    });
  });

  describe('Once-Only Event Handling', () => {
    test('should execute once listeners only one time', () => {
      const mockCallback = jest.fn();
      testEventBus.once('once.test', mockCallback);

      testEventBus.emit('once.test', 'first');
      testEventBus.emit('once.test', 'second');
      testEventBus.emit('once.test', 'third');

      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith('first');
    });

    test('should automatically remove once listeners after execution', () => {
      const mockCallback = jest.fn();
      testEventBus.once('cleanup.test', mockCallback);

      // Verify listener exists
      expect(testEventBus.events['cleanup.test']).toHaveLength(1);

      testEventBus.emit('cleanup.test', 'data');

      // Verify listener was automatically removed and event key cleaned up
      expect(testEventBus.events['cleanup.test']).toBeUndefined();
      expect('cleanup.test' in testEventBus.events).toBe(false);
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    test('should handle multiple once listeners on same event', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      testEventBus.once('multi.once.test', callback1);
      testEventBus.once('multi.once.test', callback2);

      testEventBus.emit('multi.once.test', 'data');

      expect(callback1).toHaveBeenCalledWith('data');
      expect(callback2).toHaveBeenCalledWith('data');

      // Second emit should not trigger either callback
      testEventBus.emit('multi.once.test', 'second-data');

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle errors in one listener without affecting others', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Test error');
      });
      const successCallback = jest.fn();

      // Mock console.error to prevent test output pollution
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      testEventBus.on('error.test', errorCallback);
      testEventBus.on('error.test', successCallback);

      // Should not throw and should execute both callbacks
      expect(() => {
        testEventBus.emit('error.test', 'data');
      }).not.toThrow();

      // Both callbacks should have been called
      expect(errorCallback).toHaveBeenCalledWith('data');
      expect(successCallback).toHaveBeenCalledWith('data');

      // Error should have been logged
      expect(consoleSpy).toHaveBeenCalledWith(
        'Event listener error for "error.test":',
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });

    test('should handle complex data payloads correctly', () => {
      const mockCallback = jest.fn();
      const complexData = {
        nested: {
          object: {
            with: ['arrays', 'and', 'strings'],
            numbers: [1, 2, 3],
            boolean: true,
            nullValue: null,
          },
        },
        function: () => 'test',
      };

      testEventBus.on('complex.data.test', mockCallback);
      testEventBus.emit('complex.data.test', complexData);

      expect(mockCallback).toHaveBeenCalledWith(complexData);
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    test('should maintain event listener order', () => {
      const callOrder = [];
      const callback1 = jest.fn(() => callOrder.push('first'));
      const callback2 = jest.fn(() => callOrder.push('second'));
      const callback3 = jest.fn(() => callOrder.push('third'));

      testEventBus.on('order.test', callback1);
      testEventBus.on('order.test', callback2);
      testEventBus.on('order.test', callback3);

      testEventBus.emit('order.test', 'data');

      expect(callOrder).toEqual(['first', 'second', 'third']);
    });
  });

  describe('Event Naming and Namespacing', () => {
    test('should handle dot-separated event names (namespacing)', () => {
      const noteCallback = jest.fn();
      const connectionCallback = jest.fn();

      testEventBus.on('note.created', noteCallback);
      testEventBus.on('connection.created', connectionCallback);

      testEventBus.emit('note.created', { id: '1' });
      testEventBus.emit('connection.created', { from: '1', to: '2' });

      expect(noteCallback).toHaveBeenCalledWith({ id: '1' });
      expect(connectionCallback).toHaveBeenCalledWith({ from: '1', to: '2' });
      expect(noteCallback).toHaveBeenCalledTimes(1);
      expect(connectionCallback).toHaveBeenCalledTimes(1);
    });

    test('should treat different event names as completely separate', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      testEventBus.on('test.event', callback1);
      testEventBus.on('test.event.similar', callback2);

      testEventBus.emit('test.event', 'data1');

      expect(callback1).toHaveBeenCalledWith('data1');
      expect(callback2).not.toHaveBeenCalled();
    });
  });

  describe('Global Event Bus Instance', () => {
    test('should provide a global eventBus instance', () => {
      expect(eventBus).toBeInstanceOf(EventBus);
    });

    test('should maintain state across multiple references to global instance', () => {
      const callback = jest.fn();

      eventBus.on('global.test', callback);
      eventBus.emit('global.test', 'global-data');

      expect(callback).toHaveBeenCalledWith('global-data');
    });

    test('should allow global instance to be cleaned up', () => {
      const callback = jest.fn();

      eventBus.on('cleanup.global.test', callback);
      expect(Object.keys(eventBus.events)).toContain('cleanup.global.test');

      // Clean up
      eventBus.events = {};
      expect(Object.keys(eventBus.events)).toHaveLength(0);
    });
  });

  describe('Performance and Memory', () => {
    test('should handle large numbers of listeners efficiently', () => {
      const callbacks = [];
      const numCallbacks = 1000;

      // Create many callbacks
      for (let i = 0; i < numCallbacks; i++) {
        const callback = jest.fn();
        callbacks.push(callback);
        testEventBus.on('performance.test', callback);
      }

      const startTime = performance.now();
      testEventBus.emit('performance.test', 'data');
      const endTime = performance.now();

      // Verify all callbacks were called
      callbacks.forEach((callback) => {
        expect(callback).toHaveBeenCalledWith('data');
        expect(callback).toHaveBeenCalledTimes(1);
      });

      // Performance should be reasonable (less than 100ms for 1000 callbacks)
      expect(endTime - startTime).toBeLessThan(100);
    });

    test('should properly clean up event arrays when all listeners removed', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      testEventBus.on('cleanup.array.test', callback1);
      testEventBus.on('cleanup.array.test', callback2);

      expect(testEventBus.events['cleanup.array.test']).toHaveLength(2);

      testEventBus.off('cleanup.array.test', callback1);
      expect(testEventBus.events['cleanup.array.test']).toHaveLength(1);

      testEventBus.off('cleanup.array.test', callback2);
      // Event key should be completely removed from memory
      expect(testEventBus.events['cleanup.array.test']).toBeUndefined();
      expect('cleanup.array.test' in testEventBus.events).toBe(false);
    });
  });
});
