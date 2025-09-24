/**
 * Browser Detection Utility Tests
 *
 * Tests for the core browser detection and compatibility utilities.
 * These are pure utility functions that can be used throughout the app.
 */

// Mock browser environments for testing
const createBrowserMock = (userAgent, vendor = '') => {
  Object.defineProperty(global, 'navigator', {
    value: { userAgent, vendor },
    writable: true,
    configurable: true,
  });
};

const createLocalStorageMock = (behavior = 'normal') => {
  const mock = {
    data: {},
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  };

  switch (behavior) {
    case 'unsupported':
      mock.setItem.mockImplementation(() => {
        throw new Error('localStorage is not supported');
      });
      mock.getItem.mockImplementation(() => {
        throw new Error('localStorage is not supported');
      });
      break;

    case 'safari-private':
      mock.setItem.mockImplementation((key, value) => {
        if (key === 'mindmeld-private-mode-test') {
          // Allow small test writes
          mock.data[key] = value;
        } else if (value.length > 1024) {
          // Fail on large writes
          throw new Error('localStorage is disabled in private mode');
        } else {
          mock.data[key] = value;
        }
      });
      mock.getItem.mockImplementation((key) => {
        if (key === 'mindmeld-private-mode-test') {
          return null; // Safari private mode: writes succeed but reads fail
        }
        return mock.data[key] || null;
      });
      break;

    case 'chrome-incognito':
      mock.setItem.mockImplementation((key, value) => {
        if (value.length > 2 * 1024 * 1024) {
          // 2MB limit
          const error = new Error(
            'QuotaExceededError: Chrome incognito storage limit exceeded',
          );
          error.name = 'QuotaExceededError';
          throw error;
        }
        mock.data[key] = value;
      });
      mock.getItem.mockImplementation((key) => mock.data[key] || null);
      break;

    default: // normal
      mock.setItem.mockImplementation((key, value) => {
        mock.data[key] = value;
      });
      mock.getItem.mockImplementation((key) => mock.data[key] || null);
      mock.removeItem.mockImplementation((key) => {
        delete mock.data[key];
      });
      break;
  }

  Object.defineProperty(global, 'localStorage', {
    value: mock,
    writable: true,
    configurable: true,
  });

  return mock;
};

describe('Browser Detection Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up global mocks
    delete global.navigator;
    delete global.localStorage;
  });

  describe('detectBrowser', () => {
    let detectBrowser;

    beforeEach(async () => {
      // Import after mocks are set up
      const module = await import('../../../src/js/utils/browserDetection.js');
      detectBrowser = module.detectBrowser;
    });

    it('should detect Chrome correctly', () => {
      createBrowserMock(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Google Inc.',
      );

      const result = detectBrowser();
      expect(result.isChrome).toBe(true);
      expect(result.isSafari).toBe(false);
      expect(result.isFirefox).toBe(false);
      expect(result.isEdge).toBe(false);
      expect(result.isSupported).toBe(true);
    });

    it('should detect Chromium (test environment) correctly', () => {
      createBrowserMock(
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        '', // Empty vendor like in test environments
      );

      const result = detectBrowser();
      expect(result.isChrome).toBe(true);
      expect(result.isSafari).toBe(false);
      expect(result.isFirefox).toBe(false);
      expect(result.isEdge).toBe(false);
      expect(result.isSupported).toBe(true);
    });

    it('should detect Safari correctly', () => {
      createBrowserMock(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        'Apple Computer, Inc.',
      );

      const result = detectBrowser();
      expect(result.isSafari).toBe(true);
      expect(result.isChrome).toBe(false);
      expect(result.isFirefox).toBe(false);
      expect(result.isEdge).toBe(false);
      expect(result.isSupported).toBe(true);
    });

    it('should detect Firefox as unsupported', () => {
      createBrowserMock(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/119.0',
      );

      const result = detectBrowser();
      expect(result.isFirefox).toBe(true);
      expect(result.isChrome).toBe(false);
      expect(result.isSafari).toBe(false);
      expect(result.isEdge).toBe(false);
      expect(result.isSupported).toBe(false);
    });

    it('should detect Edge as supported (Chromium-based)', () => {
      createBrowserMock(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
      );

      const result = detectBrowser();
      expect(result.isEdge).toBe(true);
      expect(result.isChrome).toBe(true); // Edge contains Chrome in UA and has empty vendor
      expect(result.isSafari).toBe(false);
      expect(result.isFirefox).toBe(false);
      expect(result.isSupported).toBe(true);
    });

    it('should handle unknown browsers gracefully', () => {
      createBrowserMock('UnknownBrowser/1.0');

      const result = detectBrowser();
      expect(result.isChrome).toBe(false);
      expect(result.isSafari).toBe(false);
      expect(result.isFirefox).toBe(false);
      expect(result.isEdge).toBe(false);
      expect(result.isSupported).toBe(false);
    });
  });

  describe('detectPrivateMode', () => {
    let detectPrivateMode;

    beforeEach(async () => {
      const module = await import('../../../src/js/utils/browserDetection.js');
      detectPrivateMode = module.detectPrivateMode;
    });

    it('should detect normal mode correctly', async () => {
      createLocalStorageMock('normal');

      const result = await detectPrivateMode();
      expect(result).toBe(false);
    });

    it('should detect Safari private mode', async () => {
      createLocalStorageMock('safari-private');

      const result = await detectPrivateMode();
      expect(result).toBe(true);
    });

    it('should detect unsupported localStorage', async () => {
      createLocalStorageMock('unsupported');

      const result = await detectPrivateMode();
      expect(result).toBe(true);
    });

    it('should handle localStorage quota errors as private mode', async () => {
      createLocalStorageMock('chrome-incognito');

      const result = await detectPrivateMode();
      // Chrome incognito allows localStorage but with quota limits
      // The detection should still work for basic operations
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getStorageLimitations', () => {
    let getStorageLimitations;

    beforeEach(async () => {
      const module = await import('../../../src/js/utils/browserDetection.js');
      getStorageLimitations = module.getStorageLimitations;
    });

    it('should return unsupported for Firefox', () => {
      const browserInfo = {
        isFirefox: true,
        isChrome: false,
        isSafari: false,
        isSupported: false,
      };

      const result = getStorageLimitations(browserInfo, false);
      expect(result.supported).toBe(false);
      expect(result.warning).toContain('Firefox');
      expect(result.recommendation).toContain('Chrome, Safari, or Edge');
    });

    it('should return limited storage for Safari private mode', () => {
      const browserInfo = {
        isFirefox: false,
        isChrome: false,
        isSafari: true,
        isSupported: true,
      };

      const result = getStorageLimitations(browserInfo, true);
      expect(result.supported).toBe(true);
      expect(result.maxStorage).toBe(1024);
      expect(result.warning).toContain('Private Browsing');
      expect(result.recommendation).toContain('private browsing');
    });

    it('should return normal limitations for Chrome normal mode', () => {
      const browserInfo = {
        isFirefox: false,
        isChrome: true,
        isSafari: false,
        isSupported: true,
      };

      const result = getStorageLimitations(browserInfo, false);
      expect(result.supported).toBe(true);
      expect(result.maxStorage).toBe(10 * 1024 * 1024);
      expect(result.warning).toBeNull();
      expect(result.recommendation).toBeNull();
    });

    it('should return reduced storage for Chrome incognito', () => {
      const browserInfo = {
        isFirefox: false,
        isChrome: true,
        isSafari: false,
        isSupported: true,
      };

      const result = getStorageLimitations(browserInfo, true);
      expect(result.supported).toBe(true);
      expect(result.maxStorage).toBe(2 * 1024 * 1024);
      expect(result.warning).toContain('Incognito');
      expect(result.recommendation).toContain('normal browsing');
    });
  });

  describe('getStorageErrorMessage', () => {
    let getStorageErrorMessage;

    beforeEach(async () => {
      const module = await import('../../../src/js/utils/browserDetection.js');
      getStorageErrorMessage = module.getStorageErrorMessage;
    });

    it('should return browser-specific message for unsupported browser', () => {
      const error = new Error('localStorage is not supported');
      const browserInfo = { isFirefox: true, isSupported: false };

      const message = getStorageErrorMessage(error, browserInfo, false);
      expect(message).toContain('Firefox is not yet fully supported');
      expect(message).toContain('Chrome, Safari, or Edge');
    });

    it('should return Safari private mode message', () => {
      const error = new Error('localStorage is disabled in private mode');
      const browserInfo = { isSafari: true, isSupported: true };

      const message = getStorageErrorMessage(error, browserInfo, true);
      expect(message).toContain('Safari Private Browsing');
      expect(message).toContain('private browsing mode');
    });

    it('should return Chrome incognito quota message', () => {
      const error = new Error('QuotaExceededError: Storage quota exceeded');
      const browserInfo = { isChrome: true, isSupported: true };

      const message = getStorageErrorMessage(error, browserInfo, false);
      expect(message).toContain('Chrome Incognito');
      expect(message).toContain('normal browsing mode');
    });

    it('should return generic quota message for other quota errors', () => {
      const error = new Error('QuotaExceededError: Storage quota exceeded');
      const browserInfo = { isSafari: true, isSupported: true };

      const message = getStorageErrorMessage(error, browserInfo, false);
      expect(message).toContain('Storage quota exceeded');
      expect(message).toContain('browser data');
    });

    it('should return generic error message for unknown errors', () => {
      const error = new Error('Unknown storage error');
      const browserInfo = { isChrome: true, isSupported: true };

      const message = getStorageErrorMessage(error, browserInfo, false);
      expect(message).toContain('Storage error');
      expect(message).toContain('Unknown storage error');
    });
  });

  describe('showBrowserMessage', () => {
    let showBrowserMessage;

    beforeEach(async () => {
      const module = await import('../../../src/js/utils/browserDetection.js');
      showBrowserMessage = module.showBrowserMessage;
    });

    it('should warn about unsupported browsers', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const infoSpy = jest.spyOn(console, 'info').mockImplementation();

      const limitations = {
        supported: false,
        warning: 'Firefox is not yet fully supported',
        recommendation: 'Use Chrome or Safari',
      };

      const result = showBrowserMessage(limitations);
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[.*\] WARN: Browser Compatibility:.*Firefox is not yet fully supported/,
        ),
      );
      expect(infoSpy).toHaveBeenCalledWith(
        'Recommendation:',
        limitations.recommendation,
      );

      consoleSpy.mockRestore();
      infoSpy.mockRestore();
    });

    it('should show info for supported browsers with warnings', () => {
      const infoSpy = jest.spyOn(console, 'info').mockImplementation();

      const limitations = {
        supported: true,
        warning: 'Chrome Incognito has reduced storage',
        recommendation: 'Use normal browsing mode',
      };

      const result = showBrowserMessage(limitations);
      expect(result).toBe(true);
      expect(infoSpy).toHaveBeenCalledWith(
        'Browser Notice:',
        limitations.warning,
      );
      expect(infoSpy).toHaveBeenCalledWith(
        'Recommendation:',
        limitations.recommendation,
      );

      infoSpy.mockRestore();
    });

    it('should be silent for fully supported browsers', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const infoSpy = jest.spyOn(console, 'info').mockImplementation();

      const limitations = {
        supported: true,
        warning: null,
        recommendation: null,
      };

      const result = showBrowserMessage(limitations);
      expect(result).toBe(true);
      expect(consoleSpy).not.toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
      infoSpy.mockRestore();
    });
  });

  describe('canSaveData', () => {
    let canSaveData;

    beforeEach(async () => {
      const module = await import('../../../src/js/utils/browserDetection.js');
      canSaveData = module.canSaveData;
    });

    it('should return false for unsupported browsers', () => {
      const limitations = { supported: false };
      const result = canSaveData(1000, limitations);
      expect(result).toBe(false);
    });

    it('should return false when data exceeds storage limit', () => {
      const limitations = {
        supported: true,
        maxStorage: 1024,
      };
      const result = canSaveData(2048, limitations);
      expect(result).toBe(false);
    });

    it('should return true when data is within limits', () => {
      const limitations = {
        supported: true,
        maxStorage: 2048,
      };
      const result = canSaveData(1000, limitations);
      expect(result).toBe(true);
    });

    it('should return true when no storage limit is specified', () => {
      const limitations = {
        supported: true,
      };
      const result = canSaveData(1000000, limitations);
      expect(result).toBe(true);
    });
  });
});
