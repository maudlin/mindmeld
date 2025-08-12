# Testing Guide

## Overview

MindMeld uses unit tests (Jest) for core logic and end-to-end tests (Playwright) for user workflows. Our event-driven architecture makes most code easily testable with minimal mocking.

**Current Status**: Run `npm test` to see test results and `npm run test:coverage` for coverage.

## Test Philosophy

**Unit Tests**: Core algorithms, data transformations, utility functions  
**E2E Tests**: Complete user workflows, UI interactions, browser integration  
**Integration Tests**: Event bus communication, service coordination

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
- **Describe blocks**: Use human-readable titles that explain *what* is being tested
- **Test descriptions**: Focus on user-observable behaviors, avoid "should" prefix
- **Documentation**: Include file-level comments explaining test purpose and focus

**Example**:
```javascript
/**
 * Connection Manager Behavior Tests
 * 
 * Tests user-observable connection creation, management, and cleanup behaviors.
 * Focus on visual feedback, state consistency, and drag interaction flows.
 */

describe('Connection Manager Behavior', () => {
  describe('Visual Connection Creation', () => {
    it('creates visible line between notes when dragged', () => {});
    it('provides immediate visual feedback during creation', () => {});
  });
});
```

## Quick Start

Run tests: `npm test && npm run test:e2e`  
Commands: See [Scripts Reference](scripts.md) for all testing commands

## Test Structure

```
tests/
├── unit/                    # Jest unit tests
│   ├── core/               # Core system tests (eventBus, errorHandling)
│   ├── services/           # Service layer tests (comprehensive coverage)
│   ├── factories/          # Pure function tests (noteFactory, etc.)
│   ├── features/           # Feature module tests
│   │   ├── connection/     # Connection system tests
│   │   ├── colorPicker/    # Color picker component tests
│   │   ├── zoom/           # Zoom manager tests
│   │   └── note/           # Note creation tests
│   ├── data/               # Data layer tests (storageManager, etc.)
│   ├── utils/              # Utility function tests
│   ├── integration/        # Cross-component integration tests
│   └── helpers/            # Test utilities (colorTestUtils.js)
└── e2e/                    # Playwright E2E tests
    └── helpers/            # Shared utilities (CanvasPage.js)
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

## End-to-End Testing (Playwright)

Tests complete user workflows across Chrome, Firefox, and Safari. Use the `CanvasPage` helper for consistent interactions.

### Critical E2E Patterns

**Note Creation**: Always use `createNote()` and respect throttling
```javascript
const canvasPage = new CanvasPage(page);

// ✅ CORRECT: Reliable pattern for multiple notes
const note1 = await canvasPage.createNote(400, 300);
await page.waitForTimeout(800); // Respect app throttling
const note2 = await canvasPage.createNote(600, 300);

// ❌ WRONG: Will fail due to throttling
const note1 = await canvasPage.createNote(400, 300);  
const note2 = await canvasPage.createNote(600, 300); // Too fast!
```

**Stability in CI**: Some tests need extra warmup time
```javascript
// For tests that create content immediately after page load
const canvasPage = new CanvasPage(page);
await canvasPage.load();
await page.waitForTimeout(1000); // CI stability - only if needed

// Then proceed with test operations
const note = await canvasPage.createNote(400, 300);
```

**Complete Workflows**: Test user journeys, not individual clicks
```javascript
test('creates, connects, and deletes notes', async ({ page }) => {
  const canvasPage = new CanvasPage(page);
  
  // Create test content with proper throttling
  const note1 = await canvasPage.createNote(400, 300);
  await page.waitForTimeout(800);
  const note2 = await canvasPage.createNote(600, 300);
  
  // Test the actual feature
  await canvasPage.connectNotes(note1, note2);
  await expect(page.locator('.connection')).toBeVisible();
});
```

### Playwright Setup

Configuration in `playwright.config.js`. Tests in `tests/e2e/`. 

**Debug failing tests**: `npx playwright test --debug`  
**See browser**: `npx playwright test --headed`  
**View reports**: `npx playwright show-report`

## Key Testing Patterns

### **Unit Test Patterns**

**Event Bus**: Comprehensive event emission/handling with error isolation  
**Service Layer**: Business logic with dependency injection patterns  
**Connection System**: Complete SVG-based connection testing with DOM integration  
**Factory Functions**: Pure function testing for note creation and DOM manipulation  
**Storage Manager**: Event-driven data persistence and state management  
**Error Handling**: Comprehensive edge cases, failure recovery, and cascade prevention  

### **E2E Testing Patterns**

**Feature Modules**: Complete component behavior testing (`colorPicker.basic.test.js`)  
**Integration**: Cross-component behavior validation (`colorPicker.integration.test.js`)  
**Menu Functions**: Complete export/import workflows (including color data)  
**Canvas Templates**: Template switching and verification workflows

## Test Utilities

**E2E Helpers**: `CanvasPage` and `TestCoordinates` from `tests/e2e/helpers/` for consistent E2E interactions

**Unit Test Helpers**: `colorTestUtils.js` provides:
- `createMockEventBus()` - Mock event bus for isolated testing
- `createTestNote()` - Generate test DOM elements with color classes  
- `createColorPickerDOM()` - Build color picker structure for testing
- `simulateClick()`, `simulateKeyboard()` - Event simulation utilities
- `expectSwatchActive()` - Color picker state assertions

## Debugging

**Timing issues**: Use `await expect().toBeVisible()` not arbitrary waits (except for throttling)  
**Flaky tests**: Usually caused by missing throttle delays between note operations  
**Performance**: Run specific test files for faster feedback  
**CI failures**: Check if local tests pass - CI failures often need stability delays

**Common Issues**:
- **"Notes created at same position"**: Missing `waitForTimeout(800)` between creations
- **"Browser context closed"**: Avoid direct DOM manipulation, use helper methods  
- **Tests pass locally, fail in CI**: Add `waitForTimeout(1000)` after page load

For complete testing details, see [`tests/README.md`](../tests/README.md).