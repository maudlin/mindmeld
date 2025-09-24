// Core logging and error handling services
// Provides centralized, configurable logging with environment-based control
// and structured error management with recovery patterns

// Log levels (DEBUG < INFO < WARN < ERROR)
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// Error severity levels
const ERROR_SEVERITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

// Environment detection
function detectEnvironment() {
  // Check for explicit environment variables or build flags
  if (typeof process !== 'undefined' && process.env) {
    return process.env.NODE_ENV || 'development';
  }

  // Browser detection - check hostname patterns
  if (typeof window !== 'undefined') {
    const hostname = window.location?.hostname || '';

    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.')
    ) {
      return 'development';
    }

    if (hostname.includes('staging') || hostname.includes('test')) {
      return 'staging';
    }

    return 'production';
  }

  return 'development';
}

// Get effective log level based on environment and overrides
function getEffectiveLogLevel() {
  // Allow runtime override via window global
  if (typeof window !== 'undefined' && window.MINDMELD_LOG_LEVEL) {
    const override = window.MINDMELD_LOG_LEVEL.toUpperCase();
    if (LOG_LEVELS[override] !== undefined) {
      return LOG_LEVELS[override];
    }
  }

  // Environment-based defaults
  const env = detectEnvironment();
  switch (env) {
    case 'development':
      return LOG_LEVELS.DEBUG;
    case 'staging':
      return LOG_LEVELS.INFO;
    case 'production':
      return LOG_LEVELS.WARN;
    case 'test':
      return LOG_LEVELS.INFO;
    default:
      return LOG_LEVELS.INFO;
  }
}

// Format log message with consistent structure
function formatMessage(level, message, context = {}) {
  const timestamp = new Date().toISOString();
  let contextStr = '';

  if (context && Object.keys(context).length > 0) {
    try {
      contextStr = JSON.stringify(context, null, 2);
    } catch {
      // Handle circular references and other JSON.stringify errors
      contextStr = '[Complex object - serialization failed]';
    }
  }

  return `[${timestamp}] ${level}: ${message}${contextStr ? ' ' + contextStr : ''}`;
}

// Performance-optimized logger - disabled logs have zero runtime cost
class Logger {
  constructor() {
    this.currentLevel = getEffectiveLogLevel();
    this.environment = detectEnvironment();
  }

  // Refresh log level (useful for runtime changes)
  refreshLogLevel() {
    this.currentLevel = getEffectiveLogLevel();
  }

  // Debug level logging - detailed state information
  debug(message, context = {}) {
    if (this.currentLevel <= LOG_LEVELS.DEBUG) {
      console.log(formatMessage('DEBUG', message, context));
    }
  }

  // Info level logging - important application events
  info(message, context = {}) {
    if (this.currentLevel <= LOG_LEVELS.INFO) {
      console.log(formatMessage('INFO', message, context));
    }
  }

  // Warning level logging - potential issues
  warn(message, context = {}) {
    if (this.currentLevel <= LOG_LEVELS.WARN) {
      console.warn(formatMessage('WARN', message, context));
    }
  }

  // Error level logging - serious problems
  error(message, context = {}) {
    if (this.currentLevel <= LOG_LEVELS.ERROR) {
      console.error(formatMessage('ERROR', message, context));
    }
  }

  // Check if a level is enabled (for expensive context building)
  isDebugEnabled() {
    return this.currentLevel <= LOG_LEVELS.DEBUG;
  }

  isInfoEnabled() {
    return this.currentLevel <= LOG_LEVELS.INFO;
  }

  isWarnEnabled() {
    return this.currentLevel <= LOG_LEVELS.WARN;
  }

  isErrorEnabled() {
    return this.currentLevel <= LOG_LEVELS.ERROR;
  }

  // Get current configuration info
  getConfig() {
    return {
      environment: this.environment,
      currentLevel: this.currentLevel,
      levelName: Object.keys(LOG_LEVELS).find(
        (key) => LOG_LEVELS[key] === this.currentLevel,
      ),
    };
  }
}

// Centralized error handling with classification and recovery
class ErrorHandler {
  constructor(logger) {
    this.logger = logger;
    this.errorCounts = new Map();
  }

  // Handle errors with context and recovery strategies
  handleError(error, options = {}) {
    const {
      component = 'Unknown',
      operation = 'Unknown',
      severity = ERROR_SEVERITY.MEDIUM,
      userMessage = 'An error occurred. Please try again.',
      recoverable = true,
      metadata = {},
    } = options;

    // Track error frequency
    const errorKey = `${component}:${operation}`;
    const count = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, count + 1);

    // Structure error context
    const errorContext = {
      component,
      operation,
      severity,
      recoverable,
      errorCount: count + 1,
      timestamp: Date.now(),
      errorMessage: error?.message || String(error),
      stackTrace: error?.stack,
      metadata,
    };

    // Log the error
    this.logger.error(`${component} error in ${operation}`, errorContext);

    // Handle based on severity
    switch (severity) {
      case ERROR_SEVERITY.CRITICAL:
        this._handleCriticalError(error, errorContext, userMessage);
        break;
      case ERROR_SEVERITY.HIGH:
        this._handleHighError(error, errorContext, userMessage);
        break;
      case ERROR_SEVERITY.MEDIUM:
        this._handleMediumError(error, errorContext, userMessage);
        break;
      case ERROR_SEVERITY.LOW:
        this._handleLowError(error, errorContext);
        break;
      default:
        this._handleMediumError(error, errorContext, userMessage);
    }

    return {
      handled: true,
      errorId: `${errorKey}-${Date.now()}`,
      severity,
      userMessage,
    };
  }

  // Execute operation with graceful degradation
  withGracefulDegradation(operation, fallback, options = {}) {
    try {
      return operation();
    } catch (error) {
      this.handleError(error, {
        ...options,
        severity: options.severity || ERROR_SEVERITY.MEDIUM,
      });

      if (typeof fallback === 'function') {
        try {
          return fallback();
        } catch (fallbackError) {
          this.handleError(fallbackError, {
            ...options,
            component: options.component || 'ErrorHandler',
            operation: 'fallback',
            severity: ERROR_SEVERITY.HIGH,
            userMessage:
              'System is experiencing issues. Please refresh the page.',
          });
          return null;
        }
      }

      return fallback;
    }
  }

  // Critical errors - may require page reload
  _handleCriticalError(error, context, userMessage) {
    if (typeof window !== 'undefined') {
      // Show user-friendly message
      setTimeout(() => {
        alert(
          `Critical error: ${userMessage}\n\nThe page may need to be refreshed.`,
        );
      }, 0);
    }
  }

  // High severity errors - show notification
  _handleHighError(error, context, userMessage) {
    if (typeof window !== 'undefined') {
      // Could integrate with a notification system
      console.warn(`User notification: ${userMessage}`);
    }
  }

  // Medium severity errors - log and continue
  _handleMediumError(error, context, userMessage) {
    // Already logged, graceful degradation
    if (context.recoverable && typeof window !== 'undefined') {
      console.info(`Recoverable error: ${userMessage}`);
    }
  }

  // Low severity errors - silent handling
  _handleLowError() {
    // Already logged, no user action needed
  }

  // Get error statistics
  getErrorStats() {
    const stats = {};
    for (const [key, count] of this.errorCounts.entries()) {
      stats[key] = count;
    }
    return stats;
  }

  // Clear error statistics (useful for testing)
  clearErrorStats() {
    this.errorCounts.clear();
  }
}

// Create singleton instances
const logger = new Logger();
const errorHandler = new ErrorHandler(logger);

// Export both individual instances and classes for testing
export {
  logger,
  errorHandler,
  Logger,
  ErrorHandler,
  LOG_LEVELS,
  ERROR_SEVERITY,
};
