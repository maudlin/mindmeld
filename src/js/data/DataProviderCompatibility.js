// src/js/data/DataProviderCompatibility.js
// Compatibility layer for gradual migration to DataProvider architecture

import { DataProviderService } from '../services/DataProviderService.js';
import { eventBus } from '../core/eventBus.js';
import { ORIGIN } from './providers/DataProvider.js';
import { getProviderType, isDebugEnabled } from '../core/featureFlags.js';
import { log } from '../utils/utils.js';

/**
 * DataProviderCompatibility - Manages the gradual migration from legacy dataStore
 * to DataProvider architecture with backward compatibility and rollback support
 */
export class DataProviderCompatibility {
  static _migrationActive = false;
  static _legacyHandlers = new Map();

  /**
   * Migrate event handlers to use DataProvider instead of legacy dataStore
   * This enables the new architecture while preserving fallback capability
   */
  static migrateToProvider() {
    if (this._migrationActive) {
      log('DataProviderCompatibility: Migration already active');
      return;
    }

    try {
      // Store references to legacy handlers for potential rollback
      this._storeLegacyHandlers();

      // Remove legacy handlers to prevent duplication
      this._removeLegacyHandlers();

      // Install DataProvider-based handlers
      this._installProviderHandlers();

      this._migrationActive = true;
      log(
        'DataProviderCompatibility: Successfully migrated to DataProvider handlers',
      );

      if (isDebugEnabled()) {
        console.log(
          `DataProviderCompatibility: Using ${getProviderType()} provider`,
        );
      }
    } catch (error) {
      console.error('DataProviderCompatibility: Migration failed:', error);
      // Attempt rollback on failure
      this.revertToLegacy();
      throw error;
    }
  }

  /**
   * Revert to legacy dataStore handlers
   * Emergency rollback capability for stability
   */
  static revertToLegacy() {
    if (!this._migrationActive) {
      log('DataProviderCompatibility: Already using legacy handlers');
      return;
    }

    try {
      // Remove DataProvider handlers
      this._removeProviderHandlers();

      // Restore legacy handlers
      this._restoreLegacyHandlers();

      this._migrationActive = false;
      log(
        'DataProviderCompatibility: Successfully reverted to legacy handlers',
      );
    } catch (error) {
      console.error('DataProviderCompatibility: Rollback failed:', error);
      throw error;
    }
  }

  /**
   * Check if migration is currently active
   * @returns {boolean}
   */
  static isMigrationActive() {
    return this._migrationActive;
  }

  /**
   * Store legacy event handlers for potential rollback
   * @private
   */
  static _storeLegacyHandlers() {
    // We'll store the handler functions, but since eventBus doesn't expose
    // a way to get existing handlers, we'll implement this as a no-op for now
    // In a real scenario, you'd need to modify eventBus to support handler retrieval
    this._legacyHandlers.set('note.created', 'legacy-handler-placeholder');
    this._legacyHandlers.set('note.updated', 'legacy-handler-placeholder');
  }

  /**
   * Remove legacy handlers to prevent duplication
   * @private
   */
  static _removeLegacyHandlers() {
    // Since we can't selectively remove specific handlers from eventBus,
    // we'll modify the dataStore initialization to be migration-aware instead
    log(
      'DataProviderCompatibility: Legacy handlers management delegated to dataStore',
    );
  }

  /**
   * Install DataProvider-based event handlers
   * @private
   */
  static _installProviderHandlers() {
    // Install note creation handler
    eventBus.on('note.created', this._handleNoteCreated.bind(this));

    // Install note update handler
    eventBus.on('note.updated', this._handleNoteUpdated.bind(this));

    // Install note deletion handler
    eventBus.on('note.deleted', this._handleNoteDeleted.bind(this));

    // Install connection handlers (for future use)
    eventBus.on('connection.created', this._handleConnectionCreated.bind(this));
    eventBus.on('connection.updated', this._handleConnectionUpdated.bind(this));
    eventBus.on('connection.deleted', this._handleConnectionDeleted.bind(this));

    if (isDebugEnabled()) {
      console.log('DataProviderCompatibility: DataProvider handlers installed');
    }
  }

  /**
   * Remove DataProvider handlers during rollback
   * @private
   */
  static _removeProviderHandlers() {
    eventBus.off('note.created', this._handleNoteCreated);
    eventBus.off('note.updated', this._handleNoteUpdated);
    eventBus.off('note.deleted', this._handleNoteDeleted);
    eventBus.off('connection.created', this._handleConnectionCreated);
    eventBus.off('connection.updated', this._handleConnectionUpdated);
    eventBus.off('connection.deleted', this._handleConnectionDeleted);
  }

  /**
   * Restore legacy handlers during rollback
   * @private
   */
  static _restoreLegacyHandlers() {
    // This would restore the original handlers
    // For now, we'll rely on dataStore re-initialization
    log(
      'DataProviderCompatibility: Legacy handlers restoration delegated to dataStore',
    );
  }

  /**
   * Handle note creation through DataProvider
   * @param {Object} noteData - Note creation data
   * @private
   */
  static _handleNoteCreated(noteData) {
    try {
      const dataProvider = DataProviderService.getInstance();

      // Convert position strings to numbers for DataProvider
      const left =
        typeof noteData.left === 'string'
          ? parseInt(noteData.left.replace('px', ''), 10)
          : noteData.left;
      const top =
        typeof noteData.top === 'string'
          ? parseInt(noteData.top.replace('px', ''), 10)
          : noteData.top;

      dataProvider.upsertNote(
        {
          id: noteData.id,
          content: noteData.content || '',
          pos: [left, top],
          color: noteData.color || null,
        },
        { origin: ORIGIN.USER },
      );

      if (isDebugEnabled()) {
        console.log(
          `DataProviderCompatibility: Routed note.created through DataProvider: ${noteData.id}`,
        );
      }
    } catch (error) {
      console.error(
        'DataProviderCompatibility: Failed to handle note.created:',
        error,
      );
      throw error;
    }
  }

  /**
   * Handle note updates through DataProvider
   * @param {Object} noteData - Note update data
   * @private
   */
  static _handleNoteUpdated(noteData) {
    try {
      const dataProvider = DataProviderService.getInstance();

      const updateData = { id: noteData.id };

      if (noteData.content !== undefined) {
        updateData.content = noteData.content;
      }

      if (noteData.left !== undefined || noteData.top !== undefined) {
        const left =
          typeof noteData.left === 'string'
            ? parseInt(noteData.left.replace('px', ''), 10)
            : noteData.left;
        const top =
          typeof noteData.top === 'string'
            ? parseInt(noteData.top.replace('px', ''), 10)
            : noteData.top;
        updateData.pos = [left, top];
      }

      if (noteData.color !== undefined) {
        updateData.color = noteData.color;
      }

      dataProvider.upsertNote(updateData, { origin: ORIGIN.USER });

      if (isDebugEnabled()) {
        console.log(
          `DataProviderCompatibility: Routed note.updated through DataProvider: ${noteData.id}`,
        );
      }
    } catch (error) {
      console.error(
        'DataProviderCompatibility: Failed to handle note.updated:',
        error,
      );
      throw error;
    }
  }

  /**
   * Handle note deletion through DataProvider
   * @param {Object} noteData - Note deletion data
   * @private
   */
  static _handleNoteDeleted(noteData) {
    try {
      const dataProvider = DataProviderService.getInstance();

      dataProvider.deleteNote(noteData.id, { origin: ORIGIN.USER });

      if (isDebugEnabled()) {
        console.log(
          `DataProviderCompatibility: Routed note.deleted through DataProvider: ${noteData.id}`,
        );
      }
    } catch (error) {
      console.error(
        'DataProviderCompatibility: Failed to handle note.deleted:',
        error,
      );
      throw error;
    }
  }

  /**
   * Handle connection creation through DataProvider
   * @param {Object} connData - Connection creation data
   * @private
   */
  static _handleConnectionCreated(connData) {
    try {
      const dataProvider = DataProviderService.getInstance();

      dataProvider.upsertConnection(
        {
          from: connData.from,
          to: connData.to,
          type: connData.type || 1,
        },
        { origin: ORIGIN.USER },
      );

      if (isDebugEnabled()) {
        console.log(
          `DataProviderCompatibility: Routed connection.created through DataProvider`,
        );
      }
    } catch (error) {
      console.error(
        'DataProviderCompatibility: Failed to handle connection.created:',
        error,
      );
      throw error;
    }
  }

  /**
   * Handle connection updates through DataProvider
   * @param {Object} connData - Connection update data
   * @private
   */
  static _handleConnectionUpdated(connData) {
    try {
      const dataProvider = DataProviderService.getInstance();

      dataProvider.upsertConnection(
        {
          id: connData.id,
          from: connData.from,
          to: connData.to,
          type: connData.type,
        },
        { origin: ORIGIN.USER },
      );

      if (isDebugEnabled()) {
        console.log(
          `DataProviderCompatibility: Routed connection.updated through DataProvider`,
        );
      }
    } catch (error) {
      console.error(
        'DataProviderCompatibility: Failed to handle connection.updated:',
        error,
      );
      throw error;
    }
  }

  /**
   * Handle connection deletion through DataProvider
   * @param {Object} connData - Connection deletion data
   * @private
   */
  static _handleConnectionDeleted(connData) {
    try {
      const dataProvider = DataProviderService.getInstance();

      dataProvider.deleteConnection(connData.id, { origin: ORIGIN.USER });

      if (isDebugEnabled()) {
        console.log(
          `DataProviderCompatibility: Routed connection.deleted through DataProvider`,
        );
      }
    } catch (error) {
      console.error(
        'DataProviderCompatibility: Failed to handle connection.deleted:',
        error,
      );
      throw error;
    }
  }
}
