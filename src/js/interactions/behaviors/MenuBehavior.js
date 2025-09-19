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
import { DataProviderService } from '../../services/DataProviderService.js';
import { clearAllState } from '../../data/storageManager.js';
import { notificationManager } from '../../services/notificationManager.js';
import { ServerClient } from '../../services/serverClient.js';
import { ServerConnectionService } from '../../services/serverConnectionService.js';

export class MenuBehavior {
  constructor(eventBus, canvas = null) {
    this.eventBus = eventBus;
    this.canvas = canvas;
    this.isInitialized = false;
    this.name = 'MenuBehavior';

    // Menu state
    this.isOpen = false;

    // Server connection state (URL only - connection status managed by ServerConnectionService)
    this.serverConfig = {
      url: null,
    };

    // Modal state
    this.modalOpen = false;

    // API client instance
    this.mapsApi = null;

    // Map state tracking (MM-228)
    this.currentMapName = 'Untitled Map';

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
    await this.loadServerConfig();

    // Set up event listeners for system integration
    this.setupEventListeners();

    // Update menu UI to reflect initial state
    // Use setTimeout to ensure DOM is ready
    // Always update UI immediately since we start with disconnected state
    setTimeout(() => {
      this.updateMenuUI();
    }, 0);

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

    // Listen for server connection status changes to update menu UI
    this.eventBus.on('server.connection.status.changed', () => {
      this.updateMenuUI();
    });

    // Note: Menu actions now handled directly by adapters calling handleMenuAction
  }

  /**
   * Load server configuration from ServerConnectionService
   */
  async loadServerConfig() {
    try {
      // Load from ServerConnectionService which handles localStorage persistence
      const storedUri = ServerConnectionService.loadServerUriFromStorage();

      if (storedUri) {
        // Update ServerConnectionService state with stored URI but mark as disconnected initially
        ServerConnectionService.setServerUri(storedUri);
        ServerConnectionService.setConnectionStatus('disconnected');

        // Update our internal state
        this.serverConfig.url = storedUri;

        // Initialize API client but don't mark as connected yet
        this.initializeApiClient(storedUri);

        console.log('MenuBehavior: Loaded server URI from storage:', storedUri);

        // Test connection and wait for result to ensure UI updates properly
        await this.testStoredConnection(storedUri);
      }

      // Migrate old localStorage data if it exists
      this.migrateOldServerConfig();
    } catch (error) {
      console.warn('MenuBehavior: Failed to load server config', error);
    }
  }

  /**
   * Test stored connection and update status
   * @private
   */
  async testStoredConnection(uri) {
    try {
      const testResult = await ServerConnectionService.testConnection(uri);
      if (testResult.success) {
        // Connection is valid - update status
        ServerConnectionService.setConnectionStatus('connected');
        console.log('MenuBehavior: Stored connection verified');
      } else {
        // Connection failed - keep URI but mark as disconnected
        ServerConnectionService.setConnectionStatus('error');
        console.log(
          'MenuBehavior: Stored connection failed:',
          testResult.error,
        );
      }

      // Update UI after connection test
      console.log(
        'MenuBehavior: About to call updateMenuUI() after connection test',
      );
      this.updateMenuUI();
      console.log('MenuBehavior: Called updateMenuUI() after connection test');
    } catch (error) {
      console.warn('MenuBehavior: Failed to test stored connection:', error);
      ServerConnectionService.setConnectionStatus('error');
      this.updateMenuUI();
    }
  }

  /**
   * Migrate old localStorage config to ServerConnectionService
   * @private
   */
  migrateOldServerConfig() {
    try {
      const oldStored = localStorage.getItem('mindmeld-server-config');
      if (oldStored) {
        const config = JSON.parse(oldStored);
        if (config.url && !ServerConnectionService.getServerUri()) {
          console.log(
            'MenuBehavior: Migrating old server config to ServerConnectionService',
          );
          ServerConnectionService.setServerUri(config.url);
          this.serverConfig.url = config.url;
          this.initializeApiClient(config.url);
        }
        // Remove old config after migration
        localStorage.removeItem('mindmeld-server-config');
      }
    } catch (error) {
      console.warn('MenuBehavior: Failed to migrate old server config:', error);
    }
  }

  /**
   * Save server configuration (now delegated to ServerConnectionService)
   */
  saveServerConfig() {
    try {
      // ServerConnectionService now handles all persistence
      // This method is kept for compatibility but delegates to ServerConnectionService
      if (this.serverConfig.url) {
        ServerConnectionService.setServerUri(this.serverConfig.url);
      }
    } catch (error) {
      console.warn('MenuBehavior: Failed to save server config', error);
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
   * Handle menu button click/tap from pageInteractions
   */
  handleMenuButtonAction(inputType) {
    console.log('MenuBehavior: Menu button action', {
      inputType,
      isOpen: this.isOpen,
    });

    if (this.isOpen) {
      this.closeMenu(inputType);
    } else {
      this.openMenu(inputType);
    }
  }

  /**
   * Set up UI event listeners for menu interactions
   */
  setupMenuUIListeners() {
    if (!this.menuButton || !this.menuElement) {
      return;
    }

    // Click-away to close
    document.addEventListener('click', (e) => {
      // Don't close menu when clicking on textarea in edit mode
      if (
        e.target.tagName === 'TEXTAREA' &&
        e.target.classList.contains('note-content')
      ) {
        return;
      }

      if (
        !this.menuElement.contains(e.target) &&
        !this.menuButton.contains(e.target)
      ) {
        this.closeMenu('ui');
      }
    });

    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closeMenu('keyboard');
      }
    });

    // Reposition on resize (desktop <-> mobile)
    window.addEventListener('resize', () => {
      if (this.isOpen) {
        this.positionMenu();
      }
    });

    // Mobile swipe-to-close functionality
    this.setupMobileInteractions();
  }

  /**
   * Setup mobile touch interactions for bottom sheet
   */
  setupMobileInteractions() {
    if (!this.menuElement) return;

    const onTouchStart = (e) => {
      if (window.innerWidth > 720) return;
      if (!e.target.closest('.kebab-menu-handle')) return;

      this.startY = e.touches[0].clientY;
      this.currentY = this.startY;
      this.dragging = true;
      this.menuElement.style.transition = 'transform 0.2s ease';
      document.body.style.overflow = 'hidden';
    };

    const onTouchMove = (e) => {
      if (!this.dragging) return;

      this.currentY = e.touches[0].clientY;
      const diff = this.currentY - this.startY;

      if (diff > 0) {
        this.menuElement.style.transform = `translateY(${diff}px)`;
      } else {
        this.menuElement.style.transform = '';
      }
    };

    const onTouchEnd = () => {
      if (!this.dragging) return;

      this.dragging = false;
      const diff = this.currentY - this.startY;
      document.body.style.overflow = '';

      if (diff > 50) {
        this.closeMenu('swipe');
      } else {
        this.menuElement.style.transform = '';
      }
    };

    this.menuElement.addEventListener('touchstart', onTouchStart, {
      passive: true,
    });
    this.menuElement.addEventListener('touchmove', onTouchMove, {
      passive: true,
    });
    this.menuElement.addEventListener('touchend', onTouchEnd);
  }

  /**
   * Open menu - delegates to working KebabMenu logic
   */
  openMenu(inputType) {
    this.isOpen = true;
    console.log('MenuBehavior: Opening menu', { inputType });

    // Emit event for any other systems that need to know
    this.eventBus.emit('menu.opened', {
      behavior: this,
      inputType,
      serverConfig: this.getServerStatus(),
    });

    // UI management will be handled by the working KebabMenu code we'll restore
  }

  /**
   * Close menu - delegates to working KebabMenu logic
   */
  closeMenu(inputType) {
    this.isOpen = false;
    console.log('MenuBehavior: Closing menu', { inputType });

    // Emit event for any other systems that need to know
    this.eventBus.emit('menu.closed', {
      behavior: this,
      inputType,
    });

    // UI management will be handled by the working KebabMenu code we'll restore
  }

  /**
   * Position the menu intelligently based on screen size and available space
   */
  positionMenu() {
    if (!this.menuElement || !this.menuButton) {
      return;
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 16;
    const gap = 8;

    // Mobile: bottom sheet full width
    if (vw <= 720) {
      this.menuElement.style.position = 'fixed';
      this.menuElement.style.top = '';
      this.menuElement.style.left = '0';
      this.menuElement.style.right = '0';
      this.menuElement.style.bottom = '0';
      this.menuElement.style.width = '100%';
      this.menuElement.style.borderRadius = '16px 16px 0 0';
      return;
    }

    // Desktop/tablet: place near button, never off-screen
    const rect = this.menuButton.getBoundingClientRect();

    // Temporarily make visible to measure true size
    const prevVis = this.menuElement.style.visibility;
    const prevDisp = this.menuElement.style.display;
    this.menuElement.style.visibility = 'hidden';
    this.menuElement.style.display = 'block';

    const menuRect = this.menuElement.getBoundingClientRect();

    // Enhanced positioning with constraint handling
    let top = rect.bottom + gap;
    if (top + menuRect.height > vh - margin) {
      // Try flipping above
      const topAlternative = rect.top - menuRect.height - gap;
      if (topAlternative >= margin) {
        // Fits above - use it
        top = topAlternative;
        // Reset scroll constraints since we have space
        this.menuElement.style.maxHeight = '';
        this.menuElement.style.overflowY = '';
      } else {
        // Doesn't fit above OR below - constrain height
        const maxHeight = vh - margin * 2;
        this.menuElement.style.maxHeight = `${maxHeight}px`;
        this.menuElement.style.overflowY = 'auto';
        top = margin - window.scrollY; // Position at viewport margin (document-relative)
      }
    } else {
      // Fits below - reset scroll constraints
      this.menuElement.style.maxHeight = '';
      this.menuElement.style.overflowY = '';
    }

    // Prefer align-left with button; shift/clamp as needed
    let left = rect.left;
    if (left + menuRect.width > vw - margin) {
      left = vw - menuRect.width - margin;
    }
    if (left < margin) left = margin;

    this.menuElement.style.position = 'absolute';
    this.menuElement.style.top = `${top + window.scrollY}px`;
    this.menuElement.style.left = `${left + window.scrollX}px`;
    this.menuElement.style.width = '';

    // Restore styles
    this.menuElement.style.visibility = prevVis;
    this.menuElement.style.display = prevDisp || '';
  }

  /**
   * Handle menu item selection from adapters
   */
  handleMenuAction(action, inputType) {
    console.log('MenuBehavior: Menu action selected', { action, inputType });

    // Show loading indicator for server operations
    if (
      ['connect-server', 'disconnect-server', 'load-from-server'].includes(
        action,
      )
    ) {
      this.showMenuItemLoading(action, true);
    }

    // Handle async operations without blocking the UI
    // Note: We don't await these since menu should close immediately
    switch (action) {
      case 'clear-canvas':
        console.log('MenuBehavior: About to call handleClearCanvas');
        this.handleClearCanvas(inputType).catch((error) => {
          console.error('MenuBehavior: Error in clear canvas:', error);
          console.error('MenuBehavior: Error stack:', error.stack);
        });
        break;
      case 'import-file':
      case 'import-from-file':
        this.handleImportFile(inputType);
        break;
      case 'export-file':
      case 'export-to-file':
        this.handleExportFile(inputType);
        break;
      case 'copy-clipboard':
      case 'export-to-clipboard':
        this.handleCopyClipboard(inputType).catch((error) =>
          console.error('MenuBehavior: Error in copy clipboard:', error),
        );
        break;
      case 'paste-clipboard':
      case 'import-from-clipboard':
        this.handlePasteClipboard(inputType).catch((error) =>
          console.error('MenuBehavior: Error in paste clipboard:', error),
        );
        break;
      case 'connect-server':
        this.handleConnectServerRequest(inputType);
        break;
      case 'server-status':
        this.handleServerStatus(inputType);
        break;
      case 'disconnect-server':
        this.handleServerDisconnect(inputType);
        break;
      case 'load-from-server':
        this.handleLoadFromServer(inputType).catch((error) =>
          console.error('MenuBehavior: Error in load from server:', error),
        );
        break;
      case 'new-map':
        this.handleNewMap(inputType);
        break;
      case 'browse-maps':
        this.handleBrowseMaps(inputType);
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
  async handleClearCanvas(inputType) {
    console.log('MenuBehavior: Clearing canvas', {
      inputType,
      canvas: this.canvas,
    });

    if (!this.canvas) {
      console.error(
        'MenuBehavior: Canvas reference is null! Cannot clear canvas.',
      );
      notificationManager.error(
        'Cannot clear canvas - canvas reference missing',
      );
      return;
    }

    const confirmed = await notificationManager.confirm(
      'Are you sure you want to clear the canvas?',
    );

    if (confirmed) {
      clearAllState(this.canvas);
      notificationManager.success('Canvas cleared successfully!');
    }
  }

  /**
   * Handle import file action
   */
  handleImportFile(inputType) {
    console.log('MenuBehavior: Importing from file', { inputType });

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          if (this.canvas) {
            const dataProviderService = DataProviderService.getInstance();
            await dataProviderService.importJSON(e.target.result);
            notificationManager.success('Mind map imported successfully!');
          }
        } catch (error) {
          console.error('Error importing file:', error);
          notificationManager.error(
            "Error importing file. Please make sure it's a valid JSON file.",
          );
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  /**
   * Handle export file action
   */
  handleExportFile(inputType) {
    console.log('MenuBehavior: Exporting to file', { inputType });

    try {
      const dataProviderService = DataProviderService.getInstance();
      const json = dataProviderService.exportJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mindmap_export.json';
      a.click();
      URL.revokeObjectURL(url);

      notificationManager.info(
        "Download started - check your browser's download area",
      );
    } catch (error) {
      console.error('Error exporting file:', error);
      notificationManager.error('Error exporting file. Please try again.');
    }
  }

  /**
   * Handle copy to clipboard action
   */
  async handleCopyClipboard(inputType) {
    console.log('MenuBehavior: Copying to clipboard', { inputType });

    try {
      const dataProviderService = DataProviderService.getInstance();
      const json = dataProviderService.exportJSON();
      await navigator.clipboard.writeText(json);
      notificationManager.success('Mind map exported to clipboard!');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      notificationManager.error(
        'Failed to copy to clipboard. Please try again.',
      );
    }
  }

  /**
   * Handle paste from clipboard action
   */
  async handlePasteClipboard(inputType) {
    console.log('MenuBehavior: Pasting from clipboard', { inputType });

    try {
      const text = await navigator.clipboard.readText();
      if (this.canvas) {
        const dataProviderService = DataProviderService.getInstance();
        await dataProviderService.importJSON(text);
        notificationManager.success('Mind map imported from clipboard!');
      }
    } catch (error) {
      console.error('Error importing from clipboard:', error);
      notificationManager.error(
        'Error importing from clipboard. Please make sure the clipboard contains valid JSON data.',
      );
    }
  }

  /**
   * Handle load from server action (MM-106)
   */
  async handleLoadFromServer(inputType) {
    console.log('MenuBehavior: Loading from server', { inputType });

    try {
      const status = ServerClient.getConnectionStatus();

      if (!status.isConnected) {
        notificationManager.error('Not connected to server');
        return;
      }

      if (!this.canvas) {
        console.error(
          'MenuBehavior: Canvas reference is null! Cannot load from server.',
        );
        notificationManager.error(
          'Cannot load from server - canvas reference missing',
        );
        return;
      }

      const success = await ServerClient.loadState(this.canvas);
      if (success) {
        notificationManager.success('Data loaded from server successfully!');
      } else {
        notificationManager.error('Failed to load data from server');
      }
    } catch (error) {
      console.error('MenuBehavior: Error loading from server:', error);
      notificationManager.error('Failed to load data from server');
    } finally {
      // Always clear loading state
      this.showMenuItemLoading('load-from-server', false);
    }
  }

  /**
   * Get server connection status for menu state
   */
  getServerConnectionStatus() {
    const connectionState = ServerConnectionService.getConnectionState() || {};
    return {
      isConnected: connectionState.isConnected || false,
      connectionStatus: connectionState.connectionStatus || 'disconnected',
    };
  }

  /**
   * Get available server actions based on connection status
   */
  getAvailableServerActions() {
    const status = ServerClient.getConnectionStatus();
    return {
      loadFromServer: status.isConnected,
    };
  }

  /**
   * Connect to server request - open modal
   */
  handleConnectServerRequest(inputType) {
    this.modalOpen = true;

    // Clear loading state since we're just opening a modal
    this.showMenuItemLoading('connect-server', false);

    console.log('MenuBehavior: Opening server connection modal', { inputType });

    this.eventBus.emit('modal.serverConnection.open', {
      behavior: this,
      inputType,
      currentUrl: this.serverConfig.url || '',
    });
  }

  /**
   * Handle server status when connected - show status modal
   */
  handleServerStatus(inputType) {
    console.log('MenuBehavior: Show server status', { inputType });

    const serverConnectionStatus = this.getServerConnectionStatus();
    const serverUri = this.getServerUri() || 'Unknown server';

    if (serverConnectionStatus && serverConnectionStatus.isConnected) {
      this.modalOpen = true;

      this.eventBus.emit('modal.serverConnection.open', {
        behavior: this,
        inputType,
        currentUrl: serverUri,
        isConnected: true,
        connectionStatus: serverConnectionStatus.connectionStatus,
      });
    } else {
      // Fallback to regular connect modal if not connected
      this.handleConnectServerRequest(inputType);
    }
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

    // Connection attempt starting (ServerConnectionService will manage the status)

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

      // Save to localStorage
      this.saveServerConfig();

      // Update menu UI to show connected state
      this.updateMenuUI();

      console.log('MenuBehavior: Server connection successful', { url });

      this.eventBus.emit('server.connected', {
        behavior: this,
        url,
        status: 'connected',
      });
    } catch (error) {
      console.error('MenuBehavior: Server connection failed', error);

      this.mapsApi = null;

      // Update menu UI to show disconnected state
      this.updateMenuUI();

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
  handleServerDisconnect(inputType = 'system-event') {
    console.log('MenuBehavior: Disconnecting from server', { inputType });

    try {
      // Use ServerConnectionService to properly disconnect
      const success = ServerConnectionService.setServerUri(null);

      if (success) {
        ServerConnectionService.setConnectionStatus('disconnected');

        // Update local state to match
        this.serverConfig.url = null;
        this.mapsApi = null;

        // Update menu UI to show disconnected state
        this.updateMenuUI();

        this.eventBus.emit('server.disconnected', {
          behavior: this,
          inputType,
        });

        // Show success notification
        notificationManager.success('Disconnected from server successfully');
        console.log('MenuBehavior: Successfully disconnected from server');
      } else {
        console.error('MenuBehavior: Failed to disconnect from server');
        notificationManager.error('Failed to disconnect from server');
      }
    } finally {
      // Always clear loading state
      this.showMenuItemLoading('disconnect-server', false);
    }
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
   * Get current map name (MM-228)
   */
  getCurrentMapName() {
    return this.currentMapName;
  }

  /**
   * Set current map name and update UI (MM-228)
   */
  setCurrentMapName(name) {
    this.currentMapName = name || 'Untitled Map';
    this.updateMenuUI(); // Trigger menu refresh
    console.log('MenuBehavior: Map name updated to:', this.currentMapName);
  }

  /**
   * Handle new map creation request (MM-228)
   */
  handleNewMap(inputType) {
    console.log('MenuBehavior: New Map requested', { inputType });

    // Check if we're connected to a server
    const serverStatus = this.getServerConnectionStatus();
    if (!serverStatus || !serverStatus.isConnected) {
      notificationManager.error(
        'Please connect to a server first to create new maps.',
      );
      return;
    }

    // Emit event to trigger MapSelectionBehavior with create new map mode
    this.eventBus.emit('modal.mapSelection.show', {
      behavior: this,
      mode: 'create-new',
      inputType,
    });

    console.log(
      'MenuBehavior: Map selection modal requested for new map creation',
    );
  }

  /**
   * Handle browse maps request (MM-228)
   */
  handleBrowseMaps(inputType) {
    console.log('MenuBehavior: Browse Maps requested', { inputType });

    // Check if we're connected to a server
    const serverStatus = this.getServerConnectionStatus();
    if (!serverStatus || !serverStatus.isConnected) {
      notificationManager.error(
        'Please connect to a server first to browse maps.',
      );
      return;
    }

    // Emit event to trigger MapSelectionBehavior
    this.eventBus.emit('modal.mapSelection.show', {
      behavior: this,
      mode: 'browse',
      inputType,
    });

    console.log(
      'MenuBehavior: Map selection modal requested for browsing maps',
    );
  }

  /**
   * Get current server status for UI updates
   */
  getServerStatus() {
    const connectionState = ServerConnectionService.getConnectionState();
    return {
      url: this.serverConfig.url,
      connected: connectionState?.isConnected || false,
      connecting: connectionState?.connectionStatus === 'connecting',
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
      serverConnection: this.getServerConnectionStatus(),
      availableActions: this.getAvailableServerActions(),
    };
  }

  /**
   * Get menu state with server info (alias for compatibility)
   */
  getMenuStateWithServerInfo() {
    return this.getMenuState();
  }

  /**
   * Update menu UI based on server connection state
   */
  updateMenuUI() {
    const serverConnectionStatus = this.getServerConnectionStatus();
    const isConnected = serverConnectionStatus
      ? serverConnectionStatus.isConnected
      : false;

    // Get menu item elements
    const connectItem = document.querySelector('.server-connect-item');
    const menuText = connectItem?.querySelector('.server-menu-text');
    const statusDot = connectItem?.querySelector('.server-status-dot');
    const disconnectItem = document.querySelector('.server-disconnect-item');
    const loadItem = document.querySelector('.server-load-item');
    // MM-228: New map management items
    const newMapItem = document.querySelector('.server-new-map-item');
    const browseMapsItem = document.querySelector('.server-browse-maps-item');

    if (
      !connectItem ||
      !menuText ||
      !statusDot ||
      !disconnectItem ||
      !loadItem ||
      !newMapItem ||
      !browseMapsItem
    ) {
      return; // Menu items not found, probably not initialized yet
    }

    if (isConnected) {
      // Update main menu item to show connected state with map name (MM-228)
      const mapName = this.getCurrentMapName();
      menuText.textContent = `Connected: ${mapName}`;
      statusDot.className = 'server-status-dot connected';
      statusDot.style.display = 'inline-block';

      // Change action to show status instead of connect
      connectItem.setAttribute('data-action', 'server-status');

      // Show server operation items
      disconnectItem.style.display = 'flex';
      loadItem.style.display = 'flex';
      // MM-228: Show new map management items
      newMapItem.style.display = 'flex';
      browseMapsItem.style.display = 'flex';
    } else {
      // Update main menu item to show disconnected state
      menuText.textContent = 'Connect to Server...';
      statusDot.style.display = 'none';

      // Change action back to connect
      connectItem.setAttribute('data-action', 'connect-server');

      // Hide server operation items
      disconnectItem.style.display = 'none';
      loadItem.style.display = 'none';
      // MM-228: Hide new map management items
      newMapItem.style.display = 'none';
      browseMapsItem.style.display = 'none';
    }
  }

  /**
   * Show loading indicator on menu item during operations
   */
  showMenuItemLoading(action, show = true) {
    const actionMap = {
      'connect-server': '.server-connect-item',
      'disconnect-server': '.server-disconnect-item',
      'load-from-server': '.server-load-item',
    };

    if (!Object.prototype.hasOwnProperty.call(actionMap, action)) return;
    const selector = actionMap[action];

    const menuItem = document.querySelector(selector);
    if (!menuItem) return;

    const span = menuItem.querySelector('span');
    if (!span) return;

    if (show) {
      // Add loading state
      menuItem.classList.add('server-loading');

      // Add spinner
      let spinner = menuItem.querySelector('.server-loading-spinner');
      if (!spinner) {
        spinner = document.createElement('div');
        spinner.className = 'server-loading-spinner';
        span.appendChild(spinner);
      }
    } else {
      // Remove loading state
      menuItem.classList.remove('server-loading');

      // Remove spinner
      const spinner = menuItem.querySelector('.server-loading-spinner');
      if (spinner) {
        spinner.remove();
      }
    }
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

  /**
   * Get the configured server URI
   */
  getServerUri() {
    const connectionState = ServerConnectionService.getConnectionState();
    return connectionState?.serverUri || null;
  }
}
