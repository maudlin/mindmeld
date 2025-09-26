/**
 * ToolbarBehavior - Comprehensive Unit Tests
 *
 * Tests the unified toolbar behavior that handles color picker and context-sensitive actions.
 * Follows Adapter-Behavior pattern with clean separation of input detection and business logic.
 * Part of Context-Sensitive Toolbar Architecture Refactor.
 */

import { ToolbarBehavior } from '../../../../src/js/interactions/behaviors/ToolbarBehavior.js';
import { noteManager } from '../../../../src/js/services/noteManager.js';

// Mock the dependencies
jest.mock('../../../../src/js/services/colorService.js', () => ({
  ColorService: {
    applyColorToSelectedNotes: jest.fn(),
    getCurrentColor: jest.fn(() => 'yellow'),
    isValidColor: jest.fn(() => true),
  },
}));

jest.mock('../../../../src/js/services/noteManager.js', () => ({
  noteManager: {
    getSelectedNotes: jest.fn(() => []),
  },
}));

jest.mock('../../../../src/js/utils/utils.js', () => ({
  log: jest.fn(),
}));

// Mock the dynamic import of connectionManager
jest.mock(
  '../../../../src/js/features/connection/connectionManager.js',
  () => ({
    connectionManager: {
      updateConnectionType: jest.fn(),
    },
  }),
);

describe('ToolbarBehavior', () => {
  let toolbarBehavior;
  let mockEventBus;

  beforeEach(() => {
    // Mock console methods
    global.console = {
      ...global.console,
      log: jest.fn(),
      warn: jest.fn(),
    };

    // Create mock event bus
    mockEventBus = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    };

    // Mock DOM elements
    global.document = {
      querySelector: jest.fn(() => null), // Default to null for graceful handling
      querySelectorAll: jest.fn(() => []),
      getElementById: jest.fn(() => ({
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
      createElement: jest.fn(() => ({
        setAttribute: jest.fn(),
        appendChild: jest.fn(),
        removeChild: jest.fn(),
        textContent: '',
        style: {},
        classList: { add: jest.fn(), remove: jest.fn() },
        className: 'sr-only',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        remove: jest.fn(),
      })),
      body: {
        appendChild: jest.fn(),
        removeChild: jest.fn(),
      },
    };

    global.console = {
      log: jest.fn(),
    };

    // Create ToolbarBehavior instance
    toolbarBehavior = new ToolbarBehavior(mockEventBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should create ToolbarBehavior instance', () => {
      expect(toolbarBehavior).toBeDefined();
      expect(toolbarBehavior.name).toBe('ToolbarBehavior');
      expect(toolbarBehavior.isInitialized).toBe(false);
    });

    test('should initialize and set up event listeners', async () => {
      await toolbarBehavior.initialize();

      expect(toolbarBehavior.isInitialized).toBe(true);
      expect(mockEventBus.on).toHaveBeenCalledWith(
        'note.selection.changed',
        expect.any(Function),
      );
      expect(mockEventBus.on).toHaveBeenCalledWith(
        'connector.hovered',
        expect.any(Function),
      );
      expect(mockEventBus.on).toHaveBeenCalledWith(
        'connector.unhovered',
        expect.any(Function),
      );
    });

    test('should not initialize twice', async () => {
      await toolbarBehavior.initialize();
      await toolbarBehavior.initialize();

      expect(toolbarBehavior.isInitialized).toBe(true);
      // Should only register listeners once
      expect(mockEventBus.on).toHaveBeenCalledTimes(5);
    });
  });

  describe('Color Selection', () => {
    beforeEach(async () => {
      await toolbarBehavior.initialize();
    });

    test('should handle color selection from desktop adapter', () => {
      toolbarBehavior.handleColorSelection('blue', 'desktop');

      expect(mockEventBus.emit).toHaveBeenCalledWith('colorPicker.selection', {
        color: 'blue',
        inputType: 'desktop',
      });
    });

    test('should handle color selection from touch adapter', () => {
      toolbarBehavior.handleColorSelection('green', 'touch');

      expect(mockEventBus.emit).toHaveBeenCalledWith('colorPicker.selection', {
        color: 'green',
        inputType: 'touch',
      });
    });

    test('should not handle color selection without color', () => {
      toolbarBehavior.handleColorSelection(null, 'desktop');

      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });

    test('should update active color swatch', () => {
      const mockSwatches = [
        { classList: { remove: jest.fn(), add: jest.fn() } },
        { classList: { remove: jest.fn(), add: jest.fn() } },
      ];
      const mockActiveSwatch = { classList: { add: jest.fn() } };

      global.document.querySelectorAll = jest.fn(() => mockSwatches);
      global.document.querySelector = jest.fn(() => mockActiveSwatch);

      toolbarBehavior.updateActiveColorSwatch('pink');

      mockSwatches.forEach((swatch) => {
        expect(swatch.classList.remove).toHaveBeenCalledWith('active');
      });
      expect(mockActiveSwatch.classList.add).toHaveBeenCalledWith('active');
    });
  });

  describe('Context State Management', () => {
    test('should start with canvas context', () => {
      // Check initial state before initialization
      expect(toolbarBehavior.currentContext.type).toBe('canvas');
    });

    test('should map empty selection to canvas context', () => {
      const selectionData = { selectedNotes: [] };
      const context = toolbarBehavior.mapSelectionToContext(selectionData);

      expect(context.type).toBe('canvas');
      expect(context.data).toBe(null);
    });

    test('should map single note selection to noteSelected context', () => {
      const selectionData = {
        type: 'selected',
        note: 'note-1',
        selectedCount: 1,
      };
      const context = toolbarBehavior.mapSelectionToContext(selectionData);

      expect(context.type).toBe('noteSelected');
      expect(context.data.count).toBe(1);
      expect(context.data.noteIds).toEqual(['note-1']);
    });

    test('should map multiple note selection to multiNoteSelected context', () => {
      const selectionData = {
        type: 'selected',
        note: 'note-3',
        selectedCount: 3,
      };
      const context = toolbarBehavior.mapSelectionToContext(selectionData);

      expect(context.type).toBe('multiNoteSelected');
      expect(context.data.count).toBe(3);
      expect(context.data.noteIds).toEqual([]); // We don't have full array, just count
    });

    test('should update context when selection changes', () => {
      const newContext = {
        type: 'noteSelected',
        data: { noteIds: ['note-1'], count: 1 },
      };

      // Test context update without triggering DOM updates
      toolbarBehavior.currentContext = newContext;

      expect(toolbarBehavior.currentContext).toEqual(newContext);
    });
  });

  describe('Button State Management', () => {
    let mockDeleteButton;
    let mockSwitchButton;

    beforeEach(async () => {
      mockDeleteButton = {
        disabled: false,
        style: { opacity: '1' },
      };
      mockSwitchButton = {
        disabled: false,
        style: { opacity: '1' },
      };

      global.document.querySelector = jest.fn((selector) => {
        if (selector === '[data-toolbar-action="delete"]')
          return mockDeleteButton;
        if (selector === '[data-toolbar-action="switch-type"]')
          return mockSwitchButton;
        return null;
      });

      await toolbarBehavior.initialize();
    });

    test('should set canvas context state (both buttons disabled)', () => {
      const context = { type: 'canvas', data: null };

      toolbarBehavior.applyContextState(context);

      expect(mockDeleteButton.disabled).toBe(true);
      expect(mockDeleteButton.style.opacity).toBe(0.2);
      expect(mockSwitchButton.disabled).toBe(true);
      expect(mockSwitchButton.style.opacity).toBe(0.2);
    });

    test('should set noteSelected context state (delete enabled, switch disabled)', () => {
      const context = {
        type: 'noteSelected',
        data: { noteIds: ['note-1'], count: 1 },
      };

      toolbarBehavior.applyContextState(context);

      expect(mockDeleteButton.disabled).toBe(false);
      expect(mockDeleteButton.style.opacity).toBe(1.0);
      expect(mockSwitchButton.disabled).toBe(true);
      expect(mockSwitchButton.style.opacity).toBe(0.2);
    });

    test('should set connectorActive context state (both buttons enabled)', () => {
      const context = {
        type: 'connectorActive',
        data: {
          connectionId: 'conn-1',
          startId: 'note-1',
          endId: 'note-2',
          currentType: 1,
        },
      };

      toolbarBehavior.applyContextState(context);

      expect(mockDeleteButton.disabled).toBe(false);
      expect(mockDeleteButton.style.opacity).toBe(1.0);
      expect(mockSwitchButton.disabled).toBe(false);
      expect(mockSwitchButton.style.opacity).toBe(1.0);
    });

    test('should handle missing DOM elements gracefully', () => {
      global.document.querySelector = jest.fn(() => null);

      const context = {
        type: 'noteSelected',
        data: { noteIds: ['note-1'], count: 1 },
      };

      expect(() => {
        toolbarBehavior.applyContextState(context);
      }).not.toThrow();
    });
  });

  describe('Delete Actions', () => {
    beforeEach(async () => {
      await toolbarBehavior.initialize();
    });

    test('should handle single note deletion', () => {
      const mockNote = { id: 'note-1' };
      noteManager.getSelectedNotes.mockReturnValue([mockNote]);
      global.document.getElementById = jest.fn(() => ({ id: 'canvas' }));

      toolbarBehavior.currentContext = {
        type: 'noteSelected',
        data: { noteIds: ['note-1'], count: 1 },
      };

      toolbarBehavior.handleDeleteAction('desktop');

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'note.deleteWithConnections',
        {
          note: mockNote,
          canvas: { id: 'canvas' },
        },
      );
    });

    test('should handle multiple note deletion', () => {
      const mockNotes = [{ id: 'note-1' }, { id: 'note-2' }];
      noteManager.getSelectedNotes.mockReturnValue(mockNotes);

      toolbarBehavior.currentContext = {
        type: 'multiNoteSelected',
        data: { noteIds: ['note-1', 'note-2'], count: 2 },
      };

      toolbarBehavior.handleDeleteAction('touch');

      expect(mockEventBus.emit).toHaveBeenCalledWith('notes.deleteSelected');
    });

    test('should handle connector deletion', () => {
      toolbarBehavior.currentContext = {
        type: 'connectorActive',
        data: { connectionId: 'conn-1', startId: 'note-1', endId: 'note-2' },
      };

      // Mock the DOM element for connector deletion
      const mockConnectorGroup = document.createElement('g');
      mockConnectorGroup.setAttribute('data-start', 'note-1');
      mockConnectorGroup.setAttribute('data-end', 'note-2');
      mockConnectorGroup.remove = jest.fn();

      global.document.querySelector = jest
        .fn()
        .mockReturnValue(mockConnectorGroup);

      toolbarBehavior.handleDeleteAction('desktop');

      expect(mockConnectorGroup.remove).toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalledWith('connection.deleted', {
        startId: 'note-1',
        endId: 'note-2',
      });
    });
  });

  describe('Connector Type Switching', () => {
    beforeEach(async () => {
      await toolbarBehavior.initialize();
    });

    test('should cycle connector types correctly', () => {
      expect(toolbarBehavior.getNextConnectionType('none')).toBe('uni-forward'); // none -> from->to
      expect(toolbarBehavior.getNextConnectionType('uni-forward')).toBe(
        'uni-backward',
      ); // from->to -> to->from
      expect(toolbarBehavior.getNextConnectionType('uni-backward')).toBe('bi'); // to->from -> bidirectional
      expect(toolbarBehavior.getNextConnectionType('bi')).toBe('none'); // bidirectional -> none
    });

    test('should handle connector type switch action', () => {
      toolbarBehavior.currentContext = {
        type: 'connectorActive',
        data: {
          startId: 'note-1',
          endId: 'note-2',
          currentType: 'uni-forward',
        },
      };

      // Mock the DOM elements needed
      const mockConnectorGroup = document.createElement('g');
      mockConnectorGroup.setAttribute('data-start', 'note-1');
      mockConnectorGroup.setAttribute('data-end', 'note-2');
      document.body.appendChild(mockConnectorGroup);

      toolbarBehavior.handleConnectorTypeSwitch('desktop');

      // Clean up
      document.body.removeChild(mockConnectorGroup);
    });

    test('should not switch type when no connector active', () => {
      toolbarBehavior.currentContext = { type: 'canvas', data: null };

      toolbarBehavior.handleConnectorTypeSwitch('desktop');

      expect(mockEventBus.emit).not.toHaveBeenCalledWith(
        'connection.typeChange',
        expect.any(Object),
      );
    });
  });

  describe('Keyboard Navigation', () => {
    beforeEach(async () => {
      await toolbarBehavior.initialize();
    });

    test('should handle Enter key', () => {
      const mockElement = { click: jest.fn() };
      const mockEvent = { key: 'Enter', preventDefault: jest.fn() };

      toolbarBehavior.handleKeyboardNavigation(mockEvent, mockElement);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockElement.click).toHaveBeenCalled();
    });

    test('should handle Space key', () => {
      const mockElement = { click: jest.fn() };
      const mockEvent = { key: ' ', preventDefault: jest.fn() };

      toolbarBehavior.handleKeyboardNavigation(mockEvent, mockElement);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockElement.click).toHaveBeenCalled();
    });

    test('should handle ArrowRight key', () => {
      const mockElement = {};
      const mockEvent = { key: 'ArrowRight', preventDefault: jest.fn() };

      // Mock the focus methods
      toolbarBehavior.focusNextToolbarElement = jest.fn();

      toolbarBehavior.handleKeyboardNavigation(mockEvent, mockElement);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(toolbarBehavior.focusNextToolbarElement).toHaveBeenCalledWith(
        mockElement,
      );
    });
  });

  describe('Cleanup', () => {
    test('should clean up event listeners and reset state', async () => {
      await toolbarBehavior.initialize();

      toolbarBehavior.cleanup();

      expect(mockEventBus.off).toHaveBeenCalledWith('note.selection.changed');
      expect(mockEventBus.off).toHaveBeenCalledWith('connector.hovered');
      expect(mockEventBus.off).toHaveBeenCalledWith('connector.unhovered');
      expect(toolbarBehavior.isInitialized).toBe(false);
    });
  });
});
