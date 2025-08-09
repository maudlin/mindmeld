// src/js/interactions/adapters/DesktopAdapter.js

import { BaseAdapter } from './BaseAdapter.js';

/**
 * Desktop input adapter for mouse, keyboard, and trackpad interactions
 * Handles traditional desktop interaction patterns
 */
export class DesktopAdapter extends BaseAdapter {
  constructor() {
    super();
    this.name = 'desktop';
  }

  /**
   * Initialize desktop-specific event listeners
   */
  async initializeEventListeners() {
    // TODO: Implement desktop event listeners in MM-52
    // This is a minimal implementation to pass tests
  }

  /**
   * Clean up desktop event listeners
   */
  async destroyEventListeners() {
    // TODO: Implement cleanup in MM-52
    // This is a minimal implementation to pass tests
  }
}
