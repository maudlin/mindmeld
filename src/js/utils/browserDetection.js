import { logger, errorHandler } from '../services/logger.js';
/**
 * Browser Detection and Compatibility Utilities
 *
 * Provides browser detection and compatibility checking for MindMeld.
 * Focus: Chrome and Safari support with graceful degradation for others.
 */

/**
 * Detect current browser type and capabilities
 * @returns {Object} Browser detection results
 */
export function detectBrowser() {
  const userAgent = navigator.userAgent;
  const vendor = navigator.vendor || '';

  // Chrome detection (includes Chromium for test environments)
  const isChrome =
    /Chrome/.test(userAgent) &&
    (/Google Inc/.test(vendor) || vendor === '' || /Chromium/.test(userAgent));

  // Safari detection
  const isSafari =
    /Safari/.test(userAgent) &&
    /Apple Computer/.test(vendor) &&
    !/Chrome/.test(userAgent);

  // Firefox detection
  const isFirefox = /Firefox/.test(userAgent);

  // Edge detection
  const isEdge = /Edg/.test(userAgent);

  // IE detection
  const isIE = /Trident/.test(userAgent) || /MSIE/.test(userAgent);

  return {
    isChrome,
    isSafari,
    isFirefox,
    isEdge,
    isIE,
    isSupported: isChrome || isSafari || isEdge,
    userAgent,
    vendor,
  };
}

/**
 * Detect if running in private/incognito mode
 * @returns {Promise<boolean>} True if in private mode
 */
export async function detectPrivateMode() {
  try {
    // Test localStorage functionality
    const testKey = 'mindmeld-private-mode-test';

    // Try to write to localStorage
    localStorage.setItem(testKey, 'test');

    // In Safari private mode, writes succeed but reads fail or quota is severely limited
    const testValue = localStorage.getItem(testKey);
    if (testValue !== 'test') {
      return true; // Safari private mode detected
    }

    // Clean up test
    localStorage.removeItem(testKey);

    // Additional Safari private mode detection: try a larger write
    try {
      const largeTestKey = 'mindmeld-quota-test';
      const largeData = 'x'.repeat(1024 * 10); // 10KB test
      localStorage.setItem(largeTestKey, largeData);
      localStorage.removeItem(largeTestKey);
      return false; // Normal mode
    } catch {
      // If we get a quota error on 10KB, likely private mode
      return true;
    }
  } catch {
    // If any localStorage operation fails completely, likely unsupported or private
    return true;
  }
}

/**
 * Get browser-specific storage limitations
 * @param {Object} browserInfo - Result from detectBrowser()
 * @param {boolean} isPrivateMode - Result from detectPrivateMode()
 * @returns {Object} Storage limitations and recommendations
 */
export function getStorageLimitations(browserInfo, isPrivateMode = false) {
  if (!browserInfo.isSupported) {
    return {
      supported: false,
      maxStorage: 0,
      maxNoteSize: 0,
      warning: `${browserInfo.isFirefox ? 'Firefox' : 'This browser'} is not yet fully supported. Please use Chrome, Safari, or Edge for the best experience.`,
      recommendation: 'Switch to Chrome, Safari, or Edge',
    };
  }

  if (browserInfo.isSafari && isPrivateMode) {
    return {
      supported: true,
      maxStorage: 1024, // Very limited in Safari private mode
      maxNoteSize: 500, // Even more conservative per note
      warning:
        'Safari Private Browsing has very limited storage. Consider using normal browsing mode for better performance.',
      recommendation: 'Exit private browsing mode or use fewer, smaller notes',
    };
  }

  if ((browserInfo.isChrome || browserInfo.isEdge) && isPrivateMode) {
    const browserName = browserInfo.isEdge ? 'Edge' : 'Chrome';
    return {
      supported: true,
      maxStorage: 2 * 1024 * 1024, // 2MB in Chromium-based incognito
      maxNoteSize: 10000, // 10KB per note (same as normal)
      warning: `${browserName} Incognito mode has reduced storage capacity.`,
      recommendation: 'Consider using normal browsing mode for large mind maps',
    };
  }

  // Normal mode for supported browsers
  return {
    supported: true,
    maxStorage: 10 * 1024 * 1024, // 10MB normal quota
    maxNoteSize: 10000, // 10KB per note
    warning: null,
    recommendation: null,
  };
}

/**
 * Show user-friendly browser compatibility message
 * @param {Object} limitations - Result from getStorageLimitations()
 */
export function showBrowserMessage(limitations) {
  if (!limitations.supported) {
    console.warn('Browser Compatibility:', limitations.warning);

    // Could show a UI notification here in the future
    if (typeof window !== 'undefined' && window.document) {
      // Future: show browser compatibility banner
      console.info('Recommendation:', limitations.recommendation);
    }

    return false;
  }

  if (limitations.warning) {
    console.info('Browser Notice:', limitations.warning);
    if (limitations.recommendation) {
      console.info('Recommendation:', limitations.recommendation);
    }
  }

  return true;
}

/**
 * Initialize browser compatibility checking
 * @returns {Object} Browser compatibility information
 */
export async function initializeBrowserCompatibility() {
  const browserInfo = detectBrowser();
  const isPrivateMode = await detectPrivateMode();
  const limitations = getStorageLimitations(browserInfo, isPrivateMode);

  // Show any necessary user messages
  showBrowserMessage(limitations);

  return {
    browser: browserInfo,
    privateMode: isPrivateMode,
    limitations,
    isFullySupported: limitations.supported && !limitations.warning,
  };
}

/**
 * Check if a save operation is likely to succeed given browser limitations
 * @param {number} dataSize - Size of data to save in bytes
 * @param {Object} limitations - Browser limitations object
 * @returns {boolean} True if save is likely to succeed
 */
export function canSaveData(dataSize, limitations) {
  if (!limitations.supported) {
    return false;
  }

  if (limitations.maxStorage && dataSize > limitations.maxStorage) {
    return false;
  }

  return true;
}

/**
 * Get user-friendly error message for storage failures
 * @param {Error} error - The storage error
 * @param {Object} browserInfo - Browser detection info
 * @param {boolean} isPrivateMode - Whether in private mode
 * @returns {string} User-friendly error message
 */
export function getStorageErrorMessage(error, browserInfo, isPrivateMode) {
  const errorMessage = error.message || error.toString();

  // Browser not supported
  if (!browserInfo.isSupported) {
    return `Storage not available: ${browserInfo.isFirefox ? 'Firefox' : 'This browser'} is not yet fully supported. Please use Chrome, Safari, or Edge.`;
  }

  // Safari private mode
  if (
    browserInfo.isSafari &&
    (isPrivateMode ||
      errorMessage.includes('private') ||
      errorMessage.includes('disabled'))
  ) {
    return 'Storage limited: Safari Private Browsing mode has very restricted storage. Consider exiting private browsing mode.';
  }

  // Chromium-based browser incognito quota
  if (
    (browserInfo.isChrome || browserInfo.isEdge) &&
    errorMessage.toLowerCase().includes('quota')
  ) {
    const browserName = browserInfo.isEdge ? 'Edge' : 'Chrome';
    return `Storage quota exceeded: ${browserName} Incognito mode has limited storage capacity. Consider using normal browsing mode or reducing the amount of data.`;
  }

  // Generic quota exceeded
  if (errorMessage.toLowerCase().includes('quota')) {
    return 'Storage quota exceeded: Your browser has run out of storage space. Try clearing some browser data or reducing the size of your mind map.';
  }

  // Generic storage error
  return `Storage error: ${errorMessage}. Please try refreshing the page or using a different browser.`;
}
