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
} from '../../data/dataStore.js';
import { logger } from '../../services/logger.js';
import { appState } from '../../data/observableState.js';
import { ZoomStateService } from '../../services/zoomStateService.js';
import { DataProviderService } from '../../services/DataProviderService.js';
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
      // Check if we should restore state (has localStorage and current state is empty)
      const currentState = appState.getState();
      const hasStoredState = localStorage.getItem('mindmeld_state');

      if (hasStoredState && currentState.notes.length === 0) {
        // Load state from localStorage using observableState
        const restored = appState.loadFromLocalStorage();

        if (restored) {
          const loadedState = appState.getState();
          logger.info('DataBootstrap: Loaded state from storage:', loadedState);
          logger.info('Loaded colorState:', loadedState.colorState);

          // Apply the loaded state to the UI
          updateNotesAndConnections(loadedState);

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
        } else {
          logger.info('DataBootstrap: Failed to load state from storage');
        }
      } else {
        logger.info(
          'DataBootstrap: No state to restore or restoration disabled',
        );
      }
    } catch (error) {
      logger.error('State restoration failed:', { error: error });
      logger.info(
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
