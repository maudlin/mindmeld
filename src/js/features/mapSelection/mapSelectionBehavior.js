// src/js/features/mapSelection/mapSelectionBehavior.js

import { eventBus } from '../../core/eventBus.js';
import { ServerClient } from '../../services/serverClient.js';
import { logger } from '../../services/logger.js';

/**
 * Map Selection Behavior - Handles the Map Selection Modal UI
 * Integrates with ServerClient for map management operations
 */
export class MapSelectionBehavior {
  constructor(interactionController) {
    this.interactionController = interactionController;
    this.eventBus = eventBus;

    // Modal state
    this.isModalOpen = false;
    this.selectedMapId = null;

    // Maps data
    this.allMaps = []; // All maps from server
    this.maps = []; // Current page of maps
    this.currentPage = 1;
    this.pageSize = 5;
    this.totalPages = 1;
    this.searchQuery = '';
    this.isLoading = false;
    this.isChangingPage = false; // Prevent double-click pagination

    // DOM element references
    this.modalElement = null;
    this.searchInput = null;
    this.mapsList = null;
    this.loadingElement = null;
    this.emptyElement = null;
    this.errorElement = null;
    this.paginationElement = null;

    // Event listener references for cleanup
    this.eventListeners = [];

    this.initialize();
  }

  /**
   * Initialize the behavior
   */
  initialize() {
    this.cacheElementReferences();
    this.setupEventListeners();

    logger.info('MapSelectionBehavior: Initialized');
  }

  /**
   * Cache DOM element references
   */
  cacheElementReferences() {
    this.modalElement = document.getElementById('map-selection-modal');
    this.searchInput = document.getElementById('map-search-input');
    this.mapsList = document.getElementById('maps-list');
    this.loadingElement = document.getElementById('maps-loading');
    this.emptyElement = document.getElementById('maps-empty');
    this.errorElement = document.getElementById('maps-error');
    this.paginationElement = document.getElementById('maps-pagination');

    // Button references
    this.createNewMapBtn = document.getElementById('create-new-map-btn');
    this.refreshMapsBtn = document.getElementById('refresh-maps-btn');
    this.createFirstMapBtn = document.getElementById('create-first-map-btn');
    this.retryLoadMapsBtn = document.getElementById('retry-load-maps-btn');
    this.cancelBtn = document.getElementById('cancel-map-selection-btn');
    this.prevPageBtn = document.getElementById('prev-page-btn');
    this.nextPageBtn = document.getElementById('next-page-btn');
    this.closeBtn = this.modalElement?.querySelector('.server-modal-close');

    // Pagination info
    this.pageInfo = document.getElementById('page-info');
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Modal show/hide events from MenuBehavior
    this.eventBus.on('modal.mapSelection.show', (data) => {
      this.showModal(data);
    });

    this.eventBus.on('modal.mapSelection.hide', () => {
      this.hideModal();
    });

    // Server connection events
    this.eventBus.on('server.connected', () => {
      if (this.isModalOpen) {
        this.loadMaps();
      }
    });

    this.eventBus.on('server.disconnected', () => {
      if (this.isModalOpen) {
        this.showError('Server disconnected');
      }
    });
  }

  /**
   * Show the modal and load maps
   */
  async showModal(data = {}) {
    this.isModalOpen = true;

    if (!this.modalElement) {
      logger.info('MapSelectionBehavior: Modal element not found');
      return;
    }

    // Show modal
    this.modalElement.style.display = 'flex';

    // Focus search input for better UX
    if (this.searchInput) {
      setTimeout(() => this.searchInput.focus(), 100);
    }

    // Set up modal event listeners
    this.setupModalEventListeners();

    // Load maps data
    await this.loadMaps();

    // Emit modal opened event
    this.eventBus.emit('modal.mapSelection.opened', {
      behavior: this,
      ...data,
    });

    logger.info('MapSelectionBehavior: Modal opened');
  }

  /**
   * Hide the modal
   */
  hideModal() {
    this.isModalOpen = false;

    if (this.modalElement) {
      this.modalElement.style.display = 'none';
    }

    // Clear modal event listeners
    this.clearModalEventListeners();

    // Reset state
    this.selectedMapId = null;
    this.searchQuery = '';
    if (this.searchInput) {
      this.searchInput.value = '';
    }

    // Emit modal closed event
    this.eventBus.emit('modal.mapSelection.closed', {
      behavior: this,
    });

    logger.info('MapSelectionBehavior: Modal closed');
  }

  /**
   * Set up modal-specific event listeners
   */
  setupModalEventListeners() {
    // Close button
    if (this.closeBtn) {
      const closeHandler = () => this.hideModal();
      this.closeBtn.addEventListener('click', closeHandler);
      this.eventListeners.push({
        element: this.closeBtn,
        event: 'click',
        handler: closeHandler,
      });
    }

    // Cancel button
    if (this.cancelBtn) {
      const cancelHandler = () => this.hideModal();
      this.cancelBtn.addEventListener('click', cancelHandler);
      this.eventListeners.push({
        element: this.cancelBtn,
        event: 'click',
        handler: cancelHandler,
      });
    }

    // Create new map buttons
    if (this.createNewMapBtn) {
      const createHandler = () => this.handleCreateNewMap();
      this.createNewMapBtn.addEventListener('click', createHandler);
      this.eventListeners.push({
        element: this.createNewMapBtn,
        event: 'click',
        handler: createHandler,
      });
    }

    if (this.createFirstMapBtn) {
      const createFirstHandler = () => this.handleCreateNewMap();
      this.createFirstMapBtn.addEventListener('click', createFirstHandler);
      this.eventListeners.push({
        element: this.createFirstMapBtn,
        event: 'click',
        handler: createFirstHandler,
      });
    }

    // Refresh button
    if (this.refreshMapsBtn) {
      const refreshHandler = () => this.loadMaps(true);
      this.refreshMapsBtn.addEventListener('click', refreshHandler);
      this.eventListeners.push({
        element: this.refreshMapsBtn,
        event: 'click',
        handler: refreshHandler,
      });
    }

    // Retry button
    if (this.retryLoadMapsBtn) {
      const retryHandler = () => this.loadMaps(true);
      this.retryLoadMapsBtn.addEventListener('click', retryHandler);
      this.eventListeners.push({
        element: this.retryLoadMapsBtn,
        event: 'click',
        handler: retryHandler,
      });
    }

    // Search input
    if (this.searchInput) {
      const searchHandler = (e) => this.handleSearch(e.target.value);
      this.searchInput.addEventListener('input', searchHandler);
      this.eventListeners.push({
        element: this.searchInput,
        event: 'input',
        handler: searchHandler,
      });
    }

    // Pagination buttons
    if (this.prevPageBtn) {
      const prevHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.isChangingPage) return;
        this.loadPreviousPage();
      };
      this.prevPageBtn.addEventListener('click', prevHandler);
      this.eventListeners.push({
        element: this.prevPageBtn,
        event: 'click',
        handler: prevHandler,
      });
    }

    if (this.nextPageBtn) {
      const nextHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.isChangingPage) return;
        this.loadNextPage();
      };
      this.nextPageBtn.addEventListener('click', nextHandler);
      this.eventListeners.push({
        element: this.nextPageBtn,
        event: 'click',
        handler: nextHandler,
      });
    }

    // Modal overlay click to close
    if (this.modalElement) {
      const overlayHandler = (e) => {
        if (e.target === this.modalElement) {
          this.hideModal();
        }
      };
      this.modalElement.addEventListener('click', overlayHandler);
      this.eventListeners.push({
        element: this.modalElement,
        event: 'click',
        handler: overlayHandler,
      });
    }

    // Escape key to close
    const keyHandler = (e) => {
      if (e.key === 'Escape' && this.isModalOpen) {
        this.hideModal();
      }
    };
    document.addEventListener('keydown', keyHandler);
    this.eventListeners.push({
      element: document,
      event: 'keydown',
      handler: keyHandler,
    });
  }

  /**
   * Clear modal event listeners
   */
  clearModalEventListeners() {
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];
  }

  /**
   * Load maps from server
   */
  async loadMaps(forceRefresh = false) {
    if (this.isLoading) return;

    this.isLoading = true;
    this.showLoading();

    try {
      const options = {
        limit: this.pageSize,
        search: this.searchQuery || undefined,
      };

      // Calculate offset from page number
      if (this.currentPage > 1) {
        options.offset = (this.currentPage - 1) * this.pageSize;
      }

      // Clear cache if force refresh requested
      if (forceRefresh) {
        ServerClient.mapsCache = null;
        ServerClient.mapsCacheExpiry = null;
      }

      const result = await ServerClient.getMaps(options);

      // ServerClient.getMaps() returns the server response directly
      // Check if result is an array (maps directly) or an object with maps property
      if (Array.isArray(result)) {
        this.allMaps = result; // Store all maps
        this.totalPages = Math.ceil(result.length / this.pageSize);
      } else {
        this.allMaps = result.maps || []; // Store all maps
        this.totalPages = Math.ceil(
          (result.totalCount || this.allMaps.length) / this.pageSize,
        );
      }

      // Slice maps for current page (client-side pagination)
      const startIndex = (this.currentPage - 1) * this.pageSize;
      const endIndex = startIndex + this.pageSize;
      this.maps = this.allMaps.slice(startIndex, endIndex);

      this.renderMaps();
      this.updatePagination();

      if (this.maps.length === 0) {
        this.showEmpty();
      } else {
        this.hideStates();
      }
    } catch (error) {
      logger.error('Error loading maps:', { error: error });
      this.showError(error.message || 'Failed to load maps');
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Handle search input
   */
  handleSearch(query) {
    this.searchQuery = query.trim();
    this.currentPage = 1; // Reset to first page on search

    // Debounce search to avoid too many requests
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.loadMaps();
    }, 300);
  }

  /**
   * Handle create new map action
   */
  async handleCreateNewMap() {
    try {
      const mapName = prompt('Enter a name for your new map:');
      if (!mapName) return;

      this.showLoading();

      const result = await ServerClient.createNewMap(mapName.trim());

      // ServerClient.createNewMap() returns the created map object directly
      if (result && result.id) {
        this.hideModal();

        // Emit success event
        this.eventBus.emit('map.created', {
          mapId: result.id,
          mapName: result.name,
        });

        logger.info(`MapSelectionBehavior: Created new map: ${result.name}`);
      } else {
        this.showError('Failed to create new map');
      }
    } catch (error) {
      logger.error('Error creating map:', { error: error });
      this.showError(error.message || 'Failed to create new map');
    }
  }

  /**
   * Handle map selection
   */
  async handleSelectMap(mapId, mapName) {
    if (this.isLoading) return;

    try {
      this.showLoading();

      const result = await ServerClient.loadMap(mapId, { mapName });

      // ServerClient.loadMap() returns the map object or false if cancelled
      if (result && result !== false) {
        this.hideModal();

        // Emit success event
        this.eventBus.emit('map.loaded', {
          mapId,
          mapName,
        });

        logger.info(`MapSelectionBehavior: Loaded map: ${mapName}`);
      } else if (result === false) {
        // User cancelled the operation
        logger.info(
          `MapSelectionBehavior: Map loading cancelled by user: ${mapName}`,
        );
      } else {
        this.showError('Failed to load map');
      }
    } catch (error) {
      logger.error('Error loading map:', { error: error });
      this.showError(error.message || 'Failed to load map');
    }
  }

  /**
   * Handle map deletion with confirmation
   */
  async handleDeleteMap(mapId, mapName) {
    if (this.isLoading) return;

    // Show confirmation dialog
    const confirmed = confirm(
      `Are you sure you want to delete "${mapName}"?\n\nThis action cannot be undone.`,
    );

    if (!confirmed) return;

    try {
      this.showLoading();

      // Call ServerClient to delete the map
      const success = await ServerClient.deleteMap(mapId);

      if (success) {
        // Remove map from current data
        this.allMaps = this.allMaps.filter((map) => map.id !== mapId);

        // Recalculate pagination
        this.totalPages = Math.ceil(this.allMaps.length / this.pageSize);

        // If current page is now empty, go to previous page
        if (this.currentPage > this.totalPages && this.totalPages > 0) {
          this.currentPage = this.totalPages;
        }

        // Update display
        this.updatePageData();

        logger.info(`MapSelectionBehavior: Deleted map: ${mapName}`);

        // Show success message briefly
        this.showSuccess('Map deleted successfully');
        setTimeout(() => this.hideStates(), 2000);
      } else {
        this.showError('Failed to delete map');
      }
    } catch (error) {
      logger.error('Error deleting map:', { error: error });
      this.showError(error.message || 'Failed to delete map');
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Load previous page
   */
  loadPreviousPage() {
    if (this.isChangingPage || this.currentPage <= 1) return;

    this.isChangingPage = true;
    this.currentPage--;
    this.updatePageData();

    // Reset flag after a short delay
    setTimeout(() => {
      this.isChangingPage = false;
    }, 200);
  }

  /**
   * Load next page
   */
  loadNextPage() {
    if (this.isChangingPage || this.currentPage >= this.totalPages) return;

    this.isChangingPage = true;
    this.currentPage++;
    this.updatePageData();

    // Reset flag after a short delay
    setTimeout(() => {
      this.isChangingPage = false;
    }, 200);
  }

  /**
   * Update page data for client-side pagination
   */
  updatePageData() {
    // Slice maps for current page
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.maps = this.allMaps.slice(startIndex, endIndex);

    this.renderMaps();
    this.updatePagination();
  }

  /**
   * Render the maps list
   */
  renderMaps() {
    if (!this.mapsList) return;

    this.mapsList.innerHTML = '';

    this.maps.forEach((map) => {
      const mapItem = this.createMapItem(map);
      this.mapsList.appendChild(mapItem);
    });
  }

  /**
   * Create a map item element
   */
  createMapItem(map) {
    const item = document.createElement('div');
    item.className = 'map-item';
    item.dataset.mapId = map.id;

    const updatedDate = new Date(map.updatedAt).toLocaleDateString();
    const updatedTime = new Date(map.updatedAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Create the item structure using DOM methods for security
    const itemInfo = document.createElement('div');
    itemInfo.className = 'map-item-info';

    const itemName = document.createElement('h4');
    itemName.className = 'map-item-name';
    itemName.textContent = map.name; // Safe text content

    const itemMeta = document.createElement('div');
    itemMeta.className = 'map-item-meta';

    const dateSpan = document.createElement('span');
    dateSpan.className = 'map-item-date';
    dateSpan.textContent = `Updated: ${updatedDate} at ${updatedTime}`;

    const versionSpan = document.createElement('span');
    versionSpan.className = 'map-item-version';
    versionSpan.textContent = `Version: ${map.version || 1}`;

    itemMeta.appendChild(dateSpan);
    itemMeta.appendChild(versionSpan);

    itemInfo.appendChild(itemName);
    itemInfo.appendChild(itemMeta);

    const itemActions = document.createElement('div');
    itemActions.className = 'map-item-actions';

    const loadButton = document.createElement('button');
    loadButton.type = 'button';
    loadButton.className = 'map-action-btn primary';
    loadButton.dataset.action = 'load';
    loadButton.dataset.mapId = map.id;
    loadButton.textContent = 'Open';

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'map-action-btn danger';
    deleteButton.dataset.action = 'delete';
    deleteButton.dataset.mapId = map.id;
    deleteButton.textContent = 'Delete';
    deleteButton.title = 'Delete this map permanently';

    itemActions.appendChild(loadButton);
    itemActions.appendChild(deleteButton);

    item.appendChild(itemInfo);
    item.appendChild(itemActions);

    // Add event listeners for the map item
    item.addEventListener('click', (e) => {
      // Don't select if clicking action buttons
      if (e.target.classList.contains('map-action-btn')) return;

      this.selectMapItem(item, map.id);
    });

    // Add event listener for the load button (directly reference it)
    loadButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleSelectMap(map.id, map.name);
    });

    // Add event listener for the delete button
    deleteButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleDeleteMap(map.id, map.name);
    });

    return item;
  }

  /**
   * Select a map item visually
   */
  selectMapItem(item, mapId) {
    // Remove selection from other items
    this.mapsList.querySelectorAll('.map-item').forEach((el) => {
      el.classList.remove('selected');
    });

    // Select this item
    item.classList.add('selected');
    this.selectedMapId = mapId;
  }

  /**
   * Update pagination controls
   */
  updatePagination() {
    if (!this.paginationElement) return;

    const shouldShow = this.totalPages > 1;
    this.paginationElement.style.display = shouldShow ? 'flex' : 'none';

    if (shouldShow) {
      // Update page info
      if (this.pageInfo) {
        this.pageInfo.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
      }

      // Update button states
      if (this.prevPageBtn) {
        this.prevPageBtn.disabled = this.currentPage <= 1;
      }

      if (this.nextPageBtn) {
        this.nextPageBtn.disabled = this.currentPage >= this.totalPages;
      }
    }
  }

  /**
   * Show loading state
   */
  showLoading() {
    this.hideStates();
    if (this.loadingElement) {
      this.loadingElement.style.display = 'flex';
    }
  }

  /**
   * Show empty state
   */
  showEmpty() {
    this.hideStates();
    if (this.emptyElement) {
      this.emptyElement.style.display = 'flex';
    }
  }

  /**
   * Show error state
   */
  showError(message) {
    this.hideStates();
    if (this.errorElement) {
      this.errorElement.style.display = 'flex';
      const errorMessage = this.errorElement.querySelector(
        '#maps-error-message',
      );
      if (errorMessage) {
        errorMessage.textContent = message;
      }
    }
  }

  /**
   * Show success message temporarily
   */
  showSuccess(message) {
    logger.info('MapSelectionBehavior: Success -', message);
    // For now, just log - could be enhanced with a success notification UI later
  }

  /**
   * Hide all state elements
   */
  hideStates() {
    [this.loadingElement, this.emptyElement, this.errorElement].forEach(
      (el) => {
        if (el) el.style.display = 'none';
      },
    );
  }

  /**
   * Escape HTML for security
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Destroy the behavior and clean up
   */
  destroy() {
    this.clearModalEventListeners();

    // Clear any pending timeouts
    clearTimeout(this.searchTimeout);

    logger.info('MapSelectionBehavior: Destroyed');
  }
}
