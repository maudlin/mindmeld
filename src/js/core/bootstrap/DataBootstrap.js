/**
 * Data Bootstrap Module
 *
 * Initializes the data layer foundation: event bus, data store, and state management.
 * This is the first bootstrap module as other systems depend on these core data services.
 */

import { BaseBootstrap } from './BaseBootstrap.js';
import { eventBus } from '../eventBus.js';
import { initializeDataStore } from '../../data/dataStore.js';
import { ConnectionService } from '../../services/connectionService.js';
import { logger } from '../../services/logger.js';
import { appState } from '../../data/observableState.js';
import { ZoomStateService } from '../../services/zoomStateService.js';
import { DataProviderService } from '../../services/DataProviderService.js';
import { persistenceService } from '../../services/PersistenceService.js';
import { isDebugEnabled, getProviderType } from '../featureFlags.js';
export class DataBootstrap extends BaseBootstrap {
  constructor() {
    super('DataBootstrap');
    this.stateRestored = false;
    this._dataProviderUnsubscribe = null;
  }

  async initialize() {
    // 1. Event bus is already instantiated as singleton, just verify it works
    await this.initializeEventBus();

    // 2. Initialize core data store
    await this.initializeDataStore();

    // 3. Initialize DataProvider and set up observers
    await this.initializeDataProvider();

    // 4. Set up state management system
    await this.initializeStateManagement();

    // 5. Set up persistence handlers
    this.setupPersistence();

    return {
      eventBus,
      dataStoreInitialized: true,
      dataProviderReady: true,
      stateManagementReady: true,
    };
  }

  async initializeEventBus() {
    // Test event bus functionality
    const testCallback = () => {};
    eventBus.on('bootstrap.test', testCallback);
    eventBus.emit('bootstrap.test');
    eventBus.off('bootstrap.test', testCallback);

    logger.info('DataBootstrap: Event bus verified and ready');
  }

  async initializeDataStore() {
    try {
      initializeDataStore();
      logger.info('DataBootstrap: Data store initialized successfully');
    } catch (error) {
      throw new Error(`Data store initialization failed: ${error.message}`);
    }
  }

  async initializeDataProvider() {
    try {
      // Get DataProviderService singleton
      const dataProvider = DataProviderService.getInstance();

      // Initialize provider - for now use null mapId (local mode)
      const cleanup = dataProvider.init(null, {
        onReady: () => {
          if (isDebugEnabled()) {
            logger.info(
              `DataBootstrap: DataProvider (${dataProvider.getProviderType()}) ready`,
            );
          }
        },
      });

      // Subscribe to DataProvider changes for debugging/monitoring only
      // Note: LocalJSONProvider now emits events directly, so no routing needed
      this._dataProviderUnsubscribe = dataProvider.subscribe((change) => {
        if (isDebugEnabled()) {
          logger.info(
            'DataBootstrap: DataProvider change (monitoring only)',
            change,
          );
        }
      });

      logger.info(
        `DataBootstrap: DataProvider (${dataProvider.getProviderType()}) initialized with observers`,
      );

      // DataProvider architecture is now the primary system
      // UI components call DataProvider directly, which emits events for coordination
      logger.info(
        `DataBootstrap: DataProvider architecture active (${getProviderType()}Provider)`,
      );

      return cleanup;
    } catch (error) {
      logger.error('DataBootstrap: DataProvider initialization failed:', error);
      throw new Error(`DataProvider initialization failed: ${error.message}`);
    }
  }

  async initializeStateManagement() {
    try {
      // Set up beforeunload event for final save
      if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', () => {
          // observableState automatically saves, but ensure any pending saves complete
          appState.saveToLocalStorage();
        });
      }

      logger.info('DataBootstrap: State management initialized');
    } catch (error) {
      logger.error('State management setup failed:', { error: error });
      // This is not critical, continue without state management
      logger.info('DataBootstrap: Continuing without state management');
    }
  }

  setupPersistence() {
    // observableState handles automatic persistence, no additional setup needed
    logger.info('DataBootstrap: Persistence handlers configured');
  }

  async restoreState() {
    if (this.stateRestored) {
      logger.info('DataBootstrap: State already restored, skipping');
      return;
    }

    try {
      // Initialize PersistenceService and check for stored state
      const hasStoredState = persistenceService.initialize();

      if (hasStoredState) {
        const loadedState = persistenceService.getState();
        logger.info('DataBootstrap: Loaded state from PersistenceService:', {
          noteCount: loadedState.notes.length,
          connectionCount: loadedState.connections.length,
          noteIds: loadedState.notes.map((n) => n.id),
        });
        logger.info('Loaded colorState:', loadedState.colorState);

        // Sync PersistenceService state to appState for UI
        appState.setState(loadedState, true); // silent to avoid autosave

        // Initialize noteIdService with existing IDs to prevent collisions
        const { NoteIdService } = await import(
          '../../services/noteIdService.js'
        );
        NoteIdService.ensureUniqueIds(loadedState.notes);
        logger.info(
          'NoteIdService: Initialized with existing note IDs:',
          loadedState.notes.map((n) => n.id),
        );

        // Apply the loaded state to the UI
        await this.restoreNotesAndConnections(loadedState);

        // Restore zoom level to zoomManager
        ZoomStateService.restoreZoomLevel();

        // Note: Canvas type restoration will be handled after UI is initialized
        // since it requires canvas element to be available

        this.stateRestored = true;
        logger.info('DataBootstrap: State restored from storage');

        // Emit event to notify components that state has been restored
        eventBus.emit('app.state.restored', {
          colorState: loadedState.colorState,
        });
        // Mark as restored
        this.stateRestored = true;
        logger.info(
          'DataBootstrap: State restored successfully from PersistenceService',
        );
      } else {
        logger.info(
          'DataBootstrap: No stored state found, starting with defaults',
        );
        // Initialize with default state
        appState.setState(persistenceService.getState(), true);
      }
    } catch (error) {
      logger.error('State restoration failed:', { error: error });
      logger.info(
        'DataBootstrap: Starting with empty state due to restoration failure',
      );
      // Continue without restored state - not fatal
    }
  }

  async restoreNotesAndConnections(state) {
    const canvas = document.querySelector('#canvas');
    if (!canvas) {
      logger.error('DataBootstrap: Canvas not found for note restoration');
      return;
    }

    logger.info('🔍 TRACE restoreNotesAndConnections called', {
      incomingNoteCount: state.notes.length,
      incomingNoteIds: state.notes.map((n) => n.id),
    });

    // Clear existing notes and connections from DOM
    document.querySelectorAll('.note').forEach((note) => note.remove());
    document.querySelectorAll('g[data-start]').forEach((conn) => conn.remove());

    // Preserve the loaded colorState during restoration
    const loadedColorState = state.colorState || {
      currentColor: 'yellow',
      notes: {},
    };

    // Temporarily disable color application during restoration
    window.noteRestorationInProgress = true;

    // Create notes using NoteBehavior directly for proper ID management
    const { NoteBehavior } = await import(
      '../../interactions/behaviors/NoteBehavior.js'
    );
    const noteBehavior = new NoteBehavior();

    state.notes.forEach((noteData) => {
      logger.info('🔍 TRACE Creating DOM note from data', {
        noteId: noteData.id,
      });
      noteBehavior.createNoteFromData(noteData, canvas);
    });

    // Re-enable color application
    window.noteRestorationInProgress = false;

    // Create connections
    state.connections.forEach((conn) => {
      ConnectionService.createConnection(conn.from, conn.to, conn.type);
    });

    // Update all connections
    ConnectionService.updateConnections();

    // Explicitly sync all restored data to appState - don't rely on events
    appState.setState({
      notes: state.notes, // Explicitly set notes from restored state
      connections: state.connections, // Preserve loaded connections
      colorState: loadedColorState,
      zoomLevel: state.zoomLevel || 5,
      canvasType: state.canvasType || 'Standard Canvas',
    });

    // Emit notes.loaded event for color application
    eventBus.emit('notes.loaded');
    logger.info(
      'Emitted notes.loaded event for color application with colorState:',
      loadedColorState,
    );

    logger.info(
      `Restored ${state.notes.length} notes and ${state.connections.length} connections`,
    );
  }

  async cleanup() {
    // Unsubscribe from DataProvider changes
    if (this._dataProviderUnsubscribe) {
      this._dataProviderUnsubscribe();
      this._dataProviderUnsubscribe = null;
    }

    // Clean up DataProviderService
    try {
      const dataProvider = DataProviderService.getInstance();
      dataProvider.destroy();
    } catch (error) {
      logger.error(
        'DataBootstrap: Error cleaning up DataProviderService:',
        error,
      );
    }

    await super.cleanup();
    this.stateRestored = false;
    this._updatePending = false;
  }
}
