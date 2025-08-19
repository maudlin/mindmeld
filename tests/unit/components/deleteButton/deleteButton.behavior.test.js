/**
 * Delete Button Component Behavior Tests
 *
 * Tests shared delete button component creation, interaction, and consistency
 * across HTML and SVG contexts. Focus on user-observable behaviors and
 * cross-component visual consistency.
 *
 * @jest-environment jsdom
 */

import {
  createHTMLDeleteButton,
  createSVGDeleteButton,
} from '../../../../src/js/components/deleteButton/deleteButtonFactory.js';
import { DELETE_BUTTON_CLASSES } from '../../../../src/js/components/deleteButton/deleteButtonStyles.js';

describe('Delete Button Component Behavior', () => {
  beforeEach(() => {
    // Clear DOM
    document.body.innerHTML = '';
  });

  describe('HTML Button Creation', () => {
    it('creates button with correct base structure', () => {
      const onClick = jest.fn();
      const button = createHTMLDeleteButton({
        ariaLabel: 'Delete test item',
        onClick,
      });

      expect(button.tagName).toBe('BUTTON');
      expect(button.getAttribute('aria-label')).toBe('Delete test item');
      expect(button.className).toBe(
        `${DELETE_BUTTON_CLASSES.BASE} ${DELETE_BUTTON_CLASSES.NOTE}`,
      );
    });

    it('creates cross icon with consistent coordinates', () => {
      const button = createHTMLDeleteButton({ onClick: jest.fn() });
      const svg = button.querySelector('svg');

      expect(svg).toBeTruthy();
      expect(svg.getAttribute('viewBox')).toBe('0 0 20 20');
      expect(svg.getAttribute('aria-hidden')).toBe('true');

      const lines = svg.querySelectorAll('line');
      expect(lines).toHaveLength(2);

      // Check cross coordinates
      expect(lines[0].getAttribute('x1')).toBe('3');
      expect(lines[0].getAttribute('y1')).toBe('3');
      expect(lines[0].getAttribute('x2')).toBe('17');
      expect(lines[0].getAttribute('y2')).toBe('17');

      expect(lines[1].getAttribute('x1')).toBe('17');
      expect(lines[1].getAttribute('y1')).toBe('3');
      expect(lines[1].getAttribute('x2')).toBe('3');
      expect(lines[1].getAttribute('y2')).toBe('17');
    });

    it('executes click handler when activated', () => {
      const onClick = jest.fn();
      const button = createHTMLDeleteButton({ onClick });

      button.click();

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick).toHaveBeenCalledWith(expect.any(Event));
    });

    it('responds to keyboard activation', () => {
      const onClick = jest.fn();
      const button = createHTMLDeleteButton({ onClick });

      // Test Enter key
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      button.dispatchEvent(enterEvent);
      expect(onClick).toHaveBeenCalledTimes(1);

      // Test Space key
      const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
      button.dispatchEvent(spaceEvent);
      expect(onClick).toHaveBeenCalledTimes(2);

      // Test other keys (should not trigger)
      const otherEvent = new KeyboardEvent('keydown', { key: 'a' });
      button.dispatchEvent(otherEvent);
      expect(onClick).toHaveBeenCalledTimes(2);
    });

    it('uses default aria label when not provided', () => {
      const button = createHTMLDeleteButton({ onClick: jest.fn() });
      expect(button.getAttribute('aria-label')).toBe('Delete note');
    });

    it('supports custom keyboard handler', () => {
      const onKeyDown = jest.fn();
      const button = createHTMLDeleteButton({
        onClick: jest.fn(),
        onKeyDown,
      });

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      button.dispatchEvent(event);

      expect(onKeyDown).toHaveBeenCalledWith(event);
    });
  });

  describe('SVG Button Creation', () => {
    it('creates SVG structure with correct elements', () => {
      const result = createSVGDeleteButton({
        x: 10,
        y: 20,
        onClick: jest.fn(),
      });

      expect(result.container.tagName).toBe('g');
      expect(result.container.getAttribute('class')).toBe(
        `${DELETE_BUTTON_CLASSES.BASE} ${DELETE_BUTTON_CLASSES.CONNECTION}`,
      );
      expect(result.container.getAttribute('data-type')).toBe('delete');

      expect(result.circle.tagName).toBe('circle');
      expect(result.circle.getAttribute('r')).toBe('9');
      expect(result.circle.getAttribute('cx')).toBe('10');
      expect(result.circle.getAttribute('cy')).toBe('20');
      expect(result.circle.getAttribute('class')).toBe(
        'shared-delete-button-background',
      );
    });

    it('positions cross icon correctly within circle', () => {
      const result = createSVGDeleteButton({
        x: 10,
        y: 20,
        onClick: jest.fn(),
      });
      const nestedSvg = result.cross;

      expect(nestedSvg.tagName).toBe('svg');
      expect(nestedSvg.getAttribute('x')).toBe('6'); // 10 - 4
      expect(nestedSvg.getAttribute('y')).toBe('16'); // 20 - 4
      expect(nestedSvg.getAttribute('width')).toBe('8');
      expect(nestedSvg.getAttribute('height')).toBe('8');
      expect(nestedSvg.getAttribute('viewBox')).toBe('0 0 20 20');

      const lines = nestedSvg.querySelectorAll('line');
      expect(lines).toHaveLength(2);

      // Verify cross coordinates match HTML button
      expect(lines[0].getAttribute('x1')).toBe('3');
      expect(lines[0].getAttribute('y1')).toBe('3');
      expect(lines[0].getAttribute('x2')).toBe('17');
      expect(lines[0].getAttribute('y2')).toBe('17');
    });

    it('handles click events when onClick provided', () => {
      const onClick = jest.fn();
      const result = createSVGDeleteButton({ x: 0, y: 0, onClick });

      // Simulate click event on SVG element
      const clickEvent = new Event('click', { bubbles: true });
      result.container.dispatchEvent(clickEvent);

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick).toHaveBeenCalledWith(expect.any(Event));
    });

    it('does not add click handler when onClick is null', () => {
      const result = createSVGDeleteButton({ x: 0, y: 0, onClick: null });

      // Should not throw error when dispatching click
      expect(() => {
        const clickEvent = new Event('click', { bubbles: true });
        result.container.dispatchEvent(clickEvent);
      }).not.toThrow();
    });

    it('defaults coordinates to 0 when not provided', () => {
      const result = createSVGDeleteButton({ onClick: jest.fn() });

      expect(result.circle.getAttribute('cx')).toBe('0');
      expect(result.circle.getAttribute('cy')).toBe('0');
      expect(result.cross.getAttribute('x')).toBe('-4');
      expect(result.cross.getAttribute('y')).toBe('-4');
    });
  });

  describe('Cross-Component Consistency', () => {
    it('maintains identical cross design across contexts', () => {
      const htmlButton = createHTMLDeleteButton({ onClick: jest.fn() });
      const svgButton = createSVGDeleteButton({ onClick: jest.fn() });

      const htmlSvg = htmlButton.querySelector('svg');
      const svgCross = svgButton.cross;

      // Same viewBox
      expect(htmlSvg.getAttribute('viewBox')).toBe(
        svgCross.getAttribute('viewBox'),
      );

      // Same line coordinates
      const htmlLines = htmlSvg.querySelectorAll('line');
      const svgLines = svgCross.querySelectorAll('line');

      expect(htmlLines[0].getAttribute('x1')).toBe(
        svgLines[0].getAttribute('x1'),
      );
      expect(htmlLines[0].getAttribute('y1')).toBe(
        svgLines[0].getAttribute('y1'),
      );
      expect(htmlLines[1].getAttribute('x2')).toBe(
        svgLines[1].getAttribute('x2'),
      );
      expect(htmlLines[1].getAttribute('y2')).toBe(
        svgLines[1].getAttribute('y2'),
      );
    });
  });
});
