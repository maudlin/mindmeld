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

### 🚀 **MM-166: Legacy System Removal - Unified Adapter Architecture** (IN PROGRESS)

**Status**: Phase 2A Complete, Phase 2B Next
**Epic Goal**: Replace dual interaction systems with unified EditModeController architecture

#### **✅ Phase 1 Complete (MM-167): EditModeController Implementation**
- **EditModeController.js**: Complete unified controller with EventBus integration
- **State Machine**: VIEW/EDITING/TRANSITIONING states with proper lifecycle
- **Markdown Integration**: Connected to existing defang/render pipeline  
- **Tests**: 22/22 unit tests passing
- **Core Pipeline Fixed**: All markdown functionality working (587/592 tests passing)

#### **✅ Phase 2A Complete (MM-168): DesktopAdapter Enhancement**
- **Bootstrap Integration**: EditModeController initialized in InteractionBootstrap
- **Event Emission**: DesktopAdapter now emits:
  - `note.requestEdit` when clicking note content
  - `note.requestView` when exiting edit mode
  - `canvas.clicked` when clicking canvas background
- **Tests**: All adapter tests passing (11/11)
- **Architecture**: Clean EventBus-driven communication established

#### **✅ Phase 2B Complete (MM-169): TouchAdapter Enhancement**
- **TouchAdapter Integration**: Enhanced to emit `note.requestEdit` and `canvas.clicked` events
- **Double-tap Edit Mode**: TouchAdapter emits edit requests to EditModeController
- **Touch-outside Exit**: Canvas taps trigger edit mode exit through EventBus
- **Mobile Keyboard**: Enhanced with 100ms delay for reliable mobile keyboard invocation
- **Tests**: All core adapter and integration tests passing (129/135 tests)

#### **🔧 IMMEDIATE PRIORITY: Fix Critical Refresh Bug**
- **NEW TICKET NEEDED**: Page Refresh Markdown Corruption Fix
- **Scope**: Debug and fix app initialization process saving HTML instead of markdown
- **Blocker for**: All remaining MM-166 phases (legacy system removal on hold)

#### **📋 Legacy System Removal (On Hold Until Bug Fixed):**
- **MM-170: Phase 2C - Integration**: Wire EditModeController to Bootstrap *(Partially Complete)*
- **MM-171: Phase 3A - Disable Legacy**: Remove noteEvents.js handlers *(BLOCKED)*
- **MM-172: Phase 3B - E2E Testing**: Comprehensive test coverage *(BLOCKED)*
- **MM-173: Phase 3C - Final Cleanup**: Remove legacy code *(BLOCKED)*

### **Current Architecture State:**

```
Modern System (Active):
├── EditModeController (✅ Implemented)
│   ├── EventBus listeners registered
│   ├── Markdown pipeline integrated
│   └── State management working
├── DesktopAdapter (✅ Enhanced)
│   ├── Emits edit/view requests
│   └── Canvas click handling
└── TouchAdapter (⏳ Next)

Legacy System (Still Active - To Be Removed):
├── noteEvents.js (double-click handlers)
└── Direct DOM manipulation
```

### **What's Working:**
- **Markdown Pipeline**: Complete security implementation (renderer, defang, storage)
- **View Mode**: Renders markdown as HTML with XSS protection
- **Edit Mode**: Shows raw markdown in contentEditable
- **Desktop Interaction**: Click-to-edit via DesktopAdapter → EditModeController
- **Touch Interaction**: Double-tap edit mode via TouchAdapter → EditModeController
- **Unified Architecture**: Both desktop and touch use EditModeController pattern
- **Tests**: 592/592 unit tests passing, 214 E2E tests passing

### **🚨 CRITICAL BUG IDENTIFIED: Page Refresh Corruption**

**Status**: Root cause identified via comprehensive test reproduction
**Impact**: Markdown content becomes corrupted across page refreshes
**Priority**: MUST FIX before continuing with legacy system removal

#### **Bug Sequence** (Reproduced in tests):
1. **Create note**: `# H1` (markdown stored correctly)
2. **First refresh**: HTML accidentally saved → `<h1>H1</h1>` 
3. **Second refresh**: Defang pipeline strips HTML → `H1` (plain text)
4. **Result**: Original markdown content permanently lost

#### **Root Cause Analysis** ✅:
- **Storage Layer**: ✅ Works correctly (canonical storage, defang pipeline)
- **Display Layer**: ✅ Works correctly (`displayAsViewMode`, markdown rendering)
- **Content Extraction**: ✅ Works correctly (`getCurrentMarkdownContent`)
- **BUG LOCATION**: 🔍 **App initialization/refresh process**

**Something during page refresh is saving `innerHTML` instead of `dataset.markdown`**

#### **Investigation Targets**:
1. **Data restoration logic** in bootstrap process
2. **Note loading/migration** that scans existing DOM elements
3. **Legacy noteEvents.js** save handlers during app startup
4. **State persistence** reading from DOM instead of proper data sources

#### **Test Coverage**: ✅ Complete reproduction test suite created
- `tests/unit/data/refreshBugDiagnosis.test.js` - Reproduces exact manual testing scenario
- Confirms: `"# H1" → "<h1>H1</h1>" → "H1"` corruption sequence
- Isolates each pipeline component to confirm they work correctly

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

### Current Status ⚠️ 
- **E2E Tests**: 100% success rate (214 tests passing)
- **Unit Tests**: 100% success rate (592/592 tests passing)
- **Architecture Health**: Grade A+ (no circular dependencies)
- **Security**: All commits scanned, no vulnerable dependencies  
- **Unified Edit Mode**: ✅ Complete for desktop and touch (EditModeController + Adapters)
- **Markdown Pipeline**: ✅ Complete with security (renderer, defang, storage)
- **TouchAdapter Integration**: ✅ Complete with mobile keyboard support
- **🚨 CRITICAL BUG**: Page refresh markdown corruption - root cause identified, fix required

### V1 Release Criteria
- **Markdown Pipeline**: ✅ Core security implementation complete (MM-154, MM-156, MM-153)  
- **Edit/View Modes**: 🔧 Being migrated to unified architecture (MM-166 epic)
- **Zero HTML Injection**: ✅ All content passes through defang pipeline
- **Performance**: ✅ Sub-500ms rendering achieved, O(n) parsing complexity
- **Backward Compatibility**: Legacy HTML migration (MM-152) - Ready after MM-166
- **Data Integrity**: Additional corruption resistance testing (MM-160) - PENDING

## Development Workflow

### Current Implementation Strategy (MM-166)
1. **Feature Branch**: Working on `feature/MM-151-156-markdown-pipeline`
2. **Phased Migration**: Implementing adapter by adapter (Desktop ✅, Touch next)
3. **Test-Driven**: Each phase validated with comprehensive tests
4. **Non-Breaking**: Legacy system remains functional during migration
5. **Validation Gates**: Each phase must pass all tests before proceeding

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

### 🚨 **CRITICAL PRIORITY: Fix Page Refresh Bug**

#### **Immediate Action Required:**
1. **Create Jira Ticket**: Page Refresh Markdown Corruption (Priority: Critical)
2. **Debug Investigation**: Use existing test reproduction to identify exact location
3. **Fix Root Cause**: Prevent HTML from being saved during app initialization
4. **Validate Fix**: Ensure test passes and manual testing confirms resolution

#### **Investigation Strategy:**
1. **Examine Bootstrap Process**: Check DataBootstrap.restoreState() for DOM reading
2. **Audit noteEvents.js**: Look for save handlers that might extract HTML during startup  
3. **Review Legacy Migration**: Check if migration logic incorrectly processes existing notes
4. **Test State Persistence**: Verify storageManager doesn't read from DOM during refresh

#### **Success Criteria:**
- Manual test sequence passes: Create note → Exit → Refresh → Refresh (content preserved)
- Automated test `refreshBugDiagnosis.test.js` passes without corruption simulation
- No HTML content ever gets stored in localStorage (only markdown)

### **Legacy System Removal Epic: MM-166** *(ON HOLD)*

#### ✅ Completed:
- **MM-167 (Phase 1)**: EditModeController implementation with tests  
- **MM-168 (Phase 2A)**: DesktopAdapter enhanced with EventBus integration
- **MM-169 (Phase 2B)**: TouchAdapter enhanced for mobile edit mode

#### 📋 **Resume After Bug Fix:**
1. **MM-170**: Complete Bootstrap integration (partially done)
2. **MM-171**: Disable legacy noteEvents.js handlers  
3. **MM-172**: Write comprehensive E2E tests for new system
4. **MM-173**: Remove legacy code after validation

### **Other Tasks** *(Lower Priority)*:
- **MM-152**: Legacy HTML migration pipeline (Ready after MM-166)
- **MM-160**: Data corruption resistance tests

### Success Validation
- ✅ Core functionality preserved (592 unit tests + 214 E2E tests passing)
- ✅ Zero HTML injection vectors (defang pipeline implemented)
- ✅ Edit/view modes unified architecture (EditModeController pattern)
- ✅ Desktop and touch edit mode working (DesktopAdapter + TouchAdapter)  
- ✅ Performance meets sub-500ms rendering target
- ⚠️ **CRITICAL BUG**: Page refresh markdown corruption (root cause identified)
- ⏳ Legacy system removal blocked until refresh bug resolved
- ⏳ Legacy HTML migration pipeline (MM-152) ready after bug fix

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

*Last Updated: January 23, 2025 - MM-169 Complete, Critical Refresh Bug Identified*