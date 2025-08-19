// src/js/interactions/capabilities/detector.js

/**
 * Detects device input capabilities and determines optimal input mode
 * Based on media queries and browser capabilities rather than user agent sniffing
 */
export class CapabilityDetector {
  constructor() {
    // Cache for performance
    this._capabilities = null;
  }

  /**
   * Check if device is primarily touch-based (phone, tablet)
   * @returns {boolean} True if device has coarse pointer and no hover
   */
  isTouchFirst() {
    try {
      if (!window.matchMedia) {
        // Fallback: only use touch points if matchMedia unavailable
        return false;
      }

      const hasCoarsePointer = window.matchMedia(
        '(pointer: coarse) and (hover: none)',
      ).matches;
      const hasTouchPoints = navigator.maxTouchPoints > 0;

      return hasCoarsePointer || hasTouchPoints;
    } catch {
      return false; // Fallback for unsupported browsers
    }
  }

  /**
   * Check if device is primarily desktop-based (mouse, trackpad)
   * @returns {boolean} True if device has fine pointer and hover capability
   */
  isDesktopFirst() {
    try {
      return (
        window.matchMedia &&
        window.matchMedia('(pointer: fine) and (hover: hover)').matches
      );
    } catch {
      return false;
    }
  }

  /**
   * Check if device supports both touch and mouse (hybrid devices)
   * @returns {boolean} True if device supports both fine and coarse pointers
   */
  isHybridDevice() {
    try {
      if (!window.matchMedia) return false;

      const hasCoarsePointer = window.matchMedia(
        '(any-pointer: coarse)',
      ).matches;
      const hasFinePointer = window.matchMedia('(any-pointer: fine)').matches;

      return hasCoarsePointer && hasFinePointer;
    } catch {
      return false;
    }
  }

  /**
   * Check if device has touch capability (fallback method)
   * @returns {boolean} True if device supports touch
   */
  hasTouch() {
    return navigator.maxTouchPoints > 0;
  }

  /**
   * Check if device has hover capability
   * @returns {boolean} True if device supports hover
   */
  hasHover() {
    try {
      return window.matchMedia && window.matchMedia('(hover: hover)').matches;
    } catch {
      return false;
    }
  }

  /**
   * Determine the optimal input mode for the device
   * @returns {string} 'touch' or 'desktop'
   */
  getOptimalInputMode() {
    // Check for manual override first (for testing/debugging)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const manualMode = urlParams.get('mode');

      if (manualMode && this._isValidMode(manualMode)) {
        return manualMode;
      }
    } catch {
      // URLSearchParams not supported, continue with detection
    }

    // Simplified detection: TouchAdapter for all touch-capable devices
    if (this.isTouchFirst() || (this.hasTouch() && !this.isDesktopFirst())) {
      return 'touch';
    }

    // Desktop for all other devices
    return 'desktop';
  }

  /**
   * Get comprehensive capability information
   * @returns {Object} Detailed capability information
   */
  getCapabilities() {
    if (this._capabilities) {
      return this._capabilities;
    }

    const isTouchFirst = this.isTouchFirst();
    const isDesktopFirst = this.isDesktopFirst();
    const isHybridDevice = this.isHybridDevice();
    const hasTouch = this.hasTouch();
    const hasHover = this.hasHover();
    const maxTouchPoints = navigator.maxTouchPoints || 0;
    const optimalInputMode = this.getOptimalInputMode();

    // Determine supported modes
    const supportedModes = [];
    if (isDesktopFirst || isHybridDevice || (!isTouchFirst && !hasTouch)) {
      supportedModes.push('desktop');
    }
    if (isTouchFirst || hasTouch || isHybridDevice) {
      supportedModes.push('touch');
    }

    // Ensure at least one mode is supported
    if (supportedModes.length === 0) {
      supportedModes.push('desktop'); // Fallback
    }

    this._capabilities = {
      isTouchFirst,
      isDesktopFirst,
      isHybridDevice,
      hasTouch,
      hasHover,
      maxTouchPoints,
      optimalInputMode,
      supportedModes,
    };

    return this._capabilities;
  }

  /**
   * Clear cached capabilities (useful for testing or runtime changes)
   */
  clearCache() {
    this._capabilities = null;
  }

  /**
   * Validate if mode is supported
   * @private
   * @param {string} mode - Mode to validate
   * @returns {boolean} True if mode is valid
   */
  _isValidMode(mode) {
    return ['touch', 'desktop'].includes(mode);
  }
}
