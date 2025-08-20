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
   * Change template - show the canvas style dropdown temporarily
   */
  changeTemplate() {
    const dropdown = document.getElementById('canvas-style-dropdown');
    if (dropdown) {
      // Temporarily show the dropdown
      const parentContainer = dropdown.parentElement;
      const originalDisplay = parentContainer.style.display;

      // Make dropdown visible and position it appropriately
      parentContainer.style.display = 'block';
      parentContainer.style.position = 'fixed';
      parentContainer.style.top = '50%';
      parentContainer.style.left = '50%';
      parentContainer.style.transform = 'translate(-50%, -50%)';
      parentContainer.style.zIndex = '2000';
      parentContainer.style.backgroundColor = 'white';
      parentContainer.style.border = '1px solid #ccc';
      parentContainer.style.borderRadius = '8px';
      parentContainer.style.padding = '16px';
      parentContainer.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';

      // Add a close button or click-away functionality
      const closeDropdown = () => {
        parentContainer.style.display = originalDisplay;
        parentContainer.style.position = '';
        parentContainer.style.top = '';
        parentContainer.style.left = '';
        parentContainer.style.transform = '';
        parentContainer.style.zIndex = '';
        parentContainer.style.backgroundColor = '';
        parentContainer.style.border = '';
        parentContainer.style.borderRadius = '';
        parentContainer.style.padding = '';
        parentContainer.style.boxShadow = '';
        document.removeEventListener('click', outsideClickHandler);
      };

      // Click-away handler
      const outsideClickHandler = (e) => {
        if (!dropdown.contains(e.target)) {
          closeDropdown();
        }
      };

      // Add click-away after a short delay to avoid immediate closure
      setTimeout(() => {
        document.addEventListener('click', outsideClickHandler);
      }, 100);

      // Also close when a template is selected
      const templateButtons = dropdown.querySelectorAll('button');
      templateButtons.forEach((button) => {
        button.addEventListener('click', closeDropdown, { once: true });
      });
    }
  }

  /**
   * Show instructions - navigate to the about page
   */
  showInstructions() {
    window.location.href = 'about.html';
  }
}
