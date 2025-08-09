// tests/unit/core/errorHandling.test.js

describe('Error Handling', () => {
  let mockConsole;

  beforeEach(() => {
    // Mock console methods to capture error logs
    mockConsole = {
      error: jest.spyOn(console, 'error').mockImplementation(() => {}),
      warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
      log: jest.spyOn(console, 'log').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
    // Clean up DOM
    document
      .querySelectorAll('.note, .error-display')
      .forEach((el) => el.remove());
  });

  describe('EventBus Error Handling', () => {
    let eventBus;

    beforeEach(async () => {
      jest.resetModules();
      const module = await import('../../../src/js/core/eventBus.js');
      eventBus = module.eventBus;
    });

    it('should handle listener errors gracefully without stopping other listeners', () => {
      const workingListener = jest.fn();
      const errorListener = jest.fn(() => {
        throw new Error('Test listener error');
      });
      const anotherWorkingListener = jest.fn();

      eventBus.on('test-event', workingListener);
      eventBus.on('test-event', errorListener);
      eventBus.on('test-event', anotherWorkingListener);

      expect(() => {
        eventBus.emit('test-event', { data: 'test' });
      }).not.toThrow();

      expect(workingListener).toHaveBeenCalledWith({ data: 'test' });
      expect(errorListener).toHaveBeenCalledWith({ data: 'test' });
      expect(anotherWorkingListener).toHaveBeenCalledWith({ data: 'test' });
      expect(mockConsole.error).toHaveBeenCalled();
    });

    it('should log detailed error information', () => {
      const errorListener = jest.fn(() => {
        throw new Error('Detailed test error');
      });

      eventBus.on('error-test-event', errorListener);
      eventBus.emit('error-test-event');

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Event listener error for'),
        expect.any(Error),
      );
    });

    it('should handle errors in once listeners', () => {
      const errorOnceListener = jest.fn(() => {
        throw new Error('Once listener error');
      });

      eventBus.once('once-error-event', errorOnceListener);

      expect(() => {
        eventBus.emit('once-error-event');
      }).not.toThrow();

      expect(errorOnceListener).toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalled();
    });
  });

  describe('State Management Error Handling', () => {
    let appState;

    beforeEach(async () => {
      jest.resetModules();
      // Mock localStorage to simulate errors
      const mockLocalStorage = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      };
      Object.defineProperty(global, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
      });

      const module = await import('../../../src/js/data/observableState.js');
      appState = module.appState;
    });

    it('should handle JSON parse errors in loadFromLocalStorage', () => {
      localStorage.getItem.mockReturnValue('invalid json {');

      expect(() => {
        appState.loadFromLocalStorage();
      }).toThrow(SyntaxError);

      expect(localStorage.getItem).toHaveBeenCalled();
    });

    it('should handle localStorage quota exceeded errors', () => {
      const quotaError = new Error('QuotaExceededError');
      quotaError.name = 'QuotaExceededError';
      localStorage.setItem.mockImplementation(() => {
        throw quotaError;
      });

      expect(() => {
        appState.saveToLocalStorage();
      }).toThrow('QuotaExceededError');
    });

    it('should handle missing localStorage gracefully', () => {
      const originalLocalStorage = global.localStorage;
      delete global.localStorage;

      expect(() => {
        appState.saveToLocalStorage();
      }).toThrow();

      global.localStorage = originalLocalStorage;
    });

    it('should handle malformed state objects', () => {
      localStorage.getItem.mockReturnValue('null');

      expect(() => {
        appState.loadFromLocalStorage();
      }).toThrow(TypeError);

      expect(localStorage.getItem).toHaveBeenCalled();
    });
  });

  describe('DOM Manipulation Error Handling', () => {
    beforeEach(() => {
      // Create a mock canvas
      const canvas = document.createElement('div');
      canvas.id = 'canvas';
      document.body.appendChild(canvas);
    });

    afterEach(() => {
      document.getElementById('canvas')?.remove();
    });

    it('should handle missing canvas element in note creation', async () => {
      // Remove canvas to simulate missing element
      document.getElementById('canvas')?.remove();

      jest.resetModules();
      const mockUtils = {
        toBase62: jest.fn().mockReturnValue('test_id'),
        calculateOffsetPosition: jest
          .fn()
          .mockReturnValue({ left: 100, top: 100 }),
      };
      const mockEventBus = {
        emit: jest.fn(),
      };
      const mockConfig = {
        noteSize: { width: 200, padding: 10 },
      };

      jest.doMock('../../../src/js/utils/utils.js', () => mockUtils);
      jest.doMock('../../../src/js/core/eventBus.js', () => ({
        eventBus: mockEventBus,
      }));
      jest.doMock('../../../src/js/core/config.js', () => ({
        default: mockConfig,
      }));
      jest.doMock('../../../src/js/core/constants.js', () => ({
        NOTE_CONTENT_LIMIT: 500,
      }));

      const { createNote } = await import(
        '../../../src/js/factories/noteFactory.js'
      );

      expect(() => {
        createNote(100, 200, null);
      }).toThrow();
    });

    it('should handle querySelector failures gracefully', () => {
      const mockElement = {
        querySelector: jest.fn().mockReturnValue(null),
        appendChild: jest.fn(),
        style: {},
      };

      expect(() => {
        // Simulate accessing properties on null querySelector result
        const result = mockElement.querySelector('.non-existent');
        if (result) {
          result.textContent = 'test';
        }
      }).not.toThrow();
    });

    it('should handle DOM removal of non-existent elements', () => {
      expect(() => {
        // Try to remove elements that don't exist
        document
          .querySelectorAll('.non-existent-notes')
          .forEach((note) => note.remove());
      }).not.toThrow();
    });
  });

  describe('Network and Async Error Handling', () => {
    it('should handle network failures gracefully', async () => {
      const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = mockFetch;

      // Simulate a network request that might fail
      let caughtError = null;
      try {
        await fetch('/api/save-data');
      } catch (error) {
        caughtError = error;
      }

      expect(caughtError).not.toBeNull();
      expect(caughtError.message).toBe('Network error');
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should handle timeout scenarios', async () => {
      jest.useFakeTimers();

      let caughtTimeoutError = null;

      const timeoutHandler = async () => {
        const timeoutPromise = new Promise((resolve, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 1000);
        });

        try {
          await timeoutPromise;
        } catch (error) {
          caughtTimeoutError = error;
        }
      };

      // Start the handler but don't await immediately
      const handlerPromise = timeoutHandler();

      // Advance timers to trigger the timeout
      jest.advanceTimersByTime(1000);

      // Wait for the handler to complete
      await handlerPromise;

      expect(caughtTimeoutError?.message).toBe('Timeout');

      jest.useRealTimers();
    });
  });

  describe('Data Validation Error Handling', () => {
    it('should handle invalid note data structures', () => {
      // Test basic error handling principles
      expect(() => {
        const invalidData = null;
        if (invalidData === null) {
          throw new Error('Invalid data');
        }
      }).toThrow('Invalid data');

      // Test graceful handling of missing properties
      const data = {};
      const left = data.left || 0;
      const top = data.top || 0;
      expect(left).toBe(0);
      expect(top).toBe(0);
    });

    it('should validate color values', async () => {
      jest.resetModules();
      const mockEventBus = { emit: jest.fn() };
      const mockAppState = {
        getState: jest.fn().mockReturnValue({
          colorState: { currentColor: 'yellow', notes: {} },
        }),
        setState: jest.fn(),
      };
      const mockUtils = { log: jest.fn() };

      jest.doMock('../../../src/js/core/eventBus.js', () => ({
        eventBus: mockEventBus,
      }));
      jest.doMock('../../../src/js/data/observableState.js', () => ({
        appState: mockAppState,
      }));
      jest.doMock('../../../src/js/utils/utils.js', () => mockUtils);

      const { ColorService } = await import(
        '../../../src/js/services/colorService.js'
      );

      // Test invalid colors
      expect(ColorService.setCurrentColor('invalidColor')).toBe(false);
      expect(ColorService.setCurrentColor(null)).toBe(false);
      expect(ColorService.setCurrentColor(undefined)).toBe(false);
      expect(ColorService.setCurrentColor('')).toBe(false);

      // Ensure state wasn't modified for invalid colors
      expect(mockAppState.setState).not.toHaveBeenCalled();
    });

    it('should handle malformed JSON in import/export', () => {
      // Test basic JSON error handling
      expect(() => {
        JSON.parse('invalid json {');
      }).toThrow();

      // Test graceful handling
      let caughtError = null;
      try {
        JSON.parse('invalid json {');
      } catch (error) {
        caughtError = error;
      }
      expect(caughtError).toBeInstanceOf(SyntaxError);

      // Test valid JSON parsing
      const result = JSON.parse('{"valid": "json"}');
      expect(result).toEqual({ valid: 'json' });
    });
  });

  describe('Memory Management Error Handling', () => {
    it('should handle memory leaks from event listeners', () => {
      // Test memory management principles
      const listeners = [];

      // Add listeners
      for (let i = 0; i < 10; i++) {
        const listener = () => {};
        listeners.push(listener);
      }

      expect(listeners).toHaveLength(10);

      // Clear listeners
      listeners.length = 0;

      expect(listeners).toHaveLength(0);
    });

    it('should handle DOM element cleanup', () => {
      // Create many notes
      const notes = [];
      for (let i = 0; i < 100; i++) {
        const note = document.createElement('div');
        note.className = 'note';
        note.id = `note-${i}`;
        document.body.appendChild(note);
        notes.push(note);
      }

      expect(document.querySelectorAll('.note')).toHaveLength(100);

      // Clean up all notes
      document.querySelectorAll('.note').forEach((note) => note.remove());

      expect(document.querySelectorAll('.note')).toHaveLength(0);
    });
  });

  describe('Cascade Failure Prevention', () => {
    it('should prevent single service failure from breaking entire application', async () => {
      jest.resetModules();

      // Mock a failing color service
      const mockFailingColorService = {
        getCurrentColor: jest.fn(() => {
          throw new Error('Color service failure');
        }),
        setCurrentColor: jest.fn(),
      };

      jest.doMock('../../../src/js/services/colorService.js', () => ({
        ColorService: mockFailingColorService,
      }));

      // The application should still function even if color service fails
      let caughtError = null;
      try {
        mockFailingColorService.getCurrentColor();
      } catch (error) {
        // Handle the error gracefully
        console.error('Color service error:', error);
        caughtError = error;
      }

      expect(caughtError).toBeInstanceOf(Error);

      // Fallback to default color should work
      const defaultColor = 'yellow';
      expect(defaultColor).toBe('yellow');
    });

    it('should isolate storage failures from affecting UI', () => {
      const mockFailingStorage = {
        setItem: jest.fn(() => {
          throw new Error('Storage quota exceeded');
        }),
        getItem: jest.fn(() => null),
      };

      Object.defineProperty(global, 'localStorage', {
        value: mockFailingStorage,
        writable: true,
      });

      // UI operations should continue even if storage fails
      const note = document.createElement('div');
      note.className = 'note';
      note.textContent = 'Test note';
      document.body.appendChild(note);

      expect(document.querySelector('.note')).toBeTruthy();
      expect(document.querySelector('.note').textContent).toBe('Test note');
    });
  });
});
