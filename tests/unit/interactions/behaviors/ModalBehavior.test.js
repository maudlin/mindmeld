/**
 * ModalBehavior Test Suite
 *
 * Tests for the ModalBehavior class that handles modal dialog business logic
 * following the adapter-behavior pattern. Tests modal registration, state management,
 * scroll prevention, backdrop close, and callback functionality.
 */

import { ModalBehavior } from '../../../../src/js/interactions/behaviors/ModalBehavior.js';

describe('ModalBehavior', () => {
  let modalBehavior;
  let mockEventBus;
  let mockModal, mockTrigger, mockCloseButton;

  beforeEach(() => {
    // Create mock event bus
    mockEventBus = {
      on: jest.fn(),
      emit: jest.fn(),
    };

    // Create modal behavior instance
    modalBehavior = new ModalBehavior(mockEventBus);

    // Create mock DOM elements
    mockModal = document.createElement('div');
    mockModal.id = 'test-modal';
    mockModal.style.display = 'none';
    mockModal.setAttribute('aria-hidden', 'true');

    mockTrigger = document.createElement('button');
    mockTrigger.id = 'test-trigger';

    mockCloseButton = document.createElement('button');
    mockCloseButton.className = 'close-button';

    mockModal.appendChild(mockCloseButton);
    document.body.appendChild(mockModal);
    document.body.appendChild(mockTrigger);

    // Reset body overflow
    document.body.style.overflow = '';
  });

  afterEach(() => {
    // Clean up DOM
    document.body.removeChild(mockModal);
    document.body.removeChild(mockTrigger);
    document.body.style.overflow = '';

    // Clean up behavior
    if (modalBehavior) {
      modalBehavior.destroy();
    }
  });

  describe('Initialization', () => {
    it('should initialize correctly', () => {
      expect(modalBehavior.name).toBe('ModalBehavior');
      expect(modalBehavior.isInitialized).toBe(false);
      expect(modalBehavior.modals).toBeInstanceOf(Map);
    });

    it('should set up event listeners on initialization', () => {
      modalBehavior.initialize();

      expect(modalBehavior.isInitialized).toBe(true);
      expect(mockEventBus.on).toHaveBeenCalledWith(
        'modal.open',
        expect.any(Function),
      );
      expect(mockEventBus.on).toHaveBeenCalledWith(
        'modal.close',
        expect.any(Function),
      );
    });

    it('should not initialize twice', () => {
      modalBehavior.initialize();
      mockEventBus.on.mockClear();

      modalBehavior.initialize(); // Second call

      expect(mockEventBus.on).not.toHaveBeenCalled();
    });
  });

  describe('Modal Registration', () => {
    beforeEach(() => {
      modalBehavior.initialize();
    });

    it('should register modal with default configuration', () => {
      const controls = modalBehavior.registerModal('test-modal', {
        modalElement: mockModal,
        triggerElement: mockTrigger,
        closeElements: [mockCloseButton],
      });

      expect(modalBehavior.modals.has('test-modal')).toBe(true);
      expect(controls).toHaveProperty('openModal');
      expect(controls).toHaveProperty('closeModal');
      expect(typeof controls.openModal).toBe('function');
      expect(typeof controls.closeModal).toBe('function');

      const modalConfig = modalBehavior.modals.get('test-modal');
      expect(modalConfig.backdropClose).toBe(true); // default
      expect(modalConfig.preventScroll).toBe(true); // default
      expect(modalConfig.isOpen).toBe(false);
    });

    it('should register modal with custom configuration', () => {
      const onOpen = jest.fn();
      const onClose = jest.fn();

      modalBehavior.registerModal('custom-modal', {
        modalElement: mockModal,
        triggerElement: mockTrigger,
        backdropClose: false,
        preventScroll: false,
        onOpen,
        onClose,
      });

      const modalConfig = modalBehavior.modals.get('custom-modal');
      expect(modalConfig.backdropClose).toBe(false);
      expect(modalConfig.preventScroll).toBe(false);
      expect(modalConfig.onOpen).toBe(onOpen);
      expect(modalConfig.onClose).toBe(onClose);
    });

    it('should allow multiple modal registrations', () => {
      modalBehavior.registerModal('modal1', {
        modalElement: mockModal,
        triggerElement: mockTrigger,
      });

      const secondModal = document.createElement('div');
      secondModal.id = 'modal2';
      document.body.appendChild(secondModal);

      modalBehavior.registerModal('modal2', {
        modalElement: secondModal,
        triggerElement: mockTrigger,
      });

      expect(modalBehavior.modals.size).toBe(2);
      expect(modalBehavior.modals.has('modal1')).toBe(true);
      expect(modalBehavior.modals.has('modal2')).toBe(true);

      document.body.removeChild(secondModal);
    });
  });

  describe('Modal Trigger Handling', () => {
    beforeEach(() => {
      modalBehavior.initialize();
      modalBehavior.registerModal('test-modal', {
        modalElement: mockModal,
        triggerElement: mockTrigger,
        closeElements: [mockCloseButton],
      });
    });

    it('should open modal when triggered and closed', () => {
      modalBehavior.handleModalTrigger('test-modal', 'touch');

      const modalConfig = modalBehavior.modals.get('test-modal');
      expect(modalConfig.isOpen).toBe(true);
      expect(mockModal.style.display).toBe('block');
      expect(mockModal.getAttribute('aria-hidden')).toBe('false');
      expect(mockEventBus.emit).toHaveBeenCalledWith('modal.opened', {
        modalId: 'test-modal',
        inputType: 'touch',
        behavior: modalBehavior,
      });
    });

    it('should close modal when triggered and open', () => {
      // First open the modal
      modalBehavior.handleModalTrigger('test-modal', 'touch');
      mockEventBus.emit.mockClear();

      // Then trigger again to close
      modalBehavior.handleModalTrigger('test-modal', 'touch');

      const modalConfig = modalBehavior.modals.get('test-modal');
      expect(modalConfig.isOpen).toBe(false);
      expect(mockModal.style.display).toBe('none');
      expect(mockModal.getAttribute('aria-hidden')).toBe('true');
      expect(mockEventBus.emit).toHaveBeenCalledWith('modal.closed', {
        modalId: 'test-modal',
        inputType: 'touch',
        closeType: 'button',
        behavior: modalBehavior,
      });
    });

    it('should handle unknown modal ID gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      modalBehavior.handleModalTrigger('unknown-modal', 'touch');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[.*\] WARN: ModalBehavior: Unknown modal ID.*unknown-modal/i,
        ),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Modal Close Interaction Handling', () => {
    beforeEach(() => {
      modalBehavior.initialize();
      modalBehavior.registerModal('test-modal', {
        modalElement: mockModal,
        triggerElement: mockTrigger,
        closeElements: [mockCloseButton],
        backdropClose: true,
      });
      // Open the modal first
      modalBehavior.openModal('test-modal');
      mockEventBus.emit.mockClear();
    });

    it('should close modal via close button interaction', () => {
      modalBehavior.handleModalCloseInteraction(
        'test-modal',
        'button',
        'touch',
      );

      const modalConfig = modalBehavior.modals.get('test-modal');
      expect(modalConfig.isOpen).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith('modal.closed', {
        modalId: 'test-modal',
        inputType: 'touch',
        closeType: 'button',
        behavior: modalBehavior,
      });
    });

    it('should close modal via backdrop interaction when enabled', () => {
      modalBehavior.handleModalCloseInteraction(
        'test-modal',
        'backdrop',
        'touch',
      );

      const modalConfig = modalBehavior.modals.get('test-modal');
      expect(modalConfig.isOpen).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith('modal.closed', {
        modalId: 'test-modal',
        inputType: 'touch',
        closeType: 'backdrop',
        behavior: modalBehavior,
      });
    });

    it('should not close modal via backdrop when disabled', () => {
      // Register modal with backdrop close disabled
      modalBehavior.registerModal('no-backdrop-modal', {
        modalElement: mockModal,
        triggerElement: mockTrigger,
        backdropClose: false,
      });
      modalBehavior.openModal('no-backdrop-modal');
      mockEventBus.emit.mockClear();

      modalBehavior.handleModalCloseInteraction(
        'no-backdrop-modal',
        'backdrop',
        'touch',
      );

      const modalConfig = modalBehavior.modals.get('no-backdrop-modal');
      expect(modalConfig.isOpen).toBe(true); // Should still be open
      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });

    it('should handle close interaction on closed modal gracefully', () => {
      modalBehavior.closeModal('test-modal'); // Close it first
      mockEventBus.emit.mockClear();

      modalBehavior.handleModalCloseInteraction(
        'test-modal',
        'button',
        'touch',
      );

      expect(mockEventBus.emit).not.toHaveBeenCalled(); // No event should be emitted
    });
  });

  describe('Scroll Prevention', () => {
    beforeEach(() => {
      modalBehavior.initialize();
    });

    it('should prevent scroll when modal opens with preventScroll enabled', () => {
      modalBehavior.registerModal('scroll-modal', {
        modalElement: mockModal,
        preventScroll: true,
      });

      modalBehavior.openModal('scroll-modal');

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should restore scroll when modal closes', () => {
      modalBehavior.registerModal('scroll-modal', {
        modalElement: mockModal,
        preventScroll: true,
      });

      modalBehavior.openModal('scroll-modal');
      expect(document.body.style.overflow).toBe('hidden');

      modalBehavior.closeModal('scroll-modal');
      expect(document.body.style.overflow).toBe('');
    });

    it('should not affect scroll when preventScroll is disabled', () => {
      modalBehavior.registerModal('no-scroll-modal', {
        modalElement: mockModal,
        preventScroll: false,
      });

      modalBehavior.openModal('no-scroll-modal');
      expect(document.body.style.overflow).toBe('');

      modalBehavior.closeModal('no-scroll-modal');
      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('Callback Functions', () => {
    let onOpen, onClose;

    beforeEach(() => {
      modalBehavior.initialize();
      onOpen = jest.fn();
      onClose = jest.fn();

      modalBehavior.registerModal('callback-modal', {
        modalElement: mockModal,
        onOpen,
        onClose,
      });
    });

    it('should call onOpen callback when modal opens', () => {
      modalBehavior.openModal('callback-modal');

      expect(onOpen).toHaveBeenCalledWith(mockModal);
    });

    it('should call onClose callback when modal closes', () => {
      modalBehavior.openModal('callback-modal');
      onOpen.mockClear();

      modalBehavior.closeModal('callback-modal');

      expect(onClose).toHaveBeenCalledWith(mockModal);
    });

    it('should call callbacks for all close methods', () => {
      modalBehavior.openModal('callback-modal');
      onOpen.mockClear();

      modalBehavior.handleModalCloseInteraction(
        'callback-modal',
        'button',
        'touch',
      );
      expect(onClose).toHaveBeenCalledTimes(1);

      modalBehavior.openModal('callback-modal');
      modalBehavior.handleModalCloseInteraction(
        'callback-modal',
        'backdrop',
        'touch',
      );
      expect(onClose).toHaveBeenCalledTimes(2);
    });
  });

  describe('Event Bus Integration', () => {
    beforeEach(() => {
      modalBehavior.initialize();
      modalBehavior.registerModal('event-modal', {
        modalElement: mockModal,
      });
    });

    it('should handle modal.open event', () => {
      const openHandler = mockEventBus.on.mock.calls.find(
        (call) => call[0] === 'modal.open',
      )[1];

      openHandler({ modalId: 'event-modal', inputType: 'touch' });

      const modalConfig = modalBehavior.modals.get('event-modal');
      expect(modalConfig.isOpen).toBe(true);
    });

    it('should handle modal.close event', () => {
      modalBehavior.openModal('event-modal');
      const modalConfig = modalBehavior.modals.get('event-modal');
      expect(modalConfig.isOpen).toBe(true);

      const closeHandler = mockEventBus.on.mock.calls.find(
        (call) => call[0] === 'modal.close',
      )[1];

      closeHandler({
        modalId: 'event-modal',
        inputType: 'touch',
        closeType: 'programmatic',
      });

      expect(modalConfig.isOpen).toBe(false);
    });
  });

  describe('State Management', () => {
    beforeEach(() => {
      modalBehavior.initialize();
      modalBehavior.registerModal('state-modal', {
        modalElement: mockModal,
        backdropClose: false,
        preventScroll: true,
      });
    });

    it('should return correct modal state', () => {
      const state = modalBehavior.getModalState('state-modal');

      expect(state).toEqual({
        modalId: 'state-modal',
        isOpen: false,
        config: {
          backdropClose: false,
          preventScroll: true,
        },
      });
    });

    it('should return null for unknown modal', () => {
      const state = modalBehavior.getModalState('unknown-modal');
      expect(state).toBeNull();
    });

    it('should return all modal states', () => {
      modalBehavior.registerModal('modal2', {
        modalElement: mockModal,
        backdropClose: true,
        preventScroll: false,
      });

      const allStates = modalBehavior.getAllModalStates();

      expect(allStates).toEqual({
        'state-modal': {
          isOpen: false,
          config: {
            backdropClose: false,
            preventScroll: true,
          },
        },
        modal2: {
          isOpen: false,
          config: {
            backdropClose: true,
            preventScroll: false,
          },
        },
      });
    });

    it('should update state correctly when modal is opened', () => {
      modalBehavior.openModal('state-modal');

      const state = modalBehavior.getModalState('state-modal');
      expect(state.isOpen).toBe(true);
    });
  });

  describe('Cleanup and Destruction', () => {
    beforeEach(() => {
      modalBehavior.initialize();
      modalBehavior.registerModal('cleanup-modal', {
        modalElement: mockModal,
      });
    });

    it('should close all open modals on destroy', () => {
      modalBehavior.openModal('cleanup-modal');
      expect(modalBehavior.getModalState('cleanup-modal').isOpen).toBe(true);

      modalBehavior.destroy();

      expect(mockModal.style.display).toBe('none');
      expect(document.body.style.overflow).toBe('');
    });

    it('should clear all modal registrations on destroy', () => {
      expect(modalBehavior.modals.size).toBe(1);

      modalBehavior.destroy();

      expect(modalBehavior.modals.size).toBe(0);
      expect(modalBehavior.isInitialized).toBe(false);
      expect(modalBehavior.eventBus).toBeNull();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      modalBehavior.initialize();
    });

    it('should handle missing modal element gracefully', () => {
      modalBehavior.registerModal('no-element-modal', {
        modalElement: null,
      });

      expect(() => {
        modalBehavior.openModal('no-element-modal');
      }).not.toThrow();

      const state = modalBehavior.getModalState('no-element-modal');
      expect(state.isOpen).toBe(true); // State should still update
    });

    it('should handle multiple open/close calls gracefully', () => {
      modalBehavior.registerModal('multi-modal', {
        modalElement: mockModal,
      });

      // Multiple opens
      modalBehavior.openModal('multi-modal');
      modalBehavior.openModal('multi-modal'); // Should not error

      expect(modalBehavior.getModalState('multi-modal').isOpen).toBe(true);

      // Multiple closes
      modalBehavior.closeModal('multi-modal');
      modalBehavior.closeModal('multi-modal'); // Should not error

      expect(modalBehavior.getModalState('multi-modal').isOpen).toBe(false);
    });
  });
});
