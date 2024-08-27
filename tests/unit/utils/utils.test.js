// tests/unit/utils/utils.test.js

import {
  calculateOffsetPosition,
  debounce,
  throttle,
  log,
  truncateNoteContent,
  toBase62,
  fromBase62,
} from '../../../src/js/utils/utils.js';
import { getZoomLevel } from '../../../src/js/features/zoom/zoomManager.js';
import { NOTE_CONTENT_LIMIT } from '../../../src/js/core/constants.js';

jest.mock('../../../src/js/features/zoom/zoomManager.js', () => ({
  getZoomLevel: jest.fn(),
}));

describe('Utility Functions', () => {
  describe('calculateOffsetPosition', () => {
    it('should calculate the correct offset position', () => {
      getZoomLevel.mockReturnValue(10);
      const canvas = {
        getBoundingClientRect: () => ({ left: 0, top: 0 }),
      };
      const event = { clientX: 100, clientY: 100 };
      const result = calculateOffsetPosition(canvas, event, null);

      expect(result).toEqual({
        left: 50,
        top: 50,
      });
    });

    it('should handle cases where element is null', () => {
      getZoomLevel.mockReturnValue(5); // scale = 1
      const canvas = {
        getBoundingClientRect: () => ({ left: 0, top: 0 }),
      };
      const event = { clientX: 100, clientY: 100 };
      const result = calculateOffsetPosition(canvas, event, null);

      expect(result).toEqual({
        left: 100,
        top: 100,
      });
    });
  });

  describe('debounce', () => {
    jest.useFakeTimers();

    it('should delay the function call', () => {
      const func = jest.fn();
      const debouncedFunc = debounce(func, 1000);

      debouncedFunc();
      expect(func).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1000);
      expect(func).toHaveBeenCalled();
    });

    it('should reset the timer if called again before the delay', () => {
      const func = jest.fn();
      const debouncedFunc = debounce(func, 1000);

      debouncedFunc();
      jest.advanceTimersByTime(500);
      debouncedFunc();
      jest.advanceTimersByTime(500);
      expect(func).not.toHaveBeenCalled();

      jest.advanceTimersByTime(500);
      expect(func).toHaveBeenCalled();
    });
  });

  describe('throttle', () => {
    jest.useFakeTimers();

    it('should call the function immediately and then throttle subsequent calls', () => {
      const func = jest.fn();
      const throttledFunc = throttle(func, 1000);

      throttledFunc();
      expect(func).toHaveBeenCalled();

      throttledFunc();
      expect(func).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(1000);
      throttledFunc();
      expect(func).toHaveBeenCalledTimes(2);
    });
  });

  describe('log', () => {
    beforeEach(() => {
      console.log = jest.fn(); // Mock console.log
    });

    it('should log message when LOGGING is enabled', () => {
      const message = 'Test log message';
      log(message, true); // Explicitly enable logging for this test
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining(message),
      );
    });

    it('should not log message when LOGGING is disabled', () => {
      const message = 'Test log message';
      log(message, false); // Explicitly disable logging for this test
      expect(console.log).not.toHaveBeenCalled();
    });
  });

  describe('truncateNoteContent', () => {
    it('should truncate content exceeding the limit', () => {
      const content = 'a'.repeat(NOTE_CONTENT_LIMIT + 10);
      const result = truncateNoteContent(content);

      expect(result.length).toBe(NOTE_CONTENT_LIMIT);
    });

    it('should return content as is if within the limit', () => {
      const content = 'a'.repeat(NOTE_CONTENT_LIMIT - 1);
      const result = truncateNoteContent(content);

      expect(result).toBe(content);
    });
  });

  describe('Base62 Encoding', () => {
    it('should correctly encode numbers to base62', () => {
      expect(toBase62(0)).toBe('0');
      expect(toBase62(61)).toBe('Z');
      expect(toBase62(62)).toBe('10');
      expect(toBase62(3844)).toBe('100');
    });

    it('should correctly decode base62 strings to numbers', () => {
      expect(fromBase62('0')).toBe(0);
      expect(fromBase62('Z')).toBe(61);
      expect(fromBase62('10')).toBe(62);
      expect(fromBase62('100')).toBe(3844);
    });
  });
});
