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
└── e2e/           # Playwright E2E tests
    └── helpers/   # Shared utilities (CanvasPage.js)
```

## Unit Testing (Jest)

Focus on pure functions and business logic. Avoid complex DOM testing - use E2E instead.

```javascript
// Good: Test pure functions
test('calculates note position correctly', () => {
  expect(calculatePosition(100, 200, canvas)).toEqual({ x: 100, y: 200 });
});

// Avoid: Complex DOM manipulation (use E2E)
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
**Menu Functions**: E2E test complete export/import workflows  
**Canvas Templates**: E2E test template switching and verification

## Test Utilities

Use `CanvasPage` and `TestCoordinates` from `tests/e2e/helpers/` for consistent E2E interactions.

## Debugging

**Timing issues**: Use `await expect().toBeVisible()` not arbitrary waits  
**Flaky tests**: Check element selection and event handling  
**Performance**: Run specific test files for faster feedback

For complete testing details, see [`tests/README.md`](../tests/README.md).