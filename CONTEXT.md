# MindMeld Developer Context

*Last Updated: August 22, 2025*

This document provides essential context for developers joining the MindMeld project, summarizing the current state, recent major work, architecture decisions, and key information needed to be productive immediately.

## Project Overview

**MindMeld** is a web-based mind mapping tool built with modern JavaScript/Node.js architecture featuring:

- **Event-driven architecture** with zero circular dependencies
- **Advanced touch/mobile support** with automatic device detection
- **Bootstrap architecture** for clean initialization
- **Comprehensive testing** (442 unit tests + 97 E2E tests)
- **Security-first approach** with ESLint security plugins and pre-commit scanning

**Live Demo**: [mind-meld.co](https://mind-meld.co/)
**Repository**: Modern vanilla JavaScript with no build step required

## Current Project State (August 2025)

### ✅ Recent Major Achievements

#### 1. **Complete Mobile Interaction System** (PR #89, MM-161/163/56/44)
- **Achievement**: Comprehensive mobile functionality completion across multiple tickets
- **Key Fixes**:
  - **MM-161**: Fixed mobile keyboard invocation on real devices with enhanced TouchAdapter
  - **MM-163**: Added two-finger pan functionality with EventBus integration
  - **MM-56**: Validated comprehensive mobile testing coverage (442 unit tests, 97 E2E tests)
  - **MM-44**: Completed mobile access epic with capability-driven architecture
- **Impact**: Mobile users now have complete feature parity with desktop, production-ready

#### 2. **Test Suite Recovery & 100% E2E Success** (PR #88, MM-56)
- **Achievement**: All 97 E2E tests now pass reliably (previously had multiple failures)
- **Key Fixes**: 
  - Split large persistence tests to prevent state pollution
  - Standardized desktop mode testing for consistency
  - Enhanced CanvasPage helper with mode-aware utilities
  - Fixed canvas timeouts, connection timeouts, clipboard permissions
- **Impact**: CI/CD pipeline now fully reliable, development velocity significantly improved

#### 3. **Touch Interaction System Overhaul** (PR #87, MM-145)
- **Achievement**: Fixed critical touch regressions and enhanced mobile context menus
- **Key Fixes**:
  - Resolved SVG touch event conflicts with proper CSS pointer-events
  - Fixed TouchAdapter event interception issues
  - Enhanced mobile context menu functionality
- **Added**: 5 new comprehensive test files for touch interactions
- **Impact**: Touch devices now have full feature parity with desktop

## Current Development Focus

### 🚀 **V1 FINAL EPIC: Markdown Pipeline Implementation** (MM-151-156)

**Status**: Ready to implement - comprehensive security and content system overhaul
**Goal**: Replace HTML injection vulnerability with secure, predictable markdown system
**Priority**: Critical for V1 release

#### **Epic Structure**:

**MM-151: Master Implementation Ticket**
- Comprehensive markdown system with 7 core requirements
- Canonical storage, renderer, edit/view modes, security pipeline
- Performance constraints (O(n lines), sub-500ms rendering)

**MM-153: Canonical Markdown Storage**
- Store all notes as raw markdown strings (`''` for empty)
- Zero HTML persistence in state/storage/exports
- Guardrails against HTML creeping into storage layer

**MM-154: Markdown Renderer (Security-First Subset)**
- **Whitelisted tags only**: `h1`, `h2`, `p`, `ul`, `li`, `em`, `strong`
- **Supported syntax**: `#`/`##` headers, `-`/`*`/`•` lists, `*italic*`, `**bold**`
- **Unsupported syntax**: Escaped and displayed as plain text
- **No attributes, inline styles, or arbitrary tags ever**
- Lightweight line-based parser (avoid heavy markdown engines)

**MM-155: Edit vs View Mode Toggle**  
- **View mode (default)**: Rendered HTML, not editable, no caret
- **Edit mode**: Raw markdown in contenteditable, triggered on focus/click
- **Exit**: blur saves → render → return to view mode
- **Future-proof**: Design for Ctrl/Cmd+Enter exit

**MM-156: Defang Pipeline (Security)**
- **Treat all input as hostile**: legacy HTML, paste, imports
- **Defense in depth**: DOMParser + textContent → plain text → markdown
- **Strip**: All tags, attributes, scripts, styles, dangerous URI schemes
- **Preserve**: Text content only through structured conversion

**MM-152: Legacy Migration Pipeline**
- **One-time conversion**: HTML → defang → markdown on load/import  
- **Detection**: `<` or `>` in content = legacy HTML input
- **Process**: DOMParser → textContent → infer structure → canonical markdown
- **Store migration flag**: Avoid re-processing same notes

#### **Security Architecture**:

```javascript
// Input Flow: ANY_INPUT → defang() → toMarkdown() → store → render()
function defangToPlainText(input, isHtml) {
  // 1. Size limit enforcement
  // 2. DOMParser for HTML → textContent extraction  
  // 3. Remove dangerous URI schemes (javascript:, data:)
  // 4. Normalize whitespace, trim
}

function miniMarkdownRenderer(markdown) {
  // 1. Line-based parsing (headers, lists, paragraphs)
  // 2. Inline emphasis (*italic*, **bold**)
  // 3. HTML escaping for all text content
  // 4. Only whitelisted tag output
}
```

#### **Implementation Priorities**:

1. **MM-154** (Renderer) - Core functionality, testable in isolation
2. **MM-156** (Defang Pipeline) - Security foundation
3. **MM-153** (Canonical Storage) - Data layer changes
4. **MM-155** (Edit/View Toggle) - UI interaction layer  
5. **MM-152** (Legacy Migration) - Backward compatibility

#### **Critical Requirements**:

- **Zero HTML injection** - All content passes through defang pipeline
- **Performance** - O(n lines) parsing, <500ms on typical notes
- **Backward compatibility** - Legacy notes migrate seamlessly
- **Edit UX** - Smooth toggle between raw markdown and rendered view
- **Mobile support** - Edit/view mode works on touch devices

### 🎯 **MM-160: Data Layer Corruption Resistance**
**Goal**: Replace misplaced E2E corruption test with proper data layer validation
**Scope**: Unit tests for localStorage corruption scenarios, integration tests for DataBootstrap
**Priority**: Medium (data integrity foundation)

## Architecture Deep Dive

### Bootstrap System
```
DataBootstrap → ServiceBootstrap → UIBootstrap → InteractionBootstrap
```
- **Clean initialization** with dependency injection
- **Zero circular dependencies** (monitored automatically)
- **Health scoring system** (90-100 = excellent)

### Event-Driven Core
- **EventBus**: Central communication hub (`src/js/core/eventBus.js`)
- **Service Layer**: Business logic (`noteService`, `colorService`, `connectionService`)
- **Feature Modules**: UI components (`colorPicker`, `note`, `connection`)

### Mobile/Touch Excellence
- **Automatic Detection**: `CapabilityDetector` routes to optimal adapter
- **TouchAdapter Features**: Long-press, pinch-zoom, two-finger pan, jiggle animations
- **Ghost Connector Enhancements**: Larger touch targets, visual feedback
- **Documentation**: Comprehensive touch patterns in `docs/mobile-interaction-patterns.md`

## File Structure
```
src/js/
├── app.js                    # Main entry (2 dependencies only!)
├── core/
│   ├── bootstrap/           # Initialization architecture
│   ├── eventBus.js          # Central communication
│   └── config.js            # Configuration
├── services/                # Business logic layer
├── features/                # UI components & interactions
│   ├── note/               # Note creation, editing, rendering
│   └── markdown/           # [NEW] Markdown pipeline components
├── interactions/            # Input adapters & gesture system
├── data/                    # State management & persistence
└── utils/                   # Utilities & mobile helpers
```

## Quality Gates & Success Metrics

### Current Status ✅
- **E2E Tests**: 100% success rate (97 tests passing)
- **Unit Tests**: 442 tests, 100% passing
- **Architecture Health**: Grade A+ (no circular dependencies)
- **Security**: All commits scanned, no vulnerable dependencies
- **Mobile Support**: Full feature parity with desktop

### V1 Release Criteria
- **Markdown Pipeline**: Complete security implementation (MM-151-156)
- **Zero HTML Injection**: All content passes through defang pipeline  
- **Performance**: Sub-500ms rendering, O(n) parsing complexity
- **Backward Compatibility**: Legacy HTML notes migrate seamlessly
- **Data Integrity**: Corruption resistance testing (MM-160)

## Development Workflow

### V1 Implementation Strategy
1. **Create feature branch**: `feature/MM-151-156-markdown-pipeline`
2. **TDD Approach**: Write tests first for each component
3. **Security First**: Implement defang pipeline before storage changes
4. **Incremental Integration**: Component-by-component with full test coverage
5. **Migration Testing**: Validate legacy HTML → markdown conversion

### Testing
```bash
# V1 Markdown Pipeline Testing
npm run test:unit -- --testNamePattern="markdown|defang"
npm run test:e2e:critical  # Core functionality validation
npm run security           # Pre-commit security scanning
```

## Critical Knowledge for V1 Development

### Markdown Security Patterns
```javascript
// NEVER trust input - always defang first
const safeMarkdown = defangToPlainText(userInput, isLegacyHtml);
const html = renderMarkdown(safeMarkdown); // Only whitelisted tags
element.innerHTML = html; // Safe after double-sanitization
```

### Edit/View Mode Implementation
```javascript
// View mode: rendered HTML, not editable
noteElement.innerHTML = renderMarkdown(markdown);
noteElement.contentEditable = false;

// Edit mode: raw markdown, editable
noteElement.textContent = markdown; // No HTML rendering
noteElement.contentEditable = true;
```

### Legacy Migration Safety
```javascript
// One-time migration on load
if (!note.migrated && containsHtml(note.content)) {
  note.content = migrateHtmlToMarkdown(note.content);
  note.migrated = true;
  saveNote(note);
}
```

## Next Developer Actions

### Immediate V1 Tasks (In Order)
1. **Start MM-154** - Implement miniMarkdown renderer with comprehensive tests
2. **Implement MM-156** - Build defang pipeline with security test coverage  
3. **Update MM-153** - Modify storage layer for canonical markdown
4. **Build MM-155** - Create edit/view mode toggle system
5. **Complete MM-152** - Implement legacy HTML migration
6. **Validate MM-160** - Add data corruption resistance tests

### Success Validation
- All existing functionality preserved
- Zero HTML injection vectors remain
- Mobile edit/view modes work flawlessly  
- Legacy mind maps migrate without data loss
- Performance meets sub-500ms rendering target

**The project is positioned for a secure, robust V1 release with the markdown pipeline implementation.**

---

*This document should be updated when the V1 markdown pipeline is completed.*