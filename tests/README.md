# MindMeld Testing Guide

## Overview
This guide documents testing approaches, technical findings, and best practices for the MindMeld mind mapping application. Tests are organized into unit tests and end-to-end (E2E) tests using Jest and Playwright respectively.

## Test Structure

```
tests/
├── README.md                 # This file - testing documentation
├── e2e/                      # End-to-end tests (Playwright)
│   ├── basic.spec.js         # Page loading and basic functionality
│   ├── note-operations.spec.js # Note CRUD operations
│   └── note-connections.spec.js # Note connection functionality
└── unit/                     # Unit tests (Jest)
    ├── features/
    │   └── zoom/
    │       └── zoomManager.test.js
    └── utils/
        └── utils.test.js
```

## Running Tests

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

**Solution**: Always wait at least 600ms between rapid note creation operations
```javascript
await canvasPage.createNoteAt(400, 300);
await page.waitForTimeout(600); // Wait longer than throttle
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
canvas: '#canvas'
canvasContainer: '#canvas-container'
svgContainer: '#svg-container'

// Notes
notes: '.note'
selectedNotes: '.note.selected'
noteContent: '.note-content'

// Connections
ghostConnectors: '.ghost-connector'
connectionGroups: 'g[data-start][data-end]'
connectionPaths: 'g[data-start][data-end] path'

// UI Elements
selectionBox: '#selection-box'
canvasStyleDropdown: '#canvas-style-dropdown'
```

#### Data Attributes
Connection elements store important metadata:
```javascript
connectionGroup.getAttribute('data-start') // Source note ID
connectionGroup.getAttribute('data-end')   // Target note ID
connectionGroup.getAttribute('data-type')  // Connection type
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

### ✅ Completed (5/6 - 83%)
- **Setup & Configuration**: Playwright infrastructure
- **Basic Functionality**: Page loading, element visibility
- **Note Operations**: Create, edit, move, delete notes
- **Note Connections**: Create connections via ghost connectors
- **Multi-Select Operations**: Selection box and group movement (MM-74)

### ❌ Remaining (1/6)
- **Canvas Template Switching**: Template dropdown and layout changes

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

## Contributing

When adding new tests:
1. Follow the Page Object Model pattern
2. Add appropriate documentation for complex interactions
3. Update this README with new findings or patterns
4. Ensure tests pass reliably before submitting
5. Consider both positive and negative test scenarios

For more information about Playwright, see the [official documentation](https://playwright.dev/docs/intro).