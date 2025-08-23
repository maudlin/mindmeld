# MindMeld Developer Context

*Last Updated: December 22, 2024*

This document provides essential context for developers joining the MindMeld project, summarizing the current state, recent major work, architecture decisions, and key information needed to be productive immediately.

## Project Overview

**MindMeld** is a web-based mind mapping tool built with modern JavaScript/Node.js architecture featuring:

- **Event-driven architecture** with zero circular dependencies
- **Advanced touch/mobile support** with automatic device detection
- **Bootstrap architecture** for clean initialization
- **Comprehensive testing** (444 unit tests + 214 E2E tests)
- **Security-first approach** with ESLint security plugins and pre-commit scanning

**Live Demo**: [mind-meld.co](https://mind-meld.co/)
**Repository**: Modern vanilla JavaScript with no build step required

## Current Project State (December 2024)

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

#### 4. **V1 FINAL EPIC: Markdown Pipeline Completed** ✅ (Commit 277040f, MM-151-156)
- **Achievement**: Complete security-first markdown system implementation
- **Components Delivered**:
  - **MM-154**: miniMarkdown renderer with XSS protection (34 tests)
  - **MM-156**: Comprehensive defang pipeline for HTML sanitization (31 tests)
  - **MM-153**: Canonical storage layer enforcing markdown-only persistence (20 tests)
  - **Infrastructure**: Fixed E2E test state pollution (214 tests now passing)
- **Security Features**: Zero HTML persistence, content sanitization, size limits, validation guardrails
- **Impact**: Foundation for secure note content handling with comprehensive validation

## Current Development Focus

### ✅ **MM-155: Edit/View Mode System - IMPLEMENTED**

**Status**: Implemented with known issues
**Achievement**: Markdown rendering integrated with note system

#### **What's Working:**
- **View mode**: Renders markdown as HTML (headers, bold, italic, lists)
- **Edit mode**: Shows raw markdown when double-clicking notes  
- **Data consistency**: Always stores raw markdown, never HTML
- **Original UX preserved**: Double-click to edit, same interaction patterns
- **Security**: XSS prevention through defang pipeline
- **Tests**: 90+ passing tests covering rendering, security, and integration

#### **Architecture Conflict Identified & Solution Designed:**
- **❗ ROOT CAUSE IDENTIFIED**: Dual interaction systems creating conflicts
  - Legacy `noteEvents.js`: Direct DOM handlers, double-click paradigm, tightly coupled
  - Modern Adapter System: Event-driven, device-aware, loosely coupled via EventBus
  - Both systems compete for same events, causing race conditions and unreliable behavior
  - Markdown DOM mutations break event delegation in legacy system
- **✅ SOLUTION ARCHITECTED**: EditModeController pattern with phased migration
  - Single source of truth for edit state, EventBus-driven communication
  - Preserves device-specific behaviors (desktop single-click, mobile double-tap)
  - Non-breaking migration path maintaining all existing functionality
- **Fixed Issues**:
  - ✅ Height doubling with plain text (fixed by selective rendering)
  - ✅ Data corruption on refresh (fixed by proper markdown storage)
  - ✅ Cursor feedback (restored with CSS)
  - ✅ Accidental deletion prevention (keydown handler added)

**Integration with Completed Pipeline:**
- **Renderer**: Uses completed `miniMarkdownRenderer` for view mode display
- **Storage**: Works with completed `canonicalStorage` for markdown-only persistence  
- **Security**: All content processed through completed `defangPipeline`
- **Mobile Support**: Touch-friendly edit/view toggle for mobile devices

**Remaining V1 Tasks:**
- **MM-155: Implement EditModeController Architecture**
  - **Phase 1**: Create EditModeController with EventBus integration
  - **Phase 2**: Enhance adapters to emit edit requests via EventBus
  - **Phase 3**: Disable and remove legacy noteEvents.js system
  - **Testing**: Comprehensive E2E tests for both desktop and touch modes
- **MM-152: Legacy Migration Pipeline** - One-time HTML → markdown conversion (BLOCKED until MM-155 resolved)
- **MM-160: Data Corruption Resistance** - Additional data layer validation tests

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

#### **Completed Implementation ✅**:

1. **MM-154** (Renderer) - ✅ Complete with 34 tests
2. **MM-156** (Defang Pipeline) - ✅ Complete with 31 tests  
3. **MM-153** (Canonical Storage) - ✅ Complete with 20 tests

#### **Next Implementation Priorities**:

4. **MM-155** (Edit/View Toggle) - UI interaction layer (NEXT)
5. **MM-152** (Legacy Migration) - Backward compatibility  
6. **MM-160** (Data Corruption Resistance) - Additional validation

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
- **E2E Tests**: 100% success rate (214 tests passing)
- **Unit Tests**: 444 tests, 100% passing (including 85 new markdown pipeline tests)
- **Architecture Health**: Grade A+ (no circular dependencies)
- **Security**: All commits scanned, no vulnerable dependencies  
- **Mobile Support**: Full feature parity with desktop
- **Markdown Pipeline**: Core security components complete (renderer, defang, storage)

### V1 Release Criteria
- **Markdown Pipeline**: ✅ Core security implementation complete (MM-154, MM-156, MM-153)  
- **Edit/View Modes**: ⚠️ Implemented but has critical usability issue (MM-155)
- **Zero HTML Injection**: ✅ All content passes through defang pipeline
- **Performance**: ✅ Sub-500ms rendering achieved, O(n) parsing complexity
- **Backward Compatibility**: Legacy HTML migration implementation (MM-152) - PENDING
- **Data Integrity**: Additional corruption resistance testing (MM-160) - PENDING

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

### Immediate V1 Tasks (Status)
1. ✅ **MM-154** - miniMarkdown renderer with comprehensive tests (34 tests)
2. ✅ **MM-156** - defang pipeline with security test coverage (31 tests)  
3. ✅ **MM-153** - canonical storage layer for markdown-only (20 tests)
4. **🔧 MM-155** - Edit/view mode system (SOLUTION READY)
   - ✅ Markdown rendering pipeline works correctly
   - ✅ Root cause identified: Dual interaction systems conflict
   - ✅ Solution designed: EditModeController with EventBus integration
   - **📋 TODO Phase 1**: Implement EditModeController class
   - **📋 TODO Phase 2**: Update adapters to use EventBus for edit requests
   - **📋 TODO Phase 3**: Disable and remove legacy noteEvents.js
5. **MM-152** - Implement legacy HTML migration pipeline (Ready after MM-155 Phase 1)
6. **MM-160** - Add data corruption resistance tests (PENDING)

### Success Validation
- ✅ Core functionality preserved (444 unit tests + 214 E2E tests passing)
- ✅ Zero HTML injection vectors (defang pipeline implemented)
- ⚠️ Edit/view modes have critical usability issue (MM-155)
- ⏳ Legacy mind maps migrate without data loss (MM-152)
- ✅ Performance meets sub-500ms rendering target

## Key Implementation Details (MM-155)

### Architecture Changes
- **noteFactory.js**: Minimal changes, focus/blur handlers added
- **noteEvents.js**: Integrated markdown rendering with double-click edit system
- **editViewMode.js**: Pure display formatter (no event handling)
- **noteService.js**: Loads stored notes in view mode with rendered HTML

### How It Works
1. **Storage**: Always stores raw markdown text
2. **Loading**: Notes load with rendered HTML (view mode)
3. **Editing**: Double-click triggers edit mode (shows raw markdown)
4. **Saving**: Blur event renders HTML and saves markdown

### Root Cause Analysis - Architecture Conflict

**Problem**: Dual interaction systems causing edit mode failures
- **Legacy System** (`noteEvents.js`): Direct DOM handlers, double-click for edit, blur for exit
- **Modern System** (Adapters): Event-driven, device-aware, single-click (desktop) / double-tap (touch)
- **Conflict**: Both systems compete for same events, causing unreliable behavior

**Technical Details**:
- `noteEvents.js` adds listeners directly to note DOM elements (lines 9-65)
- `DesktopAdapter` handles note interactions via pointer events (lines 161-203)
- `TouchAdapter` processes gestures through GestureRecognizer (lines 230-292)
- Markdown rendering changes DOM structure, breaking event delegation

**Why Current Approach Fails**:
1. Event handler registration order creates race conditions
2. DOM mutations from markdown rendering invalidate event targets
3. Focus/blur events fire inconsistently between systems
4. No unified state management for edit mode

## Architectural Solution - Unified Adapter System

### Recommended Approach: EditModeController Pattern

**Core Concept**: Single source of truth for edit mode state, managed through EventBus

```
EditModeController
├── Listens to adapter events (note.requestEdit, note.requestView)
├── Manages markdown rendering pipeline
├── Handles focus/blur lifecycle
└── Emits state changes for UI updates
```

**Benefits**:
- Eliminates event handler conflicts
- Clear separation of concerns
- Platform-specific behaviors preserved
- Non-breaking migration path

### Implementation Strategy

**Phase 1: Create EditModeController**
- New controller class managing edit/view state transitions
- EventBus integration for adapter communication
- Markdown pipeline integration (uses existing defang/render functions)
- Single active edit session enforcement

**Phase 2: Enhance Adapters**
- DesktopAdapter: Emit `note.requestEdit` on content click
- TouchAdapter: Emit `note.requestEdit` on double-tap
- Both: Handle blur/outside-click for edit exit
- Preserve all existing functionality (selection, dragging, connections)

**Phase 3: Retire Legacy System**
- Disable `noteEvents.js` event handlers
- Update `noteFactory.js` to skip `addNoteEventListeners`
- Remove legacy code after validation period

### Key Technical Decisions

1. **Event Flow**: Adapters → EventBus → EditModeController → DOM Updates
2. **State Machine**: VIEW ↔ EDITING with TRANSITIONING state for async operations
3. **Markdown Timing**: Render on blur, not on every keystroke
4. **Focus Management**: Controller owns focus/blur, not individual handlers
5. **Mobile Keyboard**: Explicit trigger in TouchAdapter after edit request

---

*Last Updated: January 23, 2025 - Root Cause Analyzed, EditModeController Solution Architected*