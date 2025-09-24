// tests/unit/services/logger.test.js

describe('Logger Service', () => {
  let Logger, ErrorHandler, LOG_LEVELS, ERROR_SEVERITY;
  let logger, errorHandler;
  let originalConsole;
  let mockConsole;

  beforeEach(async () => {
    // Reset modules
    jest.resetModules();

    // Mock console methods
    originalConsole = global.console;
    mockConsole = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
    };
    global.console = mockConsole;

    // Clear window globals
    if (typeof window !== 'undefined') {
      delete window.MINDMELD_LOG_LEVEL;
    }

    // Import the module after mocking
    const loggerModule = await import('../../../src/js/services/logger.js');
    ({
      Logger,
      ErrorHandler,
      LOG_LEVELS,
      ERROR_SEVERITY,
      logger,
      errorHandler,
    } = loggerModule);
  });

  afterEach(() => {
    // Restore console
    global.console = originalConsole;

    // Clean up window globals
    if (typeof window !== 'undefined') {
      delete window.MINDMELD_LOG_LEVEL;
    }
  });

  describe('Logger Class', () => {
    describe('Environment Detection', () => {
      test('should detect test environment in Jest', () => {
        const testLogger = new Logger();
        expect(testLogger.environment).toBe('test');
      });

      test('should use INFO level in test environment', () => {
        const testLogger = new Logger();
        expect(testLogger.currentLevel).toBe(LOG_LEVELS.INFO);
      });

      test('should respect window.MINDMELD_LOG_LEVEL override', () => {
        // Clean first
        delete window.MINDMELD_LOG_LEVEL;

        Object.defineProperty(window, 'MINDMELD_LOG_LEVEL', {
          value: 'ERROR',
          writable: true,
          configurable: true,
        });

        const testLogger = new Logger();
        expect(testLogger.currentLevel).toBe(LOG_LEVELS.ERROR);

        // Clean after
        delete window.MINDMELD_LOG_LEVEL;
      });

      test('should refresh log level when refreshLogLevel() is called', () => {
        // Ensure clean state
        delete window.MINDMELD_LOG_LEVEL;

        const testLogger = new Logger();
        expect(testLogger.currentLevel).toBe(LOG_LEVELS.INFO);

        // Change override and refresh
        window.MINDMELD_LOG_LEVEL = 'ERROR';
        testLogger.refreshLogLevel();

        expect(testLogger.currentLevel).toBe(LOG_LEVELS.ERROR);
      });
    });

    describe('Logging Methods', () => {
      let testLogger;

      beforeEach(() => {
        // Force DEBUG level for testing all methods
        window.MINDMELD_LOG_LEVEL = 'DEBUG';
        testLogger = new Logger();
      });

      test('should log debug messages when level is DEBUG', () => {
        testLogger.debug('Test debug message', { key: 'value' });

        expect(mockConsole.log).toHaveBeenCalledTimes(1);
        expect(mockConsole.log).toHaveBeenCalledWith(
          expect.stringMatching(/\[.*\] DEBUG: Test debug message \{"key":"value"\}/),
        );
      });

      test('should log info messages when level allows', () => {
        testLogger.info('Test info message', { user: 'testUser' });

        expect(mockConsole.log).toHaveBeenCalledTimes(1);
        expect(mockConsole.log).toHaveBeenCalledWith(
          expect.stringMatching(/\[.*\] INFO: Test info message \{"user":"testUser"\}/),
        );
      });

      test('should log warn messages when level allows', () => {
        testLogger.warn('Test warning message');

        expect(mockConsole.warn).toHaveBeenCalledTimes(1);
        expect(mockConsole.warn).toHaveBeenCalledWith(
          expect.stringMatching(/\[.*\] WARN: Test warning message/),
        );
      });

      test('should log error messages when level allows', () => {
        testLogger.error('Test error message', { error: 'details' });

        expect(mockConsole.error).toHaveBeenCalledTimes(1);
        expect(mockConsole.error).toHaveBeenCalledWith(
          expect.stringMatching(/\[.*\] ERROR: Test error message \{"error":"details"\}/),
        );
      });

      test('should not log messages below current level', () => {
        testLogger.currentLevel = LOG_LEVELS.ERROR;

        testLogger.debug('Should not log');
        testLogger.info('Should not log');
        testLogger.warn('Should not log');

        expect(mockConsole.log).not.toHaveBeenCalled();
        expect(mockConsole.warn).not.toHaveBeenCalled();
      });
    });

    describe('Level Check Methods', () => {
      test('should correctly report enabled levels', () => {
        const testLogger = new Logger();
        testLogger.currentLevel = LOG_LEVELS.INFO;

        expect(testLogger.isDebugEnabled()).toBe(false);
        expect(testLogger.isInfoEnabled()).toBe(true);
        expect(testLogger.isWarnEnabled()).toBe(true);
        expect(testLogger.isErrorEnabled()).toBe(true);
      });
    });

    describe('Configuration', () => {
      test('should return current configuration', () => {
        const testLogger = new Logger();
        testLogger.currentLevel = LOG_LEVELS.WARN;

        const config = testLogger.getConfig();

        expect(config).toEqual({
          environment: expect.any(String),
          currentLevel: LOG_LEVELS.WARN,
          levelName: 'WARN',
        });
      });
    });
  });

  describe('ErrorHandler Class', () => {
    let testLogger;
    let testErrorHandler;
    let mockAlert;

    beforeEach(() => {
      testLogger = new Logger();
      testErrorHandler = new ErrorHandler(testLogger);

      // Mock window.alert
      mockAlert = jest.fn();
      global.alert = mockAlert;
    });

    afterEach(() => {
      delete global.alert;
    });

    describe('Error Handling', () => {
      test('should handle basic errors with default options', () => {
        const error = new Error('Test error');
        const result = testErrorHandler.handleError(error);

        expect(result).toEqual({
          handled: true,
          errorId: expect.stringMatching(/Unknown:Unknown-\d+/),
          severity: ERROR_SEVERITY.MEDIUM,
          userMessage: 'An error occurred. Please try again.',
        });

        expect(mockConsole.error).toHaveBeenCalledWith(
          expect.stringMatching(/\[.*\] ERROR: Unknown error in Unknown/),
        );
      });

      test('should handle errors with custom options', () => {
        const error = new Error('Custom error');
        const options = {
          component: 'TestComponent',
          operation: 'testOperation',
          severity: ERROR_SEVERITY.HIGH,
          userMessage: 'Custom error message',
          metadata: { userId: '123' },
        };

        const result = testErrorHandler.handleError(error, options);

        expect(result.severity).toBe(ERROR_SEVERITY.HIGH);
        expect(result.userMessage).toBe('Custom error message');

        expect(mockConsole.error).toHaveBeenCalledWith(
          expect.stringMatching(/\[.*\] ERROR: TestComponent error in testOperation/),
        );
      });

      test('should track error counts', () => {
        const error = new Error('Repeated error');
        const options = { component: 'TestComp', operation: 'testOp' };

        testErrorHandler.handleError(error, options);
        testErrorHandler.handleError(error, options);

        const stats = testErrorHandler.getErrorStats();
        expect(stats['TestComp:testOp']).toBe(2);
      });

      test('should handle critical errors with alert', (done) => {
        const error = new Error('Critical error');
        const options = {
          severity: ERROR_SEVERITY.CRITICAL,
          userMessage: 'System failure',
        };

        testErrorHandler.handleError(error, options);

        // Use setTimeout to test the async alert call
        setTimeout(() => {
          expect(mockAlert).toHaveBeenCalledWith(
            'Critical error: System failure\n\nThe page may need to be refreshed.',
          );
          done();
        }, 10);
      });

      test('should clear error statistics', () => {
        const error = new Error('Test error');
        testErrorHandler.handleError(error, { component: 'Test', operation: 'test' });

        expect(testErrorHandler.getErrorStats()['Test:test']).toBe(1);

        testErrorHandler.clearErrorStats();
        expect(testErrorHandler.getErrorStats()).toEqual({});
      });
    });

    describe('Graceful Degradation', () => {
      test('should return operation result when successful', () => {
        const operation = jest.fn().mockReturnValue('success');
        const fallback = jest.fn();

        const result = testErrorHandler.withGracefulDegradation(operation, fallback);

        expect(result).toBe('success');
        expect(operation).toHaveBeenCalled();
        expect(fallback).not.toHaveBeenCalled();
      });

      test('should use fallback value when operation fails', () => {
        const operation = jest.fn().mockImplementation(() => {
          throw new Error('Operation failed');
        });
        const fallback = 'fallback value';

        const result = testErrorHandler.withGracefulDegradation(operation, fallback);

        expect(result).toBe('fallback value');
        expect(operation).toHaveBeenCalled();
      });

      test('should use fallback function when operation fails', () => {
        const operation = jest.fn().mockImplementation(() => {
          throw new Error('Operation failed');
        });
        const fallback = jest.fn().mockReturnValue('fallback result');

        const result = testErrorHandler.withGracefulDegradation(operation, fallback);

        expect(result).toBe('fallback result');
        expect(fallback).toHaveBeenCalled();
      });

      test('should handle fallback function failure', () => {
        const operation = jest.fn().mockImplementation(() => {
          throw new Error('Operation failed');
        });
        const fallback = jest.fn().mockImplementation(() => {
          throw new Error('Fallback failed');
        });

        const result = testErrorHandler.withGracefulDegradation(operation, fallback);

        expect(result).toBeNull();
        expect(mockConsole.error).toHaveBeenCalledTimes(2); // Both errors logged
      });
    });
  });

  describe('Singleton Instances', () => {
    test('should export singleton logger instance', () => {
      expect(logger).toBeInstanceOf(Logger);
    });

    test('should export singleton errorHandler instance', () => {
      expect(errorHandler).toBeInstanceOf(ErrorHandler);
    });

    test('should use same logger instance in errorHandler', () => {
      expect(errorHandler.logger).toBe(logger);
    });
  });

  describe('Performance Optimization', () => {
    test('should have zero runtime cost when logging disabled', () => {
      const testLogger = new Logger();
      testLogger.currentLevel = LOG_LEVELS.ERROR;

      // Mock expensive context building
      const expensiveContext = jest.fn().mockReturnValue({ expensive: 'data' });

      // These should not call the expensive function
      if (testLogger.isDebugEnabled()) {
        testLogger.debug('Debug', expensiveContext());
      }
      if (testLogger.isInfoEnabled()) {
        testLogger.info('Info', expensiveContext());
      }

      expect(expensiveContext).not.toHaveBeenCalled();
      expect(mockConsole.log).not.toHaveBeenCalled();
    });
  });
});