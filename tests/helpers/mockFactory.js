// tests/helpers/mockFactory.js
/**
 * Shared, minimal mock factory for consistent testing
 * Reduces duplication across test files while keeping mocks lightweight
 */

/**
 * Create a lightweight connection manager mock
 * @param {Object} overrides - Override specific methods
 * @returns {Object} Mock connection manager
 */
export function createConnectionManagerMock(overrides = {}) {
  return {
    createConnection: jest.fn(),
    updateConnections: jest.fn(),
    setConnectionUpdateCallback: jest.fn(),
    deleteConnectionsByNote: jest.fn(),
    setDragState: jest.fn(),
    initializeSVGContainer: jest.fn(() =>
      document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
    ),
    getClosestPoints: jest.fn(() => ({ x1: 0, y1: 0, x2: 100, y2: 100 })),
    CONNECTION_TYPES: {
      NONE: 'none',
      UNI_FORWARD: 'uni_forward',
      UNI_BACKWARD: 'uni_backward',
      BI: 'bidirectional',
    },
    ...overrides,
  };
}

/**
 * Create a minimal event bus mock
 * @param {Object} overrides - Override specific methods
 * @returns {Object} Mock event bus
 */
export function createEventBusMock(overrides = {}) {
  const listeners = new Map();

  return {
    on: jest.fn((event, callback) => {
      if (!listeners.has(event)) {
        listeners.set(event, []);
      }
      listeners.get(event).push(callback);
    }),
    emit: jest.fn((event, data) => {
      if (listeners.has(event)) {
        listeners.get(event).forEach((callback) => callback(data));
      }
    }),
    off: jest.fn((event, callback) => {
      if (listeners.has(event)) {
        const eventListeners = listeners.get(event);
        const index = eventListeners.indexOf(callback);
        if (index > -1) {
          eventListeners.splice(index, 1);
        }
      }
    }),
    removeAllListeners: jest.fn(() => listeners.clear()),
    getEventHistory: jest.fn(() => []), // For testing event sequences
    ...overrides,
  };
}

/**
 * Create a minimal data store mock
 * @param {Object} initialData - Initial state data
 * @param {Object} overrides - Override specific methods
 * @returns {Object} Mock data store
 */
export function createDataStoreMock(initialData = {}, overrides = {}) {
  let state = {
    notes: [],
    connections: [],
    ...initialData,
  };

  return {
    getState: jest.fn(() => ({ ...state })),
    setState: jest.fn((newState) => {
      state = { ...state, ...newState };
    }),
    addNote: jest.fn((note) => {
      state.notes.push(note);
    }),
    removeNote: jest.fn((noteId) => {
      state.notes = state.notes.filter((note) => note.id !== noteId);
    }),
    addConnection: jest.fn((connection) => {
      state.connections.push(connection);
    }),
    removeConnection: jest.fn((fromId, toId) => {
      state.connections = state.connections.filter(
        (conn) => !(conn.from === fromId && conn.to === toId),
      );
    }),
    exportData: jest.fn(() => JSON.stringify(state)),
    importData: jest.fn((data) => {
      state = typeof data === 'string' ? JSON.parse(data) : data;
    }),
    saveToLocalStorage: jest.fn(),
    loadFromLocalStorage: jest.fn(() => state),
    ...overrides,
  };
}

/**
 * Create a minimal note service mock
 * @param {Object} overrides - Override specific methods
 * @returns {Object} Mock note service
 */
export function createNoteServiceMock(overrides = {}) {
  return {
    createNote: jest.fn((x, y, content = 'Test Note') => ({
      id: `note-${Date.now()}`,
      x,
      y,
      content,
      color: 'yellow',
    })),
    updateNote: jest.fn(),
    deleteNote: jest.fn(),
    moveNote: jest.fn(),
    setNoteColor: jest.fn(),
    getNoteById: jest.fn((id) => ({ id, content: 'Mock Note' })),
    getAllNotes: jest.fn(() => []),
    ...overrides,
  };
}

/**
 * Create a DOM element mock structure for testing
 * @param {string} tagName - Element tag name
 * @param {Object} attributes - Element attributes
 * @param {string} content - Element content
 * @returns {HTMLElement} Mock DOM element
 */
export function createMockElement(
  tagName = 'div',
  attributes = {},
  content = '',
) {
  const element = document.createElement(tagName);

  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'style') {
      Object.assign(element.style, value);
    } else if (key === 'class') {
      element.className = value;
    } else {
      element.setAttribute(key, value);
    }
  });

  if (content) {
    element.textContent = content;
  }

  return element;
}

/**
 * Create a test canvas with basic structure
 * @param {Object} options - Canvas configuration
 * @returns {HTMLElement} Canvas element
 */
export function createTestCanvas(options = {}) {
  const canvas = createMockElement('div', {
    id: 'canvas',
    style: {
      width: '800px',
      height: '600px',
      position: 'relative',
      ...options.style,
    },
  });

  // Add to document if specified
  if (options.appendToDocument !== false) {
    document.body.appendChild(canvas);
  }

  return canvas;
}

/**
 * Create a test note element
 * @param {Object} options - Note configuration
 * @returns {HTMLElement} Note element
 */
export function createTestNote(options = {}) {
  const {
    id = `note-${Date.now()}`,
    x = 100,
    y = 100,
    content = 'Test Note',
    color = 'yellow',
  } = options;

  return createMockElement(
    'div',
    {
      id,
      class: `note color-${color}`,
      style: {
        left: `${x}px`,
        top: `${y}px`,
        position: 'absolute',
        padding: '10px',
        border: '1px solid #ccc',
        backgroundColor: 'white',
      },
    },
    content,
  );
}

/**
 * Cleanup function for test isolation
 * @param {...HTMLElement} elements - Elements to remove
 */
export function cleanupTestElements(...elements) {
  elements.forEach((element) => {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  });
}

/**
 * Wait for a condition to be true (for async testing)
 * @param {Function} condition - Function that returns boolean
 * @param {number} timeout - Timeout in milliseconds
 * @param {number} interval - Check interval in milliseconds
 * @returns {Promise} Resolves when condition is true
 */
export function waitForCondition(condition, timeout = 5000, interval = 100) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error(`Condition not met within ${timeout}ms`));
      } else {
        setTimeout(check, interval);
      }
    };

    check();
  });
}
