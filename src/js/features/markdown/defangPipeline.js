// src/js/features/markdown/defangPipeline.js

/**
 * Security-First Content Defang Pipeline
 *
 * Treats ALL input as potentially hostile and implements defense-in-depth:
 * - Size limit enforcement (10KB max)
 * - HTML parsing with DOMParser for safe text extraction
 * - Dangerous URI scheme removal (javascript:, data:, vbscript:)
 * - Whitespace normalization
 * - HTML to Markdown structure conversion
 *
 * This module is the critical security boundary - ALL content must pass through
 * this pipeline before reaching storage or rendering systems.
 */

// Security constants
const MAX_INPUT_SIZE = 10000; // 10KB limit
const DANGEROUS_URI_SCHEMES = /\b(?:javascript|data|vbscript):[^\s]*/gi;

/**
 * Main security defang function - converts any input to safe plain text
 * @param {any} input - Input of any type (null, undefined, string, etc.)
 * @param {boolean} isHtml - Whether to parse input as HTML or treat as plain text
 * @returns {string} Safe plain text output
 */
export function defangToPlainText(input, isHtml = false) {
  // Handle null/undefined
  if (input == null) {
    return '';
  }

  // Convert to string safely
  let text;
  try {
    text = String(input);
  } catch {
    return '';
  }

  // Enforce size limits
  if (text.length > MAX_INPUT_SIZE) {
    return '';
  }

  // Handle empty or whitespace-only input
  const trimmed = text.trim();
  if (trimmed === '') {
    return '';
  }

  // First, check if input has HTML entities and decode them
  let processedText = text;
  if (
    text.includes('&lt;') ||
    text.includes('&gt;') ||
    text.includes('&amp;') ||
    text.includes('&quot;')
  ) {
    processedText = text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'");
    // If we decoded entities, treat as HTML
    isHtml = true;
  }

  let result;
  if (isHtml) {
    // HTML mode: use DOMParser to safely extract text content
    result = extractTextFromHtml(processedText);
  } else {
    // Plain text mode: process as-is
    result = processedText;
  }

  // Remove dangerous URI schemes from any context
  result = result.replace(DANGEROUS_URI_SCHEMES, '');

  // Normalize whitespace but preserve line breaks for markdown structure
  // First, normalize line endings (convert \r\n and \r to \n)
  result = result.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Then normalize spaces and tabs within lines
  result = result.replace(/[ \t]+/g, ' ');
  // Finally normalize multiple consecutive line breaks to at most 2 (preserves paragraph separation)
  result = result.replace(/\n{3,}/g, '\n\n');
  // Trim leading/trailing whitespace
  result = result.trim();

  return result;
}

/**
 * Extract text content from HTML using DOMParser for safety
 * @param {string} html - HTML string to process
 * @returns {string} Plain text content
 */
function extractTextFromHtml(html) {
  try {
    // Use DOMParser for safe HTML parsing - this automatically handles:
    // - Malformed HTML
    // - Nested structures
    // - Comments and CDATA
    // - Mixed case tags
    // - Self-closing tags
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Remove script and style elements completely before extracting text
    const scripts = doc.querySelectorAll('script, style');
    scripts.forEach((el) => el.remove());

    // Extract text from elements that have useful text or alt attributes
    let result = '';

    // Process elements recursively to properly handle spacing
    result = extractTextRecursively(doc.body);

    return result.trim();
  } catch {
    // Fallback: strip basic HTML tags manually if DOMParser fails
    return html.replace(/<[^>]*>/g, '');
  }
}

/**
 * Recursively extract text from HTML elements with proper spacing
 * @param {Element} element - DOM element to process
 * @returns {string} Text content with preserved whitespace
 */
function extractTextRecursively(element) {
  let result = '';

  for (const child of element.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      // Preserve the original text content including whitespace
      result += child.textContent;
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const tagName = child.tagName.toLowerCase();

      // Handle images with alt text
      if (tagName === 'img' && child.alt) {
        result += child.alt;
      }

      // Check if this is a block-level element that should add spacing
      const isBlockElement = [
        'div',
        'p',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'ul',
        'ol',
        'li',
        'blockquote',
        'pre',
      ].includes(tagName);

      // Recursively process child content
      const childText = extractTextRecursively(child);

      if (childText.trim()) {
        // Add space before block elements if needed
        if (
          isBlockElement &&
          result &&
          !result.endsWith(' ') &&
          !result.endsWith('\n')
        ) {
          result += ' ';
        }

        result += childText;

        // Add space after block elements if needed
        if (
          isBlockElement &&
          !childText.endsWith(' ') &&
          !childText.endsWith('\n')
        ) {
          result += ' ';
        }
      }
    }
  }

  return result;
}

/**
 * Convert HTML to Markdown structure while maintaining security
 * @param {string} html - HTML string to convert
 * @returns {string} Markdown formatted string
 */
export function convertHtmlToMarkdown(html) {
  if (!html || typeof html !== 'string') {
    return '';
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    return processHtmlNode(doc.body);
  } catch {
    // Fallback: treat as plain text if parsing fails
    return defangToPlainText(html, false);
  }
}

/**
 * Recursively process HTML nodes to extract markdown-compatible structure
 * @param {Element} node - DOM node to process
 * @returns {string} Markdown formatted content
 */
function processHtmlNode(node) {
  if (!node) return '';

  let result = '';

  for (const child of node.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      // Text node - preserve whitespace including newlines
      const text = child.textContent;
      if (text) {
        result += text;
      }
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      // Element node - convert based on tag type
      const tagName = child.tagName.toLowerCase();
      const childContent = processHtmlNode(child);

      switch (tagName) {
        case 'h1':
          if (childContent.trim()) {
            result += `# ${childContent.trim()}\n\n`;
          }
          break;

        case 'h2':
          if (childContent.trim()) {
            result += `## ${childContent.trim()}\n\n`;
          }
          break;

        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
          // Unsupported headers become plain text
          if (childContent.trim()) {
            result += `${childContent.trim()}\n\n`;
          }
          break;

        case 'p':
        case 'div':
          if (childContent.trim()) {
            result += `${childContent.trim()}\n\n`;
          }
          break;

        case 'ul':
        case 'ol':
          // Process list - child content should already have list markers
          if (childContent.trim()) {
            result += `${childContent.trim()}\n\n`;
          }
          break;

        case 'li':
          if (childContent.trim()) {
            result += `- ${childContent.trim()}\n`;
          }
          break;

        case 'strong':
        case 'b':
          if (childContent.trim()) {
            result += `**${childContent.trim()}**`;
          }
          break;

        case 'em':
        case 'i':
          if (childContent.trim()) {
            result += `*${childContent.trim()}*`;
          }
          break;

        case 'br':
          result += '\n';
          break;

        default:
          // Unsupported tags - just include their text content
          if (childContent.trim()) {
            result += `${childContent.trim()} `;
          }
          break;
      }
    }
    // Skip comment nodes and other node types
  }

  return result;
}

/**
 * Legacy HTML to Markdown migration helper
 * Detects if content contains HTML and converts it safely
 * @param {string} content - Content to check and potentially migrate
 * @returns {object} {content: string, wasMigrated: boolean}
 */
export function migrateLegacyContent(content) {
  if (!content || typeof content !== 'string') {
    return { content: '', wasMigrated: false };
  }

  // Detect HTML content by presence of < or > or HTML entities
  const containsHtml = /<|>|&lt;|&gt;|&amp;|&quot;/.test(content);

  if (containsHtml) {
    // Decode HTML entities first if present, then process as HTML
    let htmlContent = content;
    if (
      content.includes('&lt;') ||
      content.includes('&gt;') ||
      content.includes('&amp;') ||
      content.includes('&quot;')
    ) {
      htmlContent = content
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'");
    }

    // This is legacy HTML - convert to markdown
    const markdownContent = convertHtmlToMarkdown(htmlContent);
    return {
      content: markdownContent,
      wasMigrated: true,
    };
  }

  // Plain text content - just defang for safety
  const safeContent = defangToPlainText(content, false);
  return {
    content: safeContent,
    wasMigrated: false,
  };
}

/**
 * Detect if content likely contains HTML
 * @param {string} content - Content to check
 * @returns {boolean} True if content appears to contain HTML
 */
export function containsHtml(content) {
  if (!content || typeof content !== 'string') {
    return false;
  }

  return /<[^>]+>/.test(content);
}
