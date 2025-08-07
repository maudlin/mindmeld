// tests/unit/helpers/colorTestUtils.js

/**
 * Test utilities for color picker functionality
 */

/**
 * Create a mock note element for testing
 * @param {string} id - Note ID
 * @param {string} colorScheme - Color scheme ('yellow', 'pink', 'green', 'blue')
 * @returns {HTMLElement} Mock note element
 */
export function createTestNote(id, colorScheme = 'yellow') {
  const note = document.createElement('div');
  note.id = id;
  note.className = `note color-${colorScheme}`;

  const noteContent = document.createElement('div');
  noteContent.className = 'note-content';
  noteContent.textContent = `Test note ${id}`;

  note.appendChild(noteContent);
  document.body.appendChild(note);

  return note;
}

/**
 * Create color picker DOM structure for testing
 */
export function createColorPickerDOM() {
  const container = document.createElement('div');
  container.id = 'color-picker-container';
  container.className = 'color-picker';

  const palette = document.createElement('div');
  palette.className = 'color-picker-palette';

  const colors = ['yellow', 'pink', 'green', 'blue'];
  colors.forEach((color) => {
    const swatch = document.createElement('div');
    swatch.className = 'color-swatch';
    if (color === 'yellow') swatch.className += ' active';
    swatch.setAttribute('data-color', color);
    swatch.setAttribute('role', 'button');
    swatch.setAttribute('tabindex', '0');
    swatch.setAttribute('aria-label', `Select ${color} color`);
    palette.appendChild(swatch);
  });

  container.appendChild(palette);
  document.body.appendChild(container);

  return container;
}

/**
 * Mock localStorage for testing
 */
export function mockLocalStorage() {
  const localStorageMock = (() => {
    let store = {};
    return {
      getItem: jest.fn((key) => store[key] || null),
      setItem: jest.fn((key, value) => {
        store[key] = value.toString();
      }),
      removeItem: jest.fn((key) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
        store = {};
      }),
    };
  })();

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  });

  return localStorageMock;
}

/**
 * Create mock event bus for testing
 */
export function createMockEventBus() {
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
        const callbacks = listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    }),

    // Helper for testing
    getListeners: () => listeners,
    clearListeners: () => listeners.clear(),
  };
}

/**
 * Clean up test DOM
 */
export function cleanupTestDOM() {
  // Remove test notes
  document.querySelectorAll('.note').forEach((note) => note.remove());

  // Remove color picker
  const colorPicker = document.getElementById('color-picker-container');
  if (colorPicker) colorPicker.remove();

  // Remove any other test elements
  document.querySelectorAll('[data-testid]').forEach((el) => el.remove());
}

/**
 * Wait for async operations in tests
 * @param {number} ms - Milliseconds to wait
 */
export function waitFor(ms = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Simulate mouse click event
 * @param {HTMLElement} element - Element to click
 * @param {Object} options - Click options
 */
export function simulateClick(element, options = {}) {
  const event = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    ...options,
  });
  element.dispatchEvent(event);
}

/**
 * Simulate keyboard event
 * @param {HTMLElement} element - Element to receive event
 * @param {string} key - Key name
 * @param {string} type - Event type ('keydown', 'keyup', 'keypress')
 */
export function simulateKeyboard(element, key, type = 'keydown') {
  const event = new KeyboardEvent(type, {
    key,
    bubbles: true,
    cancelable: true,
  });
  element.dispatchEvent(event);
}

/**
 * Assert that a color swatch is active
 * @param {string} color - Color to check
 */
export function expectSwatchActive(color) {
  const swatch = document.querySelector(`[data-color="${color}"]`);
  expect(swatch).toBeTruthy();
  expect(swatch.classList.contains('active')).toBe(true);
}

/**
 * Assert that a color swatch is not active
 * @param {string} color - Color to check
 */
export function expectSwatchInactive(color) {
  const swatch = document.querySelector(`[data-color="${color}"]`);
  expect(swatch).toBeTruthy();
  expect(swatch.classList.contains('active')).toBe(false);
}

/**
 * Get all valid color schemes
 */
export function getValidColors() {
  return ['yellow', 'pink', 'green', 'blue'];
}

/**
 * Get invalid color schemes for testing
 */
export function getInvalidColors() {
  return ['red', 'purple', 'orange', '', null, undefined, 123, {}];
}
