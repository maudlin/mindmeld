// src/js/services/ProviderCoordinator.js
// Central coordination service for data provider management

import { eventBus } from '../core/eventBus.js';
import { logger } from './logger.js';

/**
 * ProviderCoordinator manages the lifecycle and coordination of data providers
 * including ServerClient, YjsProvider, and PersistenceService.
 *
 * Responsibilities:
 * - Provider registration and validation
 * - Provider switching with state preservation
 * - Conflict detection and resolution
 * - Metadata synchronization across providers
 * - Event coordination for provider lifecycle
 */
export class ProviderCoordinator {
  // Private static fields for provider management
  static #providers = new Map(); // Map<string, Provider>
  static #currentProvider = null;

  // Required interface methods that all providers must implement
  static #REQUIRED_METHODS = [
    'getSnapshot',
    'importJSON',
    'exportJSON',
    'subscribe',
  ];

  /**
   * Register a new data provider
   * @param {Object} provider - Provider instance to register
   * @throws {Error} If provider doesn't implement required interface
   */
  static registerProvider(provider) {
    try {
      // Validate provider has constructor name
      if (
        !provider?.constructor?.name ||
        provider.constructor.name === 'Object'
      ) {
        throw new Error('Provider must have a constructor name');
      }

      const providerName = provider.constructor.name;

      // Check for duplicate registration
      if (this.#providers.has(providerName)) {
        throw new Error(`Provider ${providerName} is already registered`);
      }

      // Validate provider implements required interface
      this.#validateProvider(provider);

      // Register the provider
      this.#providers.set(providerName, provider);

      // Emit registration event
      eventBus.emit('provider.registered', {
        name: providerName,
        provider,
        timestamp: new Date().toISOString(),
      });

      logger.info(`ProviderCoordinator: Registered provider '${providerName}'`);
    } catch (error) {
      logger.error(
        `ProviderCoordinator: Failed to register provider - ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Unregister a provider by name
   * @param {string} providerName - Name of provider to unregister
   * @returns {Object|null} Unregistered provider instance or null if not found
   */
  static unregisterProvider(providerName) {
    const provider = this.#providers.get(providerName);

    if (!provider) {
      return null;
    }

    // Remove from registry
    this.#providers.delete(providerName);

    // If this was the current provider, clear it
    if (this.#currentProvider === provider) {
      this.#currentProvider = null;
    }

    // Emit unregistration event
    eventBus.emit('provider.unregistered', {
      name: providerName,
      provider,
    });

    logger.info(`ProviderCoordinator: Unregistered provider '${providerName}'`);
    return provider;
  }

  /**
   * Get a registered provider by name
   * @param {string} providerName - Name of provider to retrieve
   * @returns {Object|null} Provider instance or null if not found
   */
  static getProvider(providerName) {
    return this.#providers.get(providerName) || null;
  }

  /**
   * Get all registered providers
   * @returns {Array} Array of all registered provider instances
   */
  static getRegisteredProviders() {
    return Array.from(this.#providers.values());
  }

  /**
   * Get currently active provider
   * @returns {Object|null} Current provider instance or null
   */
  static get currentProvider() {
    return this.#currentProvider;
  }

  /**
   * Get names of all registered providers
   * @returns {Array<string>} Array of provider names
   */
  static getProviderNames() {
    return Array.from(this.#providers.keys());
  }

  /**
   * Check if a provider is registered
   * @param {string} providerName - Name of provider to check
   * @returns {boolean} True if provider is registered
   */
  static isProviderRegistered(providerName) {
    return this.#providers.has(providerName);
  }

  /**
   * Get provider registry status summary
   * @returns {Object} Registry status information
   */
  static getRegistryStatus() {
    return {
      totalProviders: this.#providers.size,
      registeredProviders: this.getProviderNames(),
      currentProvider: this.#currentProvider?.constructor?.name || null,
      hasActiveProvider: this.#currentProvider !== null,
    };
  }

  /**
   * Validate that a provider implements the required interface
   * @private
   * @param {Object} provider - Provider to validate
   * @throws {Error} If provider is missing required methods
   */
  static #validateProvider(provider) {
    if (!provider || typeof provider !== 'object') {
      throw new Error('Provider must be a valid object');
    }

    const missingMethods = this.#REQUIRED_METHODS.filter(
      // eslint-disable-next-line security/detect-object-injection
      (method) => typeof provider[method] !== 'function',
    );

    if (missingMethods.length > 0) {
      throw new Error(
        `Provider must implement required interface: ${missingMethods.join(', ')}`,
      );
    }
  }

  /**
   * Reset coordinator state (for testing)
   * @private
   */
  static _reset() {
    this.#providers.clear();
    this.#currentProvider = null;
  }
}
