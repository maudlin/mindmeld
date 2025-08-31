// uiSetup.js - Handles UI initialization and setup
import { log } from '../utils/utils.js';
import { canvasManager } from './canvasManager.js';
import { exportToJSON, importFromJSON } from '../data/dataStore.js';
import { clearAllState } from '../data/storageManager.js';
import {
  setupZoomAndPan,
  setFixedZoom,
} from '../features/zoom/viewportAdapter.js';
import { notificationManager } from '../services/notificationManager.js';
import { setupMobileDropdown } from '../utils/mobileInteractions.js';

export function setupUI(elements) {
  populateCanvasStyleDropdown(elements);
  setupExportImport(elements.menu, elements.canvas);
  setupClearCanvas(elements.menu, elements.canvas);
  setupMobileDropdownBehavior();
}

function populateCanvasStyleDropdown(elements) {
  const dropdown =
    elements.canvasStyleDropdown ||
    document.getElementById('canvas-style-dropdown');
  if (dropdown) {
    canvasManager.getAvailableModules().forEach((moduleName) => {
      const button = createDropdownButton(moduleName, () =>
        switchCanvas(moduleName, elements),
      );
      dropdown.appendChild(button);
    });
  }
}

function createDropdownButton(text, onClick) {
  const li = document.createElement('li');
  const button = document.createElement('button');
  button.textContent = text;
  button.addEventListener('click', onClick);
  li.appendChild(button);
  return li;
}

function switchCanvas(moduleName, elements) {
  log('Switching to canvas:', moduleName);
  try {
    canvasManager.switchBackgroundLayout(moduleName, elements.canvas);

    // Update canvas dimensions if necessary
    const currentModule = canvasManager.getCurrentModule();
    if (currentModule) {
      elements.canvas.style.width = `${currentModule.width}px`;
      elements.canvas.style.height = `${currentModule.height}px`;
    }

    // Handle zoom and pan
    const centerX = elements.canvas.clientWidth / 2;
    const centerY = elements.canvas.clientHeight / 2;
    setFixedZoom(1, elements.canvas, elements.zoomDisplay, centerX, centerY);
    setupZoomAndPan(
      elements.canvasContainer,
      elements.canvas,
      elements.zoomDisplay,
    );
  } catch (error) {
    console.error(`Error switching to canvas ${moduleName}:`, error);
    notificationManager.error(
      `Failed to switch to ${moduleName}. Please try again.`,
    );
  }
}

function setupExportImport(menu, canvas) {
  // Export to file button
  const exportToFileButton = document.getElementById('export-to-file-button');
  if (exportToFileButton) {
    exportToFileButton.addEventListener('click', handleExportToFile);
  }

  // Import from file button
  const importFromFileButton = document.getElementById(
    'import-from-file-button',
  );
  if (importFromFileButton) {
    importFromFileButton.addEventListener('click', () =>
      handleImportFromFile(canvas),
    );
  }

  // Export to clipboard button
  const exportToClipboardButton = document.getElementById(
    'export-to-clipboard-button',
  );
  if (exportToClipboardButton) {
    exportToClipboardButton.addEventListener('click', handleExportToClipboard);
  }

  // Import from clipboard button
  const importFromClipboardButton = document.getElementById(
    'import-from-clipboard-button',
  );
  if (importFromClipboardButton) {
    importFromClipboardButton.addEventListener('click', () =>
      handleImportFromClipboard(canvas),
    );
  }
}

function handleExportToFile() {
  const json = exportToJSON();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mindmap_export.json';
  a.click();
  URL.revokeObjectURL(url);

  // Show info notification that download was initiated (not completed)
  notificationManager.info(
    "Download started - check your browser's download area",
  );
}

function handleImportFromFile(canvas) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        importFromJSON(e.target.result, canvas);
        notificationManager.success('Mind map imported successfully!');
      } catch (error) {
        console.error('Error importing file:', error);
        notificationManager.error(
          "Error importing file. Please make sure it's a valid JSON file.",
        );
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function handleExportToClipboard() {
  const json = exportToJSON();
  navigator.clipboard
    .writeText(json)
    .then(() => {
      notificationManager.success('Mind map exported to clipboard!');
    })
    .catch((error) => {
      console.error('Error copying to clipboard:', error);
      notificationManager.error(
        'Failed to copy to clipboard. Please try again.',
      );
    });
}

function handleImportFromClipboard(canvas) {
  navigator.clipboard
    .readText()
    .then((text) => {
      try {
        importFromJSON(text, canvas);
        notificationManager.success('Mind map imported from clipboard!');
      } catch (error) {
        console.error('Error importing from clipboard:', error);
        notificationManager.error(
          'Error importing from clipboard. Please make sure the clipboard contains valid JSON data.',
        );
      }
    })
    .catch((error) => {
      console.error('Error reading from clipboard:', error);
      notificationManager.error(
        'Failed to read from clipboard. Please try again.',
      );
    });
}

function setupClearCanvas(menu, canvas) {
  const clearButton = document.getElementById('clear-canvas-button');
  if (clearButton) {
    clearButton.addEventListener('click', async () => {
      const confirmed = await notificationManager.confirm(
        'Are you sure you want to clear the canvas?',
      );
      if (confirmed) {
        clearAllState(canvas);
        notificationManager.success('Canvas cleared successfully!');
      }
    });
  }
}

function setupMobileDropdownBehavior() {
  // Use shared mobile dropdown utility for consistent behavior
  setupMobileDropdown('.menu-item', {
    dropdownSelector: '.dropdown',
    preventDefaultClick: true,
    singleDropdown: true,
    onOpen: (dropdown) => {
      log('Dropdown opened:', dropdown);
    },
    onClose: (dropdown) => {
      log('Dropdown closed:', dropdown);
    },
  });
}
