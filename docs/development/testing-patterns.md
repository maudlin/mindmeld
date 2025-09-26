# Testing Patterns

## Context

This document provides comprehensive testing patterns and best practices for MindMeld development. It covers unit testing, E2E testing, security testing, and specialized patterns for mobile interactions.

**Related:** [Coding Standards](coding-standards.md) | [CI/CD](../operations/ci-cd.md) | [Architecture Health](../operations/architecture-health.md)

## Testing Philosophy

### Core Principles
- **Red-Green-Refactor**: Always follow TDD patterns where possible
- **Test behavior, not implementation**: Focus on what the code should do
- **Isolation**: Each test should be independent and reliable
- **Coverage targets**: 80%+ for all new code, focus on critical paths

### Test Categories
- **Unit Tests**: Fast, isolated, test individual functions/classes
- **Integration Tests**: Test component interactions and service boundaries
- **E2E Tests**: Full user workflows and cross-browser compatibility
- **Security Tests**: XSS prevention, input validation, and vulnerability scanning

## Unit Testing Patterns

### Arrange-Act-Assert Pattern

```javascript
// ✅ GOOD: Clear test structure
test('handleNoteDoubleClick selects unselected note', () => {
  // Arrange
  const noteElement = createMockNoteElement({ selected: false });
  const behavior = new NoteBehavior(mockEventBus);

  // Act
  behavior.handleNoteDoubleClick(noteElement, mockEvent, 'desktop');

  // Assert
  expect(noteElement.classList.contains('selected')).toBe(true);
});
```

### Testing Adapters vs Behaviors

**Adapter Tests** - Focus on input detection:
```javascript
// Test that DesktopAdapter correctly delegates to NoteBehavior
test('handleDoubleClick calls NoteBehavior for note elements', () => {
  const mockNoteBehavior = { handleNoteDoubleClick: jest.fn() };
  const adapter = new DesktopAdapter(mockNoteBehavior);
  const mockEvent = { target: noteElement };

  adapter.handleDoubleClick(mockEvent);

  expect(mockNoteBehavior.handleNoteDoubleClick).toHaveBeenCalledWith(
    noteElement, mockEvent, 'desktop'
  );
});
```

**Behavior Tests** - Focus on business logic:
```javascript
// Test that NoteBehavior implements correct business logic
test('handleNoteDoubleClick selects note and emits edit event', () => {
  const mockEventBus = { emit: jest.fn() };
  const behavior = new NoteBehavior(mockEventBus);

  behavior.handleNoteDoubleClick(noteElement, inputEvent, 'desktop');

  expect(noteElement.classList.contains('selected')).toBe(true);
  expect(mockEventBus.emit).toHaveBeenCalledWith('note.requestEdit', {
    noteId: noteElement.id,
    noteElement,
    inputType: 'desktop'
  });
});
```

### Service Layer Testing

**DataProvider Contract Testing:**
```javascript
// Example contract test - all providers must pass
test('upsertNote creates and updates notes correctly', async () => {
  const provider = new LocalJSONProvider(); // or YjsProvider
  await provider.init('test-map');

  // Test create
  await provider.upsertNote({ id: '1', content: 'Test' });
  const snapshot = await provider.getSnapshot();
  expect(snapshot.notes).toHaveLength(1);

  // Test update
  await provider.upsertNote({ id: '1', content: 'Updated' });
  const updated = await provider.getSnapshot();
  expect(updated.notes[0].content).toBe('Updated');
});
```

### Event System Testing

```javascript
// Testing event bus coordination
test('noteService emits creation events', () => {
  const mockEventBus = { emit: jest.fn() };
  const service = new NoteService(mockEventBus);

  service.createNote({ content: 'Test', pos: [100, 200] });

  expect(mockEventBus.emit).toHaveBeenCalledWith('note.created',
    expect.objectContaining({
      content: 'Test',
      pos: [100, 200]
    })
  );
});
```

## E2E Testing Patterns

### Page Object Model

**Using CanvasPage Helper:**
```javascript
// ✅ GOOD: Use CanvasPage helper (handles timing and complexity)
import { CanvasPage } from './helpers/CanvasPage.js';

test('user can create and edit notes', async ({ page }) => {
  const canvasPage = new CanvasPage(page);
  await canvasPage.goto();

  // Create note
  const note = await canvasPage.createNote(200, 200);

  // Edit content
  await canvasPage.editNoteContent(note, 'My new content');

  // Verify
  await expect(note).toHaveText('My new content');
});
```

### Mobile/Touch Testing

**Cross-Platform Testing:**
```javascript
// Test same functionality across input methods
test.describe('Note creation', () => {
  test('works with mouse double-click', async ({ page }) => {
    await page.mouse.dblclick(200, 200);
    await expect(page.locator('.note')).toBeVisible();
  });

  test('works with touch double-tap', async ({ page, isMobile }) => {
    test.skip(!isMobile);

    await page.touchscreen.tap(200, 200);
    await page.waitForTimeout(50); // Brief gap for double-tap
    await page.touchscreen.tap(200, 200);

    await expect(page.locator('.note')).toBeVisible();
  });
});
```

### Common E2E Gotchas

#### Timing Issues
```javascript
// ✅ Use CanvasPage helper (handles timing)
const note = await canvasPage.createNote(x, y);

// ❌ Raw double-clicks may fail due to timing
await page.mouse.dblclick(x, y);
```

#### Content Editing
```javascript
// ✅ Use editNoteContent method
await canvasPage.editNoteContent(note, 'content');

// ❌ Raw clicks on editable content may fail
await note.click(); // then type
```

#### SVG Elements
```javascript
// ✅ Check attachment, not visibility
await expect(svgPath).toBeAttached();

// ❌ SVG visibility can be unreliable
await expect(svgPath).toBeVisible();
```

## Security Testing

### XSS Prevention Testing

```javascript
// Test markdown security pipeline
test('defangPipeline prevents XSS attacks', () => {
  const maliciousInput = '<script>alert("xss")</script>';
  const result = defangUserInput(maliciousInput);

  expect(result).not.toContain('<script>');
  expect(result).not.toContain('javascript:');
});

// Test content extraction security
test('getCurrentMarkdownContent never returns HTML', () => {
  const noteContent = createNoteElement();
  noteContent.innerHTML = '<h1>Title</h1>';
  noteContent.dataset.markdown = '# Title';

  const extracted = getCurrentMarkdownContent(noteContent);

  expect(extracted).toBe('# Title'); // Markdown, not HTML
  expect(extracted).not.toContain('<h1>');
});
```

### Input Validation Testing

```javascript
// Test size limits
test('rejects oversized content', () => {
  const oversizedContent = 'x'.repeat(10001); // Over 10KB limit

  expect(() => {
    defangUserInput(oversizedContent);
  }).toThrow('Content exceeds maximum length');
});

// Test dangerous URI schemes
test('removes dangerous URI schemes', () => {
  const dangerousInput = 'Click: javascript:alert("xss")';
  const result = defangUserInput(dangerousInput);

  expect(result).toBe('Click: ');
});
```

## Critical Regression Tests

### Data Corruption Prevention

**File:** `tests/unit/data/refreshPersistenceRegression.test.js`

**Purpose:** Prevents markdown content corruption during page refreshes

**Critical Test:**
```javascript
test('getCurrentState preserves markdown through refresh cycle', () => {
  const noteElement = createNoteWithMarkdown('# Header\n**Bold text**');

  // This should return markdown, never HTML
  const state = getCurrentState();
  const savedNote = state.notes[0];

  expect(savedNote.content).toBe('# Header\n**Bold text**');
  expect(savedNote.content).not.toContain('<h1>');
  expect(savedNote.content).not.toContain('<strong>');
});
```

**If this test fails: STOP** - Do not merge. The data corruption bug has returned.

## Mobile Testing Strategies

### Device Detection Testing

```javascript
test('capability detector identifies touch devices correctly', () => {
  // Mock touch capability
  Object.defineProperty(navigator, 'maxTouchPoints', { value: 1 });

  const detector = new CapabilityDetector();
  const capabilities = detector.detect();

  expect(capabilities.touch).toBe(true);
  expect(capabilities.primaryInput).toBe('touch');
});
```

### Touch Interaction Testing

```javascript
// Test touch gesture recognition
test('TouchAdapter detects double-tap correctly', async () => {
  const adapter = new TouchAdapter(mockBehaviors);
  const mockTouch = { clientX: 100, clientY: 200 };

  // Simulate double-tap timing
  adapter.handleTouchEnd({ touches: [], changedTouches: [mockTouch] });

  // Within double-tap window (300ms)
  await new Promise(resolve => setTimeout(resolve, 200));
  adapter.handleTouchEnd({ touches: [], changedTouches: [mockTouch] });

  expect(mockBehaviors.canvas.handleCanvasDoubleClick).toHaveBeenCalled();
});
```

## Performance Testing

### DOM Operation Performance

```javascript
// Test batching performance
test('batched DOM operations are faster than individual operations', () => {
  const startTime = performance.now();

  // Test batched approach
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < 100; i++) {
    const note = createNoteElement({ id: i, content: `Note ${i}` });
    fragment.appendChild(note);
  }
  canvas.appendChild(fragment);

  const batchedTime = performance.now() - startTime;

  // Should be significantly faster than individual insertions
  expect(batchedTime).toBeLessThan(50); // 50ms threshold
});
```

## Test Organization

### File Structure
```
tests/
├── unit/
│   ├── core/          # Core system tests
│   ├── services/      # Service layer tests
│   ├── interactions/  # Adapter/behavior tests
│   ├── features/      # Feature-specific tests
│   └── data/          # Data layer and regression tests
├── e2e/
│   ├── smoke/         # Essential user workflows
│   ├── integration/   # Cross-platform testing
│   └── critical/      # Regression and accessibility
└── helpers/           # Test utilities and page objects
```

### Naming Conventions

**Test Files:**
- `ComponentName.test.js` for unit tests
- `feature-name.spec.js` for E2E tests
- `ComponentName.behavior.test.js` for behavior-specific tests

**Test Names:**
```javascript
// ✅ GOOD: Descriptive test names
test('handleNoteDoubleClick selects unselected note and emits edit event');
test('TouchAdapter delegates double-tap to CanvasBehavior for canvas clicks');

// ❌ BAD: Vague test names
test('note behavior works');
test('touch handling');
```

## Test Commands

### Local Development
```bash
# Run all tests
npm test

# Unit tests only
npm run test:unit

# E2E tests (local only)
npm run test:e2e

# Watch mode for TDD
npm run test:unit -- --watch

# Coverage reporting
npm run test:unit -- --coverage
```

### CI Environment
```bash
# CI optimized (unit tests only)
npm run test:ci

# Local CI simulation
npm run ci:local
```

### Security Testing
```bash
# Security scanning
npm run security

# Fix security issues
npm run security:fix

# Semgrep analysis
npm run semgrep
```

## Debugging Tests

### Common Issues

**Timing Problems:**
- Use `waitFor` instead of fixed timeouts
- Leverage CanvasPage helpers for complex interactions
- Mock timers for time-dependent logic

**State Pollution:**
- Reset DOM state between tests
- Clear localStorage/sessionStorage
- Reset global variables and singletons

**Async Issues:**
- Always `await` async operations
- Use `waitFor` for state changes
- Handle promise rejections properly

### Debug Utilities

```javascript
// Visual debugging in E2E tests
test('debug failing interaction', async ({ page }) => {
  await page.screenshot({ path: 'debug-before.png' });

  await canvasPage.createNote(200, 200);

  await page.screenshot({ path: 'debug-after.png' });
});

// Console output debugging
test('debug behavior calls', () => {
  const mockBehavior = {
    method: jest.fn().mockImplementation((...args) => {
      console.log('Behavior called with:', args);
    })
  };
});
```

## Contributing Guidelines

### Adding New Tests

1. **Follow existing patterns** - Copy from similar working tests
2. **Use appropriate helpers** - Don't duplicate interaction logic
3. **Test locally first** - Ensure reliability before committing
4. **Update documentation** - Add new gotchas or patterns discovered

### Test Review Checklist

- [ ] Test names are descriptive and explain what's being tested
- [ ] Tests follow Arrange-Act-Assert pattern
- [ ] No hardcoded waits (use `waitFor` instead)
- [ ] Proper cleanup and state isolation
- [ ] Tests pass consistently (run 5+ times locally)
- [ ] Coverage includes error paths and edge cases

## Related Documentation

- [Coding Standards](coding-standards.md) - Code quality standards
- [Git Workflow](git-workflow.md) - Pre-commit testing requirements
- [CI/CD](../operations/ci-cd.md) - Automated testing pipeline
- [Architecture Health](../operations/architecture-health.md) - Quality monitoring
