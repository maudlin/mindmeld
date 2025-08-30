# MindMeld Testing Guide

## Overview

This comprehensive guide covers all testing approaches, patterns, and best practices for the MindMeld mind mapping application. Tests are organized into unit tests and end-to-end (E2E) tests using Jest and Playwright respectively.

**📅 Last Updated**: August 2025  
**🏗️ Architecture**: Refactored with shared Page Object Model + Event Bus foundation tests  
**🚀 Status**: V1 Feature Complete - Enterprise-grade data integrity with comprehensive test coverage

## Quick Start

```bash
# Run all tests locally
npm test && npm run test:e2e

# Run specific test types
npm run test:unit          # Jest unit tests
npm run test:e2e           # Playwright E2E tests

# Debug and development
npx playwright test --debug   # Interactive debugging
npx playwright test --headed  # See browser during tests
```

For suite options (CI/dev/smoke/critical), tag usage, and full command references, see [Testing Environments](./testing-environments.md).

## Test Philosophy & Design Strategy

MindMeld follows established testing best practices including the **Test Pyramid** (Martin Fowler) and **Testing Trophy** (Kent C. Dodds) patterns for optimal test architecture:

### Test Types and Purpose

**Unit Tests**: Core algorithms, data transformations, utility functions  
**E2E Tests**: Complete user workflows, UI interactions, browser integration  
**Integration Tests**: Event bus communication, service coordination  
**Regression Tests**: Critical bug prevention - prevent return of specific resolved issues

### Test Pyramid Architecture

#### **Atomic Tests (Base of Pyramid) - 70%**
- **One behavior per test** - easier debugging, faster feedback
- **Examples**: Note creation, note selection, note deletion
- **Benefits**: Precise failure diagnosis, quick fixes

#### **Integration Tests (Middle) - 20%**  
- **2-3 related behaviors** - catch interaction issues
- **Examples**: Edit workflows, connection creation
- **Benefits**: Detect interface problems between components

#### **Smoke Tests (Top) - 10%**
- **End-to-end user journeys** - catch regressions quickly  
- **Examples**: Complete user workflows, template switching
- **Benefits**: High confidence in overall system health

### Practical Benefits

**When atomic test fails**: "Delete key doesn't work" - precise, quick fix  
**When integration test fails**: "Edit mode and selection don't play well together" - focused scope  
**When smoke test fails**: "Something broke in the core workflow" - broader investigation needed

## Test Structure

```
tests/
├── README.md                          # Legacy - being replaced by this guide
├── e2e/                              # End-to-end tests (Playwright)
│   ├── atomic/                       # Single-behavior tests
│   │   └── note-deletion-simple.spec.js # Create → select → delete
│   ├── smoke/                       # End-to-end user journeys
│   │   └── note-operations.spec.js   # Complete CRUD workflow
│   ├── helpers/
│   │   └── CanvasPage.js             # 🆕 Shared Page Object Model
│   ├── basic.spec.js                 # Page loading and basic functionality
│   ├── note-connections.spec.js      # Note connection functionality
│   ├── multi-select-notes.spec.js    # Multi-select and group operations
│   ├── canvas-template-switching.spec.js.disabled # TODO: Re-enable template switching tests
│   ├── menu-functionality.spec.js    # 🆕 Menu operations and import/export (12 tests)
│   ├── desktop-zoom-test.spec.js     # ✨ Desktop zoom functionality tests
│   ├── touch-*.spec.js              # Touch interaction tests
│   └── [TODO: integration/ folder]  # Multi-behavior workflow tests needed
└── unit/                             # Unit tests (Jest)
    ├── core/
    │   ├── eventBus.test.js          # 🆕 Event Bus comprehensive tests (20 tests, 100% coverage)
    │   └── uiSetup.test.js           # 🆕 Menu UI setup and button handlers (15+ tests)
    ├── data/
    │   ├── clearState.test.js        # 🆕 Clear state functionality tests (15 tests)
    │   ├── exportImportData.test.js  # 🆕 Export/import data transformation (20+ tests)
    │   └── refreshPersistenceRegression.test.js # Critical data corruption prevention
    ├── features/
    │   ├── note/
    │   │   └── noteCreation.test.js
    │   └── zoom/
    │       └── zoomManager.test.js
    ├── interactions/                   # ✨ Touch and input adapter tests
    │   ├── adapters/
    │   │   ├── BaseAdapter.test.js      # Base adapter tests
    │   │   ├── DesktopAdapter.test.js   # Desktop interaction tests
    │   │   └── [TODO: TouchAdapter.test.js] # Touch adapter tests needed
    │   ├── behaviors/                   # Interaction behavior tests
    │   │   ├── DragBehavior.test.js
    │   │   ├── NoteBehavior.test.js
    │   │   └── SelectionBoxBehavior.test.js
    │   ├── capabilities/
    │   │   └── detector.test.js         # Device capability detection
    │   └── gestures/
    │       ├── GestureRecognizer.test.js # Gesture recognition tests
    │       └── TouchState.test.js       # Touch state management
    └── utils/
        └── utils.test.js
```

### Test Organization Guidelines

- **Atomic folder**: Single-behavior tests for development/debugging
- **Integration folder**: Multi-behavior workflows for component interaction testing  
- **Smoke folder**: End-to-end journeys for CI confidence and regression detection
- **Root e2e folder**: Legacy tests being migrated to new structure

## Critical Regression Tests

### MM-174: Page Refresh Markdown Corruption Prevention

**File**: `tests/unit/data/refreshPersistenceRegression.test.js`  
**Purpose**: Prevents regression of critical data loss bug where page refreshes corrupted markdown content  
**Critical Nature**: ⚠️ **MUST PASS** - Failure indicates potential data loss for users

**Bug History**:
- **Issue**: `getCurrentState()` was reading `innerHTML` (HTML) instead of stored markdown during page refreshes
- **Impact**: Progressive corruption: `# H1` → `<h1>H1</h1>` → `H1` (data permanently lost)
- **Fix**: Modified `getCurrentState()` to use `getCurrentMarkdownContent()` instead of `innerHTML`

**Test Coverage**:
- ✅ Validates `getCurrentState()` never returns HTML content
- ✅ Simulates complete refresh cycles to ensure markdown preservation
- ✅ Tests multiple refresh cycles to prevent progressive degradation
- ✅ Validates supporting pipeline components (defang, render, storage)

**When This Test Fails**:
1. **STOP IMMEDIATELY** - Do not merge/deploy code that fails this test
2. **Investigate**: Check if `getCurrentState()` has been modified to read from DOM
3. **Validate**: Ensure the fix in `dataStore.js` is still present
4. **Test Manually**: Use `test-refresh-fix.html` for manual validation

## Architecture Overview

### 🆕 Event Bus Testing Foundation (July 2025)

The event bus (`src/js/core/eventBus.js`) is now comprehensively tested with production-ready enhancements:

- **20 unit tests** covering all functionality with 100% code coverage
- **Error resilience** - failed listeners don't crash other listeners
- **Memory cleanup** - automatic cleanup prevents memory leaks
- **Performance validated** - tested with 1000+ listeners efficiently
- **Production ready** with console error logging for debugging

### 🆕 Menu Functionality Testing Foundation (July 30, 2025)

Complete menu functionality is now comprehensively tested with both E2E and unit test coverage:

**E2E Testing (`menu-functionality.spec.js`)**:
- **12 comprehensive E2E tests** covering all menu operations
- Navigation menu structure validation and dropdown accessibility
- Clear canvas functionality with confirmation dialogs and cancellation
- Import/export workflows including file operations and clipboard handling
- Error scenario testing for clipboard failures and invalid data

**Unit Testing (New test suites)**:
- **UI Setup Tests** (`uiSetup.test.js`) - Button event handlers and DOM interaction
- **Data Transformation Tests** (`exportImportData.test.js`) - JSON export/import logic validation
- **State Management Tests** (`clearState.test.js`) - Clear operations and localStorage handling

**Key Bug Fixes Covered**:
- Fixed broken clear canvas button (ID mismatch)
- Added missing clipboard export/import functionality
- Corrected export/import button selectors to match actual HTML IDs
- Enhanced error handling for clipboard access failures

### Shared Page Object Model (January 2025 Refactor)

All E2E tests now use a unified `CanvasPage` class located in `tests/e2e/helpers/CanvasPage.js`. This eliminates ~400 lines of duplicated code and provides:

- **Single source of truth** for all canvas interactions
- **Consistent API** across all test files
- **Built-in timing handling** for reliable test timing
- **Standard test coordinates** for reliable positioning
- **Template switching methods** for canvas template tests

#### Key Benefits for Future Engineers

✅ **Maintainability**: Canvas interaction changes only need one update  
✅ **Reliability**: Automatic timing handling prevents test flakiness
✅ **Consistency**: All tests use same patterns and coordinates  
✅ **Extensibility**: Easy to add new test methods to shared class

#### Using the Shared CanvasPage

```javascript
import { test, expect } from '@playwright/test';
import { CanvasPage, TestCoordinates } from './helpers/CanvasPage.js';

test('My new test', async ({ page }) => {
  const canvasPage = new CanvasPage(page);

  await canvasPage.load(); // Standard app loading

  // Create notes with automatic timing handling
  const note1 = await canvasPage.createNote(
    TestCoordinates.note1.x,
    TestCoordinates.note1.y,
  );

  // All canvas operations available
  await canvasPage.switchToTemplate("Hero's Journey");
  await canvasPage.connectNotes(note1, note2);
  await canvasPage.verifyTemplate("Hero's Journey");
});
```

## Unit Testing (Jest)

Focus on pure functions and business logic. Avoid complex DOM testing - use E2E instead.

```javascript
// Good: Test pure functions and service logic
test('calculates note position correctly', () => {
  expect(calculatePosition(100, 200, canvas)).toEqual({ x: 100, y: 200 });
});

test('validates color schemes', () => {
  expect(ColorService.isValidColor('pink')).toBe(true);
  expect(ColorService.isValidColor('invalid')).toBe(false);
});

// Good: Test DOM behavior with mocked dependencies
test('updates active color swatch', () => {
  // Use test utilities and mocked event bus
  const mockEventBus = createMockEventBus();
  // Test isolated component behavior
});

// Avoid: Complex full-page DOM manipulation (use E2E)
```

### Key Unit Testing Patterns

**Event Bus**: Comprehensive event emission/handling with error isolation  
**Service Layer**: Business logic with dependency injection patterns  
**Connection System**: Complete SVG-based connection testing with DOM integration  
**Factory Functions**: Pure function testing for note creation and DOM manipulation  
**Storage Manager**: Event-driven data persistence and state management  
**Error Handling**: Comprehensive edge cases, failure recovery, and cascade prevention

## End-to-End Testing (Playwright)

Tests complete user workflows across Chrome, Firefox, and Safari. Use the `CanvasPage` helper for consistent interactions.

### Critical Application Behaviors

#### 1. Test Timing for Note Creation ⚠️

**Background**: Rapid note creation in tests can be unreliable due to double-tap gesture detection timing (300ms window) and DOM update delays. The app enforces a 500ms double-click throttle for note creation.

**Solution**: CanvasPage helper automatically handles timing between note creations with 600ms waits locally and 800-1000ms waits in CI

```javascript
// ✅ Use CanvasPage helper - handles timing automatically
const note1 = await canvasPage.createNote(400, 300);
const note2 = await canvasPage.createNote(700, 300); // Automatic 600ms wait

// ❌ Don't use raw double-clicks without timing
await page.mouse.dblclick(400, 300);
await page.mouse.dblclick(700, 300); // May fail
```

#### 2. Ghost Connector Behavior

**Issue**: Ghost connectors (blue connection points) only appear on note hover
**Solution**: Always hover over source note before attempting connections

```javascript
async connectNotes(sourceNote, targetNote) {
  await sourceNote.hover(); // Reveals ghost connectors
  const ghostConnector = sourceNote.locator('.ghost-connector').first();
  await ghostConnector.dragTo(targetNote);
}
```

#### 3. SVG Connection Verification

**Issue**: Connection paths may be in DOM but not "visible" due to CSS styling
**Solution**: Use `toBeAttached()` instead of `toBeVisible()` for SVG elements

```javascript
// ✅ Reliable approach
await expect(connectionPath).toBeAttached();

// ❌ May fail due to CSS
await expect(connectionPath).toBeVisible();
```

#### 4. Selection Box Coordinate Precision ⚠️

**Issue**: Selection boxes must fully encompass note bounding boxes for selection to work
**Solution**: Use larger selection boxes that extend well beyond note boundaries

```javascript
// ❌ Too small - may not select notes
await createSelectionBox(250, 200, 550, 300);

// ✅ Larger box ensures full note containment
await createSelectionBox(400, 200, 800, 350);
```

#### 5. Multi-Select Group Movement

**Issue**: Moving selected notes requires dragging any selected note, not the selection box
**Solution**: Get first selected note and perform drag operation on it

```javascript
async moveSelectedNotes(deltaX, deltaY) {
  const selectedNotes = await this.getSelectedNotes();
  const selectedNote = selectedNotes.first();
  // Drag the note (this moves all selected notes together)
  await selectedNote.hover();
  // ... drag operation
}
```

### DOM Element Reference

#### Core Selectors

```javascript
// Canvas and containers
canvas: '#canvas';
canvasContainer: '#canvas-container';
svgContainer: '#svg-container';

// Notes
notes: '.note';
selectedNotes: '.note.selected';
noteContent: '.note-content';

// Connections
ghostConnectors: '.ghost-connector';
connectionGroups: 'g[data-start][data-end]';
connectionPaths: 'g[data-start][data-end] path';

// UI Elements
selectionBox: '#selection-box';
canvasStyleDropdown: '#canvas-style-dropdown';
```

#### Data Attributes

Connection elements store important metadata:

```javascript
connectionGroup.getAttribute('data-start'); // Source note ID
connectionGroup.getAttribute('data-end'); // Target note ID
connectionGroup.getAttribute('data-type'); // Connection type
```

### Page Object Model Pattern

#### CanvasPage Class Structure

```javascript
class CanvasPage {
  constructor(page) {
    this.page = page;
    this.canvas = page.locator('#canvas');
    this.note = page.locator('.note').first();
  }

  async load() {
    await this.page.goto('http://localhost:8080');
    await expect(this.canvas).toBeVisible();
  }

  async createNoteAt(x, y) {
    await this.page.mouse.dblclick(x, y);
    await expect(this.page.locator('.note').last()).toBeVisible();
    return this.page.locator('.note').last();
  }

  async connectNotes(sourceNote, targetNote) {
    await sourceNote.hover();
    const ghostConnector = sourceNote.locator('.ghost-connector').first();
    await ghostConnector.dragTo(targetNote);
  }
}
```

### Standard Test Coordinates

Use these well-spaced coordinates for consistent multi-note tests:

```javascript
const testPositions = {
  note1: { x: 400, y: 300 },
  note2: { x: 700, y: 300 },
  note3: { x: 400, y: 600 },
  note4: { x: 700, y: 600 },
};

// Empty canvas areas for selection box operations
const emptyAreas = {
  topLeft: { x: 200, y: 200 },
  center: { x: 640, y: 400 },
};
```

## 📱 Touch Interaction Testing (TouchAdapter System)

MindMeld's TouchAdapter system requires specific testing patterns for advanced touch interactions. Tests should verify both the legacy touch system and the enhanced TouchAdapter mode.

**TODO**: Comprehensive TouchAdapter unit tests needed (see missing TouchAdapter.test.js above).

### Touch Mode Test Setup

```javascript
// Loading app in Touch Mode
test('TouchAdapter gesture behavior', async ({ page }) => {
  await page.goto('http://localhost:8080/?mode=touch');
  await page.waitForTimeout(1000); // Allow TouchAdapter initialization

  // Test TouchAdapter-specific interactions
});

// Verifying TouchAdapter is active
const isUsingTouchAdapter = await page.evaluate(() => {
  return new URLSearchParams(window.location.search).get('mode') === 'touch';
});
```

### Key Touch Interaction Test Patterns

**Single-Finger Drag Lasso Selection:**

```javascript
test('Single-finger drag creates lasso selection', async ({ page }) => {
  await page.goto('http://localhost:8080/?mode=touch');

  // Create notes for selection
  const canvasPage = new CanvasPage(page);
  const note1 = await canvasPage.createNote(400, 300);
  await page.waitForTimeout(800);
  const note2 = await canvasPage.createNote(600, 300);

  // Test single-finger drag lasso
  await page.mouse.move(350, 250);
  await page.mouse.down();
  await page.mouse.move(650, 350);
  await page.mouse.up();

  // Verify selection
  await expect(page.locator('.note.selected')).toHaveCount(2);
});
```

**Press-Hold-Drag Note Movement:**

```javascript
test('Press-hold-drag moves notes in touch mode', async ({ page }) => {
  await page.goto('http://localhost:8080/?mode=touch');

  const canvasPage = new CanvasPage(page);
  const note = await canvasPage.createNote(400, 300);

  // Test press-hold-drag (wait for long-press detection)
  await page.mouse.move(400, 300);
  await page.mouse.down();
  await page.waitForTimeout(500); // Long-press threshold
  await page.mouse.move(500, 400);
  await page.mouse.up();

  // Verify note moved
  const noteBox = await note.boundingBox();
  expect(noteBox.x).toBeGreaterThan(450);
});
```

### Touch vs Desktop Mode Isolation

```javascript
test.describe('Touch vs Desktop Isolation', () => {
  test('Desktop mode uses DesktopAdapter', async ({ page }) => {
    await page.goto('http://localhost:8080'); // No touch mode

    // Verify DesktopAdapter behaviors
    // - Right-click drag for canvas pan
    // - Immediate drag for multi-select lasso
    // - No long-press requirements
  });

  test('Touch mode uses TouchAdapter', async ({ page }) => {
    await page.goto('http://localhost:8080/?mode=touch');

    // Verify TouchAdapter behaviors
    // - Two-finger drag for canvas pan
    // - Single-finger drag for lasso
    // - Long-press for note movement
  });
});
```

## 🔒 Security Testing Framework

### Shift-Left Security Implementation

MindMeld implements comprehensive security testing with immediate developer feedback through pre-commit hooks and automated security scanning.

### Security Tools & Coverage

#### ESLint Security Plugins

- **eslint-plugin-security**: Detects security vulnerabilities and anti-patterns
- **eslint-plugin-no-unsanitized**: Prevents XSS attacks through DOM manipulation

#### Security Rules Active

```javascript
// Detected security issues include:
- Unsafe dynamic imports
- Object injection vulnerabilities
- Non-literal regex construction
- Unsanitized DOM methods (innerHTML, outerHTML)
- Unsafe eval() usage
- Weak cryptographic functions
- Hardcoded secrets detection
```

### Pre-commit Security Hooks

Automated security scanning runs on every commit via **Husky + lint-staged**:

```bash
# Pre-commit flow (automatic):
1. Developer commits code
2. Husky triggers pre-commit hook
3. lint-staged runs security checks on staged files
4. ESLint security rules scan for vulnerabilities
5. Prettier formats code
6. Commit proceeds only if security checks pass
```

### Security Command Reference

```bash
# Manual security scanning
npm run security           # Run security-focused ESLint rules
npm run security:fix       # Auto-fix security issues where possible

# Development workflow
git add src/js/newFile.js  # Stage changes
git commit -m "Add feature" # Triggers automatic security scan
```

## Timing & Wait Strategies

### Critical Wait Times

- **Note Creation**: 600ms between rapid creations (test stability, not app throttle)
- **Ghost Connectors**: Brief hover before interaction
- **DOM Updates**: Use `toBeAttached()` for element verification
- **Animations**: Allow time for connection drawing

### Recommended Wait Patterns

```javascript
// Element attachment verification
await expect(element).toBeAttached();

// Test timing for reliable note creation
const note1 = await canvasPage.createNote(400, 300); // Handles timing automatically

// Network stability on load
await page.goto(url, { waitUntil: 'networkidle' });
```

## Test Implementation Guidelines

### For Multi-Select Tests

- **Selection Box**: Click and drag on empty canvas areas (not on notes)
- **Coordinate Precision**: Make selection boxes larger than expected to ensure full note containment
- **Multiple Selection**: Verify `.selected` class on target notes
- **Group Movement**: Test that relative positioning is maintained after dragging any selected note
- **Edge Cases**: Empty selections, partial selections, overlapping selection areas

### For Canvas Template Tests

- **Template Switching**: Use dropdown menu in navbar
- **DOM Cleanup**: Verify no artifacts remain from previous templates
- **Layout Verification**: Check for template-specific elements
- **Note Preservation**: Ensure existing notes remain after template switch

### Debugging Techniques

```javascript
// Pause for manual inspection
await page.pause();

// Screenshot on failure
await page.screenshot({ path: 'debug-screenshot.png' });

// Element information
console.log('Bounding box:', await element.boundingBox());
console.log('Note count:', await page.locator('.note').count());
```

## Test Coverage Status

### ✅ Completed (6/6 - 100%) 🎯

- **Setup & Configuration**: Playwright infrastructure
- **Basic Functionality**: Page loading, element visibility
- **Note Operations**: Create, edit, move, delete notes
- **Note Connections**: Create connections via ghost connectors
- **Multi-Select Operations**: Selection box and group movement
- **Canvas Template Switching**: Template dropdown and layout changes ✨

### 📊 Test Metrics

**Unit Tests**: Comprehensive test suite covering:

- **MM-160 Data Corruption Resistance Epic**: Enterprise-grade data integrity testing
  - Storage quota exhaustion handling
  - Browser compatibility testing (Chrome, Safari, Edge support)
  - Data corruption recovery scenarios
  - Session integrity and multi-tab consistency
- Core architecture, event bus, services, and business logic
- Touch/desktop interaction adapters and gesture recognition
- Data integrity, export/import, and state management

**E2E Tests**: Core user workflows (basic, note operations, connections, multi-select, template switching, menu, touch, zoom)

**TODO**: Add comprehensive TouchAdapter unit test coverage for the interaction system

## Configuration Files

### Playwright Configuration

```javascript
// playwright.config.js
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  webServer: {
    command: 'npm start',
    url: 'http://localhost:8080',
    reuseExistingServer: true,
  },
});
```

### Jest Configuration

```javascript
// jest.config.js
export default {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests/unit'],
  transform: {
    '^.+\\.js': 'babel-jest',
  },
};
```

## Advanced Testing Patterns

### Device Detection Testing

```javascript
// Test automatic device detection
test('CapabilityDetector routes to correct adapter', () => {
  const detector = new CapabilityDetector();

  // Mock touch-first device
  Object.defineProperty(window, 'matchMedia', {
    value: jest.fn(() => ({ matches: true })),
  });

  expect(detector.getOptimalInputMode()).toBe('touch');
});
```

### Touch-Specific E2E Testing

```javascript
// Test enhanced touch interactions
test('Touch device shows jiggle animation on long press', async ({ page }) => {
  // Set mobile viewport and CSS environment
  await page.setViewportSize({ width: 375, height: 667 });
  await page.addStyleTag({
    content:
      '@media (pointer: coarse) { .note.jiggle { animation: noteJiggle 0.3s; } }',
  });

  const canvasPage = new CanvasPage(page);
  const note = await canvasPage.createNote(400, 300);

  // Simulate long press with timing
  await page.touchStart(note);
  await page.waitForTimeout(500); // Long press threshold

  await expect(page.locator('.note.jiggle')).toBeVisible();

  // Test animation cleanup
  await page.touchEnd(note);
  await page.waitForTimeout(100);
  await expect(page.locator('.note.jiggle')).not.toBeVisible();
});
```

### Performance Testing

**Memory Leak Detection:**

```javascript
// Test adapter cleanup prevents memory leaks
test('TouchAdapter properly cleans up event listeners', async () => {
  const touchAdapter = new TouchAdapter();
  const mockCanvas = document.createElement('div');

  await touchAdapter.init(mockEventBus);
  touchAdapter.canvas = mockCanvas;

  // Track event listeners
  const initialListeners = getEventListenerCount(mockCanvas);

  await touchAdapter.initializeEventListeners();
  const afterInitListeners = getEventListenerCount(mockCanvas);

  expect(afterInitListeners).toBeGreaterThan(initialListeners);

  // Cleanup
  await touchAdapter.destroyEventListeners();
  const finalListeners = getEventListenerCount(mockCanvas);

  expect(finalListeners).toBe(initialListeners);
});
```

## Test Utilities

### E2E Helpers

**CanvasPage** and **TestCoordinates** from `tests/e2e/helpers/` for consistent E2E interactions

**Touch Testing**: CanvasPage includes touch-specific methods:
- `simulateTouchGesture()` - Multi-touch gesture simulation
- `testTouchMode()` - Load app in touch mode (?mode=touch)
- `verifyTouchInteraction()` - Touch-specific assertions

### Unit Test Helpers

**colorTestUtils.js** provides:
- `createMockEventBus()` - Mock event bus for isolated testing
- `createTestNote()` - Generate test DOM elements with color classes
- `createColorPickerDOM()` - Build color picker structure for testing
- `simulateClick()`, `simulateKeyboard()` - Event simulation utilities
- `expectSwatchActive()` - Color picker state assertions

## Test Naming and Structure Standards

### File Naming Convention

- **Unit tests**: `[component].[context].test.js` (e.g., `connectionManager.behavior.test.js`, `colorPicker.integration.test.js`)
- **E2E tests**: `[feature-name].spec.js` with kebab-case (e.g., `note-operations.spec.js`)

### Test Structure Pattern

```javascript
/**
 * [Component] [Test Type] Tests
 *
 * [Brief description of behaviors being tested]
 * Focus on [specific testing aspects]
 */

describe('[Component] [Human-Readable Context]', () => {
  describe('[Feature Category]', () => {
    it('[behavioral description without "should"]', () => {
      // Test implementation
    });
  });
});
```

### Naming Guidelines

- **Describe blocks**: Use human-readable titles that explain _what_ is being tested
- **Test descriptions**: Focus on user-observable behaviors, avoid "should" prefix
- **Documentation**: Include file-level comments explaining test purpose and focus

## Best Practices

### Test Design

- **Independence**: Each test should run in isolation
- **Reliability**: Tests should pass consistently (>95% success rate)
- **Performance**: Individual tests should complete under 30 seconds
- **Maintainability**: Use page objects and reusable utilities

### Error Handling

- Always verify prerequisite conditions before actions
- Use descriptive error messages in assertions
- Handle timing issues with proper waits
- Design for both positive and negative test cases

### Code Quality

- Follow ESLint formatting requirements
- Use meaningful variable and method names
- Comment complex interactions and workarounds
- Document browser-specific behaviors

### Security Practices

- **Pre-commit scanning**: All code automatically scanned for security issues
- **Secure coding patterns**: Follow security plugin recommendations
- **No hardcoded secrets**: Use environment variables or secure vaults
- **Input validation**: Always validate user inputs and dynamic content
- **Safe DOM manipulation**: Use `textContent` instead of `innerHTML` when possible

## Troubleshooting

### Common Issues

1. **Note creation fails**: Use CanvasPage.createNote() which handles timing automatically
2. **Connection tests fail**: Verify ghost connector hover
3. **SVG elements not found**: Use `toBeAttached()` instead of `toBeVisible()`
4. **Flaky tests**: Add appropriate waits for DOM updates
5. **"Notes created at same position"**: Missing `waitForTimeout(800)` between creations
6. **"Browser context closed"**: Avoid direct DOM manipulation, use helper methods
7. **Tests pass locally, fail in CI**: Add `waitForTimeout(1000)` after page load

### Performance Tips

- Reuse browser contexts when possible
- Use specific selectors to reduce search time
- Minimize unnecessary waits and timeouts
- Run tests in parallel for faster feedback

### CI-Specific Issues

For CI-specific stability tips and environment differences, see [CI vs Local E2E Troubleshooting](ci-e2e-troubleshooting.md).

**Timing issues**: Use `await expect().toBeVisible()` not arbitrary waits (except for throttling)  
**Flaky tests**: Usually caused by missing throttle delays between note operations  
**Performance**: Run specific test files for faster feedback  
**CI failures**: Check if local tests pass - CI failures often need stability delays

## 🚨 Known Issues & Solutions

### Intermittent Test Failures

**Issue**: `note-connections.spec.js` occasionally fails during parallel execution  
**Cause**: Resource contention when multiple tests run simultaneously  
**Status**: Intermittent in parallel execution

**Solutions for Future Engineers**:

1. **Quick Fix**: Run failed tests individually - they pass reliably in isolation
2. **Medium Term**: Reduce Playwright worker count in `playwright.config.js`
3. **Long Term**: Implement better test isolation or sequential execution for sensitive tests

**Current Status**: Playwright config already implements `fullyParallel: !process.env.CI` to reduce parallelism in CI environments.

## 🛠️ Maintenance Guidelines

### Adding New Canvas Features

When MindMeld adds new canvas functionality:

1. **Add methods to CanvasPage.js** - Don't duplicate in test files
2. **Use TestCoordinates** - Don't hardcode positions
3. **Handle timing** - Use `createNote()` method which handles timing automatically
4. **Follow existing patterns** - Check similar tests for consistency
5. **Test interaction modes** - Verify both Desktop and Touch modes where applicable
6. **Check gesture conflicts** - Ensure new features don't interfere with existing gestures

### Canvas Template Extensions

For new canvas templates:

1. **Add template verification** - Extend `verifyTemplate()` method
2. **Add cleanup verification** - Extend `verifyTemplateCleanup()` method
3. **Update template class map** - Add new template mapping
4. **Test element detection** - Verify unique template elements

**TODO**: Re-enable canvas-template-switching.spec.js (currently disabled)

### Performance Considerations

- Tests run in parallel by default
- Each test gets a fresh browser context
- Use `page.waitForFunction()` instead of arbitrary timeouts

## 📋 Quick Reference

### Common CanvasPage Methods

```javascript
// App lifecycle
await canvasPage.load();

// Note operations
const note = await canvasPage.createNoteAt(x, y);
const note = await canvasPage.createNote(x, y); // Handles timing automatically
await canvasPage.selectNote(note);
await canvasPage.editNoteContent('text', note);

// Connections
await canvasPage.connectNotes(sourceNote, targetNote);
await canvasPage.verifyConnection(sourceNote, targetNote);

// Multi-select
await canvasPage.createSelectionBox(startX, startY, endX, endY);
const selectedNotes = await canvasPage.getSelectedNotes();
await canvasPage.moveSelectedNotes(deltaX, deltaY);

// Templates
await canvasPage.switchToTemplate("Hero's Journey");
await canvasPage.verifyTemplate("Hero's Journey");
```

### Standard Test Coordinates

```javascript
import { TestCoordinates } from './helpers/CanvasPage.js';

TestCoordinates.note1; // { x: 400, y: 300 }
TestCoordinates.note2; // { x: 700, y: 300 }
TestCoordinates.note3; // { x: 400, y: 600 }
TestCoordinates.note4; // { x: 700, y: 600 }
TestCoordinates.selectionBoxes.topHalf; // Pre-defined selection areas
```

## Contributing

When adding new tests:

1. **Use the shared CanvasPage** - Don't create duplicate page objects
2. **Import TestCoordinates** - Use standard positioning
3. **Handle timing properly** - Use `createNote()` method for reliable note creation
4. **Update this guide** - Document new patterns or findings
5. **Test reliability** - Run your test multiple times to ensure stability
6. **Consider parallel execution** - Ensure your test doesn't conflict with others

### Template for New Tests

```javascript
import { test, expect } from '@playwright/test';
import { CanvasPage, TestCoordinates } from './helpers/CanvasPage.js';

test.describe('My New Feature', () => {
  test('Should do something amazing', async ({ page }) => {
    const canvasPage = new CanvasPage(page);

    await canvasPage.load();
    // Your test logic using canvasPage methods
  });

  test('Should work in touch mode', async ({ page }) => {
    const canvasPage = new CanvasPage(page);

    await canvasPage.testTouchMode(); // Loads with ?mode=touch
    // Test touch-specific interactions
  });
});
```

## Related Documentation

- **[Testing Environments](./testing-environments.md)** - Suites, commands, tags, and when to run which
- **[CI vs Local E2E Troubleshooting](./ci-e2e-troubleshooting.md)** - Stabilizing tests across environments
- **[Scripts Reference](./scripts.md)** - Complete npm scripts documentation
- **[Playwright Official Documentation](https://playwright.dev/docs/intro)**
