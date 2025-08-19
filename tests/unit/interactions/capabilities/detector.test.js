// tests/unit/interactions/capabilities/detector.test.js

describe('Capability Detector', () => {
  let CapabilityDetector;
  let detector;

  beforeEach(async () => {
    // Reset modules
    jest.resetModules();

    // Mock window.matchMedia
    global.matchMedia = jest.fn();

    // Mock navigator
    global.navigator = {
      ...global.navigator,
      maxTouchPoints: 0,
    };

    // Clear URL search params
    delete global.URLSearchParams;
    global.URLSearchParams = jest.fn().mockImplementation(() => ({
      get: jest.fn().mockReturnValue(null),
    }));

    // Import the module to test
    const module = await import(
      '../../../../src/js/interactions/capabilities/detector.js'
    );
    CapabilityDetector = module.CapabilityDetector;
    detector = new CapabilityDetector();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Touch Capability Detection', () => {
    it('should detect touch-first devices with coarse pointer', () => {
      // Setup: Device with coarse pointer and no hover
      global.matchMedia.mockImplementation((query) => {
        if (query === '(pointer: coarse) and (hover: none)') {
          return { matches: true };
        }
        return { matches: false };
      });
      global.navigator.maxTouchPoints = 5;

      const result = detector.isTouchFirst();

      expect(result).toBe(true);
      expect(global.matchMedia).toHaveBeenCalledWith(
        '(pointer: coarse) and (hover: none)',
      );
    });

    it('should detect desktop devices with fine pointer and hover', () => {
      // Setup: Device with fine pointer and hover capability
      global.matchMedia.mockImplementation((query) => {
        if (query === '(pointer: fine) and (hover: hover)') {
          return { matches: true };
        }
        return { matches: false };
      });
      global.navigator.maxTouchPoints = 0;

      const result = detector.isDesktopFirst();

      expect(result).toBe(true);
      expect(global.matchMedia).toHaveBeenCalledWith(
        '(pointer: fine) and (hover: hover)',
      );
    });

    it('should detect hybrid devices with multiple pointer types', () => {
      // Setup: Device that supports both fine and coarse pointers
      global.matchMedia.mockImplementation((query) => {
        if (query === '(any-pointer: coarse)') {
          return { matches: true };
        }
        if (query === '(any-pointer: fine)') {
          return { matches: true };
        }
        return { matches: false };
      });
      global.navigator.maxTouchPoints = 10;

      const result = detector.isHybridDevice();

      expect(result).toBe(true);
      expect(global.matchMedia).toHaveBeenCalledWith('(any-pointer: coarse)');
      expect(global.matchMedia).toHaveBeenCalledWith('(any-pointer: fine)');
    });

    it('should fallback to maxTouchPoints when media queries are unsupported', () => {
      // Setup: Browser that doesn't support pointer media queries
      global.matchMedia.mockImplementation(() => ({ matches: false }));
      global.navigator.maxTouchPoints = 5;

      const result = detector.hasTouch();

      expect(result).toBe(true);
    });

    it('should handle missing matchMedia gracefully', () => {
      // Setup: Very old browser without matchMedia
      delete global.matchMedia;

      expect(() => {
        const result = detector.isTouchFirst();
        expect(result).toBe(false); // Should default to false
      }).not.toThrow();
    });
  });

  describe('Input Mode Detection', () => {
    it('should determine optimal input mode for touch-first device', () => {
      global.matchMedia.mockImplementation((query) => {
        return { matches: query === '(pointer: coarse) and (hover: none)' };
      });
      global.navigator.maxTouchPoints = 5;

      const mode = detector.getOptimalInputMode();

      expect(mode).toBe('touch');
    });

    it('should determine optimal input mode for desktop device', () => {
      global.matchMedia.mockImplementation((query) => {
        return { matches: query === '(pointer: fine) and (hover: hover)' };
      });
      global.navigator.maxTouchPoints = 0;

      const mode = detector.getOptimalInputMode();

      expect(mode).toBe('desktop');
    });

    it('should use touch mode for devices with touch capability', () => {
      // Setup: Device supports both touch and precision - use TouchAdapter for best mobile experience
      global.matchMedia.mockImplementation((query) => {
        if (query === '(any-pointer: fine)') return { matches: true };
        if (query === '(any-pointer: coarse)') return { matches: true };
        if (query === '(pointer: fine) and (hover: hover)')
          return { matches: false };
        if (query === '(pointer: coarse) and (hover: none)')
          return { matches: false };
        return { matches: false };
      });
      global.navigator.maxTouchPoints = 10;

      const mode = detector.getOptimalInputMode();

      expect(mode).toBe('touch'); // TouchAdapter provides best experience for touch devices
    });
  });

  describe('Manual Override Support', () => {
    it('should respect manual mode override via URL parameter', () => {
      global.URLSearchParams = jest.fn().mockImplementation(() => ({
        get: jest.fn((param) => (param === 'mode' ? 'touch' : null)),
      }));

      // Even on desktop device, should return touch due to override
      global.matchMedia.mockImplementation(() => ({ matches: false }));
      global.navigator.maxTouchPoints = 0;

      const mode = detector.getOptimalInputMode();

      expect(mode).toBe('touch');
    });

    it('should validate manual override values', () => {
      global.URLSearchParams = jest.fn().mockImplementation(() => ({
        get: jest.fn(() => 'invalid-mode'),
      }));

      // Should fallback to detected mode when override is invalid
      global.matchMedia.mockImplementation((query) => {
        return { matches: query === '(pointer: fine) and (hover: hover)' };
      });

      const mode = detector.getOptimalInputMode();

      expect(mode).toBe('desktop'); // Fallback to detected
    });
  });

  describe('Capability Details', () => {
    it('should provide detailed capability information', () => {
      global.matchMedia.mockImplementation((query) => {
        const queries = {
          '(pointer: coarse) and (hover: none)': true,
          '(any-pointer: fine)': false,
          '(any-pointer: coarse)': true,
          '(hover: hover)': false,
          '(hover: none)': true,
        };
        // eslint-disable-next-line security/detect-object-injection
        return { matches: queries[query] || false };
      });
      global.navigator.maxTouchPoints = 5;

      const capabilities = detector.getCapabilities();

      expect(capabilities).toEqual({
        isTouchFirst: true,
        isDesktopFirst: false,
        isHybridDevice: false,
        hasTouch: true,
        hasHover: false,
        maxTouchPoints: 5,
        optimalInputMode: 'touch',
        supportedModes: ['touch'],
      });
    });

    it('should identify supported input modes correctly', () => {
      // Setup: Hybrid device supporting both modes
      global.matchMedia.mockImplementation((query) => {
        const queries = {
          '(any-pointer: fine)': true,
          '(any-pointer: coarse)': true,
          '(pointer: fine) and (hover: hover)': false,
          '(pointer: coarse) and (hover: none)': false,
        };
        // eslint-disable-next-line security/detect-object-injection
        return { matches: queries[query] || false };
      });
      global.navigator.maxTouchPoints = 10;

      const capabilities = detector.getCapabilities();

      expect(capabilities.supportedModes).toEqual(['desktop', 'touch']);
      expect(capabilities.isHybridDevice).toBe(true);
    });
  });
});
