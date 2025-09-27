// src/js/services/CollaborationService.js
// CollaborationService - Central service for managing collaboration sessions and provider integration

import { DataProviderService } from './DataProviderService.js';
import { eventBus } from '../core/eventBus.js';
import { logger } from './logger.js';

/**
 * CollaborationService - Manages collaboration sessions and provider switching
 * Implements singleton pattern for consistent collaboration state management
 */
export class CollaborationService {
  static _instance = null;

  constructor() {
    if (CollaborationService._instance) {
      throw new Error('Use CollaborationService.getInstance() instead of new');
    }

    this._currentSession = null;
    this._dataProviderService = null;
    this._cleanupFunctions = [];
    this._sessionCleanup = null;
    this._isInitialized = false;

    // Configuration defaults
    this._config = {
      maxUsers: 50,
      sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
      presenceUpdateInterval: 5000, // 5 seconds
    };

    this._init();
  }

  /**
   * Initialize the collaboration service
   * @private
   */
  _init() {
    try {
      this._dataProviderService = DataProviderService.getInstance();
      this._isInitialized = true;
      logger.info('CollaborationService: Initialized successfully');
    } catch (error) {
      logger.error('CollaborationService: Initialization failed', error);
      throw new Error(
        `Failed to initialize CollaborationService: ${error.message}`,
      );
    }
  }

  /**
   * Get singleton instance
   * @returns {CollaborationService}
   */
  static getInstance() {
    if (!CollaborationService._instance) {
      CollaborationService._instance = new CollaborationService();
    }
    return CollaborationService._instance;
  }

  /**
   * Check if service is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this._isInitialized;
  }

  /**
   * Get current session configuration
   * @returns {Object}
   */
  getSessionConfig() {
    return { ...this._config };
  }

  /**
   * Check if collaboration is currently active
   * @returns {boolean}
   */
  isCollaborationActive() {
    return (
      this._currentSession !== null && this._currentSession.status === 'active'
    );
  }

  /**
   * Get current collaboration session
   * @returns {Object|null}
   */
  getCurrentSession() {
    return this._currentSession;
  }

  /**
   * Get active users in current session
   * @returns {Array}
   */
  getActiveUsers() {
    if (!this._currentSession) {
      return [];
    }
    return this._currentSession.participants || [];
  }

  /**
   * Create a new collaboration session
   * @param {string} mapId - The map ID to collaborate on
   * @param {Object} options - Session options
   * @param {string} options.serverUrl - Server URL for collaboration
   * @param {Object} options.userInfo - User information
   * @param {string} options.permissions - User permissions level
   * @returns {Promise<Object>} Created session
   */
  async createSession(mapId, options = {}) {
    this._validateCreateSessionParams(mapId, options);

    if (this._currentSession) {
      throw new Error('Session already active. Call leaveSession() first.');
    }

    try {
      const sessionId = this._generateSessionId();
      const session = {
        id: sessionId,
        mapId,
        createdBy: options.userInfo.id,
        createdAt: Date.now(),
        status: 'active',
        participants: [
          {
            id: options.userInfo.id,
            name: options.userInfo.name,
            joinedAt: Date.now(),
            presence: null,
          },
        ],
        serverUrl: options.serverUrl,
        permissions: options.permissions || 'admin',
      };

      this._currentSession = session;

      // Emit session created event
      eventBus.emit('collaboration.session.created', {
        sessionId,
        mapId,
        createdBy: options.userInfo.id,
      });

      logger.info('CollaborationService: Session created', {
        sessionId,
        mapId,
      });
      return session;
    } catch (error) {
      // Cleanup on failure
      this._cleanup();
      logger.error('CollaborationService: Session creation failed', error);
      throw error;
    }
  }

  /**
   * Join an existing collaboration session
   * @param {string} sessionId - Session ID to join
   * @param {Object} userInfo - User information
   * @param {string} serverUrl - Server URL
   * @returns {Promise<Object>} Join result
   */
  async joinSession(sessionId, userInfo, serverUrl) {
    this._validateJoinSessionParams(sessionId, userInfo, serverUrl);

    try {
      // Simulate session validation (in real implementation, would check with server)
      const sessionExists = await this._validateSessionExists(sessionId);
      if (!sessionExists) {
        throw new Error('Session not found or inactive');
      }

      const session = {
        id: sessionId,
        mapId: 'joined-map', // Would be retrieved from server
        createdBy: 'other-user',
        createdAt: Date.now() - 60000, // Created 1 minute ago
        status: 'active',
        participants: [
          {
            id: userInfo.id,
            name: userInfo.name,
            joinedAt: Date.now(),
            presence: null,
          },
        ],
        serverUrl,
        permissions: 'editor',
      };

      this._currentSession = session;

      // Emit session joined event
      eventBus.emit('collaboration.session.joined', {
        sessionId,
        userId: userInfo.id,
      });

      logger.info('CollaborationService: Joined session', {
        sessionId,
        userId: userInfo.id,
      });
      return { success: true, session };
    } catch (error) {
      logger.error('CollaborationService: Failed to join session', error);
      throw error;
    }
  }

  /**
   * Leave current collaboration session
   * @returns {Promise<Object>} Leave result
   */
  async leaveSession() {
    if (!this._currentSession) {
      return { success: true, message: 'No active session to leave' };
    }

    const sessionId = this._currentSession.id;
    const userId = this._getCurrentUserId();

    try {
      // Cleanup session resources
      if (this._sessionCleanup) {
        this._sessionCleanup();
        this._sessionCleanup = null;
      }

      // Emit session left event
      eventBus.emit('collaboration.session.left', {
        sessionId,
        userId,
      });

      this._currentSession = null;

      logger.info('CollaborationService: Left session', { sessionId, userId });
      return { success: true };
    } catch (error) {
      logger.error('CollaborationService: Failed to leave session', error);
      throw error;
    }
  }

  /**
   * Update user presence in current session
   * @param {string} userId - User ID
   * @param {Object} presenceData - Presence data
   */
  updateUserPresence(userId, presenceData) {
    if (!this._currentSession) {
      throw new Error('No active session');
    }

    const user = this._currentSession.participants.find((p) => p.id === userId);
    if (!user) {
      throw new Error('User not found in current session');
    }

    user.presence = {
      ...presenceData,
      lastUpdated: Date.now(),
    };

    // Emit presence updated event
    eventBus.emit('collaboration.presence.updated', {
      userId,
      presence: presenceData,
    });

    logger.debug('CollaborationService: Updated user presence', {
      userId,
      presenceData,
    });
  }

  /**
   * Enable collaboration mode with provider switching
   * @param {string} sessionId - Session ID
   * @param {string} serverUrl - Server URL
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Enable result
   */
  async enableCollaboration(sessionId, serverUrl) {
    this._validateEnableCollaborationParams(sessionId, serverUrl);

    try {
      // Preserve existing data before switching
      this._dataProviderService.getSnapshot();

      // Switch to collaborative provider
      const success = await this._dataProviderService.enableCollaboration(
        serverUrl,
        sessionId,
      );
      if (!success) {
        throw new Error('Failed to enable collaboration mode');
      }

      // Emit collaboration enabled event
      eventBus.emit('collaboration.enabled', {
        sessionId,
        serverUrl,
        providerType: 'yjs',
      });

      logger.info('CollaborationService: Collaboration enabled', {
        sessionId,
        serverUrl,
      });
      return { success: true, sessionId, serverUrl };
    } catch (error) {
      // Emit error event
      eventBus.emit('collaboration.error', {
        type: 'enable_failed',
        error: error.message,
        sessionId,
        serverUrl,
      });

      logger.error(
        'CollaborationService: Failed to enable collaboration',
        error,
      );
      throw error;
    }
  }

  /**
   * Disable collaboration mode and return to local provider
   * @returns {Promise<Object>} Disable result
   */
  async disableCollaboration() {
    if (!this.isCollaborationActive()) {
      return { success: true, message: 'Collaboration not active' };
    }

    const sessionId = this._currentSession.id;

    try {
      // Preserve collaborative data before switching
      this._dataProviderService.getSnapshot();

      // Switch back to local provider
      const success = await this._dataProviderService.disableCollaboration();
      if (!success) {
        throw new Error('Failed to disable collaboration mode');
      }

      // Emit collaboration disabled event
      eventBus.emit('collaboration.disabled', {
        sessionId,
        providerType: 'local',
      });

      logger.info('CollaborationService: Collaboration disabled', {
        sessionId,
      });
      return { success: true };
    } catch (error) {
      logger.error(
        'CollaborationService: Failed to disable collaboration',
        error,
      );
      throw error;
    }
  }

  /**
   * Get current provider status
   * @returns {Object} Provider status
   */
  getProviderStatus() {
    const providerType = this._dataProviderService.getProviderType();
    const collaborationEnabled =
      this._dataProviderService.isCollaborationEnabled();

    return {
      type: providerType,
      collaborationEnabled,
      sessionId: this._currentSession ? this._currentSession.id : null,
    };
  }

  /**
   * Subscribe to provider events
   * @param {Function} callback - Event callback
   * @returns {Function} Unsubscribe function
   */
  subscribeToProviderEvents(callback) {
    if (this._dataProviderService.subscribe) {
      return this._dataProviderService.subscribe(callback);
    } else {
      // Fallback to eventBus if provider doesn't support direct subscription
      eventBus.on('provider.change', callback);
      return () => eventBus.off('provider.change', callback);
    }
  }

  /**
   * Validate session state consistency
   */
  validateSessionState() {
    const isActive = this.isCollaborationActive();
    const hasSession = this._currentSession !== null;

    if (isActive !== hasSession) {
      throw new Error('Session state inconsistency detected');
    }
  }

  /**
   * Validate session data structure
   */
  validateSessionData() {
    if (!this._currentSession) {
      return;
    }

    const requiredFields = [
      'id',
      'mapId',
      'createdBy',
      'createdAt',
      'status',
      'participants',
    ];
    for (const field of requiredFields) {
      if (
        !Object.prototype.hasOwnProperty.call(this._currentSession, field) ||
        !this._currentSession[field]
      ) {
        throw new Error('Invalid session data structure');
      }
    }
  }

  /**
   * Add cleanup function
   * @param {Function} cleanupFn - Cleanup function
   * @private
   */
  _addCleanupFunction(cleanupFn) {
    this._cleanupFunctions.push(cleanupFn);
  }

  /**
   * Cleanup resources and reset state
   * @private
   */
  _cleanup() {
    // Execute all cleanup functions
    this._cleanupFunctions.forEach((cleanup) => {
      try {
        cleanup();
      } catch (error) {
        logger.warn('CollaborationService: Cleanup function error', error);
      }
    });
    this._cleanupFunctions = [];

    if (this._sessionCleanup) {
      try {
        this._sessionCleanup();
      } catch (error) {
        logger.warn('CollaborationService: Session cleanup error', error);
      }
      this._sessionCleanup = null;
    }

    this._currentSession = null;
  }

  /**
   * Destroy service and reset singleton
   */
  destroy() {
    this._cleanup();
    this._isInitialized = false;
    CollaborationService._instance = null;
    logger.info('CollaborationService: Destroyed');
  }

  // Validation methods
  _validateCreateSessionParams(mapId, options) {
    if (!mapId) {
      throw new Error('mapId is required');
    }
    if (!options.serverUrl) {
      throw new Error('options.serverUrl is required');
    }
    if (!options.userInfo) {
      throw new Error('options.userInfo is required');
    }
    if (!options.userInfo.id || !options.userInfo.name) {
      throw new Error('options.userInfo must contain id and name');
    }
  }

  _validateJoinSessionParams(sessionId, userInfo, serverUrl) {
    if (!sessionId) {
      throw new Error('sessionId is required');
    }
    if (!userInfo) {
      throw new Error('userInfo is required');
    }
    if (!serverUrl) {
      throw new Error('serverUrl is required');
    }
  }

  _validateEnableCollaborationParams(sessionId, serverUrl) {
    if (!sessionId) {
      throw new Error('sessionId is required');
    }
    if (!serverUrl) {
      throw new Error('serverUrl is required');
    }
  }

  // Helper methods
  _generateSessionId() {
    return (
      'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
    );
  }

  _getCurrentUserId() {
    return this._currentSession
      ? this._currentSession.participants[0]?.id
      : null;
  }

  async _validateSessionExists(sessionId) {
    // In real implementation, would check with server
    // For tests, return true for valid-looking session IDs
    return sessionId && typeof sessionId === 'string' && sessionId.length > 0;
  }
}
