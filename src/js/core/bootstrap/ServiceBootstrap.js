/**
 * Service Bootstrap Module
 *
 * Initializes the business logic service layer.
 * Depends on DataBootstrap for event bus and data store foundation.
 */

import { BaseBootstrap } from './BaseBootstrap.js';
import { ConnectionService } from '../../services/connectionService.js';
import { NoteEventService } from '../../services/noteEventService.js';
import { connectionManager } from '../../features/connection/connectionManager.js';
import { updateConnectionInDataStore } from '../../data/dataStore.js';
import { ColorPickerEvents } from '../../features/colorPicker/colorPickerEvents.js';
import { NoteColorApplication } from '../../features/note/noteColorApplication.js';
import { KebabMenu } from '../../features/kebabMenu/kebabMenu.js';
import { KebabMenuEvents } from '../../features/kebabMenu/kebabMenuEvents.js';
import { log } from '../../utils/utils.js';

export class ServiceBootstrap extends BaseBootstrap {
  constructor() {
    super('ServiceBootstrap');
  }

  async initialize() {
    // Initialize services in dependency order
    await this.initializeNoteServices();
    await this.initializeConnectionServices();
    await this.initializeColorServices();
    await this.initializeMenuServices();

    return {
      noteServiceReady: true,
      connectionServiceReady: true,
      colorServicesReady: true,
      menuServicesReady: true,
    };
  }

  async initializeNoteServices() {
    try {
      NoteEventService.initialize();
      log('ServiceBootstrap: Note event service initialized');
    } catch (error) {
      throw new Error(`Note service initialization failed: ${error.message}`);
    }
  }

  async initializeConnectionServices() {
    try {
      // Set up connection service with its dependencies
      ConnectionService.setConnectionManager(connectionManager);
      ConnectionService.setDataStoreUpdateCallback(updateConnectionInDataStore);

      log('ServiceBootstrap: Connection service configured and ready');
    } catch (error) {
      throw new Error(
        `Connection service initialization failed: ${error.message}`,
      );
    }
  }

  async initializeColorServices() {
    try {
      ColorPickerEvents.initialize();
      NoteColorApplication.initialize();

      log('ServiceBootstrap: Color services initialized');
    } catch (error) {
      console.error(
        'ServiceBootstrap: Color service initialization failed:',
        error,
      );
      // Color services are not critical - continue without them
      log('ServiceBootstrap: Continuing without color services');
    }
  }

  async initializeMenuServices() {
    try {
      const kebabMenu = new KebabMenu();
      kebabMenu.initialize();

      new KebabMenuEvents();

      log('ServiceBootstrap: Menu services initialized');
    } catch (error) {
      console.error(
        'ServiceBootstrap: Menu service initialization failed:',
        error,
      );
      // Menu services are not critical - continue without them
      log('ServiceBootstrap: Continuing without menu services');
    }
  }

  async cleanup() {
    await super.cleanup();
    // Services don't currently have cleanup methods, but we could add them here
    log('ServiceBootstrap: Services cleaned up');
  }
}
