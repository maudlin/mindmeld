// src/js/data/providers/OriginTracker.js
// OriginTracker - Origin marking system to prevent feedback loops in collaborative scenarios

/**
 * OriginTracker manages transaction origin marking to prevent feedback loops
 * in collaborative environments where multiple users edit simultaneously.
 *
 * Key Features:
 * - Origin classification (user, system, collaboration, import)
 * - Feedback loop prevention through origin-based filtering
 * - Update queue management to prevent recursion
 * - Performance monitoring and metrics collection
 * - Integration with WebSocket provider events
 */
export class OriginTracker {
  static ORIGINS = {
    USER: 'user',
    SYSTEM: 'system',
    COLLABORATION: 'collaboration',
    IMPORT: 'import',
  };

  constructor(provider) {
    this.provider = provider;
    this.updateQueue = [];
    this.isProcessing = false;

    // Metrics collection
    this.metrics = {
      user: 0,
      system: 0,
      collaboration: 0,
      import: 0,
      total: 0,
    };

    // Performance tracking
    this.performanceMetrics = {
      totalProcessed: 0,
      totalProcessingTime: 0,
      averageProcessingTime: 0,
    };

    // Warning system
    this.warnings = [];
    this.recentSystemUpdates = [];
    this.systemUpdateWindow = 1000; // 1 second window
    this.maxSystemUpdatesPerWindow = 5;

    // Memory management
    this.maxQueueSize = 1000;
  }

  /**
   * Mark transaction with specific origin
   */
  markOrigin(transaction, origin) {
    if (!transaction) return;

    transaction.origin = origin;

    // Update metrics
    if (Object.prototype.hasOwnProperty.call(this.metrics, origin)) {
      this.metrics[origin]++;
      this.metrics.total++;
    }
  }

  /**
   * Determine if transaction should trigger UI logic
   * Prevents feedback loops from server/collaboration updates
   */
  shouldTriggerUILogic(transaction) {
    if (!transaction || !transaction.origin) {
      return false;
    }

    // Only trigger UI logic for user-initiated changes
    return transaction.origin === OriginTracker.ORIGINS.USER;
  }

  /**
   * Process update with origin marking and filtering
   */
  processUpdate(transaction, origin) {
    if (!transaction) return;

    const startTime = performance.now();

    // Handle queue overflow protection
    if (this.isProcessing) {
      if (this.updateQueue.length >= this.maxQueueSize) {
        // Remove oldest entries to prevent memory leaks
        this.updateQueue.splice(
          0,
          this.updateQueue.length - this.maxQueueSize + 1,
        );
      }

      this.updateQueue.push({ transaction, origin });
      return;
    }

    this.isProcessing = true;

    try {
      // Mark origin
      this.markOrigin(transaction, origin);

      // Track system update frequency for feedback loop detection
      if (origin === OriginTracker.ORIGINS.SYSTEM) {
        this._trackSystemUpdate();
      }

      // Process the update
      if (this.provider && this.provider.handleUpdate) {
        this.provider.handleUpdate(transaction);
      }

      // Update performance metrics
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      this.performanceMetrics.totalProcessed++;
      this.performanceMetrics.totalProcessingTime += processingTime;
      this.performanceMetrics.averageProcessingTime =
        this.performanceMetrics.totalProcessingTime /
        this.performanceMetrics.totalProcessed;
    } finally {
      this.isProcessing = false;

      // Process queued updates
      if (this.updateQueue.length > 0) {
        // Process queue asynchronously to prevent stack overflow
        setTimeout(() => this.processQueue(), 0);
      }
    }
  }

  /**
   * Process queued updates
   */
  async processQueue() {
    while (this.updateQueue.length > 0 && !this.isProcessing) {
      const { transaction, origin } = this.updateQueue.shift();
      this.processUpdate(transaction, origin);
    }
  }

  /**
   * Track system updates for feedback loop detection
   */
  _trackSystemUpdate() {
    const now = Date.now();
    this.recentSystemUpdates.push(now);

    // Clean old updates outside the window
    this.recentSystemUpdates = this.recentSystemUpdates.filter(
      (timestamp) => now - timestamp <= this.systemUpdateWindow,
    );

    // Check for potential feedback loop
    if (this.recentSystemUpdates.length > this.maxSystemUpdatesPerWindow) {
      const warning = 'High frequency system updates detected';
      if (!this.warnings.includes(warning)) {
        this.warnings.push(warning);
        console.warn('OriginTracker:', warning);
      }
    }
  }

  /**
   * Handle WebSocket updates from server
   */
  handleWebSocketUpdate(transaction) {
    this.processUpdate(transaction, OriginTracker.ORIGINS.SYSTEM);
  }

  /**
   * Handle user interaction events
   */
  handleUserInteraction(transaction) {
    this.processUpdate(transaction, OriginTracker.ORIGINS.USER);
  }

  /**
   * Handle collaborative updates from other clients
   */
  handleCollaborativeUpdate(transaction) {
    this.processUpdate(transaction, OriginTracker.ORIGINS.COLLABORATION);
  }

  /**
   * Get origin distribution metrics
   */
  getOriginMetrics() {
    return { ...this.metrics };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      queueLength: this.updateQueue.length,
    };
  }

  /**
   * Get warnings
   */
  getWarnings() {
    return [...this.warnings];
  }

  /**
   * Clear warnings
   */
  clearWarnings() {
    this.warnings = [];
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      user: 0,
      system: 0,
      collaboration: 0,
      import: 0,
      total: 0,
    };

    this.performanceMetrics = {
      totalProcessed: 0,
      totalProcessingTime: 0,
      averageProcessingTime: 0,
    };

    this.recentSystemUpdates = [];
    this.warnings = [];
  }

  /**
   * Get current queue status
   */
  getQueueStatus() {
    return {
      length: this.updateQueue.length,
      isProcessing: this.isProcessing,
      maxSize: this.maxQueueSize,
    };
  }

  /**
   * Configure queue settings
   */
  configureQueue(options = {}) {
    if (options.maxSize !== undefined) {
      this.maxQueueSize = Math.max(100, options.maxSize); // Minimum 100
    }

    if (options.systemUpdateWindow !== undefined) {
      this.systemUpdateWindow = Math.max(500, options.systemUpdateWindow); // Minimum 500ms
    }

    if (options.maxSystemUpdatesPerWindow !== undefined) {
      this.maxSystemUpdatesPerWindow = Math.max(
        3,
        options.maxSystemUpdatesPerWindow,
      ); // Minimum 3
    }
  }

  /**
   * Destroy tracker and cleanup
   */
  destroy() {
    this.updateQueue = [];
    this.isProcessing = false;
    this.recentSystemUpdates = [];
    this.warnings = [];
    this.provider = null;
  }
}
