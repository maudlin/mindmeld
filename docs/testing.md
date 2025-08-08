# Testing Guide

## Overview

MindMeld uses unit tests (Jest) for core logic and end-to-end tests (Playwright) for user workflows. Because we follow clean architecture principles, most code is easily testable without complex mocking.

## Test Philosophy

**Unit Tests**: Core algorithms, data transformations, utility functions  
**E2E Tests**: Complete user workflows, UI interactions, browser integration  
**Integration Tests**: Event bus communication, service coordination

## Quick Start

Run tests: `npm test && npm run test:e2e`  
Commands: See [Scripts Reference](scripts.md) for all testing commands

## Test Structure

```
tests/
├── unit/          # Jest unit tests
│   ├── services/  # Service layer tests (colorService.test.js)
│   ├── features/  # Feature tests (colorPicker.basic.test.js)
│   ├── integration/ # Integration tests (colorPicker.integration.test.js)
│   └── helpers/   # Test utilities (colorTestUtils.js)
└── e2e/           # Playwright E2E tests
    └── helpers/   # Shared utilities (CanvasPage.js)
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

```javascript
// Use Page Object Model
const canvasPage = new CanvasPage(page);
await canvasPage.createNoteAt(400, 300);

// Test complete workflows, not individual clicks
test('creates, connects, and deletes notes', async ({ page }) => {
  // Full user journey
});

// Built-in waits prevent flaky tests
await expect(noteElement).toBeVisible();
```

### Playwright Setup

Configuration in `playwright.config.js`. Tests in `tests/e2e/`. 

**Debug failing tests**: `npx playwright test --debug`  
**See browser**: `npx playwright test --headed`  
**View reports**: `npx playwright show-report`

## Key Testing Patterns

**Event Bus**: Test event emission/handling in unit tests  
**Service Layer**: Test business logic with mocked dependencies (`colorService.test.js`)  
**Feature Modules**: Test component behavior with DOM utilities (`colorPicker.basic.test.js`)  
**Integration**: Test cross-component behavior (`colorPicker.integration.test.js`)  
**Menu Functions**: E2E test complete export/import workflows (including color data)  
**Canvas Templates**: E2E test template switching and verification

## Test Utilities

**E2E Helpers**: `CanvasPage` and `TestCoordinates` from `tests/e2e/helpers/` for consistent E2E interactions

**Unit Test Helpers**: `colorTestUtils.js` provides:
- `createMockEventBus()` - Mock event bus for isolated testing
- `createTestNote()` - Generate test DOM elements with color classes  
- `createColorPickerDOM()` - Build color picker structure for testing
- `simulateClick()`, `simulateKeyboard()` - Event simulation utilities
- `expectSwatchActive()` - Color picker state assertions

## Debugging

**Timing issues**: Use `await expect().toBeVisible()` not arbitrary waits  
**Flaky tests**: Check element selection and event handling  
**Performance**: Run specific test files for faster feedback

For complete testing details, see [`tests/README.md`](../tests/README.md).