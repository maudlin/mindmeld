/**
 * Data Bootstrap Module
 *
 * Initializes the data layer foundation: event bus, data store, and state management.
 * This is the first bootstrap module as other systems depend on these core data services.
 */

import { BaseBootstrap } from './BaseBootstrap.js';
import { eventBus } from '../eventBus.js';
import { initializeDataStore } from '../../data/dataStore.js';
import {
  loadStateFromStorage,
  saveStateToStorage,
  initializeStateManagement,
  shouldRestoreState,
} from '../../data/storageManager.js';
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
      initializeStateManagement();
      log('DataBootstrap: State management initialized');
    } catch (error) {
      console.error('DataBootstrap: State management setup failed:', error);
      // This is not critical, continue without state management
      log('DataBootstrap: Continuing without state management');
    }
  }

  setupPersistence() {
    // Set up automatic state saving before page unload
    window.addEventListener('beforeunload', saveStateToStorage);
    log('DataBootstrap: Persistence handlers configured');
  }

  async restoreState(canvas) {
    if (this.stateRestored) {
      log('DataBootstrap: State already restored, skipping');
      return;
    }

    try {
      if (shouldRestoreState()) {
        loadStateFromStorage(canvas);
        this.stateRestored = true;
        log('DataBootstrap: State restored from storage');
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
    window.removeEventListener('beforeunload', saveStateToStorage);
    this.stateRestored = false;
  }
}
