// src/js/features/markdown/markdownRenderer.js

/**
 * MiniMarkdown Renderer - Security-First Subset Implementation
 *
 * Converts a limited subset of markdown to HTML with strict security controls:
 * - Whitelisted tags only: h1, h2, p, ul, li, em, strong
 * - All text content is HTML-escaped
 * - No attributes or inline styles ever output
 * - Unsupported syntax rendered as plain text
 *
 * Performance: O(n lines) with sub-500ms target for typical notes
 */

/**
 * HTML escape utility - converts dangerous characters to entities
 * @param {string} text - Text to escape
 * @returns {string} HTML-safe text
 */
function escapeHtml(text) {
  if (typeof text !== 'string') return '';

  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Process inline formatting (*italic*, **bold**)
 * @param {string} text - Text to process
 * @returns {string} Text with inline HTML tags
 */
function processInlineFormatting(text) {
  // First escape all HTML entities in the input text
  let result = escapeHtml(text);

  // Safe approach: completely manual parsing to avoid regex catastrophic backtracking
  // Parse character by character for maximum safety

  const chars = result.split('');
  const output = [];
  let i = 0;

  while (i < chars.length) {
    // Check for **bold** (must be at least 5 chars: **x**)
    if (i <= chars.length - 5 && chars[i] === '*' && chars[i + 1] === '*') {
      // Find the closing **
      let j = i + 2;
      let foundClosing = false;

      while (j <= chars.length - 2) {
        if (chars[j] === '*' && chars[j + 1] === '*') {
          foundClosing = true;
          break;
        }
        j++;
      }

      if (foundClosing) {
        // Extract content between ** and **
        const content = chars.slice(i + 2, j).join('');
        // Process any *italic* inside
        const processedContent = content.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        output.push(`<strong>${processedContent}</strong>`);
        i = j + 2; // Skip past closing **
        continue;
      }
    }

    // Check for *italic* (must be at least 3 chars: *x*)
    if (i <= chars.length - 3 && chars[i] === '*') {
      // Find the closing *
      let j = i + 1;
      let foundClosing = false;

      while (j < chars.length) {
        if (chars[j] === '*') {
          foundClosing = true;
          break;
        }
        // Don't match across < or > (avoid matching inside already processed tags)
        if (chars[j] === '<' || chars[j] === '>') {
          break;
        }
        j++;
      }

      if (foundClosing && j > i + 1) {
        const content = chars.slice(i + 1, j).join('');
        output.push(`<em>${content}</em>`);
        i = j + 1; // Skip past closing *
        continue;
      }
    }

    // Regular character
    output.push(chars[i]);
    i++;
  }

  return output.join('');
}

/**
 * Detect if a line is a header (# or ##)
 * @param {string} line - Line to check
 * @returns {object|null} {level, content} or null
 */
function parseHeader(line) {
  const trimmed = line.trim();

  // Check for ## (h2)
  if (trimmed.startsWith('## ') && trimmed.length > 3) {
    return { level: 2, content: trimmed.slice(3).trim() };
  }

  // Check for # (h1)
  if (trimmed.startsWith('# ') && trimmed.length > 2) {
    return { level: 1, content: trimmed.slice(2).trim() };
  }

  return null;
}

/**
 * Detect if a line is a list item (-, *, •)
 * @param {string} line - Line to check
 * @returns {object|null} {marker, content} or null
 */
function parseListItem(line) {
  const trimmed = line.trim();

  // Check for list markers with required space
  const markers = ['-', '*', '•'];
  for (const marker of markers) {
    if (trimmed.startsWith(marker + ' ')) {
      return {
        marker,
        content: trimmed.slice(2).trim(),
      };
    }
  }

  return null;
}

/**
 * Group consecutive list items by marker type
 * @param {Array} lines - Array of line objects
 * @returns {Array} Grouped blocks
 */
function groupListItems(lines) {
  const blocks = [];
  let currentList = null;

  for (const line of lines) {
    if (line.type === 'list') {
      if (currentList && currentList.marker === line.marker) {
        // Same list type, add to current list
        currentList.items.push(line.content);
      } else {
        // New list type, start new list
        if (currentList) blocks.push(currentList);
        currentList = {
          type: 'list',
          marker: line.marker,
          items: [line.content],
        };
      }
    } else {
      // Non-list item, close current list if exists
      if (currentList) {
        blocks.push(currentList);
        currentList = null;
      }
      blocks.push(line);
    }
  }

  // Don't forget the last list
  if (currentList) {
    blocks.push(currentList);
  }

  return blocks;
}

/**
 * Group consecutive paragraph lines, but respect blank line separation
 * @param {Array} lines - Array of processed lines (including blanks)
 * @returns {Array} Blocks with paragraphs properly grouped
 */
function groupParagraphs(lines) {
  const result = [];
  let currentParagraph = [];

  for (const line of lines) {
    if (line.type === 'blank') {
      // Blank line ends current paragraph
      if (currentParagraph.length > 0) {
        result.push({
          type: 'paragraph',
          content: currentParagraph.join(' '),
        });
        currentParagraph = [];
      }
    } else if (line.type === 'paragraph') {
      currentParagraph.push(line.content);
    } else {
      // Non-paragraph block (header, list), close current paragraph if exists
      if (currentParagraph.length > 0) {
        result.push({
          type: 'paragraph',
          content: currentParagraph.join(' '),
        });
        currentParagraph = [];
      }
      result.push(line);
    }
  }

  // Don't forget the last paragraph
  if (currentParagraph.length > 0) {
    result.push({
      type: 'paragraph',
      content: currentParagraph.join(' '),
    });
  }

  return result;
}

/**
 * Render blocks to HTML
 * @param {Array} blocks - Processed blocks
 * @returns {string} HTML string
 */
function renderBlocks(blocks) {
  return blocks
    .map((block) => {
      let content;
      let items;

      switch (block.type) {
        case 'header':
          content = processInlineFormatting(block.content);
          return `<h${block.level}>${content}</h${block.level}>`;

        case 'paragraph':
          content = processInlineFormatting(block.content);
          return `<p>${content}</p>`;

        case 'list':
          items = block.items
            .map((item) => {
              const itemContent = processInlineFormatting(item);
              return `<li>${itemContent}</li>`;
            })
            .join('');
          return `<ul>${items}</ul>`;

        default:
          // Unknown block type - render as paragraph for safety
          content = processInlineFormatting(block.content || '');
          return `<p>${content}</p>`;
      }
    })
    .join('');
}

/**
 * Main markdown rendering function
 * @param {string} markdown - Raw markdown string
 * @returns {string} HTML string (whitelisted tags only)
 */
export function renderMarkdown(markdown) {
  // Handle null/undefined/empty input
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  // Handle whitespace-only input
  const trimmed = markdown.trim();
  if (trimmed === '') {
    return '';
  }

  // Split into lines for processing
  const lines = markdown.split('\n');
  const processedLines = [];

  // First pass: classify each line
  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip blank lines (they separate blocks)
    if (trimmedLine === '') {
      processedLines.push({ type: 'blank' });
      continue;
    }

    // Check for header
    const header = parseHeader(line);
    if (header) {
      processedLines.push({
        type: 'header',
        level: header.level,
        content: header.content,
      });
      continue;
    }

    // Check for list item
    const listItem = parseListItem(line);
    if (listItem) {
      processedLines.push({
        type: 'list',
        marker: listItem.marker,
        content: listItem.content,
      });
      continue;
    }

    // Default to paragraph
    processedLines.push({
      type: 'paragraph',
      content: trimmedLine,
    });
  }

  // Group consecutive paragraphs (keeping blank lines for separation)
  const paragraphGroups = groupParagraphs(processedLines);

  // Filter out any remaining blank lines after paragraph grouping
  const nonBlankBlocks = paragraphGroups.filter(
    (block) => block.type !== 'blank',
  );

  // Group list items by marker
  const finalBlocks = groupListItems(nonBlankBlocks);

  // Render to HTML
  return renderBlocks(finalBlocks);
}
