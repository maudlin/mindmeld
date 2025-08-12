/**
 * MindMeld Application Entry Point
 *
 * Orchestrates application initialization using the bootstrap system.
 * Maintains clean separation of concerns and robust error handling.
 */

import { log } from './utils/utils.js';
import { AppBootstrap } from './core/bootstrap/AppBootstrap.js';

log('app.js loaded');

async function initializeApp() {
  log('Initializing MindMeld application...');

  const appBootstrap = new AppBootstrap();

  try {
    const result = await appBootstrap.initialize();

    log('MindMeld application initialized successfully');
    log('Initialization result:', result);

    // Store bootstrap instance globally for potential cleanup during development/testing
    if (typeof window !== 'undefined') {
      window.__mindmeld_bootstrap = appBootstrap;
    }
  } catch (error) {
    console.error('MindMeld application failed to initialize:', error);

    // Show user-friendly error message
    showInitializationError();
  }
}

function showInitializationError() {
  // Create a simple error display for users
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    background: #ff6b6b; color: white; padding: 20px; border-radius: 8px;
    font-family: system-ui, sans-serif; text-align: center; z-index: 9999;
    max-width: 400px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;

  errorDiv.innerHTML = `
    <h3 style="margin: 0 0 10px 0;">Application Error</h3>
    <p style="margin: 0 0 15px 0;">MindMeld failed to initialize properly.</p>
    <p style="margin: 0; font-size: 0.9em; opacity: 0.9;">
      Please refresh the page to try again.
    </p>
  `;

  document.body.appendChild(errorDiv);

  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (errorDiv.parentNode) {
      errorDiv.parentNode.removeChild(errorDiv);
    }
  }, 10000);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);
