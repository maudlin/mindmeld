/**
 * NavbarBehavior - Handles navbar interaction logic
 *
 * Manages navbar elements including map title editing and collaborator presence.
 * Integrates with CollaborationService for real-time collaboration features.
 * Handles persistence of map metadata and title synchronization.
 */

import { persistenceService } from '../../services/PersistenceService.js';
import { CollaborationService } from '../../services/CollaborationService.js';
import { logger } from '../../services/logger.js';

export class NavbarBehavior {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.isInitialized = false;
    this.name = 'NavbarBehavior';

    // Map title state
    this.currentMapName = 'Untitled Map';

    // Collaboration state
    this.collaborationService = null;
    this.activeCollaborators = [];

    logger.debug('NavbarBehavior created');
  }

  /**
   * Initialize the behavior
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    // Initialize collaboration service
    this.collaborationService = CollaborationService.getInstance();

    // Load map title from persistence
    this.loadMapTitleFromState();

    // Setup event listeners
    this.setupEventListeners();

    // Setup title click handler
    this.setupTitleEditingHandlers();

    // Setup collaboration event listeners
    this.setupCollaborationEventListeners();

    // Update navbar UI
    this.updateNavbarTitle();

    this.isInitialized = true;
    logger.info('NavbarBehavior initialized');
  }

  /**
   * Setup event listeners for system integration
   */
  setupEventListeners() {
    // Listen for map state changes
    this.eventBus.on('map.loaded', (data) => {
      if (data.metadata && data.metadata.title) {
        this.setCurrentMapName(data.metadata.title);
      }
    });

    // Listen for server connection changes
    this.eventBus.on('server.connected', () => {
      this.updateCollaboratorDisplay();
    });

    this.eventBus.on('server.disconnected', () => {
      this.hideCollaboratorDisplay();
    });
  }

  /**
   * Setup title editing click handlers
   */
  setupTitleEditingHandlers() {
    const titleElement = document.getElementById('map-title');
    if (titleElement) {
      titleElement.addEventListener('click', () => {
        this.handleTitleClick();
      });

      // Add hover styling
      titleElement.style.cursor = 'pointer';
    }
  }

  /**
   * Setup collaboration event listeners for title updates
   */
  setupCollaborationEventListeners() {
    // Listen for title changes from other users
    this.eventBus.on('collaboration.map.title.changed', (data) => {
      this.setCurrentMapName(data.title);
      this.updateNavbarTitle();
    });

    // Listen for collaboration presence updates
    this.eventBus.on('collaboration.presence.updated', (data) => {
      this.updateCollaboratorAvatars(data.participants || []);
    });

    // Listen for collaboration session events
    this.eventBus.on('collaboration.session.joined', () => {
      this.updateCollaboratorDisplay();
    });

    this.eventBus.on('collaboration.session.left', () => {
      this.hideCollaboratorDisplay();
    });
  }

  /**
   * Get current map name
   */
  getCurrentMapName() {
    return this.currentMapName;
  }

  /**
   * Set current map name and update UI
   */
  setCurrentMapName(name) {
    const sanitizedName = this.validateMapTitle(name);
    this.currentMapName = sanitizedName;
    this.updateNavbarTitle();
    logger.info('NavbarBehavior: Map name updated to:', this.currentMapName);
  }

  /**
   * Update navbar title element
   */
  updateNavbarTitle() {
    const titleElement = document.getElementById('map-title');
    if (titleElement) {
      titleElement.textContent = this.getCurrentMapName();
    }
  }

  /**
   * Load map title from persistence service state
   */
  loadMapTitleFromState() {
    try {
      const state = persistenceService.getState();
      if (state.metadata && state.metadata.title) {
        this.setCurrentMapName(state.metadata.title);
      }
    } catch (error) {
      logger.warn('NavbarBehavior: Failed to load map title from state', error);
    }
  }

  /**
   * Validate and sanitize map title input
   */
  validateMapTitle(title) {
    // Handle null/undefined/empty cases
    if (!title || typeof title !== 'string') {
      return 'Untitled Map';
    }

    // Trim whitespace
    const sanitized = title.trim();
    if (sanitized.length === 0) {
      return 'Untitled Map';
    }

    // Limit length
    const limitedTitle =
      sanitized.length > 100 ? sanitized.substring(0, 100) : sanitized;

    // Remove potentially dangerous characters (basic XSS prevention)
    return limitedTitle.replace(/[<>]/g, '');
  }

  /**
   * Handle title click for editing
   */
  handleTitleClick() {
    const titleElement = document.getElementById('map-title');
    if (!titleElement) return;

    const currentTitle = titleElement.textContent;

    // Create inline input element
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentTitle;
    input.className = 'title-edit-input';
    input.maxLength = 100;

    // Replace title with input
    titleElement.style.display = 'none';
    titleElement.parentNode.insertBefore(input, titleElement);

    input.focus();
    input.select();

    // Setup event handlers for save/cancel
    this.setupTitleEditHandlers(input, titleElement, currentTitle);
  }

  /**
   * Setup event handlers for title editing
   */
  setupTitleEditHandlers(input, titleElement, originalTitle) {
    const saveAndExit = async () => {
      const newTitle = input.value;
      if (input && input.remove) input.remove();
      if (titleElement) titleElement.style.display = '';

      if (newTitle !== originalTitle) {
        await this.saveMapTitle(newTitle);
      }
    };

    const cancelAndExit = () => {
      if (input && input.remove) input.remove();
      if (titleElement) {
        titleElement.style.display = '';
        titleElement.textContent = originalTitle;
      }
    };

    // Save on Enter or blur
    if (input && input.addEventListener) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveAndExit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cancelAndExit();
        }
      });

      input.addEventListener('blur', saveAndExit);
    }
  }

  /**
   * Save map title to persistence and sync to collaborators
   */
  async saveMapTitle(newTitle) {
    const validTitle = this.validateMapTitle(newTitle);

    try {
      // Update local state
      this.setCurrentMapName(validTitle);

      // Save to persistence service
      const mapState = persistenceService.getState();
      mapState.metadata = mapState.metadata || {};
      mapState.metadata.title = validTitle;
      persistenceService.setState(mapState);

      // Notify collaborators if active
      this.eventBus.emit('map.title.changed', { title: validTitle });

      logger.info('Map title saved successfully', { title: validTitle });
    } catch (error) {
      logger.error('Failed to save map title', error);
      throw error;
    }
  }

  /**
   * Update collaborator avatar display
   */
  updateCollaboratorDisplay() {
    const collaboratorsContainer = document.getElementById('collaborators');
    if (!collaboratorsContainer) return;

    // Show collaborators container if collaboration is active
    if (this.collaborationService.isCollaborationActive()) {
      collaboratorsContainer.style.display = 'flex';
      this.updateCollaboratorAvatars(
        this.collaborationService.getActiveUsers(),
      );
    } else {
      collaboratorsContainer.style.display = 'none';
    }
  }

  /**
   * Hide collaborator display
   */
  hideCollaboratorDisplay() {
    const collaboratorsContainer = document.getElementById('collaborators');
    if (collaboratorsContainer) {
      collaboratorsContainer.style.display = 'none';
    }
    this.activeCollaborators = [];
  }

  /**
   * Update collaborator avatars based on active users
   */
  updateCollaboratorAvatars(participants) {
    const collaboratorsContainer = document.getElementById('collaborators');
    if (!collaboratorsContainer) return;

    // Clear existing avatars
    collaboratorsContainer.innerHTML = '';

    // Filter out current user and create avatars for others
    const otherUsers = participants.filter(
      (user) => user.id !== this.getCurrentUserId(),
    );

    if (otherUsers.length === 0) {
      this.hideCollaboratorDisplay();
      return;
    }

    // Show container and create avatars
    collaboratorsContainer.style.display = 'flex';

    otherUsers.forEach((user) => {
      const avatar = this.createUserAvatar(user);
      collaboratorsContainer.appendChild(avatar);
    });

    this.activeCollaborators = otherUsers;
    logger.debug('Updated collaborator avatars', { count: otherUsers.length });
  }

  /**
   * Create user avatar element
   */
  createUserAvatar(user) {
    const avatar = document.createElement('div');
    avatar.className = 'collaborator-avatar';
    avatar.setAttribute('data-user-id', user.id);
    avatar.setAttribute('title', user.name || 'Unknown User');

    // Create initials from user name
    const initials = this.getUserInitials(user.name);
    avatar.textContent = initials;

    return avatar;
  }

  /**
   * Get user initials for avatar display
   */
  getUserInitials(name) {
    if (!name || typeof name !== 'string') return '??';

    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }

    return (words[0][0] + words[1][0]).toUpperCase();
  }

  /**
   * Get current user ID (placeholder - would come from user authentication)
   */
  getCurrentUserId() {
    // TODO: This should come from user authentication service
    // For now, return a placeholder
    return 'current-user';
  }

  /**
   * Get current behavior state
   */
  getState() {
    return {
      name: this.name,
      isInitialized: this.isInitialized,
      currentMapName: this.currentMapName,
      activeCollaborators: this.activeCollaborators,
    };
  }

  /**
   * Clean up behavior resources
   */
  async destroy() {
    // Remove event listeners
    const titleElement = document.getElementById('map-title');
    if (titleElement) {
      titleElement.style.cursor = '';
    }

    // Reset state
    this.isInitialized = false;
    this.activeCollaborators = [];
    this.collaborationService = null;
    this.eventBus = null;

    logger.info('NavbarBehavior destroyed');
  }
}
