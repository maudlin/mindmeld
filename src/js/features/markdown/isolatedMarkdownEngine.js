// src/js/features/markdown/isolatedMarkdownEngine.js

/**
 * Isolated Markdown Engine - Pure Functions Only
 *
 * This module contains ONLY the core markdown parsing logic,
 * completely separated from DOM manipulation, content editing,
 * or any other system concerns. This allows us to test and debug
 * the markdown parsing in complete isolation.
 */

/* eslint-disable security/detect-object-injection */

/**
 * HTML escape utility - pure function
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
 * Safe whitespace normalization - preserves markdown structure
 * @param {string} text - Input text
 * @returns {string} Normalized text with preserved structure
 */
export function normalizeMarkdownWhitespace(text) {
  if (typeof text !== 'string') return '';

  // Step 1: Normalize line endings (don't lose any line breaks)
  let result = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Step 2: Normalize spaces and tabs WITHIN lines (preserve line structure)
  const lines = result.split('\n');
  const normalizedLines = lines.map((line) => line.replace(/[ \t]+/g, ' '));
  result = normalizedLines.join('\n');

  // Step 3: Limit excessive consecutive newlines (but preserve intentional breaks)
  result = result.replace(/\n{4,}/g, '\n\n\n'); // Max 3 consecutive newlines

  // Step 4: Trim only leading/trailing whitespace from entire text
  return result.trim();
}

/**
 * Parse a single line to detect if it's a header
 * @param {string} line - Line to parse
 * @returns {object|null} {level, content} or null
 */
export function parseHeaderLine(line) {
  if (typeof line !== 'string') return null;

  const trimmed = line.trim();

  // Check for ## (h2) first to avoid ## being captured as # h1
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
 * Parse a single line to detect if it's a list item
 * @param {string} line - Line to parse
 * @returns {object|null} {marker, content} or null
 */
export function parseListItemLine(line) {
  if (typeof line !== 'string') return null;

  const trimmed = line.trim();
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
 * Process inline formatting (*italic*, **bold**) - pure function
 * @param {string} text - Text to process
 * @returns {string} Text with HTML formatting
 */
export function processInlineFormatting(text) {
  if (typeof text !== 'string') return '';

  // Escape HTML first
  let result = escapeHtml(text);

  // Manual character-by-character parsing for safety
  const chars = result.split('');
  const output = [];
  let i = 0;

  while (i < chars.length) {
    // Check for **bold** (need at least 5 chars: **x**)
    if (i <= chars.length - 5 && chars[i] === '*' && chars[i + 1] === '*') {
      let j = i + 2;
      let foundClosing = false;

      while (j <= chars.length - 2) {
        if (chars[j] === '*' && chars[j + 1] === '*') {
          foundClosing = true;
          break;
        }
        j++;
      }

      if (foundClosing && j > i + 2) {
        const content = chars.slice(i + 2, j).join('');
        // Process any *italic* inside bold
        const processedContent = content.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        output.push(`<strong>${processedContent}</strong>`);
        i = j + 2;
        continue;
      }
    }

    // Check for *italic* (need at least 3 chars: *x*)
    if (i <= chars.length - 3 && chars[i] === '*') {
      let j = i + 1;
      let foundClosing = false;

      while (j < chars.length) {
        if (chars[j] === '*') {
          foundClosing = true;
          break;
        }
        // Don't match across processed tags
        if (chars[j] === '<' || chars[j] === '>') {
          break;
        }
        j++;
      }

      if (foundClosing && j > i + 1) {
        const content = chars.slice(i + 1, j).join('');
        output.push(`<em>${content}</em>`);
        i = j + 1;
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
 * Parse markdown lines into structured blocks - pure function
 * @param {string} markdown - Raw markdown text
 * @returns {Array} Array of parsed blocks
 */
export function parseMarkdownToBlocks(markdown) {
  if (typeof markdown !== 'string') return [];

  const lines = markdown.split('\n');
  const blocks = [];
  let currentParagraph = [];
  let currentList = null;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Blank line - end current block
    if (trimmedLine === '') {
      // End current paragraph
      if (currentParagraph.length > 0) {
        blocks.push({
          type: 'paragraph',
          content: currentParagraph.join(' '),
        });
        currentParagraph = [];
      }

      // End current list
      if (currentList) {
        blocks.push(currentList);
        currentList = null;
      }

      continue;
    }

    // Check for header
    const header = parseHeaderLine(line);
    if (header) {
      // End current blocks
      if (currentParagraph.length > 0) {
        blocks.push({
          type: 'paragraph',
          content: currentParagraph.join(' '),
        });
        currentParagraph = [];
      }
      if (currentList) {
        blocks.push(currentList);
        currentList = null;
      }

      blocks.push({
        type: 'header',
        level: header.level,
        content: header.content,
      });
      continue;
    }

    // Check for list item
    const listItem = parseListItemLine(line);
    if (listItem) {
      // End current paragraph
      if (currentParagraph.length > 0) {
        blocks.push({
          type: 'paragraph',
          content: currentParagraph.join(' '),
        });
        currentParagraph = [];
      }

      // Continue or start list
      if (currentList && currentList.marker === listItem.marker) {
        currentList.items.push(listItem.content);
      } else {
        if (currentList) {
          blocks.push(currentList);
        }
        currentList = {
          type: 'list',
          marker: listItem.marker,
          items: [listItem.content],
        };
      }
      continue;
    }

    // Regular paragraph line
    if (currentList) {
      blocks.push(currentList);
      currentList = null;
    }
    currentParagraph.push(trimmedLine);
  }

  // Don't forget final blocks
  if (currentParagraph.length > 0) {
    blocks.push({
      type: 'paragraph',
      content: currentParagraph.join(' '),
    });
  }
  if (currentList) {
    blocks.push(currentList);
  }

  return blocks;
}

/**
 * Render parsed blocks to HTML - pure function
 * @param {Array} blocks - Parsed blocks from parseMarkdownToBlocks
 * @returns {string} HTML string
 */
export function renderBlocksToHtml(blocks) {
  if (!Array.isArray(blocks)) return '';

  return blocks
    .map((block) => {
      switch (block.type) {
        case 'header': {
          const content = processInlineFormatting(block.content);
          return `<h${block.level}>${content}</h${block.level}>`;
        }

        case 'paragraph': {
          const pContent = processInlineFormatting(block.content);
          return `<p>${pContent}</p>`;
        }

        case 'list': {
          const items = block.items
            .map((item) => {
              const itemContent = processInlineFormatting(item);
              return `<li>${itemContent}</li>`;
            })
            .join('');
          return `<ul>${items}</ul>`;
        }

        default: {
          // Unknown block type
          const defaultContent = processInlineFormatting(block.content || '');
          return `<p>${defaultContent}</p>`;
        }
      }
    })
    .join('');
}

/**
 * Complete markdown to HTML conversion - pure function pipeline
 * @param {string} markdown - Raw markdown text
 * @returns {string} Safe HTML
 */
export function markdownToHtml(markdown) {
  if (typeof markdown !== 'string' || !markdown.trim()) {
    return '';
  }

  // Step 1: Normalize whitespace (preserve structure)
  const normalized = normalizeMarkdownWhitespace(markdown);

  // Step 2: Parse to blocks
  const blocks = parseMarkdownToBlocks(normalized);

  // Step 3: Render to HTML
  return renderBlocksToHtml(blocks);
}

/**
 * Debug function - parse markdown and return detailed info
 * @param {string} markdown - Raw markdown text
 * @returns {object} Debug information
 */
export function debugMarkdownParsing(markdown) {
  const normalized = normalizeMarkdownWhitespace(markdown);
  const blocks = parseMarkdownToBlocks(normalized);
  const html = renderBlocksToHtml(blocks);

  return {
    original: markdown,
    normalized,
    lines: normalized.split('\n'),
    blocks,
    html,
    stats: {
      originalLength: markdown.length,
      normalizedLength: normalized.length,
      lineCount: normalized.split('\n').length,
      blockCount: blocks.length,
    },
  };
}
