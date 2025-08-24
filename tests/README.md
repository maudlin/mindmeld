# MindMeld Testing Guide

## Overview

This guide documents testing approaches, technical findings, and best practices for the MindMeld mind mapping application. Tests are organized into unit tests and end-to-end (E2E) tests using Jest and Playwright respectively.

**📅 Last Updated**: August 2025  
**🏗️ Architecture**: Refactored with shared Page Object Model + Event Bus foundation tests
**🚀 Status**: V1 Feature Complete - Enterprise-grade data integrity with comprehensive test coverage

Scope: This guide focuses on hands-on details: test structure, the shared CanvasPage API, selectors/coordinates, and technical findings. For philosophy, naming conventions, and patterns, see docs/testing.md. For suites, commands, tags, and runtimes, see docs/testing-environments.md.

## Test Structure

```
tests/
├── README.md                          # This file - testing documentation
├── e2e/                              # End-to-end tests (Playwright)
│   ├── helpers/
│   │   └── CanvasPage.js             # 🆕 Shared Page Object Model
│   ├── basic.spec.js                 # Page loading and basic functionality
│   ├── note-operations.spec.js       # Note CRUD operations
│   ├── note-connections.spec.js      # Note connection functionality
│   ├── multi-select-notes.spec.js    # Multi-select and group operations
│   ├── canvas-template-switching.spec.js # Template switching functionality
│   ├── menu-functionality.spec.js    # 🆕 Menu operations and import/export (12 tests)
│   └── desktop-zoom-test.spec.js     # ✨ Desktop zoom functionality tests
└── unit/                             # Unit tests (Jest)
    ├── core/
    │   ├── eventBus.test.js          # 🆕 Event Bus comprehensive tests (20 tests, 100% coverage)
    │   └── uiSetup.test.js           # 🆕 Menu UI setup and button handlers (15+ tests)
    ├── data/
    │   ├── clearState.test.js        # 🆕 Clear state functionality tests (15 tests)
    │   └── exportImportData.test.js  # 🆕 Export/import data transformation (20+ tests)
    ├── features/
    │   ├── note/
    │   │   └── noteCreation.test.js
    │   └── zoom/
    │       └── zoomManager.test.js
    ├── interactions/                   # ✨ Touch and input adapter tests
    │   ├── adapters/
    │   │   ├── DesktopAdapter.test.js   # Desktop interaction tests
    │   │   └── TouchAdapter.test.js     # Touch interaction tests
    │   └── gestures/
    │       └── GestureRecognizer.test.js # Gesture recognition tests
    └── utils/
        └── utils.test.js
```

## 🏗️ **Architecture Overview (July 2025 Update)**

### **🆕 Menu Functionality Testing Foundation (July 30, 2025)**

Complete menu functionality is now comprehensively tested with both E2E and unit test coverage:

**E2E Testing (`menu-functionality.spec.js`):**

- **12 comprehensive E2E tests** covering all menu operations
- Navigation menu structure validation and dropdown accessibility
- Clear canvas functionality with confirmation dialogs and cancellation
- Import/export workflows including file operations and clipboard handling
- Error scenario testing for clipboard failures and invalid data

**Unit Testing (New test suites):**

- **UI Setup Tests** (`uiSetup.test.js`) - Button event handlers and DOM interaction
- **Data Transformation Tests** (`exportImportData.test.js`) - JSON export/import logic validation
- **State Management Tests** (`clearState.test.js`) - Clear operations and localStorage handling

**Key Bug Fixes Covered:**

- Fixed broken clear canvas button (ID mismatch)
- Added missing clipboard export/import functionality
- Corrected export/import button selectors to match actual HTML IDs
- Enhanced error handling for clipboard access failures

### **🆕 Event Bus Testing Foundation (July 2025)**

The event bus (`src/js/core/eventBus.js`) is now comprehensively tested with production-ready enhancements:

- **20 unit tests** covering all functionality with 100% code coverage
- **Error resilience** - failed listeners don't crash other listeners
- **Memory cleanup** - automatic cleanup prevents memory leaks
- **Performance validated** - tested with 1000+ listeners efficiently
- **Production ready** with console error logging for debugging

## 🏗️ **E2E Architecture Overview (January 2025 Refactor)**

### **Shared Page Object Model**

All E2E tests now use a unified `CanvasPage` class located in `tests/e2e/helpers/CanvasPage.js`. This eliminates ~400 lines of duplicated code and provides:

- **Single source of truth** for all canvas interactions
- **Consistent API** across all test files
- **Built-in timing handling** for MindMeld's 500ms throttling
- **Standard test coordinates** for reliable positioning
- **Template switching methods** for canvas template tests

### **Key Benefits for Future Engineers**

✅ **Maintainability**: Canvas interaction changes only need one update  
✅ **Reliability**: Automatic throttle handling prevents timing issues  
✅ **Consistency**: All tests use same patterns and coordinates  
✅ **Extensibility**: Easy to add new test methods to shared class

### **Using the Shared CanvasPage**

```javascript
import { test, expect } from '@playwright/test';
import { CanvasPage, TestCoordinates } from './helpers/CanvasPage.js';

test('My new test', async ({ page }) => {
  const canvasPage = new CanvasPage(page);

  await canvasPage.load(); // Standard app loading

  // Create notes with automatic throttle handling
  const note1 = await canvasPage.createNoteWithThrottleWait(
    TestCoordinates.note1.x,
    TestCoordinates.note1.y,
  );

  // All canvas operations available
  await canvasPage.switchToTemplate("Hero's Journey");
  await canvasPage.connectNotes(note1, note2);
  await canvasPage.verifyTemplate("Hero's Journey");
});
```

## Running Tests

For which suite to run (CI/dev/smoke/critical), tag usage, and approximate runtimes, see the Testing Environments guide. This file focuses on structure, the shared Page Object Model, and technical findings.

### End-to-End Tests (Playwright)

```bash
# Install dependencies (includes Playwright browser installation)
npm install

# Run all E2E tests
npm run test:e2e

# Run specific test file
npx playwright test tests/e2e/basic.spec.js

# Run tests in headed mode (see browser)
npx playwright test --headed

# Debug tests interactively
npx playwright test --debug
```

### Unit Tests (Jest)

```bash
# Run all unit tests
npm run test:unit

# Run tests in watch mode
npm test
```

### Security Testing (ESLint + Pre-commit Hooks)

```bash
# Run security-focused linting
npm run security

# Fix auto-fixable security issues
npm run security:fix

# Security checks run automatically on every commit via pre-commit hooks
```

## E2E Testing - Technical Findings & Solutions

### Critical Application Behaviors

#### 1. Note Creation Throttling ⚠️

**Issue**: MindMeld implements a 500ms throttle on double-click note creation

```javascript
// From src/js/core/event.js
const throttledHandleDoubleClick = throttle((event) => {
  // Note creation logic
}, 500); // 500ms throttle
```

**Solution**: Wait ~600ms between creations locally and 800–1000ms in CI to account for timing variability

```javascript
await canvasPage.createNoteAt(400, 300);
await page.waitForTimeout(600); // Local buffer (~600ms)
await canvasPage.createNoteAt(700, 300);
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

### Timing & Wait Strategies

#### Critical Wait Times

- **Note Creation**: 600ms between rapid creations (500ms throttle + buffer)
- **Ghost Connectors**: Brief hover before interaction
- **DOM Updates**: Use `toBeAttached()` for element verification
- **Animations**: Allow time for connection drawing

#### Recommended Wait Patterns

```javascript
// Element attachment verification
await expect(element).toBeAttached();

// Throttle handling
await page.waitForTimeout(600);

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

## Current Test Coverage

### ✅ Completed (6/6 - 100%) 🎯

- **Setup & Configuration**: Playwright infrastructure
- **Basic Functionality**: Page loading, element visibility
- **Note Operations**: Create, edit, move, delete notes
- **Note Connections**: Create connections via ghost connectors
- **Multi-Select Operations**: Selection box and group movement
- **Canvas Template Switching**: Template dropdown and layout changes ✨

### 📊 **Test Metrics**

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
- Runtimes vary by environment; see Testing Environments for suite guidance

## 🔒 **Security Testing Framework**

### **Shift-Left Security Implementation**

MindMeld implements comprehensive security testing with immediate developer feedback through pre-commit hooks and automated security scanning.

### **Security Tools & Coverage**

#### **ESLint Security Plugins**

- **eslint-plugin-security**: Detects security vulnerabilities and anti-patterns
- **eslint-plugin-no-unsanitized**: Prevents XSS attacks through DOM manipulation

#### **Security Rules Active**

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

### **Pre-commit Security Hooks**

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

### **Security Command Reference**

```bash
# Manual security scanning
npm run security           # Run security-focused ESLint rules
npm run security:fix       # Auto-fix security issues where possible

# Development workflow
git add src/js/newFile.js  # Stage changes
git commit -m "Add feature" # Triggers automatic security scan
```

### **Security Issues Detection Examples**

#### **Critical Issues Caught**

```javascript
// ❌ Unsafe dynamic import (blocked)
const module = await import(userControlledPath);

// ❌ Object injection vulnerability (warning)
const data = {};
data[userInput] = value; // Flagged by security/detect-object-injection

// ❌ XSS vulnerability (error)
element.innerHTML = userContent; // Blocked by no-unsanitized/property
```

#### **Secure Alternatives**

```javascript
// ✅ Safe import with validation
const allowedModules = ['./module1.js', './module2.js'];
if (allowedModules.includes(modulePath)) {
  const module = await import(modulePath);
}

// ✅ Safe property assignment
const data = new Map();
data.set(userInput, value);

// ✅ Safe DOM manipulation
element.textContent = userContent;
```

### **Developer Experience Benefits**

#### **Immediate Feedback**

- **Real-time detection**: Security issues caught before commit
- **Educational**: Developers learn secure patterns immediately
- **Fast feedback loop**: Seconds vs. hours/days in traditional security reviews

#### **IDE Integration Ready**

Security rules work with most IDEs for real-time feedback:

- VS Code: ESLint extension shows security warnings inline
- JetBrains: Built-in ESLint integration highlights issues
- Vim/Neovim: ALE or similar plugins provide security linting

### **Security Testing Metrics**

- **Detection Speed**: < 2 seconds for full codebase scan
- **False Positive Rate**: Low (~5%) due to high-quality security rules
- **Coverage**: All JavaScript files automatically scanned
- **Developer Impact**: Zero friction - runs transparently on commits

### **Future Security Enhancements**

#### **Potential Additions**

1. **Dependency Scanning**: Regular npm audit integration
2. **SAST Integration**: Additional tools like CodeQL or Semgrep
3. **Security Unit Tests**: Tests specifically for security edge cases
4. **Penetration Testing**: Automated security testing of running application

#### **Monitoring & Metrics**

Track security improvements over time:

- Number of vulnerabilities detected and fixed
- Mean time to fix security issues
- Developer security awareness metrics
- Reduction in production security incidents

## 📱 **Touch Interaction Testing (TouchAdapter System)**

### **Testing Touch Mode Features**

MindMeld's TouchAdapter system requires specific testing patterns for advanced touch interactions. Tests should verify both the legacy touch system and the enhanced TouchAdapter mode.

#### **Touch Mode Test Setup**

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

#### **Key Touch Interaction Test Patterns**

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

**Canvas Panning Conflict Prevention:**
```javascript
test('Single touch hold does not move canvas', async ({ page }) => {
  await page.goto('http://localhost:8080/?mode=touch');
  
  const canvas = page.locator('#canvas');
  
  // Get initial canvas position
  const initialTransform = await canvas.evaluate(el => 
    getComputedStyle(el).transform
  );
  
  // Perform single touch and hold on canvas
  await page.mouse.move(400, 300);
  await page.mouse.down();
  await page.waitForTimeout(600); // Hold longer than long-press
  await page.mouse.up();
  
  // Verify canvas did not move
  const finalTransform = await canvas.evaluate(el => 
    getComputedStyle(el).transform
  );
  expect(finalTransform).toBe(initialTransform);
});
```

#### **Two-Finger Gesture Testing**

**Two-Finger Pan:**
```javascript
test('Two-finger drag pans canvas', async ({ page }) => {
  await page.goto('http://localhost:8080/?mode=touch');
  
  // Simulate two-finger pan using mouse events
  // (Playwright doesn't support native multi-touch, use pointer events)
  await page.evaluate(() => {
    const canvas = document.querySelector('#canvas');
    
    // Create synthetic two-finger pan
    const touchStart = new TouchEvent('touchstart', {
      touches: [
        { clientX: 400, clientY: 300, identifier: 0 },
        { clientX: 500, clientY: 300, identifier: 1 }
      ]
    });
    
    const touchMove = new TouchEvent('touchmove', {
      touches: [
        { clientX: 450, clientY: 350, identifier: 0 },
        { clientX: 550, clientY: 350, identifier: 1 }
      ]
    });
    
    canvas.dispatchEvent(touchStart);
    canvas.dispatchEvent(touchMove);
  });
});
```

#### **Touch vs Desktop Mode Isolation**

**Verify Interaction Mode Separation:**
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

#### **Legacy Touch System Testing**

**Mobile Device Legacy Mode:**
```javascript
test('Mobile devices without touch mode use legacy system', async ({ page }) => {
  // Simulate mobile device without ?mode=touch
  await page.emulate({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
    viewport: { width: 375, height: 667 }
  });
  
  await page.goto('http://localhost:8080');
  
  // Verify legacy touch panning is available
  // (TouchAdapter should NOT be active)
});
```

### **TouchAdapter Unit Testing**

**Test TouchAdapter Gesture State Machine:**
```javascript
// tests/unit/interactions/adapters/TouchAdapter.test.js
describe('TouchAdapter Gesture Recognition', () => {
  it('detects long-press for note movement', () => {
    // Test gesture state transitions
  });
  
  it('distinguishes single-finger vs two-finger gestures', () => {
    // Test multi-touch detection
  });
  
  it('prevents canvas pan conflicts with note interactions', () => {
    // Test event handling isolation
  });
});
```

### **Common Touch Testing Issues**

- **Gesture Timing**: Allow adequate time for long-press detection (500ms)
- **Mode Parameter**: Always verify ?mode=touch is set for TouchAdapter tests
- **Event Simulation**: Use synthetic touch events for complex multi-touch testing
- **Canvas Conflicts**: Test that legacy and TouchAdapter systems don't interfere
- **Device Simulation**: Test both desktop and mobile contexts appropriately

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
    '^.+\\.js: 'babel-jest',
  },
};
```

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

1. **Note creation fails**: Check 500ms throttle timing
2. **Connection tests fail**: Verify ghost connector hover
3. **SVG elements not found**: Use `toBeAttached()` instead of `toBeVisible()`
4. **Flaky tests**: Add appropriate waits for DOM updates

### Performance Tips

- Reuse browser contexts when possible
- Use specific selectors to reduce search time
- Minimize unnecessary waits and timeouts
- Run tests in parallel for faster feedback

## 🚨 **Known Issues & Solutions**

### **Intermittent Test Failures**

**Issue**: `note-connections.spec.js` occasionally fails during parallel execution  
**Cause**: Resource contention when 9 tests run simultaneously  
**Status**: Intermittent in parallel execution

**Solutions for Future Engineers**:

1. **Quick Fix**: Run failed tests individually - they pass reliably in isolation
2. **Medium Term**: Reduce Playwright worker count in `playwright.config.js`
3. **Long Term**: Implement better test isolation or sequential execution for sensitive tests

**Example Fix**:

```javascript
// In playwright.config.js
export default defineConfig({
  workers: process.env.CI ? 1 : 6, // Reduce from 9 to 6 workers
});
```

## 🛠️ **Maintenance Guidelines**

### **Adding New Canvas Features**

When MindMeld adds new canvas functionality:

1. **Add methods to CanvasPage.js** - Don't duplicate in test files
2. **Use TestCoordinates** - Don't hardcode positions
3. **Handle throttling** - Use `createNoteWithThrottleWait()` for rapid note creation
4. **Follow existing patterns** - Check similar tests for consistency
5. **Test interaction modes** - Verify both Desktop and Touch modes where applicable
6. **Check gesture conflicts** - Ensure new features don't interfere with existing gestures

### **Canvas Template Extensions**

For new canvas templates:

1. **Add template verification** - Extend `verifyTemplate()` method
2. **Add cleanup verification** - Extend `verifyTemplateCleanup()` method
3. **Update template class map** - Add new template mapping
4. **Test element detection** - Verify unique template elements

### **Performance Considerations**

- Tests run in parallel by default
- Each test gets a fresh browser context
- Use `page.waitForFunction()` instead of arbitrary timeouts

## 📋 **Quick Reference**

### **Common CanvasPage Methods**

```javascript
// App lifecycle
await canvasPage.load();

// Note operations
const note = await canvasPage.createNoteAt(x, y);
const note = await canvasPage.createNoteWithThrottleWait(x, y); // Handles 600ms wait
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

### **Standard Test Coordinates**

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
3. **Handle throttling properly** - Use `createNoteWithThrottleWait()` for multiple notes
4. **Update this README** - Document new patterns or findings
5. **Test reliability** - Run your test multiple times to ensure stability
6. **Consider parallel execution** - Ensure your test doesn't conflict with others

### **Template for New Tests**

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

For more information about Playwright, see the [official documentation](https://playwright.dev/docs/intro).
