/**
 * Delete Button Configuration Tests
 *
 * Tests shared delete button configuration constants, CSS class structure,
 * and SVG markup consistency. Focus on component design system compliance
 * and cross-browser compatibility requirements.
 *
 * @jest-environment jsdom
 */

import {
  DELETE_BUTTON_SVG,
  DELETE_BUTTON_CLASSES,
  DELETE_BUTTON_CONFIG,
} from '../../../../src/js/components/deleteButton/deleteButtonStyles.js';

describe('Delete Button Configuration', () => {
  describe('DELETE_BUTTON_SVG', () => {
    it('contains valid SVG markup', () => {
      expect(DELETE_BUTTON_SVG).toContain('<svg viewBox="0 0 20 20"');
      expect(DELETE_BUTTON_SVG).toContain('aria-hidden="true"');
      expect(DELETE_BUTTON_SVG).toContain(
        '<line x1="3" y1="3" x2="17" y2="17"',
      );
      expect(DELETE_BUTTON_SVG).toContain(
        '<line x1="17" y1="3" x2="3" y2="17"',
      );
      expect(DELETE_BUTTON_SVG).toContain('</svg>');
    });

    it('can be parsed as valid XML', () => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(DELETE_BUTTON_SVG, 'image/svg+xml');
      const svg = doc.documentElement;

      expect(svg.tagName).toBe('svg');
      expect(svg.getAttribute('viewBox')).toBe('0 0 20 20');

      const lines = svg.querySelectorAll('line');
      expect(lines).toHaveLength(2);
    });
  });

  describe('DELETE_BUTTON_CLASSES', () => {
    it('provides all required class names', () => {
      expect(DELETE_BUTTON_CLASSES.BASE).toBe('shared-delete-button');
      expect(DELETE_BUTTON_CLASSES.NOTE).toBe('shared-delete-button--note');
      expect(DELETE_BUTTON_CLASSES.CONNECTION).toBe(
        'shared-delete-button--connection',
      );
      expect(DELETE_BUTTON_CLASSES.HOVER).toBe('shared-delete-button--hover');
      expect(DELETE_BUTTON_CLASSES.ACTIVE).toBe('shared-delete-button--active');
    });

    it('uses BEM naming convention', () => {
      const baseName = 'shared-delete-button';

      // Base class
      expect(DELETE_BUTTON_CLASSES.BASE).toBe(baseName);

      // Context modifiers use double dash
      expect(DELETE_BUTTON_CLASSES.NOTE).toMatch(
        new RegExp(`^${baseName}--\\w+$`),
      );
      expect(DELETE_BUTTON_CLASSES.CONNECTION).toMatch(
        new RegExp(`^${baseName}--\\w+$`),
      );

      // State modifiers use double dash
      expect(DELETE_BUTTON_CLASSES.HOVER).toMatch(
        new RegExp(`^${baseName}--\\w+$`),
      );
      expect(DELETE_BUTTON_CLASSES.ACTIVE).toMatch(
        new RegExp(`^${baseName}--\\w+$`),
      );
    });
  });

  describe('DELETE_BUTTON_CONFIG', () => {
    it('provides consistent color configuration', () => {
      expect(DELETE_BUTTON_CONFIG.BACKGROUND_COLOR).toBe(
        'rgba(255, 58, 48, 0.5)',
      );
      expect(DELETE_BUTTON_CONFIG.BACKGROUND_COLOR_HOVER).toBe(
        'rgba(255, 59, 48, 0.9)',
      );
      expect(DELETE_BUTTON_CONFIG.BACKGROUND_COLOR_ACTIVE).toBe(
        'rgba(255, 59, 48, 0.7)',
      );
      expect(DELETE_BUTTON_CONFIG.ICON_COLOR).toBe('#FFFFFF');
    });

    it('provides size configuration', () => {
      expect(DELETE_BUTTON_CONFIG.SIZE_DEFAULT).toBe('18px');
      expect(DELETE_BUTTON_CONFIG.SIZE_CONNECTION).toBe('18px');
    });

    it('provides animation configuration', () => {
      expect(DELETE_BUTTON_CONFIG.TRANSITION_DURATION).toBe('120ms');
      expect(DELETE_BUTTON_CONFIG.ANIMATION_EASING).toBe('ease-out');
    });

    it('uses semantic red color values', () => {
      // All background colors should be variations of red
      const redRegex = /rgba?\(255,\s*\d+,\s*48/;

      expect(DELETE_BUTTON_CONFIG.BACKGROUND_COLOR).toMatch(redRegex);
      expect(DELETE_BUTTON_CONFIG.BACKGROUND_COLOR_HOVER).toMatch(redRegex);
      expect(DELETE_BUTTON_CONFIG.BACKGROUND_COLOR_ACTIVE).toMatch(redRegex);
    });

    it('uses progressive opacity for interaction states', () => {
      const extractOpacity = (color) => parseFloat(color.match(/[\d.]+\)$/)[0]);

      const defaultOpacity = extractOpacity(
        DELETE_BUTTON_CONFIG.BACKGROUND_COLOR,
      );
      const hoverOpacity = extractOpacity(
        DELETE_BUTTON_CONFIG.BACKGROUND_COLOR_HOVER,
      );
      const activeOpacity = extractOpacity(
        DELETE_BUTTON_CONFIG.BACKGROUND_COLOR_ACTIVE,
      );

      // Hover should be more opaque than default
      expect(hoverOpacity).toBeGreaterThan(defaultOpacity);

      // Active should be between default and hover
      expect(activeOpacity).toBeGreaterThan(defaultOpacity);
      expect(activeOpacity).toBeLessThan(hoverOpacity);
    });
  });
});
