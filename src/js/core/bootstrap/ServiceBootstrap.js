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
import { logger, errorHandler } from '../../services/logger.js';
import { ZoomStateService } from '../../services/zoomStateService.js';
import { CanvasStateService } from '../../services/canvasStateService.js';
import { ServerClient } from '../../services/serverClient.js';
import { DataProviderService } from '../../services/DataProviderService.js';
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
          logger.info('ServiceBootstrap: DataProviderService ready');
        },
      });

      // Make service available globally for debugging
      if (typeof window !== 'undefined') {
        window.dataProviderServiceDebug = dataProviderService;
      }

      logger.info('ServiceBootstrap: DataProviderService initialized');
    } catch (error) {
      throw new Error(
        `DataProvider service initialization failed: ${error.message}`,
      );
    }
  }

  async initializeNotificationServices() {
    try {
      notificationManager.initialize();
      logger.info('ServiceBootstrap: Notification manager initialized');
    } catch (error) {
      throw new Error(
        `Notification service initialization failed: ${error.message}`,
      );
    }
  }

  async initializeNoteServices() {
    try {
      NoteEventService.initialize();
      logger.info('ServiceBootstrap: Note event service initialized');
    } catch (error) {
      throw new Error(`Note service initialization failed: ${error.message}`);
    }
  }

  async initializeConnectionServices() {
    try {
      // Set up connection service with its dependencies
      ConnectionService.setConnectionManager(connectionManager);
      ConnectionService.setDataStoreUpdateCallback(updateConnectionInDataStore);

      logger.info('ServiceBootstrap: Connection service configured and ready');
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
      logger.info('ServiceBootstrap: Color services initialized');
    } catch (error) {
      errorHandler.handleError(error, {
        component: 'ServiceBootstrap',
        operation: 'initializeColorServices',
        severity: 'MEDIUM',
        recoverable: true,
        userMessage:
          'Color picker may not work properly, but other features are available.',
        metadata: {
          serviceType: 'color',
          fallbackAvailable: true,
        },
      });
      // Color services are not critical - continue without them
      logger.info('ServiceBootstrap: Continuing without color services');
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

      logger.info('ServiceBootstrap: State services initialized');
    } catch (error) {
      errorHandler.handleError(error, {
        component: 'ServiceBootstrap',
        operation: 'initializeStateServices',
        severity: 'MEDIUM',
        recoverable: true,
        userMessage: 'Some state management features may not work optimally.',
        metadata: {
          serviceType: 'state',
          services: ['ZoomStateService', 'CanvasStateService'],
          fallbackAvailable: true,
        },
      });
      // State services are not critical - continue without them
      logger.info('ServiceBootstrap: Continuing without state services');
    }
  }

  async initializeServerServices() {
    try {
      ServerClient.initialize();
      logger.info('ServiceBootstrap: Server services initialized');
    } catch (error) {
      errorHandler.handleError(error, {
        component: 'ServiceBootstrap',
        operation: 'initializeServerServices',
        severity: 'MEDIUM',
        recoverable: true,
        userMessage:
          'Server features may not be available, but local functionality works normally.',
        metadata: {
          serviceType: 'server',
          fallbackAvailable: true,
          localMode: true,
        },
      });
      // Server services are not critical - continue without them
      logger.info('ServiceBootstrap: Continuing without server services');
    }
  }

  async initializeMenuServices() {
    try {
      // Menu services now handled by MenuBehavior through InteractionBootstrap
      logger.info('ServiceBootstrap: Menu services delegated to MenuBehavior');
    } catch (error) {
      errorHandler.handleError(error, {
        component: 'ServiceBootstrap',
        operation: 'initializeMenuServices',
        severity: 'LOW',
        recoverable: true,
        userMessage: 'Menu functionality may be limited.',
        metadata: {
          serviceType: 'menu',
          fallbackAvailable: true,
          handledByBehavior: true,
        },
      });
      // Menu services are not critical - continue without them
      logger.info('ServiceBootstrap: Continuing without menu services');
    }
  }

  async cleanup() {
    await super.cleanup();
    // Services don't currently have cleanup methods, but we could add them here
    logger.info('ServiceBootstrap: Services cleaned up');
  }
}
