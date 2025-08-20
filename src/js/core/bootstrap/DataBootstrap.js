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
import { appState } from '../../data/observableState.js';
import { ZoomStateService } from '../../services/zoomStateService.js';
import { log } from '../../utils/utils.js';

export class DataBootstrap extends BaseBootstrap {
  constructor() {
    super('DataBootstrap');
    this.stateRestored = false;
  }

  async initialize() {
    // 1. Event bus is already instantiated as singleton, just verify it works
    await this.initializeEventBus();

    // 2. Initialize core data store
    await this.initializeDataStore();

    // 3. Set up state management system
    await this.initializeStateManagement();

    // 4. Set up persistence handlers
    this.setupPersistence();

    return {
      eventBus,
      dataStoreInitialized: true,
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
      initializeDataStore();
      log('DataBootstrap: Data store initialized successfully');
    } catch (error) {
      throw new Error(`Data store initialization failed: ${error.message}`);
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
    await super.cleanup();
    this.stateRestored = false;
  }
}
