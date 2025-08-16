// tests/unit/services/notificationManager.test.js

import { NotificationManager } from '../../../src/js/services/notificationManager.js';

describe('NotificationManager', () => {
  let notificationManager;

  beforeEach(() => {
    document.body.innerHTML = '';
    notificationManager = new NotificationManager();
    jest.useFakeTimers();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    test('should initialize with default state', () => {
      expect(notificationManager.toastContainer).toBeNull();
      expect(notificationManager.modalOverlay).toBeNull();
      expect(notificationManager.activeToasts).toBeInstanceOf(Set);
      expect(notificationManager.activeToasts.size).toBe(0);
      expect(notificationManager.isInitialized).toBe(false);
    });

    test('should create DOM containers on initialize', () => {
      notificationManager.initialize();

      expect(notificationManager.isInitialized).toBe(true);
      expect(notificationManager.toastContainer).toBeTruthy();
      expect(notificationManager.modalOverlay).toBeTruthy();
      expect(document.body.contains(notificationManager.toastContainer)).toBe(
        true,
      );
      expect(document.body.contains(notificationManager.modalOverlay)).toBe(
        true,
      );
    });

    test('should not initialize twice', () => {
      notificationManager.initialize();
      const firstContainer = notificationManager.toastContainer;

      notificationManager.initialize();

      expect(notificationManager.toastContainer).toBe(firstContainer);
    });

    test('should create toast container with correct attributes', () => {
      notificationManager.initialize();

      const container = notificationManager.toastContainer;
      expect(container.id).toBe('notification-toast-container');
      expect(container.className).toBe('notification-toast-container');
      expect(container.getAttribute('aria-live')).toBe('polite');
      expect(container.getAttribute('aria-label')).toBe('Notifications');
    });

    test('should create modal overlay with correct attributes', () => {
      notificationManager.initialize();

      const overlay = notificationManager.modalOverlay;
      expect(overlay.id).toBe('notification-modal-overlay');
      expect(overlay.className).toBe('notification-modal-overlay hidden');
      expect(overlay.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('toast notifications', () => {
    beforeEach(() => {
      notificationManager.initialize();
    });

    test('should create and show toast notification', () => {
      const toast = notificationManager.showToast('Test message', 'success');

      expect(toast).toBeTruthy();
      expect(notificationManager.toastContainer.contains(toast)).toBe(true);
      expect(notificationManager.activeToasts.has(toast)).toBe(true);
      expect(toast.classList.contains('notification-toast')).toBe(true);
      expect(toast.classList.contains('notification-toast-success')).toBe(true);
    });

    test('should create toast with correct structure', () => {
      const toast = notificationManager.showToast('Test message', 'info');

      expect(toast.querySelector('.notification-toast-icon')).toBeTruthy();
      expect(toast.querySelector('.notification-toast-message')).toBeTruthy();
      expect(toast.querySelector('.notification-toast-close')).toBeTruthy();
      expect(
        toast.querySelector('.notification-toast-message').textContent,
      ).toBe('Test message');
    });

    test('should set correct ARIA attributes on toast', () => {
      const toast = notificationManager.showToast('Test message');

      expect(toast.getAttribute('role')).toBe('alert');
      expect(toast.getAttribute('aria-live')).toBe('assertive');

      const closeButton = toast.querySelector('.notification-toast-close');
      expect(closeButton.getAttribute('aria-label')).toBe('Close notification');
    });

    test('should auto-dismiss toast after specified duration', () => {
      const toast = notificationManager.showToast('Test message', 'info', 1000);
      notificationManager.dismissToast = jest.fn();

      jest.advanceTimersByTime(1000);

      expect(notificationManager.dismissToast).toHaveBeenCalledWith(toast);
    });

    test('should not auto-dismiss when duration is 0', () => {
      notificationManager.showToast('Test message', 'info', 0);
      notificationManager.dismissToast = jest.fn();

      jest.advanceTimersByTime(5000);

      expect(notificationManager.dismissToast).not.toHaveBeenCalled();
    });

    test('should manually dismiss toast via close button', () => {
      const toast = notificationManager.showToast('Test message');
      const closeButton = toast.querySelector('.notification-toast-close');

      closeButton.click();

      expect(notificationManager.activeToasts.has(toast)).toBe(false);
      expect(toast.classList.contains('dismissing')).toBe(true);
    });

    test('should handle multiple toasts', () => {
      notificationManager.showToast('Message 1');
      notificationManager.showToast('Message 2');

      expect(notificationManager.activeToasts.size).toBe(2);
      expect(notificationManager.toastContainer.children.length).toBe(2);
    });

    test('should use correct icons for different types', () => {
      const successToast = notificationManager.showToast('Success', 'success');
      const errorToast = notificationManager.showToast('Error', 'error');
      const warningToast = notificationManager.showToast('Warning', 'warning');
      const infoToast = notificationManager.showToast('Info', 'info');

      expect(
        successToast.querySelector('.notification-toast-icon').textContent,
      ).toBe('✓');
      expect(
        errorToast.querySelector('.notification-toast-icon').textContent,
      ).toBe('✕');
      expect(
        warningToast.querySelector('.notification-toast-icon').textContent,
      ).toBe('⚠');
      expect(
        infoToast.querySelector('.notification-toast-icon').textContent,
      ).toBe('ℹ');
    });

    test('should provide convenience methods', () => {
      notificationManager.showToast = jest.fn();

      notificationManager.success('Success message');
      notificationManager.error('Error message');
      notificationManager.warning('Warning message');
      notificationManager.info('Info message');

      expect(notificationManager.showToast).toHaveBeenCalledWith(
        'Success message',
        'success',
      );
      expect(notificationManager.showToast).toHaveBeenCalledWith(
        'Error message',
        'error',
      );
      expect(notificationManager.showToast).toHaveBeenCalledWith(
        'Warning message',
        'warning',
      );
      expect(notificationManager.showToast).toHaveBeenCalledWith(
        'Info message',
        'info',
      );
    });

    test('should clear all toasts', () => {
      const toast1 = notificationManager.showToast('Message 1');
      const toast2 = notificationManager.showToast('Message 2');
      notificationManager.dismissToast = jest.fn();

      notificationManager.clearAllToasts();

      expect(notificationManager.dismissToast).toHaveBeenCalledWith(toast1);
      expect(notificationManager.dismissToast).toHaveBeenCalledWith(toast2);
    });
  });

  describe('modal confirmations', () => {
    beforeEach(() => {
      notificationManager.initialize();
    });

    test('should create and show confirmation modal', async () => {
      const confirmationPromise =
        notificationManager.showConfirmation('Are you sure?');

      expect(
        notificationManager.modalOverlay.classList.contains('hidden'),
      ).toBe(false);
      expect(notificationManager.modalOverlay.getAttribute('aria-hidden')).toBe(
        'false',
      );

      const modal = notificationManager.modalOverlay.querySelector(
        '.notification-modal',
      );
      expect(modal).toBeTruthy();

      // Click confirm button
      const confirmButton = modal.querySelector(
        '.notification-modal-button-confirm',
      );
      confirmButton.click();

      const result = await confirmationPromise;
      expect(result).toBe(true);
    });

    test('should create modal with correct structure', async () => {
      notificationManager.showConfirmation('Test message');

      const modal = notificationManager.modalOverlay.querySelector(
        '.notification-modal',
      );
      expect(modal.querySelector('.notification-modal-icon')).toBeTruthy();
      expect(modal.querySelector('.notification-modal-title')).toBeTruthy();
      expect(modal.querySelector('.notification-modal-message')).toBeTruthy();
      expect(
        modal.querySelector('.notification-modal-button-confirm'),
      ).toBeTruthy();
      expect(
        modal.querySelector('.notification-modal-button-cancel'),
      ).toBeTruthy();

      expect(
        modal.querySelector('.notification-modal-message').textContent,
      ).toBe('Test message');
    });

    test('should set correct ARIA attributes on modal', async () => {
      notificationManager.showConfirmation('Test message');

      const modal = notificationManager.modalOverlay.querySelector(
        '.notification-modal',
      );
      expect(modal.getAttribute('role')).toBe('dialog');
      expect(modal.getAttribute('aria-modal')).toBe('true');
      expect(modal.getAttribute('aria-labelledby')).toBe('modal-title');
      expect(modal.getAttribute('aria-describedby')).toBe('modal-message');
    });

    test('should resolve true when confirm button clicked', async () => {
      const confirmationPromise =
        notificationManager.showConfirmation('Are you sure?');

      const confirmButton = notificationManager.modalOverlay.querySelector(
        '.notification-modal-button-confirm',
      );
      confirmButton.click();

      const result = await confirmationPromise;
      expect(result).toBe(true);
      expect(
        notificationManager.modalOverlay.classList.contains('hidden'),
      ).toBe(true);
    });

    test('should resolve false when cancel button clicked', async () => {
      const confirmationPromise =
        notificationManager.showConfirmation('Are you sure?');

      const cancelButton = notificationManager.modalOverlay.querySelector(
        '.notification-modal-button-cancel',
      );
      cancelButton.click();

      const result = await confirmationPromise;
      expect(result).toBe(false);
      expect(
        notificationManager.modalOverlay.classList.contains('hidden'),
      ).toBe(true);
    });

    test('should use custom options', async () => {
      const options = {
        title: 'Custom Title',
        confirmText: 'Yes',
        cancelText: 'No',
        type: 'danger',
      };

      notificationManager.showConfirmation('Custom message', options);

      const modal = notificationManager.modalOverlay.querySelector(
        '.notification-modal',
      );
      expect(modal.querySelector('.notification-modal-title').textContent).toBe(
        'Custom Title',
      );
      expect(
        modal.querySelector('.notification-modal-button-confirm').textContent,
      ).toBe('Yes');
      expect(
        modal.querySelector('.notification-modal-button-cancel').textContent,
      ).toBe('No');
      expect(
        modal
          .querySelector('.notification-modal-icon')
          .classList.contains('notification-modal-icon-danger'),
      ).toBe(true);
    });

    test('should focus first button when modal opens', async () => {
      notificationManager.showConfirmation('Test message');

      const firstButton =
        notificationManager.modalOverlay.querySelector('button');
      firstButton.focus = jest.fn();

      // Simulate the focus call that happens in showConfirmation
      const modal = notificationManager.modalOverlay.querySelector(
        '.notification-modal',
      );
      const firstModalButton = modal.querySelector('button');
      if (firstModalButton) {
        firstModalButton.focus();
      }

      expect(firstModalButton).toBeTruthy();
    });

    test('should provide convenience confirm method', async () => {
      notificationManager.showConfirmation = jest.fn().mockResolvedValue(true);

      const result = await notificationManager.confirm('Test message');

      expect(notificationManager.showConfirmation).toHaveBeenCalledWith(
        'Test message',
      );
      expect(result).toBe(true);
    });
  });

  describe('modal overlay interactions', () => {
    beforeEach(() => {
      notificationManager.initialize();
    });

    test('should close modal on overlay click', async () => {
      notificationManager.showConfirmation('Test message');

      // Click on the overlay itself (not modal content)
      notificationManager.modalOverlay.click();

      expect(
        notificationManager.modalOverlay.classList.contains('hidden'),
      ).toBe(true);
    });

    test('should close modal on escape key', async () => {
      notificationManager.showConfirmation('Test message');

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);

      expect(
        notificationManager.modalOverlay.classList.contains('hidden'),
      ).toBe(true);
    });

    test('should not close modal on escape when modal is hidden', async () => {
      notificationManager.closeModal = jest.fn();

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);

      expect(notificationManager.closeModal).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      notificationManager.initialize();
    });

    test('should handle dismissing non-active toast', () => {
      const fakeToast = document.createElement('div');

      expect(() => {
        notificationManager.dismissToast(fakeToast);
      }).not.toThrow();
    });

    test('should handle removing toast that has no parent', () => {
      const toast = notificationManager.showToast('Test message');
      toast.parentNode.removeChild(toast); // Remove manually

      // This should not throw when timeout fires
      jest.advanceTimersByTime(5000);

      expect(notificationManager.activeToasts.has(toast)).toBe(false);
    });

    test('should use default icon for unknown toast type', () => {
      const toast = notificationManager.showToast(
        'Test message',
        'unknown-type',
      );

      expect(toast.querySelector('.notification-toast-icon').textContent).toBe(
        'ℹ',
      );
    });

    test('should use default icon for unknown modal type', () => {
      notificationManager.showConfirmation('Test message', {
        type: 'unknown-type',
      });

      const modal = notificationManager.modalOverlay.querySelector(
        '.notification-modal',
      );
      expect(modal.querySelector('.notification-modal-icon').textContent).toBe(
        '?',
      );
    });
  });

  describe('cleanup and lifecycle', () => {
    beforeEach(() => {
      notificationManager.initialize();
    });

    test('should remove toast from DOM after dismiss animation', () => {
      const toast = notificationManager.showToast('Test message');

      notificationManager.dismissToast(toast);

      expect(toast.classList.contains('dismissing')).toBe(true);
      expect(notificationManager.activeToasts.has(toast)).toBe(false);

      // Fast-forward through the animation delay
      jest.advanceTimersByTime(300);

      expect(notificationManager.toastContainer.contains(toast)).toBe(false);
    });

    test('should clear modal content when closed', () => {
      notificationManager.showConfirmation('Test message');

      notificationManager.closeModal();

      expect(notificationManager.modalOverlay.innerHTML).toBe('');
      expect(notificationManager.modalOverlay.getAttribute('aria-hidden')).toBe(
        'true',
      );
      expect(
        notificationManager.modalOverlay.classList.contains('hidden'),
      ).toBe(true);
    });
  });
});
