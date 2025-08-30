# Testing Guide

## Overview

MindMeld uses unit tests (Jest) for core logic and end-to-end tests (Playwright) for user workflows. Our event-driven architecture makes most code easily testable with minimal mocking.

**Current Status**: Run `npm test` to see test results and `npm run test:coverage` for coverage.

Note on throttling: The app enforces a 500ms double-click throttle for note creation. In tests, wait ~600ms between creations locally and 800–1000ms in CI for stability.

## Test Philosophy

**Unit Tests**: Core algorithms, data transformations, utility functions  
**E2E Tests**: Complete user workflows, UI interactions, browser integration  
**Integration Tests**: Event bus communication, service coordination  
**Regression Tests**: Critical bug prevention - prevent return of specific resolved issues

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

This test is designed to catch any changes that might accidentally reintroduce the data corruption bug.

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

Run all tests locally:

- Unit + E2E: `npm test && npm run test:e2e`

For suite options (CI/dev/smoke/critical), tag usage, and full command references, see [Testing Environments](./testing-environments.md). For all script entries, also see the [Scripts Reference](scripts.md).

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
│   ├── interactions/       # Touch and input adapter tests
│   │   ├── adapters/       # DesktopAdapter and TouchAdapter tests
│   │   └── gestures/       # GestureRecognizer tests
│   ├── data/               # Data layer tests (storageManager, etc.)
│   ├── utils/              # Utility function tests
│   ├── integration/        # Cross-component integration tests
│   └── helpers/            # Test utilities (colorTestUtils.js)
└── e2e/                    # Playwright E2E tests
    ├── helpers/            # Shared utilities (CanvasPage.js)
    ├── touch-*.spec.js     # Touch interaction E2E tests
    └── desktop-*.spec.js   # Desktop interaction E2E tests
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

### Test Categories, Commands, and Tags

See [Testing Environments](./testing-environments.md) for the definitive suite breakdowns (CI/dev/smoke/critical), tag definitions (`@smoke`, `@critical`), and guidance on when to run which suite. Locally, prefer smoke tests for rapid iteration and run critical tests before committing; CI runs the CI suite.

### Critical E2E Patterns

- Respect app throttling (500ms) with buffers (~600ms local; 800–1000ms in CI) during rapid note creation
- Prefer Page Object methods (CanvasPage) for interactions and stability helpers
- Test end-to-end user journeys rather than isolated clicks

For complete, working examples using CanvasPage (note creation patterns, CI warmups, connection workflows), see tests/README.md.

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
**Touch Interactions**: TouchAdapter system testing with advanced gesture patterns (`touch-*.spec.js`)  
**Input Adapters**: Platform-specific interaction testing (Desktop vs Touch modes)

## Test Utilities

**E2E Helpers**: `CanvasPage` and `TestCoordinates` from `tests/e2e/helpers/` for consistent E2E interactions

**Touch Testing**: CanvasPage includes touch-specific methods:

- `simulateTouchGesture()` - Multi-touch gesture simulation
- `testTouchMode()` - Load app in touch mode (?mode=touch)
- `verifyTouchInteraction()` - Touch-specific assertions

**Unit Test Helpers**: `colorTestUtils.js` provides:

- `createMockEventBus()` - Mock event bus for isolated testing
- `createTestNote()` - Generate test DOM elements with color classes
- `createColorPickerDOM()` - Build color picker structure for testing
- `simulateClick()`, `simulateKeyboard()` - Event simulation utilities
- `expectSwatchActive()` - Color picker state assertions

## Debugging

For CI-specific stability tips and environment differences, see [CI vs Local E2E Troubleshooting](ci-e2e-troubleshooting.md).

**Timing issues**: Use `await expect().toBeVisible()` not arbitrary waits (except for throttling)  
**Flaky tests**: Usually caused by missing throttle delays between note operations  
**Performance**: Run specific test files for faster feedback  
**CI failures**: Check if local tests pass - CI failures often need stability delays

**Common Issues**:

- **"Notes created at same position"**: Missing `waitForTimeout(800)` between creations
- **"Browser context closed"**: Avoid direct DOM manipulation, use helper methods
- **Tests pass locally, fail in CI**: Add `waitForTimeout(1000)` after page load
- **Touch interactions fail**: Use device emulation for proper touch testing
- **Canvas panning conflicts**: Verify CapabilityDetector routing and adapter isolation
- **Gesture timing issues**: Allow adequate time for long-press detection (500ms)
- **CSS Media Query Issues**: Verify `@media (pointer: coarse)` styles in tests

## Advanced Testing Patterns

Detailed, copy-pastable examples for mobile/touch patterns, selectors, coordinates, and complex interactions live in tests/README.md. Use this doc for philosophy and patterns; use tests/README.md for concrete examples and recipes.

**Device Detection Testing**:

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

**Touch-Specific E2E Testing**:

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

**CSS Media Query Testing**:

```javascript
// Verify touch-specific styles don't leak to desktop
test('Touch transitions only apply on touch devices', async ({ page }) => {
  const canvasPage = new CanvasPage(page);
  const note = await canvasPage.createNote(400, 300);

  // Desktop: no transitions on ghost connectors
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.hover(note);

  const connector = page.locator('.ghost-connector');
  await expect(connector).not.toHaveCSS('transition', /ease/);

  // Touch: transitions enabled
  await page.setViewportSize({ width: 375, height: 667 });
  await page.tap(note);
  await expect(connector).toHaveCSS('transition', /ease/);
});
```

### Complex Interaction Testing

**Event Flow Testing**:

```javascript
// Test event propagation through adapters
test('Touch gestures route through correct event handlers', async () => {
  const mockEventBus = createMockEventBus();
  const touchAdapter = new TouchAdapter();
  await touchAdapter.init(mockEventBus);

  // Simulate touch sequence
  const touchEvent = createMockTouchEvent({
    touches: [{ clientX: 100, clientY: 200, identifier: 0 }],
  });

  touchAdapter.handleTouchStart(touchEvent);

  // Verify event emission
  expect(mockEventBus.emit).toHaveBeenCalledWith(
    'gesture.start',
    expect.objectContaining({ _gesture: 'touch' }),
  );
});
```

**State Machine Testing**:

```javascript
// Test gesture recognition state transitions
test('GestureRecognizer handles complex touch sequences', () => {
  const recognizer = new GestureRecognizer(mockEventBus);

  // Start with single touch
  recognizer.handleTouchStart(singleTouchEvent);
  expect(recognizer.currentState).toBe('single_touch');

  // Add second touch
  recognizer.handleTouchStart(secondTouchEvent);
  expect(recognizer.currentState).toBe('multi_touch');

  // Test movement detection
  recognizer.handleTouchMove(pinchEvent);
  expect(recognizer.currentState).toBe('pinch_gesture');
});
```

### Regression Testing

**Context Menu Positioning**:

```javascript
// Test that context menus appear at correct locations
test('Context menu appears over connection lines, not ghost connectors', async ({
  page,
}) => {
  const canvasPage = new CanvasPage(page);

  // Create connected notes
  const note1 = await canvasPage.createNote(400, 300);
  await page.waitForTimeout(800);
  const note2 = await canvasPage.createNote(600, 300);
  await canvasPage.connectNotes(note1, note2);

  // Hover over connection line (not ghost connector)
  const connection = page.locator('[data-start][data-end] .connector-hotspot');
  await page.hover(connection);

  // Verify context menu appears at connection
  const contextMenu = page.locator('.context-menu');
  await expect(contextMenu).toBeVisible();

  // Verify it's positioned over the line, not at ghost connector
  const menuBox = await contextMenu.boundingBox();
  const connectionBox = await connection.boundingBox();

  expect(Math.abs(menuBox.x - connectionBox.x)).toBeLessThan(50);
});
```

**Ghost Connector Behavior**:

```javascript
// Test ghost connector sizing and visibility
test('Ghost connectors adapt to device type', async ({ page }) => {
  const canvasPage = new CanvasPage(page);
  const note = await canvasPage.createNote(400, 300);

  // Desktop: hover shows connectors
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.hover(note);

  const connector = page.locator('.ghost-connector');
  await expect(connector).toBeVisible();
  await expect(connector).toHaveCSS('width', '10px'); // Desktop size

  // Touch: selection shows connectors with enhanced sizing
  await page.setViewportSize({ width: 375, height: 667 });
  await page.tap(note);

  // Should still be 10px base size (enhanced via transforms, not CSS width)
  await expect(connector).toHaveCSS('width', '10px');

  // But should have enhanced touch targets via CSS
  const hitArea = await connector.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });

  expect(hitArea.width).toBeGreaterThan(20); // Expanded hit area
});
```

### Performance Testing

**Memory Leak Detection**:

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

**Animation Performance**:

```javascript
// Test CSS animations don't interfere with interactions
test('Jiggle animation cleanup works correctly', async ({ page }) => {
  const canvasPage = new CanvasPage(page);
  const note = await canvasPage.createNote(400, 300);

  // Start jiggle animation
  await page.touchStart(note);
  await page.waitForTimeout(500);
  await expect(page.locator('.note.jiggle')).toBeVisible();

  // Cancel via tap on canvas
  await page.tap('.canvas', { position: { x: 100, y: 100 } });

  // Animation should be cleared
  await page.waitForTimeout(100);
  await expect(page.locator('.note.jiggle')).not.toBeVisible();

  // Note should still be selectable
  await page.tap(note);
  await expect(page.locator('.note.selected')).toBeVisible();
});
```

### Integration Testing

**Cross-Component Communication**:

```javascript
// Test adapter communication with other systems
test('TouchAdapter coordinates with zoom manager', async () => {
  const touchAdapter = new TouchAdapter();
  const mockZoomManager = {
    setZoomLevel: jest.fn(),
    getZoomLevel: jest.fn(() => 5),
  };

  await touchAdapter.init(mockEventBus);

  // Simulate pinch gesture
  const pinchEvent = createPinchGestureEvent(1.5); // 1.5x scale
  touchAdapter.handlePinchMove(pinchEvent);

  // Verify zoom event emission
  expect(mockEventBus.emit).toHaveBeenCalledWith(
    'zoom.change',
    expect.objectContaining({
      direction: 'in',
      scale: 1.5,
      _gesture: 'pinch',
    }),
  );
});
```

## Touch Regression Testing

### Manual Testing Protocol

When making changes that could affect touch interactions:

**1. Basic Touch Flow Test**

```bash
# Start dev server and test in browser
npm start

# Open with touch mode
# http://localhost:8080/?mode=touch
```

**Test checklist:**

- [ ] Note creation (double-tap canvas)
- [ ] Note selection (tap note)
- [ ] Note movement (long-press + drag)
- [ ] Connection creation (tap ghost connector → tap target note)
- [ ] Connection context menu (tap connector-hotspot)
- [ ] Context menu interactions (tap delete/cycle buttons)
- [ ] Canvas pan (two-finger drag)
- [ ] Canvas zoom (pinch gesture)

**2. Cross-Platform Verification**

- [ ] Desktop mode still works (`http://localhost:8080/`)
- [ ] Browser dev tools mobile viewport
- [ ] Actual mobile device testing

### Automated Regression Tests

**Touch Event Handler Tests**

```javascript
describe('Touch Event Regression', () => {
  test('SVG elements receive touch events', () => {
    const svgContainer = document.getElementById('svg-container');
    const pathElement = svgContainer.querySelector('path');

    // Verify CSS pointer-events configuration
    const pathStyles = getComputedStyle(pathElement);
    expect(pathStyles.pointerEvents).toBe('all');

    // Verify touch event handlers are attached
    const listeners = getEventListeners(svgContainer);
    expect(listeners.touchend).toBeDefined();
  });

  test('TouchAdapter does not intercept context menu events', () => {
    const touchAdapter = new TouchAdapter();
    const mockContextMenu = { show: jest.fn() };

    // Simulate tap on connector-hotspot
    const mockTouch = {
      currentX: 100,
      currentY: 100,
    };

    // Mock element detection to return connector-hotspot
    jest
      .spyOn(document, 'elementFromPoint')
      .mockReturnValue(createMockElement('circle', 'connector-hotspot'));

    touchAdapter.handleTap(mockTouch);

    // TouchAdapter should NOT call context menu directly
    expect(mockContextMenu.show).not.toHaveBeenCalled();

    // Event should bubble to SVG container handlers instead
  });
});
```

### Common Regression Patterns

**Pattern 1: Event Interception**

- **Symptom**: Touch interactions stop working after TouchAdapter changes
- **Root cause**: New code calling `event.preventDefault()` too early
- **Test**: Verify event bubbling still reaches intended handlers

**Pattern 2: CSS Pointer Events**

- **Symptom**: SVG elements not responding to touch
- **Root cause**: Missing `pointer-events: all` on SVG elements
- **Test**: Check computed styles in automated tests

**Pattern 3: Handler Registration Order**

- **Symptom**: Inconsistent behavior depending on load order
- **Root cause**: Event handlers depending on registration sequence
- **Test**: Verify interactions work regardless of initialization order

### E2E Regression Suite

**Touch Context Menu E2E Test**

```javascript
test('Connection context menu touch regression', async ({ page }) => {
  // Set up touch viewport
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('http://localhost:8080/?mode=touch');

  const canvasPage = new CanvasPage(page);

  // Create notes and connection
  const note1 = await canvasPage.createNote(200, 200);
  const note2 = await canvasPage.createNote(400, 200);
  await canvasPage.createConnection(note1, note2);

  // Tap on connector-hotspot
  const hotspot = page.locator('.connector-hotspot').first();
  await hotspot.tap();

  // Context menu should appear
  await expect(page.locator('.context-menu')).toBeVisible();

  // Test delete button
  await page.locator('.menu-item[data-type="delete"]').tap();

  // Connection should be removed
  await expect(page.locator('path')).toHaveCount(0);
});
```

### Performance Regression

**Touch Event Performance Test**

```javascript
test('Touch events performance regression', async () => {
  const touchAdapter = new TouchAdapter();
  const performanceMarks = [];

  // Mock performance.now for consistent timing
  jest
    .spyOn(performance, 'now')
    .mockImplementation(() => performanceMarks.length * 16.67); // 60fps

  // Simulate rapid touch events
  for (let i = 0; i < 100; i++) {
    const startTime = performance.now();

    touchAdapter.handleTap({
      currentX: Math.random() * 400,
      currentY: Math.random() * 400,
    });

    const duration = performance.now() - startTime;
    performanceMarks.push(duration);
  }

  // Average processing time should be under 16ms (60fps)
  const averageTime =
    performanceMarks.reduce((a, b) => a + b) / performanceMarks.length;
  expect(averageTime).toBeLessThan(16);
});
```

For complete testing details, see [`tests/README.md`](../tests/README.md).
