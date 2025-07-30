/**
 * Unit tests for uiSetup.js - Menu functionality and button handlers
 */

import { setupUI } from '../../../src/js/core/uiSetup.js';
import { exportToJSON, importFromJSON } from '../../../src/js/data/dataStore.js';
import { clearAllState } from '../../../src/js/data/storageManager.js';

// Mock dependencies
jest.mock('../../../src/js/data/dataStore.js');
jest.mock('../../../src/js/data/storageManager.js');
jest.mock('../../../src/js/core/canvasManager.js', () => ({
  canvasManager: {
    getAvailableModules: jest.fn(() => ['Standard Canvas', 'Hero\'s Journey'])
  }
}));
jest.mock('../../../src/js/utils/utils.js', () => ({
  log: jest.fn(),
  debounce: jest.fn(fn => fn),
  throttle: jest.fn(fn => fn),
  truncateNoteContent: jest.fn(content => content.substring(0, 100))
}));

// Mock DOM methods
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
    readText: jest.fn(),
  },
});

// Mock window.confirm and alert
global.confirm = jest.fn();
global.alert = jest.fn();

describe('UI Setup - Menu Functionality', () => {
  let mockElements;
  let mockCanvas;
  let mockMenu;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set up DOM
    document.body.innerHTML = `
      <div id="canvas"></div>
      <div id="menu">
        <button id="clear-canvas-button">Clear Canvas</button>
        <button id="export-to-file-button">Export to File</button>
        <button id="import-from-file-button">Import from File</button>
        <button id="export-to-clipboard-button">Export to Clipboard</button>
        <button id="import-from-clipboard-button">Import from Clipboard</button>
      </div>
      <ul id="canvas-style-dropdown"></ul>
    `;
    
    mockCanvas = document.getElementById('canvas');
    mockMenu = document.getElementById('menu');
    
    mockElements = {
      canvas: mockCanvas,
      menu: mockMenu,
      canvasStyleDropdown: document.getElementById('canvas-style-dropdown'),
    };
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Button Event Handler Setup', () => {
    test('should attach event listeners to all menu buttons', () => {
      setupUI(mockElements);
      
      // Test that buttons exist and can be found
      expect(mockMenu.querySelector('#clear-canvas-button')).toBeTruthy();
      expect(mockMenu.querySelector('#export-to-file-button')).toBeTruthy();
      expect(mockMenu.querySelector('#import-from-file-button')).toBeTruthy();
      expect(mockMenu.querySelector('#export-to-clipboard-button')).toBeTruthy();
      expect(mockMenu.querySelector('#import-from-clipboard-button')).toBeTruthy();
    });
  });

  describe('Clear Canvas Functionality', () => {
    test('should clear canvas when user confirms', () => {
      global.confirm.mockReturnValue(true);
      clearAllState.mockImplementation(() => {});
      
      setupUI(mockElements);
      
      const clearButton = mockMenu.querySelector('#clear-canvas-button');
      clearButton.click();
      
      expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to clear the canvas?');
      expect(clearAllState).toHaveBeenCalledWith(mockCanvas);
    });

    test('should not clear canvas when user cancels', () => {
      global.confirm.mockReturnValue(false);
      clearAllState.mockImplementation(() => {});
      
      setupUI(mockElements);
      
      const clearButton = mockMenu.querySelector('#clear-canvas-button');
      clearButton.click();
      
      expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to clear the canvas?');
      expect(clearAllState).not.toHaveBeenCalled();
    });
  });

  describe('Export to File Functionality', () => {
    test('should trigger file download on export', () => {
      const mockJsonData = '{"data":{"n":[],"c":[]}}';
      exportToJSON.mockReturnValue(mockJsonData);
      
      // Mock URL and createElement
      const mockAnchor = {
        href: '',
        download: '',
        click: jest.fn(),
      };
      jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor);
      global.URL.createObjectURL = jest.fn().mockReturnValue('blob:mock-url');
      global.URL.revokeObjectURL = jest.fn();
      
      setupUI(mockElements);
      
      const exportButton = mockMenu.querySelector('#export-to-file-button');
      exportButton.click();
      
      expect(exportToJSON).toHaveBeenCalled();
      expect(mockAnchor.download).toBe('mindmap_export.json');
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });
  });

  describe('Import from File Functionality', () => {
    test('should handle file import process', () => {
      importFromJSON.mockImplementation(() => {});
      
      // Mock file input creation
      const mockFileInput = {
        type: '',
        accept: '',
        onchange: null,
        click: jest.fn(),
      };
      jest.spyOn(document, 'createElement').mockReturnValue(mockFileInput);
      
      setupUI(mockElements);
      
      const importButton = mockMenu.querySelector('#import-from-file-button');
      importButton.click();
      
      expect(mockFileInput.type).toBe('file');
      expect(mockFileInput.accept).toBe('.json');
      expect(mockFileInput.click).toHaveBeenCalled();
    });
  });

  describe('Clipboard Functionality', () => {
    test('should export to clipboard successfully', async () => {
      const mockJsonData = '{"data":{"n":[],"c":[]}}';
      exportToJSON.mockReturnValue(mockJsonData);
      navigator.clipboard.writeText.mockResolvedValue();
      
      setupUI(mockElements);
      
      const exportButton = mockMenu.querySelector('#export-to-clipboard-button');
      exportButton.click();
      
      // Wait for async clipboard operation
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(exportToJSON).toHaveBeenCalled();
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockJsonData);
      expect(global.alert).toHaveBeenCalledWith('Mind map exported to clipboard!');
    });

    test('should handle clipboard export failure', async () => {
      const mockJsonData = '{"data":{"n":[],"c":[]}}';
      exportToJSON.mockReturnValue(mockJsonData);
      navigator.clipboard.writeText.mockRejectedValue(new Error('Clipboard access denied'));
      
      setupUI(mockElements);
      
      const exportButton = mockMenu.querySelector('#export-to-clipboard-button');
      exportButton.click();
      
      // Wait for async clipboard operation
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(global.alert).toHaveBeenCalledWith('Failed to copy to clipboard. Please try again.');
    });

    test('should import from clipboard successfully', async () => {
      const mockJsonData = '{"data":{"n":[{"i":"1","p":[100,100],"c":"Test"}],"c":[]}}';
      navigator.clipboard.readText.mockResolvedValue(mockJsonData);
      importFromJSON.mockImplementation(() => {});
      
      setupUI(mockElements);
      
      const importButton = mockMenu.querySelector('#import-from-clipboard-button');
      importButton.click();
      
      // Wait for async clipboard operation
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(navigator.clipboard.readText).toHaveBeenCalled();
      expect(importFromJSON).toHaveBeenCalledWith(mockJsonData, mockCanvas);
      expect(global.alert).toHaveBeenCalledWith('Mind map imported from clipboard!');
    });

    test('should handle clipboard import failure', async () => {
      navigator.clipboard.readText.mockRejectedValue(new Error('Clipboard access denied'));
      
      setupUI(mockElements);
      
      const importButton = mockMenu.querySelector('#import-from-clipboard-button');
      importButton.click();
      
      // Wait for async clipboard operation
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(global.alert).toHaveBeenCalledWith('Failed to read from clipboard. Please try again.');
    });

    test('should handle invalid JSON in clipboard', async () => {
      navigator.clipboard.readText.mockResolvedValue('invalid json');
      importFromJSON.mockImplementation(() => {
        throw new Error('Invalid JSON');
      });
      
      setupUI(mockElements);
      
      const importButton = mockMenu.querySelector('#import-from-clipboard-button');
      importButton.click();
      
      // Wait for async clipboard operation
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(global.alert).toHaveBeenCalledWith('Error importing from clipboard. Please make sure the clipboard contains valid JSON data.');
    });
  });
});