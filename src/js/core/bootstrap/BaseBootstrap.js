/**
 * Base Bootstrap Module
 *
 * Provides common interface and error handling patterns for all bootstrap modules.
 * Each bootstrap module handles initialization of related system concerns.
 */

import { log } from '../../utils/utils.js';

export class BaseBootstrap {
  constructor(name) {
    this.name = name;
    this.initialized = false;
    this.dependencies = new Set();
  }

  /**
   * Initialize the bootstrap module
   * Must be implemented by subclasses
   */
  // eslint-disable-next-line no-unused-vars
  async initialize(...args) {
    throw new Error(
      `${this.name}: initialize() must be implemented by subclass`,
    );
  }

  /**
   * Add dependency tracking for proper initialization order
   */
  addDependency(bootstrapModule) {
    this.dependencies.add(bootstrapModule);
  }

  /**
   * Check if all dependencies are initialized
   */
  dependenciesReady() {
    for (const dep of this.dependencies) {
      if (!dep.initialized) {
        return false;
      }
    }
    return true;
  }

  /**
   * Safe initialization wrapper with error handling and logging
   */
  async safeInitialize(...args) {
    if (this.initialized) {
      log(`${this.name}: Already initialized, skipping`);
      return true;
    }

    if (!this.dependenciesReady()) {
      throw new Error(
        `${this.name}: Dependencies not ready for initialization`,
      );
    }

    try {
      log(`${this.name}: Starting initialization...`);
      const result = await this.initialize(...args);
      this.initialized = true;
      log(`${this.name}: Initialization completed successfully`);
      return result;
    } catch (error) {
      console.error(`${this.name}: Initialization failed:`, error);
      throw new Error(`${this.name} initialization failed: ${error.message}`);
    }
  }

  /**
   * Cleanup method for testing and shutdown scenarios
   */
  async cleanup() {
    log(`${this.name}: Cleaning up...`);
    this.initialized = false;
  }
}
