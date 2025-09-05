/**
 * MenuBehavior - Handles all kebab menu interaction logic
 *
 * Unified behavior for menu operations across desktop and touch.
 * Receives input from both DesktopAdapter and TouchAdapter.
 * Manages menu state, server connections, and system operations.
 *
 * MM-104: Server Connection Configuration UI
 */

import { createMapsApi } from '../../services/mapsApi.js';

export class MenuBehavior {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.isInitialized = false;
    this.name = 'MenuBehavior';

    // Menu state
    this.isOpen = false;

    // Server connection state
    this.serverConfig = {
      url: null,
      connected: false,
      connecting: false,
    };

    // Modal state
    this.modalOpen = false;

    // API client instance
    this.mapsApi = null;

    console.log('MenuBehavior: Created');
  }

  /**
   * Initialize the behavior
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    // Load server configuration from localStorage
    this.loadServerConfig();

    // Set up event listeners for system integration
    this.setupEventListeners();

    this.isInitialized = true;
    console.log('MenuBehavior: Initialized', {
      serverUrl: this.serverConfig.url,
      hasConnection: !!this.mapsApi,
    });
  }

  /**
   * Set up event listeners for system integration
   */
  setupEventListeners() {
    // Listen for server operations from other parts of the system
    this.eventBus.on('server.connect', (data) =>
      this.handleServerConnect(data),
    );
    this.eventBus.on('server.disconnect', () => this.handleServerDisconnect());
    this.eventBus.on('modal.close', () => this.handleModalClose());
  }

  /**
   * Load server configuration from localStorage
   */
  loadServerConfig() {
    try {
      const stored = localStorage.getItem('mindmeld-server-config');
      if (stored) {
        const config = JSON.parse(stored);
        this.serverConfig.url = config.url;

        if (config.url) {
          this.initializeApiClient(config.url);
        }
      }
    } catch (error) {
      console.warn(
        'MenuBehavior: Failed to load server config from localStorage',
        error,
      );
    }
  }

  /**
   * Save server configuration to localStorage
   */
  saveServerConfig() {
    try {
      localStorage.setItem(
        'mindmeld-server-config',
        JSON.stringify({
          url: this.serverConfig.url,
        }),
      );
    } catch (error) {
      console.warn(
        'MenuBehavior: Failed to save server config to localStorage',
        error,
      );
    }
  }

  /**
   * Initialize API client with server URL
   */
  initializeApiClient(url) {
    try {
      this.mapsApi = createMapsApi({ baseUrl: url });
      console.log('MenuBehavior: API client initialized', { url });
    } catch (error) {
      console.error('MenuBehavior: Failed to initialize API client', error);
      this.mapsApi = null;
    }
  }

  /**
   * Handle menu button click/tap from adapters
   */
  handleMenuButtonAction(inputType) {
    if (this.isOpen) {
      this.closeMenu(inputType);
    } else {
      this.openMenu(inputType);
    }
  }

  /**
   * Open menu
   */
  openMenu(inputType) {
    this.isOpen = true;

    console.log('MenuBehavior: Opening menu', { inputType });

    this.eventBus.emit('menu.opened', {
      behavior: this,
      inputType,
      serverConfig: this.getServerStatus(),
    });
  }

  /**
   * Close menu
   */
  closeMenu(inputType) {
    this.isOpen = false;

    console.log('MenuBehavior: Closing menu', { inputType });

    this.eventBus.emit('menu.closed', {
      behavior: this,
      inputType,
    });
  }

  /**
   * Handle menu item selection from adapters
   */
  handleMenuAction(action, inputType) {
    console.log('MenuBehavior: Menu action selected', { action, inputType });

    switch (action) {
      case 'clear-canvas':
        this.handleClearCanvas(inputType);
        break;
      case 'import-file':
        this.handleImportFile(inputType);
        break;
      case 'export-file':
        this.handleExportFile(inputType);
        break;
      case 'copy-clipboard':
        this.handleCopyClipboard(inputType);
        break;
      case 'paste-clipboard':
        this.handlePasteClipboard(inputType);
        break;
      case 'connect-server':
        this.handleConnectServerRequest(inputType);
        break;
      case 'disconnect-server':
        this.handleDisconnectServer(inputType);
        break;
      default:
        console.warn('MenuBehavior: Unknown menu action', { action });
    }

    // Close menu after action
    this.closeMenu(inputType);
  }

  /**
   * Handle clear canvas action
   */
  handleClearCanvas(inputType) {
    this.eventBus.emit('canvas.clear', {
      behavior: this,
      inputType,
    });
  }

  /**
   * Handle import file action
   */
  handleImportFile(inputType) {
    this.eventBus.emit('file.import', {
      behavior: this,
      inputType,
    });
  }

  /**
   * Handle export file action
   */
  handleExportFile(inputType) {
    this.eventBus.emit('file.export', {
      behavior: this,
      inputType,
    });
  }

  /**
   * Handle copy to clipboard action
   */
  handleCopyClipboard(inputType) {
    this.eventBus.emit('clipboard.copy', {
      behavior: this,
      inputType,
    });
  }

  /**
   * Handle paste from clipboard action
   */
  handlePasteClipboard(inputType) {
    this.eventBus.emit('clipboard.paste', {
      behavior: this,
      inputType,
    });
  }

  /**
   * Handle connect to server request - open modal
   */
  handleConnectServerRequest(inputType) {
    this.modalOpen = true;

    console.log('MenuBehavior: Opening server connection modal', { inputType });

    this.eventBus.emit('modal.serverConnection.open', {
      behavior: this,
      inputType,
      currentUrl: this.serverConfig.url || '',
    });
  }

  /**
   * Handle server connection from modal
   */
  async handleServerConnect(data) {
    const { url } = data;

    if (!url) {
      console.warn('MenuBehavior: No URL provided for server connection');
      return;
    }

    this.serverConfig.connecting = true;

    console.log('MenuBehavior: Attempting server connection', { url });

    this.eventBus.emit('server.connecting', {
      behavior: this,
      url,
    });

    try {
      // Initialize API client
      this.initializeApiClient(url);

      if (!this.mapsApi) {
        throw new Error('Failed to initialize API client');
      }

      // Test connection with health check
      await this.mapsApi.health();

      // Connection successful
      this.serverConfig.url = url;
      this.serverConfig.connected = true;
      this.serverConfig.connecting = false;

      // Save to localStorage
      this.saveServerConfig();

      console.log('MenuBehavior: Server connection successful', { url });

      this.eventBus.emit('server.connected', {
        behavior: this,
        url,
        status: 'connected',
      });
    } catch (error) {
      console.error('MenuBehavior: Server connection failed', error);

      this.serverConfig.connected = false;
      this.serverConfig.connecting = false;
      this.mapsApi = null;

      this.eventBus.emit('server.connectionFailed', {
        behavior: this,
        url,
        error: error.message,
      });
    }
  }

  /**
   * Handle server disconnection
   */
  handleDisconnectServer(inputType) {
    console.log('MenuBehavior: Disconnecting from server', { inputType });

    this.serverConfig.url = null;
    this.serverConfig.connected = false;
    this.serverConfig.connecting = false;
    this.mapsApi = null;

    // Clear localStorage
    try {
      localStorage.removeItem('mindmeld-server-config');
    } catch (error) {
      console.warn(
        'MenuBehavior: Failed to clear server config from localStorage',
        error,
      );
    }

    this.eventBus.emit('server.disconnected', {
      behavior: this,
      inputType,
    });
  }

  /**
   * Handle modal close
   */
  handleModalClose() {
    this.modalOpen = false;

    this.eventBus.emit('modal.serverConnection.closed', {
      behavior: this,
    });
  }

  /**
   * Get current server status for UI updates
   */
  getServerStatus() {
    return {
      url: this.serverConfig.url,
      connected: this.serverConfig.connected,
      connecting: this.serverConfig.connecting,
      hasApi: !!this.mapsApi,
    };
  }

  /**
   * Get menu state for UI updates
   */
  getMenuState() {
    return {
      isOpen: this.isOpen,
      modalOpen: this.modalOpen,
      serverStatus: this.getServerStatus(),
    };
  }

  /**
   * Get current behavior state for debugging
   */
  getState() {
    return {
      name: this.name,
      isInitialized: this.isInitialized,
      menuState: this.getMenuState(),
    };
  }

  /**
   * Clean up behavior resources
   */
  async destroy() {
    this.isInitialized = false;
    this.eventBus = null;
    this.mapsApi = null;

    console.log('MenuBehavior: Destroyed');
  }
}
