/**
 * ModalBehavior - Handles modal dialog interaction logic
 *
 * Unified behavior for modal operations across desktop and touch.
 * Receives input from both DesktopAdapter and TouchAdapter.
 * Manages modal state, backdrop close, scroll prevention, and callbacks.
 *
 * Follows proper adapter-behavior separation:
 * - Adapters detect modal trigger/close interactions
 * - ModalBehavior handles business logic and state management
 */

export class ModalBehavior {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.name = 'ModalBehavior';
    this.isInitialized = false;

    // Modal state
    this.modals = new Map(); // Track multiple modals by ID

    console.log('ModalBehavior: Created');
  }

  /**
   * Initialize the behavior
   */
  initialize() {
    if (this.isInitialized) {
      return;
    }

    this.setupEventListeners();
    this.isInitialized = true;
    console.log('ModalBehavior: Initialized');
  }

  /**
   * Set up event listeners for modal system integration
   */
  setupEventListeners() {
    // Listen for modal events from other systems
    this.eventBus.on('modal.open', (data) => this.handleModalOpen(data));
    this.eventBus.on('modal.close', (data) => this.handleModalClose(data));
  }

  /**
   * Register a modal with its configuration
   * Called by adapters when they detect modal elements
   */
  registerModal(modalId, config) {
    const modalConfig = {
      modalId,
      modalElement: config.modalElement,
      triggerElement: config.triggerElement,
      closeElements: config.closeElements || [],
      backdropClose: config.backdropClose !== false, // default true
      preventScroll: config.preventScroll !== false, // default true
      onOpen: config.onOpen || null,
      onClose: config.onClose || null,
      isOpen: false,
      ...config,
    };

    this.modals.set(modalId, modalConfig);

    console.log('ModalBehavior: Registered modal', {
      modalId,
      config: modalConfig,
    });

    return {
      openModal: () => this.openModal(modalId),
      closeModal: () => this.closeModal(modalId),
    };
  }

  /**
   * Handle modal trigger interaction from adapters
   * Called when user taps/clicks modal trigger
   */
  handleModalTrigger(modalId, inputType) {
    const modal = this.modals.get(modalId);
    if (!modal) {
      console.warn('ModalBehavior: Unknown modal ID', { modalId });
      return;
    }

    console.log('ModalBehavior: Modal trigger interaction', {
      modalId,
      inputType,
    });

    if (modal.isOpen) {
      this.closeModal(modalId, inputType);
    } else {
      this.openModal(modalId, inputType);
    }
  }

  /**
   * Handle modal close interaction from adapters
   * Called when user taps/clicks close button or backdrop
   */
  handleModalCloseInteraction(modalId, closeType, inputType) {
    const modal = this.modals.get(modalId);
    if (!modal || !modal.isOpen) {
      return;
    }

    console.log('ModalBehavior: Modal close interaction', {
      modalId,
      closeType,
      inputType,
    });

    // Check if this close method is enabled
    if (closeType === 'backdrop' && !modal.backdropClose) {
      return; // Backdrop close is disabled
    }

    this.closeModal(modalId, inputType, closeType);
  }

  /**
   * Open modal - implements all business logic
   */
  openModal(modalId, inputType = 'programmatic') {
    const modal = this.modals.get(modalId);
    if (!modal || modal.isOpen) {
      return;
    }

    console.log('ModalBehavior: Opening modal', { modalId, inputType });

    // Update modal state
    modal.isOpen = true;

    // Handle scroll prevention
    if (modal.preventScroll) {
      document.body.style.overflow = 'hidden';
    }

    // Update modal element
    if (modal.modalElement) {
      modal.modalElement.style.display = 'block';
      modal.modalElement.setAttribute('aria-hidden', 'false');
    }

    // Call callback
    if (modal.onOpen) {
      modal.onOpen(modal.modalElement);
    }

    // Emit event for system integration
    this.eventBus.emit('modal.opened', {
      modalId,
      inputType,
      behavior: this,
    });
  }

  /**
   * Close modal - implements all business logic
   */
  closeModal(modalId, inputType = 'programmatic', closeType = 'button') {
    const modal = this.modals.get(modalId);
    if (!modal || !modal.isOpen) {
      return;
    }

    console.log('ModalBehavior: Closing modal', {
      modalId,
      inputType,
      closeType,
    });

    // Update modal state
    modal.isOpen = false;

    // Restore scroll
    if (modal.preventScroll) {
      document.body.style.overflow = '';
    }

    // Update modal element
    if (modal.modalElement) {
      modal.modalElement.style.display = 'none';
      modal.modalElement.setAttribute('aria-hidden', 'true');
    }

    // Call callback
    if (modal.onClose) {
      modal.onClose(modal.modalElement);
    }

    // Emit event for system integration
    this.eventBus.emit('modal.closed', {
      modalId,
      inputType,
      closeType,
      behavior: this,
    });
  }

  /**
   * Handle modal open from event bus
   */
  handleModalOpen(data) {
    const { modalId, inputType } = data;
    this.openModal(modalId, inputType);
  }

  /**
   * Handle modal close from event bus
   */
  handleModalClose(data) {
    const { modalId, inputType, closeType } = data;
    this.closeModal(modalId, inputType, closeType);
  }

  /**
   * Get modal state for debugging/testing
   */
  getModalState(modalId) {
    const modal = this.modals.get(modalId);
    if (!modal) {
      return null;
    }

    return {
      modalId,
      isOpen: modal.isOpen,
      config: {
        backdropClose: modal.backdropClose,
        preventScroll: modal.preventScroll,
      },
    };
  }

  /**
   * Get all modal states
   */
  getAllModalStates() {
    const states = {};
    for (const [modalId, modal] of this.modals) {
      Object.defineProperty(states, modalId, {
        value: {
          isOpen: modal.isOpen,
          config: {
            backdropClose: modal.backdropClose,
            preventScroll: modal.preventScroll,
          },
        },
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
    return states;
  }

  /**
   * Clean up behavior resources
   */
  destroy() {
    // Close all open modals
    for (const [modalId, modal] of this.modals) {
      if (modal.isOpen) {
        this.closeModal(modalId, 'system');
      }
    }

    this.modals.clear();
    this.isInitialized = false;
    this.eventBus = null;

    console.log('ModalBehavior: Destroyed');
  }
}
