/**
 * ServerConnectionBehavior - Handles server connection modal/popup logic
 *
 * Manages the popup UI for server connection configuration.
 * Integrates with ServerConnectionService for actual connection logic.
 * Works with MenuBehavior for menu integration.
 *
 * MM-104: Server Connection Configuration UI
 */

import { eventBus } from '../../core/eventBus.js';
import { ServerConnectionService } from '../../services/serverConnectionService.js';
import { notificationManager } from '../../services/notificationManager.js';
import { logger } from '../../services/logger.js';

export class ServerConnectionBehavior {
  constructor(eventBusInstance = eventBus) {
    this.eventBus = eventBusInstance;
    this.isInitialized = false;
    this.name = 'ServerConnectionBehavior';

    // Modal state
    this.isModalOpen = false;
    this.isConnecting = false;

    // Form event listeners (for cleanup)
    this.formEventListeners = [];

    // DOM element references
    this.modalElement = null;
    this.formElement = null;
    this.uriInput = null;
    this.connectButton = null;
    this.statusElement = null;

    logger.debug('ServerConnectionBehavior created');
  }

  /**
   * Initialize the behavior
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    // Setup event listeners for modal management
    this.setupEventListeners();

    // Get DOM references
    this.cacheElementReferences();

    this.isInitialized = true;
    logger.debug('ServerConnectionBehavior initialized');
  }

  /**
   * Cache DOM element references
   */
  cacheElementReferences() {
    this.modalElement = document.getElementById('server-connection-modal');
    this.formElement = document.getElementById('server-connection-form');
    this.uriInput = document.getElementById('server-uri-input');
    this.connectButton = document.getElementById('connect-server-btn');
    this.statusElement = document.getElementById('connection-status');
  }

  /**
   * Setup event listeners for system integration
   */
  setupEventListeners() {
    // Listen for modal open/close events
    this.eventBus.on('modal.serverConnection.open', (data) => {
      this.showModal(data);
    });

    this.eventBus.on('modal.serverConnection.close', () => {
      this.hideModal();
    });

    logger.info('ServerConnectionBehavior: Event listeners setup');
  }

  /**
   * Show the server connection modal
   * @param {Object} data - Modal data containing currentUrl and connection state
   */
  showModal(data = {}) {
    this.isModalOpen = true;

    if (!this.modalElement) {
      this.cacheElementReferences();
    }

    // Show modal
    if (this.modalElement) {
      this.modalElement.style.display = 'flex';
    } else {
      logger.error('ServerConnectionBehavior: Modal element not found!');
    }

    // Populate current server URI
    const currentUri =
      data.currentUrl || ServerConnectionService.getServerUri() || '';
    if (this.uriInput) {
      this.uriInput.value = currentUri;
    }

    // Update modal title and content based on connection state
    this.updateModalContent(data);

    // Setup form event listeners
    this.setupFormEventListeners();

    // Update UI based on current connection state
    this.updateConnectionUI();

    // Emit event for other systems
    this.eventBus.emit('modal.opened', { type: 'serverConnection' });

    logger.info('Modal shown', {
      currentUri,
      isConnected: data.isConnected,
    });
  }

  /**
   * Update modal content based on connection state
   * @param {Object} data - Connection state data
   */
  updateModalContent(data = {}) {
    const modalTitle = document.getElementById('server-modal-title');
    const connectionState = ServerConnectionService.getConnectionState() || {};
    const isConnected =
      data.isConnected || connectionState.isConnected || false;

    if (!modalTitle) return;

    if (isConnected) {
      // Connected state - show status information
      modalTitle.textContent = 'Server Connection Status';

      // Make form inputs read-only when showing status
      if (this.uriInput) {
        this.uriInput.readOnly = true;
        this.uriInput.classList.add('readonly');
        this.uriInput.setAttribute(
          'aria-label',
          'Current server URL (read-only)',
        );
      }

      // Update button text and behavior for connected state
      if (this.connectButton) {
        this.connectButton.textContent = 'Disconnect from Server';
        this.connectButton.classList.add('disconnect');
        // Change the form action to disconnect
        this.connectButton.setAttribute('data-action', 'disconnect');
        this.connectButton.setAttribute(
          'aria-label',
          'Disconnect from the current server',
        );
      }

      // Add a status indicator or help text to make it clearer
      this.addConnectionStatusInfo();
    } else {
      // Not connected - show connection form
      modalTitle.textContent = 'Connect to Server';

      // Make form inputs editable
      if (this.uriInput) {
        this.uriInput.readOnly = false;
        this.uriInput.classList.remove('readonly');
      }

      // Reset button text and behavior for connection
      if (this.connectButton) {
        this.connectButton.textContent = 'Connect';
        this.connectButton.classList.remove('disconnect');
        this.connectButton.removeAttribute('data-action');
        this.connectButton.removeAttribute('aria-label');
      }

      // Remove any connection status info
      this.removeConnectionStatusInfo();
    }
  }

  /**
   * Add connection status information to the modal
   */
  addConnectionStatusInfo() {
    // Remove any existing status info
    const existingInfo = document.querySelector('.connection-status-info');
    if (existingInfo) {
      existingInfo.remove();
    }

    // Create status info element
    const statusInfo = document.createElement('div');
    statusInfo.className = 'connection-status-info';
    // Create status indicator safely
    const statusIndicator = document.createElement('div');
    statusIndicator.className = 'status-indicator';

    const statusDot = document.createElement('span');
    statusDot.className = 'status-dot connected';

    const statusText = document.createElement('span');
    statusText.className = 'status-text';
    statusText.textContent = 'Connected to server';

    statusIndicator.appendChild(statusDot);
    statusIndicator.appendChild(statusText);

    const statusHelp = document.createElement('div');
    statusHelp.className = 'status-help';
    statusHelp.textContent =
      'You can disconnect from this server or close this dialog to continue using the app.';

    statusInfo.appendChild(statusIndicator);
    statusInfo.appendChild(statusHelp);

    // Insert the status info after the form input
    const formGroup = document.querySelector('.form-group');
    if (formGroup) {
      formGroup.appendChild(statusInfo);
    }
  }

  /**
   * Remove connection status information from the modal
   */
  removeConnectionStatusInfo() {
    const existingInfo = document.querySelector('.connection-status-info');
    if (existingInfo) {
      existingInfo.remove();
    }
  }

  /**
   * Hide the server connection modal
   */
  hideModal() {
    this.isModalOpen = false;

    if (this.modalElement) {
      this.modalElement.style.display = 'none';
    }

    // Clear form event listeners
    this.clearFormEventListeners();

    // Clear status messages and connection status info
    this.clearStatusMessage();
    this.removeConnectionStatusInfo();

    // Emit event for other systems
    this.eventBus.emit('modal.closed', { type: 'serverConnection' });

    logger.info('ServerConnectionBehavior: Modal hidden');
  }

  /**
   * Setup form event listeners
   */
  setupFormEventListeners() {
    if (!this.formElement) return;

    // Form submission
    const handleFormSubmit = (e) => {
      e.preventDefault();
      this.handleConnect();
    };

    // Close button only (no click-outside-to-close for better UX)
    const handleCloseClick = (e) => {
      // Handle close button clicks only
      if (
        e.target.classList.contains('modal-close') ||
        e.target.closest('.modal-close')
      ) {
        this.hideModal();
      }
    };

    // Escape key
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && this.isModalOpen) {
        this.hideModal();
      }
    };

    // Modal click handler removed for better UX (no accidental closes)

    // Add event listeners
    this.formElement.addEventListener('submit', handleFormSubmit);

    document.addEventListener('click', handleCloseClick);
    document.addEventListener('keydown', handleKeyDown);

    // Store for cleanup
    this.formEventListeners = [
      { element: this.formElement, event: 'submit', handler: handleFormSubmit },
      { element: document, event: 'click', handler: handleCloseClick },
      { element: document, event: 'keydown', handler: handleKeyDown },
    ];
  }

  /**
   * Clear form event listeners
   */
  clearFormEventListeners() {
    this.formEventListeners.forEach(({ element, event, handler }) => {
      if (element && handler) {
        element.removeEventListener(event, handler);
      }
    });
    this.formEventListeners = [];
  }

  /**
   * Show status message in modal
   * @param {string} message - Status message to display
   * @param {'info'|'success'|'error'} type - Message type for styling
   */
  showStatusMessage(message, type = 'info') {
    if (!this.statusElement) return;

    // Create elements safely to avoid innerHTML security issues
    const messageDiv = document.createElement('div');
    messageDiv.className = `status-message status-${type}`;

    if (type === 'info') {
      const spinner = document.createElement('div');
      spinner.className = 'spinner';
      messageDiv.appendChild(spinner);
    }

    const span = document.createElement('span');
    span.textContent = message;
    messageDiv.appendChild(span);

    this.statusElement.innerHTML = '';
    this.statusElement.appendChild(messageDiv);
    this.statusElement.style.display = 'block';
  }

  /**
   * Clear status message from modal
   */
  clearStatusMessage() {
    if (this.statusElement) {
      this.statusElement.innerHTML = '';
      this.statusElement.style.display = 'none';
    }
  }

  /**
   * Handle connect action with integrated testing
   */
  async handleConnect() {
    if (!this.uriInput) return;

    // Check if we're in disconnect mode
    const isDisconnecting =
      this.connectButton?.getAttribute('data-action') === 'disconnect';

    if (isDisconnecting) {
      return this.handleDisconnect();
    }

    const uri = this.uriInput.value.trim();

    // Validate URI format
    if (!ServerConnectionService.validateServerUri(uri)) {
      this.showStatusMessage(
        'Please enter a valid HTTPS URL or HTTP localhost (e.g., https://api.example.com or http://localhost:3000)',
        'error',
      );
      return;
    }

    // Clear any previous status
    this.clearStatusMessage();

    // Update UI during connection process
    this.isConnecting = true;
    this.updateConnectButtonState(true);

    try {
      // Phase 1: Test Connection
      this.showStatusMessage('Testing connection to server...', 'info');
      const testResult = await ServerConnectionService.testConnection(uri);

      if (!testResult.success) {
        // Show detailed error from test
        const errorMessage =
          testResult.error ||
          'Connection test failed. Please check the server URL and try again.';
        this.showStatusMessage(errorMessage, 'error');

        ServerConnectionService.setConnectionStatus('error');

        // Keep modal open on test failure
        this.isConnecting = false;
        this.updateConnectButtonState(false);
        this.updateConnectionUI();
        return;
      }

      // Phase 2: Connection Success - proceed with actual connection
      this.showStatusMessage(
        'Connection test successful! Connecting...',
        'info',
      );

      // Small delay to show the success message
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Set server URI and update status
      const success = ServerConnectionService.setServerUri(uri);

      if (success) {
        ServerConnectionService.setConnectionStatus('connected');
        this.showStatusMessage('Successfully connected to server!', 'success');

        // Show success for a moment before closing
        setTimeout(() => {
          this.hideModal();
        }, 1000);
      } else {
        ServerConnectionService.setConnectionStatus('error');
        this.showStatusMessage('Failed to save server configuration.', 'error');
      }
    } catch (error) {
      logger.error('Connect error:', { error: error });
      ServerConnectionService.setConnectionStatus('error');
      this.showStatusMessage(
        'Failed to connect to server. Please check the URL and try again.',
        'error',
      );
    } finally {
      this.isConnecting = false;
      this.updateConnectButtonState(false);
      this.updateConnectionUI();
    }

    logger.info('Connection attempt completed', {
      uri,
    });
  }

  /**
   * Handle disconnect action
   */
  async handleDisconnect() {
    // Update UI during disconnection
    this.isConnecting = true;
    this.updateConnectButtonState(true);

    try {
      // Clear server URI and update status
      const success = ServerConnectionService.setServerUri(null);

      if (success) {
        ServerConnectionService.setConnectionStatus('disconnected');
        notificationManager.success('Disconnected from server successfully');

        // Close modal after successful disconnection
        this.hideModal();

        // Emit event to update other UI components
        this.eventBus.emit('server.disconnected');
      } else {
        notificationManager.error('Failed to disconnect from server');
      }
    } catch (error) {
      logger.error('Disconnect error:', { error: error });
      notificationManager.error('Failed to disconnect from server');
    } finally {
      this.isConnecting = false;
      this.updateConnectButtonState(false);
      this.updateConnectionUI();
    }

    logger.info('ServerConnectionBehavior: Disconnect completed');
  }

  /**
   * Update connection UI based on current state
   */
  updateConnectionUI() {
    const connectionState = ServerConnectionService.getConnectionState() || {
      serverUri: null,
      isConnected: false,
      connectionStatus: 'disconnected',
    };

    if (this.uriInput && connectionState.serverUri) {
      this.uriInput.value = connectionState.serverUri;
    }

    this.updateConnectButtonUI(connectionState);
  }

  /**
   * Update connect button UI based on connection state
   * @param {Object} connectionState - Current connection state
   */
  updateConnectButtonUI(connectionState) {
    if (!this.connectButton) return;

    // Clear existing classes
    this.connectButton.classList.remove('connected', 'error');

    switch (connectionState.connectionStatus) {
      case 'connected':
        this.connectButton.textContent = 'Disconnect';
        this.connectButton.classList.add('connected');
        break;
      case 'error':
        this.connectButton.textContent = 'Retry Connection';
        this.connectButton.classList.add('error');
        break;
      default:
        this.connectButton.textContent = 'Connect';
    }
  }

  /**
   * Update connect button state during connection process
   * @param {boolean} isConnecting - Whether connection is in progress
   */
  updateConnectButtonState(isConnecting) {
    if (!this.connectButton) return;

    this.connectButton.disabled = isConnecting;

    if (isConnecting) {
      // Check if we're in disconnect mode
      const isDisconnecting =
        this.connectButton.getAttribute('data-action') === 'disconnect';
      this.connectButton.textContent = isDisconnecting
        ? 'Disconnecting...'
        : 'Connecting...';
    }
    // Don't change text when not connecting - let updateConnectionUI handle that
  }

  /**
   * Get current behavior state
   */
  getState() {
    return {
      name: this.name,
      isInitialized: this.isInitialized,
      isModalOpen: this.isModalOpen,
      isConnecting: this.isConnecting,
    };
  }

  /**
   * Clean up behavior resources
   */
  async destroy() {
    // Clear form event listeners
    this.clearFormEventListeners();

    // Clear DOM references
    this.modalElement = null;
    this.formElement = null;
    this.uriInput = null;
    this.connectButton = null;
    this.statusElement = null;

    // Reset state
    this.isInitialized = false;
    this.isModalOpen = false;
    this.isConnecting = false;
    this.eventBus = null;

    logger.info('ServerConnectionBehavior: Destroyed');
  }
}
