// src/js/services/notificationManager.js

/**
 * NotificationManager - Centralized service for displaying styled notifications and confirmations
 * Replaces browser alert() and confirm() with consistent, styled UI components
 */

import { logger } from './logger.js';

export class NotificationManager {
  constructor() {
    this.toastContainer = null;
    this.modalOverlay = null;
    this.activeToasts = new Set();
    this.isInitialized = false;
  }

  /**
   * Initialize the notification system
   */
  initialize() {
    if (this.isInitialized) return;

    this.createToastContainer();
    this.createModalOverlay();
    this.setupEventListeners();
    this.isInitialized = true;
    logger.info('NotificationManager initialized');
  }

  /**
   * Create the toast notification container
   */
  createToastContainer() {
    this.toastContainer = document.createElement('div');
    this.toastContainer.id = 'notification-toast-container';
    this.toastContainer.className = 'notification-toast-container';
    this.toastContainer.setAttribute('aria-live', 'polite');
    this.toastContainer.setAttribute('aria-label', 'Notifications');
    document.body.appendChild(this.toastContainer);
  }

  /**
   * Create the modal overlay for confirmations
   */
  createModalOverlay() {
    this.modalOverlay = document.createElement('div');
    this.modalOverlay.id = 'notification-modal-overlay';
    this.modalOverlay.className = 'notification-modal-overlay hidden';
    this.modalOverlay.setAttribute('aria-hidden', 'true');
    document.body.appendChild(this.modalOverlay);
  }

  /**
   * Setup global event listeners
   */
  setupEventListeners() {
    // Close modal on overlay click
    this.modalOverlay.addEventListener('click', (e) => {
      if (e.target === this.modalOverlay) {
        this.closeModal();
      }
    });

    // Handle escape key for modals
    document.addEventListener('keydown', (e) => {
      if (
        e.key === 'Escape' &&
        !this.modalOverlay.classList.contains('hidden')
      ) {
        this.closeModal();
      }
    });
  }

  /**
   * Show a toast notification
   * @param {string} message - The message to display
   * @param {string} type - Type: 'success', 'error', 'info', 'warning'
   * @param {number} duration - Auto-dismiss duration in ms (0 = no auto-dismiss)
   */
  showToast(message, type = 'info', duration = 5000) {
    const toast = this.createToast(message, type);
    this.toastContainer.appendChild(toast);
    this.activeToasts.add(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Auto-dismiss if duration > 0
    if (duration > 0) {
      setTimeout(() => {
        this.dismissToast(toast);
      }, duration);
    }

    return toast;
  }

  /**
   * Create a toast element
   * @param {string} message - The message
   * @param {string} type - The toast type
   */
  createToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `notification-toast notification-toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');

    const icon = this.getToastIcon(type);
    const closeButton = document.createElement('button');
    closeButton.className = 'notification-toast-close';
    closeButton.setAttribute('aria-label', 'Close notification');
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => this.dismissToast(toast));

    const content = document.createElement('div');
    content.className = 'notification-toast-content';

    const iconEl = document.createElement('div');
    iconEl.className = 'notification-toast-icon';
    iconEl.textContent = icon;

    const messageEl = document.createElement('div');
    messageEl.className = 'notification-toast-message';
    messageEl.textContent = message;

    content.appendChild(iconEl);
    content.appendChild(messageEl);
    toast.appendChild(content);
    toast.appendChild(closeButton);

    return toast;
  }

  /**
   * Get icon for toast type
   * @param {string} type - The toast type
   */
  getToastIcon(type) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ',
    };
    return icons[type] || icons.info;
  }

  /**
   * Dismiss a toast notification
   * @param {HTMLElement} toast - The toast element to dismiss
   */
  dismissToast(toast) {
    if (!this.activeToasts.has(toast)) return;

    toast.classList.add('dismissing');
    this.activeToasts.delete(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300); // Match CSS transition duration
  }

  /**
   * Show a confirmation modal
   * @param {string} message - The confirmation message
   * @param {Object} options - Configuration options
   * @returns {Promise<boolean>} - Resolves with user's choice
   */
  showConfirmation(message, options = {}) {
    return new Promise((resolve) => {
      const config = {
        title: 'Confirm',
        confirmText: 'Yes',
        cancelText: 'No',
        type: 'warning',
        ...options,
      };

      const modal = this.createModal(message, config, resolve);
      this.modalOverlay.innerHTML = '';
      this.modalOverlay.appendChild(modal);
      this.modalOverlay.classList.remove('hidden');
      this.modalOverlay.setAttribute('aria-hidden', 'false');

      // Focus the modal for accessibility
      const firstButton = modal.querySelector('button');
      if (firstButton) {
        firstButton.focus();
      }
    });
  }

  /**
   * Create a modal element
   * @param {string} message - The message
   * @param {Object} config - Configuration
   * @param {Function} resolve - Promise resolve function
   */
  createModal(message, config, resolve) {
    const modal = document.createElement('div');
    modal.className = 'notification-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'modal-title');
    modal.setAttribute('aria-describedby', 'modal-message');

    const icon = this.getModalIcon(config.type);

    const content = document.createElement('div');
    content.className = 'notification-modal-content';

    const header = document.createElement('div');
    header.className = 'notification-modal-header';

    const iconEl = document.createElement('div');
    iconEl.className = `notification-modal-icon notification-modal-icon-${config.type}`;
    iconEl.textContent = icon;

    const title = document.createElement('h3');
    title.id = 'modal-title';
    title.className = 'notification-modal-title';
    title.textContent = config.title;

    header.appendChild(iconEl);
    header.appendChild(title);

    const messageEl = document.createElement('div');
    messageEl.id = 'modal-message';
    messageEl.className = 'notification-modal-message';
    messageEl.textContent = message;

    const actions = document.createElement('div');
    actions.className = 'notification-modal-actions';

    const cancelButton = document.createElement('button');
    cancelButton.className =
      'notification-modal-button notification-modal-button-cancel';
    cancelButton.setAttribute('data-action', 'cancel');
    cancelButton.textContent = config.cancelText;

    const confirmButton = document.createElement('button');
    confirmButton.className =
      'notification-modal-button notification-modal-button-confirm';
    confirmButton.setAttribute('data-action', 'confirm');
    confirmButton.textContent = config.confirmText;

    actions.appendChild(cancelButton);
    actions.appendChild(confirmButton);

    content.appendChild(header);
    content.appendChild(messageEl);
    content.appendChild(actions);
    modal.appendChild(content);

    // Add event listeners
    modal.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action === 'confirm') {
        this.closeModal();
        resolve(true);
      } else if (action === 'cancel') {
        this.closeModal();
        resolve(false);
      }
    });

    return modal;
  }

  /**
   * Get icon for modal type
   * @param {string} type - The modal type
   */
  getModalIcon(type) {
    const icons = {
      warning: '⚠',
      danger: '⚠',
      info: 'ℹ',
      question: '?',
    };
    return icons[type] || icons.question;
  }

  /**
   * Close the active modal
   */
  closeModal() {
    this.modalOverlay.classList.add('hidden');
    this.modalOverlay.setAttribute('aria-hidden', 'true');
    this.modalOverlay.innerHTML = '';
  }

  /**
   * Show success notification
   * @param {string} message - Success message
   */
  success(message) {
    return this.showToast(message, 'success');
  }

  /**
   * Show error notification
   * @param {string} message - Error message
   */
  error(message) {
    return this.showToast(message, 'error');
  }

  /**
   * Show info notification
   * @param {string} message - Info message
   */
  info(message) {
    return this.showToast(message, 'info');
  }

  /**
   * Show warning notification
   * @param {string} message - Warning message
   */
  warning(message) {
    return this.showToast(message, 'warning');
  }

  /**
   * Show confirmation dialog
   * @param {string} message - Confirmation message
   */
  confirm(message) {
    return this.showConfirmation(message);
  }

  /**
   * Clear all active toasts
   */
  clearAllToasts() {
    const toasts = Array.from(this.activeToasts);
    toasts.forEach((toast) => this.dismissToast(toast));
  }
}

// Create global instance
export const notificationManager = new NotificationManager();
