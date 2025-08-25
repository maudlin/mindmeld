# Markdown Parsing Architecture

## Overview

MindMeld implements a **security-first markdown rendering system** with comprehensive data corruption resistance. This document details the architecture, security measures, and robustness features that protect user data across the entire pipeline.

## Critical Requirements

### Data Integrity (MM-174 Context)
The markdown system was built in response to **MM-174: CRITICAL Page Refresh Corrupts Markdown Content**, a data loss bug where markdown progressively corrupted across page refreshes:

- **Original**: `# H1` (markdown)
- **After first refresh**: `<h1>H1</h1>` (HTML saved to localStorage)  
- **After second refresh**: `H1` (plain text after HTML defanging)
- **Result**: Original markdown permanently lost

This architecture prevents such corruption through multiple layers of protection.

### Security Requirements
- **Zero HTML injection**: All content must be defanged before rendering
- **XSS protection**: No user content can execute JavaScript
- **Size limits**: 10KB maximum input to prevent DoS
- **Dangerous URI removal**: `javascript:`, `data:`, `vbscript:` schemes stripped

## Architecture Overview

```
User Input → Defang Pipeline → Storage → Retrieval → Markdown Renderer → Safe HTML
     ↑                                                        ↓
     └─────────── Edit Mode Content Extraction ←──────────────┘
```

### Core Principles
1. **Defang-First**: ALL input passes through security defang before storage
2. **Markdown-Only Storage**: Only markdown is persisted, never HTML
3. **Safe Rendering**: HTML generation happens only at render time with whitelisted tags
4. **Round-Trip Integrity**: Content maintains fidelity through edit/view cycles

## Component Architecture

### 1. Defang Pipeline (`defangPipeline.js`)
**Location**: `src/js/features/markdown/defangPipeline.js`
**Purpose**: Security-first content sanitization

#### Core Functions

**`defangToPlainText(input, isHtml)`**
- Primary security boundary for ALL content
- Enforces 10KB size limit
- Removes dangerous URI schemes (`javascript:`, `data:`, `vbscript:`)
- Uses DOMParser for safe HTML parsing when `isHtml=true`
- Preserves line breaks for markdown structure

**Critical Security Features:**
```javascript
// Size enforcement
if (text.length > MAX_INPUT_SIZE) {
  return '';  // Reject oversized input
}

// Dangerous URI removal
result = result.replace(DANGEROUS_URI_SCHEMES, '');

// HTML entity decoding with forced HTML mode
if (text.includes('&lt;') || text.includes('&gt;')) {
  // Decode entities and switch to HTML parsing mode
  isHtml = true;
}
```

#### HTML Processing (`extractTextFromHtml`)
Uses DOMParser for security:
- Removes `<script>` and `<style>` elements completely
- Extracts text content recursively
- Preserves spacing between block elements
- Handles malformed HTML gracefully

**Whitespace Preservation Algorithm:**
```javascript
// Critical for markdown structure preservation
// 1. Normalize line endings (\r\n, \r → \n)
result = result.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
// 2. Normalize spaces within lines 
result = result.replace(/[ \t]+/g, ' ');
// 3. Limit consecutive newlines (max 2 for paragraph separation)
result = result.replace(/\n{3,}/g, '\n\n');
```

### 2. Markdown Renderer (`markdownRenderer.js`)
**Location**: `src/js/features/markdown/markdownRenderer.js`
**Purpose**: Convert sanitized markdown to safe HTML

#### Supported Elements
- **Headers**: `# H1` and `## H2` only
- **Emphasis**: `*italic*` and `**bold**`
- **Lists**: `- item`, `* item`, `• item`
- **Paragraphs**: Automatic grouping with blank line separation

#### Security Architecture
```javascript
// 1. HTML escape ALL text content first
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// 2. Generate only whitelisted HTML tags
const ALLOWED_TAGS = ['h1', 'h2', 'p', 'ul', 'li', 'em', 'strong'];

// 3. No attributes or inline styles ever output
```

#### Parsing Algorithm
**Line-by-line processing:**
1. **Classification**: Each line classified as header/list/paragraph/blank
2. **Grouping**: Consecutive elements grouped (paragraphs, lists)
3. **Rendering**: Generate whitelisted HTML with escaped content

**List Processing:**
```javascript
function parseListItem(line) {
  const trimmed = line.trim();
  const markers = ['-', '*', '•'];
  
  for (const marker of markers) {
    if (trimmed.startsWith(marker + ' ')) {  // Requires space after marker
      return { marker, content: trimmed.slice(2).trim() };
    }
  }
  return null;
}
```

### 3. Content Extraction (`editViewMode.js`)
**Location**: `src/js/features/note/editViewMode.js`
**Purpose**: Safely extract markdown content for storage

#### Core Function: `getCurrentMarkdownContent()`
This function is **critical for MM-174 prevention**:

```javascript
export function getCurrentMarkdownContent(noteContent) {
  // Edit mode: Use textContent (user's raw input)
  if (noteContent.contentEditable === 'true' || 
      noteContent.classList.contains('edit-mode')) {
    return noteContent.textContent || '';
  }
  
  // View mode: Use stored markdown from dataset
  return noteContent.dataset.markdown || 
         noteContent.getAttribute('data-markdown') || '';
}
```

**Why this matters:**
- **Edit mode**: Returns raw text user is typing (markdown)
- **View mode**: Returns stored markdown from dataset, NOT rendered HTML
- **Never returns HTML**: Prevents the MM-174 corruption cycle

### 4. Data Store Integration (`dataStore.js`)
**Location**: `src/js/data/dataStore.js`
**Purpose**: Ensure only markdown is persisted

#### Fixed Implementation (Post MM-174)
```javascript
export function getCurrentState() {
  const notes = Array.from(document.querySelectorAll('.note')).map((noteElement) => {
    const noteContent = noteElement.querySelector('.note-content');
    
    // CRITICAL: Use getCurrentMarkdownContent, never innerHTML
    const content = getCurrentMarkdownContent(noteContent) || 
                   noteContent.dataset.markdown || 
                   noteContent.textContent || '';
    
    return {
      id: noteElement.id,
      content: content,  // Always markdown, never HTML
      left: noteElement.style.left,
      top: noteElement.style.top,
    };
  });
  
  return { notes, connections: getConnections() };
}
```

## Data Flow Patterns

### Content Creation Flow
```
1. User types markdown → Note content element (textContent)
2. Auto-save triggers → getCurrentMarkdownContent() extracts textContent  
3. Storage → defangToPlainText(content, false) cleans content
4. localStorage → Stores sanitized markdown only
```

### Content Display Flow
```
1. Load from storage → Raw markdown content
2. Defang check → defangToPlainText(content, false) 
3. Render → renderMarkdown(content) generates safe HTML
4. Display → innerHTML set to rendered HTML
5. Dataset → data-markdown stores original markdown for extraction
```

### Edit Mode Flow
```
1. Enter edit mode → Switch contentEditable=true
2. Content → textContent shows raw markdown for editing
3. Exit edit mode → getCurrentMarkdownContent() extracts textContent
4. Re-render → Process through render pipeline, update dataset
```

## Robustness Features

### 1. Data Corruption Resistance

#### MM-174 Prevention Layers
1. **Content Extraction**: `getCurrentMarkdownContent()` never returns HTML
2. **Storage Validation**: Only markdown persisted to localStorage  
3. **Render Separation**: HTML generation happens only at display time
4. **Dataset Backup**: `data-markdown` attribute preserves source

#### Corruption Detection
```javascript
// Built into defang pipeline
function migrateLegacyContent(content) {
  const containsHtml = /<|>|&lt;|&gt;|&amp;|&quot;/.test(content);
  
  if (containsHtml) {
    // Legacy HTML detected - convert to markdown safely
    const markdownContent = convertHtmlToMarkdown(htmlContent);
    return { content: markdownContent, wasMigrated: true };
  }
  
  return { content: defangToPlainText(content, false), wasMigrated: false };
}
```

### 2. Security Hardening

#### Input Validation
- **Size limits**: 10KB maximum input prevents DoS attacks
- **Type coercion**: All input converted to string safely
- **Null handling**: Graceful handling of null/undefined input

#### URI Scheme Filtering
```javascript
const DANGEROUS_URI_SCHEMES = /\b(?:javascript|data|vbscript):[^\s]*/gi;

// Removes dangerous URIs from ANY context, not just links
result = result.replace(DANGEROUS_URI_SCHEMES, '');
```

#### HTML Sanitization
- **DOMParser usage**: Browser's native HTML parser for safety
- **Element removal**: Scripts and styles completely removed
- **Attribute stripping**: No attributes ever output in final HTML

### 3. Performance Safeguards

#### Algorithmic Complexity
- **O(n) processing**: Linear time complexity for all operations
- **No regex backtracking**: Manual character-by-character parsing for inline formatting
- **Early termination**: Size limits prevent processing oversized input

#### Memory Management  
- **Streaming processing**: Line-by-line parsing, not full DOM manipulation
- **Limited recursion**: Bounded recursion depth for nested HTML

### 4. Backward Compatibility

#### Legacy Content Migration
The system automatically detects and migrates legacy HTML content:

```javascript
// Auto-detection of legacy HTML content
const containsHtml = /<[^>]+>/.test(content);

if (containsHtml) {
  // Convert legacy HTML to safe markdown
  return convertHtmlToMarkdown(content);
}
```

#### Version Tolerance
- **Graceful degradation**: Unsupported markdown becomes plain text
- **Forward compatibility**: New markdown features can be added safely

## Current Issues & Solutions

### ✅ RESOLVED: Edit Mode Corruption (Critical Fix)
**Problem**: `"* one \n* two"` became italic formatting instead of list when editing existing notes
**Root Cause**: Three functions had dangerous `textContent` fallbacks that returned HTML-derived text with stripped newlines
**Fixed Locations**:
1. `displayAsEditMode()` - lines 52-56 ✅
2. `EditModeController.enterEditMode()` - lines 124-128 ✅  
3. `getCurrentMarkdownContent()` - line 90 ✅

**Solution**: Removed all `textContent` fallbacks. Functions now warn and return empty string rather than corrupted content.

**Visual Enhancement**: Edit mode now uses monospace font with light background to clearly distinguish raw markdown editing from rendered view mode.

### Known Issue 1: Single-Line Multi-Headers
**Problem**: `"# H1 ## H2"` renders only as H1
**Root Cause**: Markdown parser expects headers on separate lines (standard markdown behavior)
**Status**: This is correct behavior per markdown specification. Users should press Enter between headers.

## Testing Strategy

### Regression Tests (MM-174)
**File**: `tests/unit/data/refreshPersistence.test.js`
- **Purpose**: Prevent return of MM-174 data corruption bug
- **Coverage**: Complete refresh cycle simulation
- **Critical**: These tests MUST PASS always

### Security Tests
**File**: `tests/unit/features/markdown/defangPipeline.test.js`
- XSS vector prevention (15+ attack patterns tested)
- Size limit enforcement
- Dangerous URI scheme removal
- HTML injection prevention

### Integration Tests
**Files**: Various pipeline integration tests
- Complete render cycle testing
- Edit/view mode transitions  
- Storage round-trip validation

## Maintenance Guidelines

### Adding New Markdown Features
1. **Security first**: All new features must pass through defang pipeline
2. **Whitelist approach**: Add to allowed tags/formatting explicitly
3. **Test coverage**: Include security and regression tests
4. **Performance**: Verify O(n) complexity maintained

### Debugging Issues
1. **Use test files**: Create focused test cases in `tests/unit/features/markdown/`
2. **Pipeline tracing**: Test each stage independently
3. **Manual validation**: Use debug tools to trace content transformation

### Critical Considerations
- **Never bypass defang**: All user content MUST pass through security pipeline
- **Preserve line structure**: Newlines are critical for markdown parsing
- **Maintain dataset**: Always keep `data-markdown` in sync with display
- **Test refresh cycles**: Any storage changes must be tested across page refreshes

---

*This architecture document is living documentation that should be updated as the markdown system evolves. The security and data integrity patterns established here are foundational to user trust and must be preserved in all future modifications.*