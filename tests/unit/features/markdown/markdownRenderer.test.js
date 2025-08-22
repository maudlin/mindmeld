// tests/unit/features/markdown/markdownRenderer.test.js

describe('Markdown Renderer', () => {
  let renderMarkdown;

  beforeEach(async () => {
    // Reset modules to ensure clean imports
    jest.resetModules();

    // Import the module to test
    const module = await import(
      '../../../../src/js/features/markdown/markdownRenderer.js'
    );
    renderMarkdown = module.renderMarkdown;
  });

  describe('Security Requirements', () => {
    it('should only output whitelisted tags', () => {
      const maliciousInput =
        '# Header\n<script>alert("xss")</script>\n**bold** text';
      const result = renderMarkdown(maliciousInput);

      expect(result).toContain('<h1>Header</h1>');
      expect(result).toContain('<strong>bold</strong>');
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;'); // Should be escaped
    });

    it('should never output attributes on any tag', () => {
      const input = '# Header\n**bold**\n- item';
      const result = renderMarkdown(input);

      // Should not contain any attributes (class, id, style, onclick, etc.)
      expect(result).not.toMatch(/<\w+\s+[^>]*>/);
      expect(result).toBe(
        '<h1>Header</h1><p><strong>bold</strong></p><ul><li>item</li></ul>',
      );
    });

    it('should escape all HTML entities in text content', () => {
      const input = 'Text with <>&"\' characters';
      const result = renderMarkdown(input);

      expect(result).toBe(
        '<p>Text with &lt;&gt;&amp;&quot;&#x27; characters</p>',
      );
    });

    it('should handle empty input securely', () => {
      expect(renderMarkdown('')).toBe('');
      expect(renderMarkdown('   \n\n  ')).toBe('');
      expect(renderMarkdown(null)).toBe('');
      expect(renderMarkdown(undefined)).toBe('');
    });
  });

  describe('Header Rendering', () => {
    it('should render single # as h1', () => {
      expect(renderMarkdown('# Main Header')).toBe('<h1>Main Header</h1>');
    });

    it('should render double ## as h2', () => {
      expect(renderMarkdown('## Sub Header')).toBe('<h2>Sub Header</h2>');
    });

    it('should not render h3, h4, etc - render as paragraph instead', () => {
      expect(renderMarkdown('### Not Supported')).toBe(
        '<p>### Not Supported</p>',
      );
      expect(renderMarkdown('#### Also Not Supported')).toBe(
        '<p>#### Also Not Supported</p>',
      );
    });

    it('should handle headers with trailing spaces', () => {
      expect(renderMarkdown('#   Header with spaces   ')).toBe(
        '<h1>Header with spaces</h1>',
      );
      expect(renderMarkdown('##  Another header  ')).toBe(
        '<h2>Another header</h2>',
      );
    });

    it('should require space after # to be valid header', () => {
      expect(renderMarkdown('#NoSpace')).toBe('<p>#NoSpace</p>');
      expect(renderMarkdown('##NoSpace')).toBe('<p>##NoSpace</p>');
    });
  });

  describe('Paragraph Rendering', () => {
    it('should render non-empty lines as paragraphs', () => {
      expect(renderMarkdown('Simple text')).toBe('<p>Simple text</p>');
    });

    it('should handle multiple paragraphs separated by blank lines', () => {
      const input = 'First paragraph\n\nSecond paragraph';
      const expected = '<p>First paragraph</p><p>Second paragraph</p>';
      expect(renderMarkdown(input)).toBe(expected);
    });

    it('should treat soft line breaks as spaces within paragraphs', () => {
      const input = 'Line one\nLine two\nLine three';
      const expected = '<p>Line one Line two Line three</p>';
      expect(renderMarkdown(input)).toBe(expected);
    });

    it('should handle paragraphs with mixed content', () => {
      const input = 'Paragraph with **bold** and *italic* text';
      const expected =
        '<p>Paragraph with <strong>bold</strong> and <em>italic</em> text</p>';
      expect(renderMarkdown(input)).toBe(expected);
    });
  });

  describe('List Rendering', () => {
    it('should render lines starting with - as unordered list', () => {
      const input = '- First item\n- Second item';
      const expected = '<ul><li>First item</li><li>Second item</li></ul>';
      expect(renderMarkdown(input)).toBe(expected);
    });

    it('should render lines starting with * as unordered list', () => {
      const input = '* First item\n* Second item';
      const expected = '<ul><li>First item</li><li>Second item</li></ul>';
      expect(renderMarkdown(input)).toBe(expected);
    });

    it('should render lines starting with • as unordered list', () => {
      const input = '• First item\n• Second item';
      const expected = '<ul><li>First item</li><li>Second item</li></ul>';
      expect(renderMarkdown(input).replace(/\u2022/g, '•')).toBe(expected);
    });

    it('should handle mixed list markers as separate lists', () => {
      const input = '- Dash item\n* Star item';
      const expected = '<ul><li>Dash item</li></ul><ul><li>Star item</li></ul>';
      expect(renderMarkdown(input)).toBe(expected);
    });

    it('should handle list items with inline formatting', () => {
      const input = '- Item with **bold**\n- Item with *italic*';
      const expected =
        '<ul><li>Item with <strong>bold</strong></li><li>Item with <em>italic</em></li></ul>';
      expect(renderMarkdown(input)).toBe(expected);
    });

    it('should require space after list marker', () => {
      expect(renderMarkdown('-NoSpace')).toBe('<p>-NoSpace</p>');
      expect(renderMarkdown('*NoSpace')).toBe('<p>*NoSpace</p>');
    });
  });

  describe('Inline Formatting', () => {
    it('should render *text* as <em>', () => {
      expect(renderMarkdown('*italic text*')).toBe(
        '<p><em>italic text</em></p>',
      );
    });

    it('should render **text** as <strong>', () => {
      expect(renderMarkdown('**bold text**')).toBe(
        '<p><strong>bold text</strong></p>',
      );
    });

    it('should handle nested inline formatting', () => {
      const input = '**bold with *italic* inside**';
      const expected =
        '<p><strong>bold with <em>italic</em> inside</strong></p>';
      expect(renderMarkdown(input)).toBe(expected);
    });

    it('should handle multiple inline elements in same line', () => {
      const input = 'Some **bold** and *italic* text';
      const expected =
        '<p>Some <strong>bold</strong> and <em>italic</em> text</p>';
      expect(renderMarkdown(input)).toBe(expected);
    });

    it('should not render unclosed formatting', () => {
      expect(renderMarkdown('*unclosed italic')).toBe(
        '<p>*unclosed italic</p>',
      );
      expect(renderMarkdown('**unclosed bold')).toBe('<p>**unclosed bold</p>');
    });
  });

  describe('Complex Document Rendering', () => {
    it('should render complete document with all supported elements', () => {
      const input = `# Main Title

This is a paragraph with **bold** and *italic* text.

## Subtitle

Another paragraph here.

- First list item
- Second list item with **bold**
- Third item

Final paragraph.`;

      const expected =
        '<h1>Main Title</h1><p>This is a paragraph with <strong>bold</strong> and <em>italic</em> text.</p><h2>Subtitle</h2><p>Another paragraph here.</p><ul><li>First list item</li><li>Second list item with <strong>bold</strong></li><li>Third item</li></ul><p>Final paragraph.</p>';

      expect(renderMarkdown(input)).toBe(expected);
    });

    it('should handle mixed content blocks correctly', () => {
      const input = `# Header
- List item
Regular paragraph
## Another header`;

      const expected =
        '<h1>Header</h1><ul><li>List item</li></ul><p>Regular paragraph</p><h2>Another header</h2>';
      expect(renderMarkdown(input)).toBe(expected);
    });
  });

  describe('Unsupported Syntax', () => {
    it('should render unsupported markdown as plain text', () => {
      // Links
      expect(renderMarkdown('[link text](http://example.com)')).toBe(
        '<p>[link text](http://example.com)</p>',
      );

      // Images
      expect(renderMarkdown('![alt text](image.jpg)')).toBe(
        '<p>![alt text](image.jpg)</p>',
      );

      // Code blocks
      expect(renderMarkdown('```code```')).toBe('<p>```code```</p>');

      // Inline code
      expect(renderMarkdown('`code`')).toBe('<p>`code`</p>');

      // Blockquotes
      expect(renderMarkdown('> quote')).toBe('<p>&gt; quote</p>');
    });

    it('should escape HTML-like syntax in unsupported markdown', () => {
      expect(renderMarkdown('~~strikethrough~~')).toBe(
        '<p>~~strikethrough~~</p>',
      );
      expect(renderMarkdown('<u>underline</u>')).toBe(
        '<p>&lt;u&gt;underline&lt;/u&gt;</p>',
      );
    });
  });

  describe('Performance Requirements', () => {
    it('should handle typical note sizes efficiently', () => {
      // Generate a reasonably sized note (500 chars as per spec)
      const largeInput =
        '# Header\n\n' +
        'This is a test paragraph with **bold** and *italic* text. '.repeat(
          10,
        ) +
        '\n\n- Item 1\n- Item 2\n- Item 3';

      const startTime = performance.now();
      const result = renderMarkdown(largeInput);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
      expect(result).toContain('<h1>Header</h1>');
      expect(result).toContain('<strong>bold</strong>');
      expect(result).toContain('<ul><li>Item 1</li>');
    });

    it('should handle line complexity in O(n) time', () => {
      // Test with many lines to ensure O(n) behavior
      const manyLines = Array.from(
        { length: 100 },
        (_, i) => `Line ${i} with **bold** text`,
      ).join('\n');

      const startTime = performance.now();
      renderMarkdown(manyLines);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50); // Should be very fast for line-based parsing
    });
  });

  describe('Edge Cases', () => {
    it('should handle input with only whitespace characters', () => {
      expect(renderMarkdown(' \t \n \r\n ')).toBe('');
    });

    it('should handle single character inputs', () => {
      expect(renderMarkdown('#')).toBe('<p>#</p>');
      expect(renderMarkdown('*')).toBe('<p>*</p>');
      expect(renderMarkdown('-')).toBe('<p>-</p>');
    });

    it('should handle very long lines', () => {
      const longLine = 'a'.repeat(1000);
      const result = renderMarkdown(longLine);
      expect(result).toBe(`<p>${longLine}</p>`);
    });

    it('should handle special Unicode characters', () => {
      const input = 'Unicode: 🎉 emoji and 中文 characters';
      expect(renderMarkdown(input)).toBe(
        '<p>Unicode: 🎉 emoji and 中文 characters</p>',
      );
    });
  });
});
