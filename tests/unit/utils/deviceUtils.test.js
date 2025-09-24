/**
 * Device Utilities Test Suite
 *
 * Tests for pure device detection and viewport utility functions.
 * These functions provide device capabilities and viewport information
 * used throughout the application for responsive behavior.
 */

import {
  isMobileDevice,
  isTouchDevice,
  getViewportInfo,
} from '../../../src/js/utils/deviceUtils.js';

describe('Device Utilities', () => {
  // Mock window and navigator properties for testing
  let mockWindow, mockNavigator;

  beforeEach(() => {
    // Store original values
    mockWindow = {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
    };
    mockNavigator = {
      userAgent: navigator.userAgent,
      maxTouchPoints: navigator.maxTouchPoints,
    };

    // Clean up any existing ontouchstart
    delete window.ontouchstart;
  });

  afterEach(() => {
    // Restore original values
    Object.defineProperty(window, 'innerWidth', {
      value: mockWindow.innerWidth,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(window, 'innerHeight', {
      value: mockWindow.innerHeight,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(navigator, 'userAgent', {
      value: mockNavigator.userAgent,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: mockNavigator.maxTouchPoints,
      configurable: true,
      writable: true,
    });
    delete window.ontouchstart;
  });

  describe('isMobileDevice', () => {
    const testCases = [
      {
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
        expected: true,
        description: 'should detect iPhone as mobile (contains "Mobile")',
      },
      {
        userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G975F)',
        expected: true,
        description: 'should detect Android as mobile',
      },
      {
        userAgent:
          'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
        expected: true,
        description: 'should detect iPad as mobile (contains "Mobile")',
      },
      {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        expected: false,
        description: 'should not detect desktop Mac as mobile',
      },
      {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        expected: false,
        description: 'should not detect Windows as mobile',
      },
    ];

    testCases.forEach(({ userAgent, expected, description }) => {
      it(`${description}`, () => {
        Object.defineProperty(navigator, 'userAgent', {
          value: userAgent,
          configurable: true,
        });

        expect(isMobileDevice()).toBe(expected);
      });
    });
  });

  describe('isTouchDevice', () => {
    it('should return true when ontouchstart is supported', () => {
      Object.defineProperty(window, 'ontouchstart', {
        value: {},
        configurable: true,
      });

      expect(isTouchDevice()).toBe(true);
    });

    it('should return true when maxTouchPoints > 0', () => {
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 1,
        configurable: true,
        writable: true,
      });

      expect(isTouchDevice()).toBe(true);
    });

    it('should return true when both conditions are met', () => {
      Object.defineProperty(window, 'ontouchstart', {
        value: {},
        configurable: true,
      });
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 2,
        configurable: true,
        writable: true,
      });

      expect(isTouchDevice()).toBe(true);
    });

    it('should return false when no touch support is detected', () => {
      // Ensure both conditions are false
      delete window.ontouchstart;
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 0,
        configurable: true,
        writable: true,
      });

      expect(isTouchDevice()).toBe(false);
    });

    it('should return false when maxTouchPoints is undefined', () => {
      delete window.ontouchstart;
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: undefined,
        configurable: true,
        writable: true,
      });

      expect(isTouchDevice()).toBe(false);
    });
  });

  describe('getViewportInfo', () => {
    const testCases = [
      {
        width: 320,
        height: 568,
        expected: { isMobile: true, isTablet: false, isDesktop: false },
        description: 'should classify iPhone SE size as mobile',
      },
      {
        width: 768,
        height: 1024,
        expected: { isMobile: true, isTablet: false, isDesktop: false },
        description: 'should classify 768px as mobile (boundary case)',
      },
      {
        width: 800,
        height: 600,
        expected: { isMobile: false, isTablet: true, isDesktop: false },
        description: 'should classify small tablet as tablet',
      },
      {
        width: 1024,
        height: 768,
        expected: { isMobile: false, isTablet: true, isDesktop: false },
        description: 'should classify 1024px as tablet (boundary case)',
      },
      {
        width: 1200,
        height: 800,
        expected: { isMobile: false, isTablet: false, isDesktop: true },
        description: 'should classify laptop size as desktop',
      },
      {
        width: 1920,
        height: 1080,
        expected: { isMobile: false, isTablet: false, isDesktop: true },
        description: 'should classify full desktop as desktop',
      },
    ];

    testCases.forEach(({ width, height, expected, description }) => {
      it(`${description}`, () => {
        Object.defineProperty(window, 'innerWidth', {
          value: width,
          configurable: true,
          writable: true,
        });
        Object.defineProperty(window, 'innerHeight', {
          value: height,
          configurable: true,
          writable: true,
        });

        const result = getViewportInfo();

        expect(result.width).toBe(width);
        expect(result.height).toBe(height);
        expect(result.isMobile).toBe(expected.isMobile);
        expect(result.isTablet).toBe(expected.isTablet);
        expect(result.isDesktop).toBe(expected.isDesktop);
      });
    });

    it('should return current viewport dimensions', () => {
      const testWidth = 1366;
      const testHeight = 768;

      Object.defineProperty(window, 'innerWidth', {
        value: testWidth,
        configurable: true,
        writable: true,
      });
      Object.defineProperty(window, 'innerHeight', {
        value: testHeight,
        configurable: true,
        writable: true,
      });

      const result = getViewportInfo();

      expect(result.width).toBe(testWidth);
      expect(result.height).toBe(testHeight);
    });

    it('should handle edge cases gracefully', () => {
      Object.defineProperty(window, 'innerWidth', {
        value: 0,
        configurable: true,
        writable: true,
      });
      Object.defineProperty(window, 'innerHeight', {
        value: 0,
        configurable: true,
        writable: true,
      });

      const result = getViewportInfo();

      expect(result.width).toBe(0);
      expect(result.height).toBe(0);
      expect(result.isMobile).toBe(true); // 0 <= 768
      expect(result.isTablet).toBe(false);
      expect(result.isDesktop).toBe(false);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle typical mobile device scenario', () => {
      // Simulate iPhone
      Object.defineProperty(navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
        configurable: true,
      });
      Object.defineProperty(window, 'ontouchstart', {
        value: {},
        configurable: true,
      });
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 5,
        configurable: true,
        writable: true,
      });
      Object.defineProperty(window, 'innerWidth', {
        value: 375,
        configurable: true,
        writable: true,
      });
      Object.defineProperty(window, 'innerHeight', {
        value: 812,
        configurable: true,
        writable: true,
      });

      expect(isMobileDevice()).toBe(true);
      expect(isTouchDevice()).toBe(true);

      const viewport = getViewportInfo();
      expect(viewport.isMobile).toBe(true);
      expect(viewport.isTablet).toBe(false);
      expect(viewport.isDesktop).toBe(false);
    });

    it('should handle typical desktop scenario', () => {
      // Simulate desktop Chrome
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        configurable: true,
      });
      delete window.ontouchstart;
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 0,
        configurable: true,
        writable: true,
      });
      Object.defineProperty(window, 'innerWidth', {
        value: 1920,
        configurable: true,
        writable: true,
      });
      Object.defineProperty(window, 'innerHeight', {
        value: 1080,
        configurable: true,
        writable: true,
      });

      expect(isMobileDevice()).toBe(false);
      expect(isTouchDevice()).toBe(false);

      const viewport = getViewportInfo();
      expect(viewport.isMobile).toBe(false);
      expect(viewport.isTablet).toBe(false);
      expect(viewport.isDesktop).toBe(true);
    });

    it('should handle touch-enabled desktop scenario', () => {
      // Simulate Surface Pro or touch laptop
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        configurable: true,
      });
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 10,
        configurable: true,
        writable: true,
      });
      Object.defineProperty(window, 'innerWidth', {
        value: 1280,
        configurable: true,
        writable: true,
      });
      Object.defineProperty(window, 'innerHeight', {
        value: 720,
        configurable: true,
        writable: true,
      });

      expect(isMobileDevice()).toBe(false);
      expect(isTouchDevice()).toBe(true); // Has touch despite being desktop size

      const viewport = getViewportInfo();
      expect(viewport.isDesktop).toBe(true);
    });
  });
});
