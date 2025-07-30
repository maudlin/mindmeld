# Testing Guide

## Overview

MindMeld uses a comprehensive testing strategy combining unit tests for core logic and end-to-end (E2E) tests for user workflows. This document supplements the detailed testing guide in [`tests/README.md`](../tests/README.md).

## Testing Philosophy

### Test Types and Purpose
- **Unit Tests**: Fast, focused tests for pure functions and business logic
- **E2E Tests**: Browser-based tests validating complete user workflows
- **Integration Tests**: Service interactions and event flow validation

### When to Use Each Type
- **Unit Tests**: Core algorithms, data transformations, utility functions
- **E2E Tests**: User interactions, UI workflows, browser API integration
- **Integration Tests**: Event bus communication, service coordination

## Quick Start

### Running Tests
```bash
# All tests
npm test && npm run test:e2e

# Unit tests only
npm run test:unit

# E2E tests only  
npm run test:e2e

# Watch mode for development
npm run test:watch
```

### Test Structure
```
tests/
├── unit/               # Jest unit tests
│   ├── core/          # Core functionality tests
│   ├── data/          # Data management tests
│   ├── features/      # Feature-specific tests
│   └── utils/         # Utility function tests
└── e2e/               # Playwright E2E tests
    ├── helpers/       # Shared test utilities
    └── *.spec.js      # Test specifications
```

## Unit Testing

### Framework: Jest
- **Environment**: jsdom for DOM simulation
- **Mocking**: Minimal mocking thanks to clean architecture
- **Coverage**: Focused on core logic and pure functions

### Best Practices
```javascript
// Good: Test pure functions
test('should calculate note position correctly', () => {
  const result = calculatePosition(100, 200, canvas);
  expect(result).toEqual({ x: 100, y: 200 });
});

// Good: Test business logic
test('should validate JSON structure', () => {
  const isValid = validateMindMapData(mockData);
  expect(isValid).toBe(true);
});

// Avoid: Complex DOM manipulation testing (use E2E instead)
```

### Running Unit Tests
```bash
npm run test:unit           # Run all unit tests
npm run test:unit -- --watch  # Watch mode
npm run test:unit -- --coverage  # With coverage report
```

## End-to-End Testing

### Framework: Playwright
- **Browsers**: Chrome, Firefox, Safari
- **Page Object Model**: Shared utilities in `CanvasPage.js`
- **Real Browser Testing**: Validates actual user experience

### Test Categories
1. **Basic Functionality**: Page loading, element visibility
2. **Note Operations**: Create, edit, move, delete notes  
3. **Connections**: Note-to-note connection workflows
4. **Multi-Select**: Selection box and group operations
5. **Canvas Templates**: Template switching and layouts
6. **Menu Functions**: All menu operations and error handling

### E2E Best Practices
```javascript
// Good: Use Page Object Model
const canvasPage = new CanvasPage(page);
await canvasPage.createNoteAt(400, 300);

// Good: Test complete workflows
test('Should create, connect, and delete notes', async ({ page }) => {
  // Complete user journey testing
});

// Good: Handle timing with built-in waits
await expect(noteElement).toBeVisible();
```

### Running E2E Tests
```bash
npm run test:e2e            # Run all E2E tests
npx playwright test --headed  # See browser actions
npx playwright test --debug   # Interactive debugging
```

## Testing Specific Features

### Event Bus Testing
```javascript
// Unit test: Event emission and handling
test('should emit and receive events correctly', () => {
  const eventBus = new EventBus();
  const mockHandler = jest.fn();
  
  eventBus.on('test.event', mockHandler);
  eventBus.emit('test.event', { data: 'test' });
  
  expect(mockHandler).toHaveBeenCalledWith({ data: 'test' });
});
```

### Menu Functionality Testing
```javascript
// E2E test: Complete menu workflow
test('Should export and import mind maps', async ({ page }) => {
  // Create content, export, clear, import, verify
  const canvasPage = new CanvasPage(page);
  await canvasPage.load();
  // ... test implementation
});
```

### Canvas Template Testing
```javascript
// E2E test: Template switching
test('Should switch canvas templates correctly', async ({ page }) => {
  await canvasPage.switchToTemplate("Hero's Journey");
  await canvasPage.verifyTemplate("Hero's Journey");
});
```

## Test Utilities and Helpers

### Shared Page Object Model
```javascript
// Import and use standardized canvas interactions
import { CanvasPage, TestCoordinates } from './helpers/CanvasPage.js';

const canvasPage = new CanvasPage(page);
await canvasPage.createNoteAt(TestCoordinates.note1.x, TestCoordinates.note1.y);
```

### Test Coordinates
```javascript
// Use consistent positioning for reliable tests
TestCoordinates.note1     // { x: 400, y: 300 }
TestCoordinates.note2     // { x: 700, y: 300 }
```

## Debugging and Troubleshooting

### Common Issues
1. **Timing Problems**: Use `await expect().toBeVisible()` instead of arbitrary waits
2. **Flaky Tests**: Check for proper element selection and event handling
3. **Test Isolation**: Ensure tests don't depend on each other

### Debugging Tools
```bash
# Playwright debugging
npx playwright test --debug
npx playwright test --headed

# Jest debugging
npm run test:unit -- --watch
npm run test:unit -- --verbose
```

### Performance Tips
- **Parallel Execution**: Tests run in parallel by default
- **Specific Tests**: Run individual test files for faster feedback
- **Focused Testing**: Use `.only()` for development testing

## CI/CD Integration

### Automated Testing
All tests run automatically in CI:
- **Pull Requests**: Full test suite validation
- **Security Scanning**: ESLint security rules
- **Cross-browser**: E2E tests across multiple browsers

### Coverage Requirements
- **Unit Tests**: Focus on core logic coverage
- **E2E Tests**: Complete user workflow coverage
- **Combined**: Comprehensive application validation

## Contributing Test Code

### Adding New Tests
1. **Unit Tests**: Place in appropriate `tests/unit/` subdirectory
2. **E2E Tests**: Use existing Page Object Model pattern
3. **Documentation**: Update this guide for new patterns

### Test Review Checklist
- [ ] Tests are focused and specific
- [ ] E2E tests use Page Object Model
- [ ] Unit tests avoid complex mocking
- [ ] Tests handle timing appropriately
- [ ] Documentation is updated

## Advanced Topics

### Custom Matchers
Available Jest matchers for common assertions:
- `toBeVisible()` - Element visibility
- `toBeAttached()` - DOM attachment (useful for SVG)
- `toContainEqual()` - Array/object deep equality

### Browser Limitations
- **Clipboard Access**: Limited in headless mode, tests handle gracefully
- **File Downloads**: Special handling for download testing
- **Permissions**: Some APIs restricted in test environments

For comprehensive testing details, see [`tests/README.md`](../tests/README.md).