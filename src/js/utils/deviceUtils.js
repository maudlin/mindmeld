// src/js/utils/deviceUtils.js

/**
 * Device and Viewport Utility Functions
 *
 * Pure utility functions for device detection and viewport information.
 * These are platform-agnostic utilities that can be used throughout the app.
 */

/**
 * Detects if the current device is a mobile device.
 * @returns {boolean} - True if the device is mobile, false otherwise.
 */
export function isMobileDevice() {
  return /Mobi|Android/i.test(navigator.userAgent);
}

/**
 * Detect if the current device is touch-capable
 * More accurate than isMobileDevice() as it detects actual touch support
 *
 * @returns {boolean} True if touch is supported
 */
export function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Get viewport size information
 * Useful for responsive behavior decisions
 *
 * @returns {Object} Viewport information with breakpoints
 */
export function getViewportInfo() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    isMobile: window.innerWidth <= 768,
    isTablet: window.innerWidth > 768 && window.innerWidth <= 1024,
    isDesktop: window.innerWidth > 1024,
  };
}
