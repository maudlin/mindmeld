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
import { notificationManager } from '../../services/notificationManager.js';
import { ZoomStateService } from '../../services/zoomStateService.js';
import { CanvasStateService } from '../../services/canvasStateService.js';
import { ServerClient } from '../../services/serverClient.js';
import { DataProviderService } from '../../services/DataProviderService.js';
import { log } from '../../utils/utils.js';

export class ServiceBootstrap extends BaseBootstrap {
  constructor() {
    super('ServiceBootstrap');
  }

  async initialize() {
    // Initialize services in dependency order
    await this.initializeDataProviderService();
    await this.initializeNotificationServices();
    await this.initializeNoteServices();
    await this.initializeConnectionServices();
    await this.initializeColorServices();
    await this.initializeStateServices();
    await this.initializeServerServices();
    await this.initializeMenuServices();

    return {
      dataProviderServiceReady: true,
      notificationServiceReady: true,
      noteServiceReady: true,
      connectionServiceReady: true,
      colorServicesReady: true,
      stateServicesReady: true,
      serverServicesReady: true,
      menuServicesReady: true,
    };
  }

  async initializeDataProviderService() {
    try {
      // Initialize DataProviderService singleton
      const dataProviderService = DataProviderService.getInstance();

      // Initialize provider for default map
      dataProviderService.init(null, {
        onReady: () => {
          log('ServiceBootstrap: DataProviderService ready');
        },
      });

      // Make service available globally for debugging in development
      if (
        typeof window !== 'undefined' &&
        process.env.NODE_ENV === 'development'
      ) {
        window.dataProviderServiceDebug = dataProviderService;
      }

      log('ServiceBootstrap: DataProviderService initialized');
    } catch (error) {
      throw new Error(
        `DataProvider service initialization failed: ${error.message}`,
      );
    }
  }

  async initializeNotificationServices() {
    try {
      notificationManager.initialize();
      log('ServiceBootstrap: Notification manager initialized');
    } catch (error) {
      throw new Error(
        `Notification service initialization failed: ${error.message}`,
      );
    }
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

  async initializeStateServices() {
    try {
      ZoomStateService.initialize();
      CanvasStateService.initialize();

      // Debug: expose state services globally for E2E testing
      if (typeof window !== 'undefined') {
        window.stateServicesDebug = {
          ZoomStateService,
          CanvasStateService,
        };
      }

      log('ServiceBootstrap: State services initialized');
    } catch (error) {
      console.error(
        'ServiceBootstrap: State service initialization failed:',
        error,
      );
      // State services are not critical - continue without them
      log('ServiceBootstrap: Continuing without state services');
    }
  }

  async initializeServerServices() {
    try {
      ServerClient.initialize();
      log('ServiceBootstrap: Server services initialized');
    } catch (error) {
      console.error(
        'ServiceBootstrap: Server service initialization failed:',
        error,
      );
      // Server services are not critical - continue without them
      log('ServiceBootstrap: Continuing without server services');
    }
  }

  async initializeMenuServices() {
    try {
      // Menu services now handled by MenuBehavior through InteractionBootstrap
      log('ServiceBootstrap: Menu services delegated to MenuBehavior');
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
