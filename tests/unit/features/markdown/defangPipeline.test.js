// tests/unit/features/markdown/defangPipeline.test.js

describe('Defang Pipeline - Security Tests', () => {
  let defangToPlainText;
  let convertHtmlToMarkdown;

  beforeEach(async () => {
    // Reset modules to ensure clean imports
    jest.resetModules();

    // Import the module to test
    const module = await import(
      '../../../../src/js/features/markdown/defangPipeline.js'
    );
    defangToPlainText = module.defangToPlainText;
    convertHtmlToMarkdown = module.convertHtmlToMarkdown;
  });

  describe('Core Security Requirements', () => {
    it('should strip all HTML tags and return plain text', () => {
      const maliciousInput =
        '<script>alert("xss")</script><div>content</div><p>text</p>';
      const result = defangToPlainText(maliciousInput, true);

      expect(result).not.toContain('<script>');
      expect(result).not.toContain('<div>');
      expect(result).not.toContain('<p>');
      expect(result).toBe('content text');
    });

    it('should remove dangerous script elements completely', () => {
      const inputs = [
        '<script>alert("hack")</script>Safe content',
        'Before<script src="evil.js"></script>After',
        '<SCRIPT>var x=1;</SCRIPT>Text',
        '<script type="text/javascript">console.log("bad")</script>Good',
      ];

      inputs.forEach((input) => {
        const result = defangToPlainText(input, true);
        expect(result).not.toContain('alert');
        expect(result).not.toContain('hack');
        expect(result).not.toContain('evil.js');
        expect(result).not.toContain('console.log');
        expect(result).not.toContain('<script>');
      });
    });

    it('should strip all tag attributes regardless of tag type', () => {
      const input =
        '<div id="bad" class="evil" onclick="alert()">content</div><p style="color:red" data-test="x">text</p>';
      const result = defangToPlainText(input, true);

      expect(result).not.toContain('id=');
      expect(result).not.toContain('class=');
      expect(result).not.toContain('onclick=');
      expect(result).not.toContain('style=');
      expect(result).not.toContain('data-test=');
      expect(result).toBe('content text');
    });

    it('should remove dangerous URI schemes from any context', () => {
      const inputs = [
        'Click javascript:alert("xss") here',
        'Link to data:text/html,<script>alert(1)</script>',
        'Visit vbscript:msgbox("bad") now',
        'Go to javascript:void(0) please',
      ];

      inputs.forEach((input) => {
        const result = defangToPlainText(input, false);
        expect(result).not.toContain('javascript:');
        expect(result).not.toContain('data:text/html');
        expect(result).not.toContain('vbscript:');
      });
    });

    it('should handle mixed dangerous content comprehensively', () => {
      const input =
        '<div onclick="javascript:alert(document.cookie)">Click <script>steal()</script> here</div>';
      const result = defangToPlainText(input, true);

      expect(result).toBe('Click here');
      expect(result).not.toContain('javascript:');
      expect(result).not.toContain('alert');
      expect(result).not.toContain('document.cookie');
      expect(result).not.toContain('steal()');
    });
  });

  describe('Size Limit Enforcement', () => {
    it('should enforce maximum input size limits', () => {
      const tooLargeInput = 'a'.repeat(10001); // Over 10KB limit
      const result = defangToPlainText(tooLargeInput, false);

      expect(result).toBe('');
    });

    it('should accept input within size limits', () => {
      const validSizeInput = 'Valid content within limits';
      const result = defangToPlainText(validSizeInput, false);

      expect(result).toBe('Valid content within limits');
    });

    it('should handle exactly at size limit', () => {
      const exactLimitInput = 'a'.repeat(10000); // Exactly 10KB
      const result = defangToPlainText(exactLimitInput, false);

      expect(result).toBe(exactLimitInput);
    });
  });

  describe('Input Type Safety', () => {
    it('should handle null and undefined inputs safely', () => {
      expect(defangToPlainText(null, false)).toBe('');
      expect(defangToPlainText(undefined, false)).toBe('');
      expect(defangToPlainText(null, true)).toBe('');
      expect(defangToPlainText(undefined, true)).toBe('');
    });

    it('should handle non-string inputs by converting safely', () => {
      expect(defangToPlainText(123, false)).toBe('123');
      expect(defangToPlainText(true, false)).toBe('true');
      expect(defangToPlainText({}, false)).toBe('[object Object]');
      expect(defangToPlainText([], false)).toBe('');
    });

    it('should handle empty and whitespace-only inputs', () => {
      expect(defangToPlainText('', false)).toBe('');
      expect(defangToPlainText('   ', false)).toBe('');
      expect(defangToPlainText('\n\t  \r\n', false)).toBe('');
    });
  });

  describe('HTML Parsing Mode', () => {
    it('should extract text content from complex HTML structures', () => {
      const html = `
        <div>
          <h1>Title</h1>
          <p>First paragraph with <strong>bold</strong> text.</p>
          <ul>
            <li>Item one</li>
            <li>Item two</li>
          </ul>
          <p>Second paragraph.</p>
        </div>
      `;

      const result = defangToPlainText(html, true);
      expect(result).toContain('Title');
      expect(result).toContain('First paragraph with bold text.');
      expect(result).toContain('Item one');
      expect(result).toContain('Item two');
      expect(result).toContain('Second paragraph.');
      expect(result).not.toContain('<h1>');
      expect(result).not.toContain('<p>');
      expect(result).not.toContain('<ul>');
    });

    it('should handle malformed HTML gracefully', () => {
      const malformed = '<div><p>Unclosed tags<span>nested<div>more</p></div>';
      const result = defangToPlainText(malformed, true);

      expect(result).toContain('Unclosed tags');
      expect(result).toContain('nested');
      expect(result).toContain('more');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });

    it('should preserve text content order from HTML', () => {
      const html = '<div>First</div><div>Second</div><div>Third</div>';
      const result = defangToPlainText(html, true);

      const firstIndex = result.indexOf('First');
      const secondIndex = result.indexOf('Second');
      const thirdIndex = result.indexOf('Third');

      expect(firstIndex).toBeLessThan(secondIndex);
      expect(secondIndex).toBeLessThan(thirdIndex);
    });
  });

  describe('Plain Text Mode', () => {
    it('should process plain text input without HTML parsing', () => {
      const text = 'This is plain text with < and > characters';
      const result = defangToPlainText(text, false);

      expect(result).toBe('This is plain text with < and > characters');
    });

    it('should still remove dangerous URI schemes in plain text', () => {
      const text = 'Click this javascript:alert("xss") link';
      const result = defangToPlainText(text, false);

      expect(result).not.toContain('javascript:alert');
      expect(result).toContain('Click this');
      expect(result).toContain('link');
    });

    it('should normalize whitespace in plain text mode', () => {
      const text = 'Multiple   spaces\n\nand\t\ttabs\r\nhere';
      const result = defangToPlainText(text, false);

      expect(result).not.toContain('   ');
      expect(result).not.toContain('\t\t');
      expect(result).not.toContain('\r\n');
      expect(result).toContain('Multiple spaces');
      expect(result).toContain('and tabs');
    });
  });

  describe('HTML to Markdown Conversion', () => {
    it('should convert HTML headers to markdown headers', () => {
      const html = '<h1>Main Title</h1><h2>Subtitle</h2><h3>Not Supported</h3>';
      const result = convertHtmlToMarkdown(html);

      expect(result).toContain('# Main Title');
      expect(result).toContain('## Subtitle');
      expect(result).toContain('Not Supported'); // h3 becomes plain text
      expect(result).not.toContain('<h1>');
      expect(result).not.toContain('<h2>');
    });

    it('should convert HTML lists to markdown lists', () => {
      const html = '<ul><li>First item</li><li>Second item</li></ul>';
      const result = convertHtmlToMarkdown(html);

      expect(result).toContain('- First item');
      expect(result).toContain('- Second item');
      expect(result).not.toContain('<ul>');
      expect(result).not.toContain('<li>');
    });

    it('should convert HTML emphasis to markdown emphasis', () => {
      const html =
        '<p>Text with <strong>bold</strong> and <em>italic</em> formatting.</p>';
      const result = convertHtmlToMarkdown(html);

      expect(result).toContain('**bold**');
      expect(result).toContain('*italic*');
      expect(result).not.toContain('<strong>');
      expect(result).not.toContain('<em>');
    });

    it('should handle nested HTML structures during conversion', () => {
      const html = `
        <div>
          <h1>Document Title</h1>
          <p>Paragraph with <strong>bold <em>and italic</em></strong> text.</p>
          <ul>
            <li>List item with <strong>formatting</strong></li>
            <li>Another item</li>
          </ul>
        </div>
      `;

      const result = convertHtmlToMarkdown(html);
      expect(result).toContain('# Document Title');
      expect(result).toContain('**bold *and italic***');
      expect(result).toContain('- List item with **formatting**');
      expect(result).toContain('- Another item');
    });

    it('should strip unsupported HTML elements during conversion', () => {
      const html =
        '<div><a href="http://example.com">Link</a><img src="test.jpg" alt="Image"><code>code</code></div>';
      const result = convertHtmlToMarkdown(html);

      expect(result).toContain('Link'); // Text preserved
      expect(result).toContain('code'); // Code text preserved
      expect(result).not.toContain('<a');
      expect(result).not.toContain('<img');
      expect(result).not.toContain('<code');
      expect(result).not.toContain('href=');
      expect(result).not.toContain('src=');
      expect(result).not.toContain('alt=');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle extremely nested HTML without stack overflow', () => {
      let nested = 'content';
      for (let i = 0; i < 100; i++) {
        nested = `<div>${nested}</div>`;
      }

      const result = defangToPlainText(nested, true);
      expect(result).toBe('content');
    });

    it('should handle HTML with mixed case tag names', () => {
      const html = '<DIV><P>Mixed <STRONG>case</STRONG> tags</P></DIV>';
      const result = defangToPlainText(html, true);

      expect(result).toBe('Mixed case tags');
    });

    it('should handle self-closing tags correctly', () => {
      const html = 'Before<br/>Middle<hr />After<img src="test.jpg" />End';
      const result = defangToPlainText(html, true);

      expect(result).toContain('Before');
      expect(result).toContain('Middle');
      expect(result).toContain('After');
      expect(result).toContain('End');
      expect(result).not.toContain('<br');
      expect(result).not.toContain('<hr');
      expect(result).not.toContain('<img');
    });

    it('should handle comments and CDATA sections', () => {
      const html = '<!-- comment --><div>Content</div><![CDATA[data]]>';
      const result = defangToPlainText(html, true);

      expect(result).toBe('Content');
      expect(result).not.toContain('<!--');
      expect(result).not.toContain('CDATA');
    });
  });

  describe('Security Regression Tests', () => {
    it('should prevent all known XSS attack vectors', () => {
      const xssVectors = [
        '<script>alert(1)</script>',
        '<img src=x onerror=alert(1)>',
        '<svg onload=alert(1)>',
        '<iframe src="javascript:alert(1)">',
        '<object data="javascript:alert(1)">',
        '<embed src="javascript:alert(1)">',
        '<form action="javascript:alert(1)"><input type=submit>',
        '<input onfocus=alert(1) autofocus>',
        '<select onfocus=alert(1) autofocus>',
        '<textarea onfocus=alert(1) autofocus>',
        '<keygen onfocus=alert(1) autofocus>',
        '<video><source onerror="alert(1)">',
        '<audio src=x onerror=alert(1)>',
        '<details open ontoggle=alert(1)>',
        '<marquee onstart=alert(1)>',
      ];

      xssVectors.forEach((vector) => {
        const result = defangToPlainText(vector, true);
        expect(result).not.toContain('alert');
        expect(result).not.toContain('javascript:');
        expect(result).not.toContain('onerror');
        expect(result).not.toContain('onload');
        expect(result).not.toContain('<script>');
      });
    });

    it('should prevent HTML injection in markdown conversion', () => {
      const maliciousHtml =
        '<h1 onclick="alert(1)">Title</h1><p style="background:url(javascript:alert(1))">Text</p>';
      const result = convertHtmlToMarkdown(maliciousHtml);

      expect(result).toContain('# Title');
      expect(result).toContain('Text');
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('style=');
      expect(result).not.toContain('javascript:');
      expect(result).not.toContain('alert');
    });

    it('should handle data URI attempts in various contexts', () => {
      const inputs = [
        'data:text/html,<script>alert(1)</script>',
        'Data:application/javascript,alert(1)',
        'DATA:TEXT/HTML;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
        'Visit data:text/html;charset=utf-8,<script>alert(1)</script> now',
      ];

      inputs.forEach((input) => {
        const result = defangToPlainText(input, false);
        expect(result).not.toContain('data:text/html');
        expect(result).not.toContain('data:application/javascript');
        expect(result).not.toContain('DATA:TEXT/HTML');
        expect(result).not.toContain('base64,');
      });
    });
  });

  describe('Performance Requirements', () => {
    it('should process typical input sizes efficiently', () => {
      const largeInput =
        '<div>' + 'This is test content. '.repeat(500) + '</div>';

      const startTime = performance.now();
      defangToPlainText(largeInput, true);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
    });

    it('should handle maximum allowed input size within time limits', () => {
      const maxInput = '<p>' + 'a'.repeat(9990) + '</p>'; // Just under 10KB limit

      const startTime = performance.now();
      const result = defangToPlainText(maxInput, true);
      const endTime = performance.now();

      expect(result.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(500); // Should complete in under 500ms
    });
  });
});
