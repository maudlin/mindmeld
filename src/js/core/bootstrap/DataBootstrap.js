/**
 * Data Bootstrap Module
 *
 * Initializes the data layer foundation: event bus, data store, and state management.
 * This is the first bootstrap module as other systems depend on these core data services.
 */

import { BaseBootstrap } from './BaseBootstrap.js';
import { eventBus } from '../eventBus.js';
import {
  initializeDataStore,
  updateNotesAndConnections,
  addNote,
  updateNote,
} from '../../data/dataStore.js';
import { appState } from '../../data/observableState.js';
import { ZoomStateService } from '../../services/zoomStateService.js';
import { DataProviderService } from '../../services/DataProviderService.js';
import {
  isDebugEnabled,
  isDebounceEnabled,
  getProviderType,
} from '../featureFlags.js';
import { log } from '../../utils/utils.js';

export class DataBootstrap extends BaseBootstrap {
  constructor() {
    super('DataBootstrap');
    this.stateRestored = false;
    this._dataProviderUnsubscribe = null;
    this._updatePending = false; // Guard for debouncing UI updates
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

    log('DataBootstrap: Event bus verified and ready');
  }

  async initializeDataStore() {
    try {
      await initializeDataStore();
      log('DataBootstrap: Data store initialized successfully');
    } catch (error) {
      throw new Error(`Data store initialization failed: ${error.message}`);
    }
  }

  async initializeDataProvider() {
    try {
      // Get DataProviderService singleton
      const dataProvider = DataProviderService.getInstance();

      // Initialize provider - for now use null mapId (local mode)
      const cleanup = await dataProvider.init(null, {
        onReady: () => {
          if (isDebugEnabled()) {
            console.log(
              `DataBootstrap: DataProvider (${dataProvider.getProviderType()}) ready`,
            );
          }
        },
      });

      // Subscribe to DataProvider changes and route them to existing event bus patterns
      this._dataProviderUnsubscribe = dataProvider.subscribe((change) => {
        this._handleProviderChange(change);
      });

      log(
        `DataBootstrap: DataProvider (${dataProvider.getProviderType()}) initialized with observers`,
      );

      // YjsProvider is now the primary architecture - no migration needed
      if (getProviderType() === 'yjs') {
        log('DataBootstrap: YjsProvider architecture active');
      }

      return cleanup;
    } catch (error) {
      console.error(
        'DataBootstrap: DataProvider initialization failed:',
        error,
      );
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

      log('DataBootstrap: State management initialized');
    } catch (error) {
      console.error('DataBootstrap: State management setup failed:', error);
      // This is not critical, continue without state management
      log('DataBootstrap: Continuing without state management');
    }
  }

  setupPersistence() {
    // observableState handles automatic persistence, no additional setup needed
    log('DataBootstrap: Persistence handlers configured');
  }

  /**
   * Handle DataProvider changes and route them to existing event bus patterns
   * This bridges the DataProvider observer system with the existing UI event system
   * @param {Object} change - DataProvider change event
   * @private
   */
  _handleProviderChange(change) {
    if (isDebugEnabled()) {
      console.log('DataBootstrap: Processing provider change', change);
    }

    // Debounce UI updates if enabled to prevent event storms
    if (isDebounceEnabled() && this._updatePending) {
      if (isDebugEnabled()) {
        console.log('DataBootstrap: Debouncing change event', change.type);
      }
      return;
    }

    if (isDebounceEnabled()) {
      this._updatePending = true;
      requestAnimationFrame(() => {
        this._processBatchedChanges(change);
        this._updatePending = false;
      });
    } else {
      this._processBatchedChanges(change);
    }
  }

  /**
   * Process batched changes and emit appropriate event bus events
   * @param {Object} change - DataProvider change event
   * @private
   */
  _processBatchedChanges(change) {
    switch (change.type) {
      case 'notes':
        this._handleNoteChange(change);
        break;
      case 'connections':
        this._handleConnectionChange(change);
        break;
      case 'meta':
        this._handleMetaChange(change);
        break;
      case 'snapshot':
        this._handleSnapshotChange(change);
        break;
      default:
        if (isDebugEnabled()) {
          console.log('DataBootstrap: Unknown change type', change.type);
        }
    }
  }

  /**
   * Handle note changes from DataProvider
   * @param {Object} change
   * @private
   */
  _handleNoteChange(change) {
    if (change.payload.deleted) {
      // Direct appState update - no events
      if (isDebugEnabled()) {
        console.log(
          'DataBootstrap: Handling note deletion in appState for:',
          change.payload.id,
        );
      }
      // Note: deleteNoteById would be needed here, but the DOM note was already removed by user action
      eventBus.emit('note.deleted', {
        id: change.payload.id,
        origin: change.origin,
      });
    } else {
      // For note updates, fetch complete note data and sync directly to appState
      try {
        const dataProvider = DataProviderService.getInstance();
        const snapshot = dataProvider.getSnapshot();
        const note = snapshot.data.n.find((n) => n.i === change.payload.id);

        if (note) {
          if (isDebugEnabled()) {
            console.log('DataBootstrap: Syncing note to appState:', note.i);
          }

          // Direct appState update - no events needed
          const noteData = {
            id: note.i,
            content: note.c || '',
            left: `${note.p[0]}px`,
            top: `${note.p[1]}px`,
            color: note.cl,
          };

          // Check if note exists in appState
          const currentNotes = appState.getState().notes;
          const existingNoteIndex = currentNotes.findIndex(
            (n) => n.id === note.i,
          );

          if (existingNoteIndex >= 0) {
            // Update existing note
            updateNote(note.i, noteData);
          } else {
            // Add new note
            addNote(noteData);
          }
        } else {
          if (isDebugEnabled()) {
            console.log(
              `DataBootstrap: Note ${change.payload.id} not found in snapshot, skipping update`,
            );
          }
        }
      } catch (error) {
        console.error(
          'DataBootstrap: Failed to sync note data to appState:',
          error,
        );
      }
    }

    // Only emit general change event for UI refresh
    eventBus.emit('notes.changed', {
      origin: change.origin,
      type: 'note',
    });
  }

  /**
   * Handle connection changes from DataProvider
   * @param {Object} change
   * @private
   */
  _handleConnectionChange(change) {
    if (change.payload.deleted) {
      eventBus.emit('connection.deleted', {
        id: change.payload.id,
        origin: change.origin,
      });
    } else {
      eventBus.emit('connection.updated', {
        id: change.payload.id,
        origin: change.origin,
      });
    }

    // Emit general notes changed event
    eventBus.emit('notes.changed', {
      origin: change.origin,
      type: 'connection',
    });
  }

  /**
   * Handle metadata changes from DataProvider
   * @param {Object} change
   * @private
   */
  _handleMetaChange(change) {
    eventBus.emit('meta.updated', {
      meta: change.payload.meta,
      origin: change.origin,
    });
  }

  /**
   * Handle snapshot changes (bulk import) from DataProvider
   * @param {Object} change
   * @private
   */
  _handleSnapshotChange(change) {
    // For snapshot changes, trigger a full reload
    eventBus.emit('notes.loaded', {
      origin: change.origin,
    });
  }

  async restoreState() {
    if (this.stateRestored) {
      log('DataBootstrap: State already restored, skipping');
      return;
    }

    try {
      // Check if we should restore state (has localStorage and current state is empty)
      const currentState = appState.getState();
      const hasStoredState = localStorage.getItem('mindmeld_state');

      if (hasStoredState && currentState.notes.length === 0) {
        // Load state from localStorage using observableState
        const restored = appState.loadFromLocalStorage();

        if (restored) {
          const loadedState = appState.getState();
          console.log('DataBootstrap: Loaded state from storage:', loadedState);
          console.log('Loaded colorState:', loadedState.colorState);

          // Apply the loaded state to the UI
          updateNotesAndConnections(loadedState);

          // Restore zoom level to zoomManager
          ZoomStateService.restoreZoomLevel();

          // Note: Canvas type restoration will be handled after UI is initialized
          // since it requires canvas element to be available

          this.stateRestored = true;
          log('DataBootstrap: State restored from storage');

          // Emit event to notify components that state has been restored
          eventBus.emit('app.state.restored', {
            colorState: loadedState.colorState,
          });
        } else {
          log('DataBootstrap: Failed to load state from storage');
        }
      } else {
        log('DataBootstrap: No state to restore or restoration disabled');
      }
    } catch (error) {
      console.error('DataBootstrap: State restoration failed:', error);
      log(
        'DataBootstrap: Starting with empty state due to restoration failure',
      );
      // Continue without restored state - not fatal
    }
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
      console.error(
        'DataBootstrap: Error cleaning up DataProviderService:',
        error,
      );
    }

    await super.cleanup();
    this.stateRestored = false;
    this._updatePending = false;
  }
}
