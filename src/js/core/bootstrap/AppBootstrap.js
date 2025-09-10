/**
 * Application Bootstrap Orchestrator
 *
 * Coordinates the initialization of all bootstrap modules in the correct order
 * with proper error handling and fallback mechanisms.
 */

import { DataBootstrap } from './DataBootstrap.js';
import { ServiceBootstrap } from './ServiceBootstrap.js';
import { UIBootstrap } from './UIBootstrap.js';
import { InteractionBootstrap } from './InteractionBootstrap.js';
import { log } from '../../utils/utils.js';

export class AppBootstrap {
  constructor() {
    this.dataBootstrap = new DataBootstrap();
    this.serviceBootstrap = new ServiceBootstrap();
    this.uiBootstrap = new UIBootstrap();
    this.interactionBootstrap = new InteractionBootstrap();

    // Set up dependency chain
    this.serviceBootstrap.addDependency(this.dataBootstrap);
    this.uiBootstrap.addDependency(this.serviceBootstrap);
    this.interactionBootstrap.addDependency(this.uiBootstrap);

    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) {
      log('AppBootstrap: Already initialized, skipping');
      return;
    }

    try {
      log('AppBootstrap: Starting application initialization...');

      // Phase 1: Data layer foundation
      const dataResult = await this.dataBootstrap.safeInitialize();

      // Phase 2: Service layer
      const serviceResult = await this.serviceBootstrap.safeInitialize();

      // Phase 3: UI layer
      const uiResult = await this.uiBootstrap.safeInitialize();

      // Phase 4: Interaction layer
      const interactionResult =
        await this.interactionBootstrap.safeInitialize();

      // Phase 5: State restoration (after all systems are ready)
      await this.dataBootstrap.restoreState(uiResult.elements.canvas);

      this.initialized = true;
      log('AppBootstrap: Application initialization completed successfully');
      
      // Emit event to signal that all services are ready
      const { eventBus } = await import('../eventBus.js');
      eventBus.emit('app.services.ready');

      return {
        success: true,
        data: dataResult,
        services: serviceResult,
        ui: uiResult,
        interactions: interactionResult,
      };
    } catch (error) {
      console.error('AppBootstrap: Critical initialization failure:', error);
      await this.handleInitializationFailure(error);
      throw error;
    }
  }

  async handleInitializationFailure(error) {
    log('AppBootstrap: Attempting graceful degradation...');

    try {
      // Try to at least get basic functionality working
      // This could show an error message to the user
      console.error(
        'AppBootstrap: Application failed to initialize properly:',
        error.message,
      );

      // In a real implementation, we might show a user-friendly error message
      // or attempt to initialize in a minimal mode
    } catch (recoveryError) {
      console.error('AppBootstrap: Even recovery failed:', recoveryError);
    }
  }

  async cleanup() {
    log('AppBootstrap: Starting application cleanup...');

    // Cleanup in reverse order with error handling
    const cleanupErrors = [];

    try {
      await this.interactionBootstrap.cleanup();
    } catch (error) {
      cleanupErrors.push(`InteractionBootstrap: ${error.message}`);
    }

    try {
      await this.uiBootstrap.cleanup();
    } catch (error) {
      cleanupErrors.push(`UIBootstrap: ${error.message}`);
    }

    try {
      await this.serviceBootstrap.cleanup();
    } catch (error) {
      cleanupErrors.push(`ServiceBootstrap: ${error.message}`);
    }

    try {
      await this.dataBootstrap.cleanup();
    } catch (error) {
      cleanupErrors.push(`DataBootstrap: ${error.message}`);
    }

    if (cleanupErrors.length > 0) {
      console.warn(
        'AppBootstrap: Some cleanup operations failed:',
        cleanupErrors,
      );
    }

    this.initialized = false;
    log('AppBootstrap: Application cleanup completed');
  }
}
