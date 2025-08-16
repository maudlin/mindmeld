// src/js/features/kebabMenu/kebabMenuEvents.js

/**
 * Event handler for kebab menu actions
 * Connects kebab menu to existing functionality
 */
export class KebabMenuEvents {
  constructor() {
    this.setupEventListeners();
  }

  /**
   * Set up event listeners for kebab menu actions
   */
  setupEventListeners() {
    document.addEventListener('kebab-menu-action', (e) => {
      this.handleAction(e.detail.action);
    });

    // Handle navbar instructions button
    const instructionsButton = document.getElementById(
      'show-instructions-button',
    );
    if (instructionsButton) {
      instructionsButton.addEventListener('click', () => {
        this.showInstructions();
      });
    }
  }

  /**
   * Handle kebab menu actions by triggering existing functionality
   * @param {string} action - The action to perform
   */
  handleAction(action) {
    switch (action) {
      case 'clear-canvas':
        this.clearCanvas();
        break;
      case 'import-from-file':
        this.importFromFile();
        break;
      case 'export-to-file':
        this.exportToFile();
        break;
      case 'export-to-clipboard':
        this.exportToClipboard();
        break;
      case 'import-from-clipboard':
        this.importFromClipboard();
        break;
      case 'change-template':
        this.changeTemplate();
        break;
      default:
        console.warn(`Unhandled kebab menu action: ${action}`);
    }
  }

  /**
   * Clear the canvas by clicking the existing clear button
   */
  clearCanvas() {
    const clearButton = document.getElementById('clear-canvas-button');
    if (clearButton) {
      clearButton.click();
    }
  }

  /**
   * Import from file by clicking the existing import button
   */
  importFromFile() {
    const importButton = document.getElementById('import-from-file-button');
    if (importButton) {
      importButton.click();
    }
  }

  /**
   * Export to file by clicking the existing export button
   */
  exportToFile() {
    const exportButton = document.getElementById('export-to-file-button');
    if (exportButton) {
      exportButton.click();
    }
  }

  /**
   * Export to clipboard by clicking the existing export button
   */
  exportToClipboard() {
    const exportButton = document.getElementById('export-to-clipboard-button');
    if (exportButton) {
      exportButton.click();
    }
  }

  /**
   * Import from clipboard by clicking the existing import button
   */
  importFromClipboard() {
    const importButton = document.getElementById(
      'import-from-clipboard-button',
    );
    if (importButton) {
      importButton.click();
    }
  }

  /**
   * Change template - this will need to be enhanced to show template options
   */
  changeTemplate() {
    // For now, we'll navigate to the canvas style dropdown
    const dropdown = document.getElementById('canvas-style-dropdown');
    if (dropdown) {
      // Trigger the dropdown to show available templates
      const parentItem = dropdown.closest('.menu-item');
      if (parentItem) {
        parentItem.querySelector('.menu-button')?.click();
      }
    }
  }

  /**
   * Show instructions - display the overlay with instructions
   */
  showInstructions() {
    const overlay = document.getElementById('overlay');
    if (overlay) {
      overlay.classList.remove('hidden');
    }
  }
}
