// tests/unit/setup.js
import '@testing-library/jest-dom';

// Extend existing jsdom environment
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
  writable: true,
});

// Add any missing methods to window
window.addEventListener = window.addEventListener || jest.fn();
window.removeEventListener = window.removeEventListener || jest.fn();

// Add any missing methods to document
document.addEventListener = document.addEventListener || jest.fn();
document.removeEventListener = document.removeEventListener || jest.fn();

// Mock canvas methods
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  clearRect: jest.fn(),
  // Add any other canvas methods you use in your tests
}));

// Mock any other browser APIs you're using
