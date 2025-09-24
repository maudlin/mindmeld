# Coding Standards

## Context

MindMeld follows consistent coding standards to maintain readability, enable effective collaboration, and ensure compatibility with development tools. These standards are enforced through ESLint, Prettier, and automated CI checks.

## Language & Module System

### JavaScript Standards
- **ES6+ modules** (import/export) - NO CommonJS
- **Modern JavaScript features** - async/await, destructuring, optional chaining
- **Type safety** through JSDoc where beneficial
- **No TypeScript** - vanilla JavaScript with strong patterns

### Module System
```javascript
// ✅ GOOD: ES6+ imports
import { log } from './utils/utils.js';
import { DataProviderService } from './services/DataProviderService.js';

// ❌ BAD: CommonJS
const utils = require('./utils/utils.js');
```

## Naming Conventions

### Files & Functions
- **camelCase** for files and functions: `noteManager.js`, `handleDoubleClick()`
- **PascalCase** for classes: `NoteBehavior`, `DataProvider`
- **kebab-case** for CSS classes: `.note-content`, `.edit-mode`

### Events
Events follow `noun.verb` pattern:
```javascript
// ✅ GOOD: Descriptive noun.verb format
eventBus.emit('note.created', noteData);
eventBus.emit('note.selection.changed', selectionData);
eventBus.emit('canvas.zoom.updated', zoomLevel);

// ❌ BAD: Vague or inconsistent naming
eventBus.emit('noteEvent', noteData);
eventBus.emit('selectionChanged', selectionData);
```

### Constants
- **SCREAMING_SNAKE_CASE** for constants: `MAX_CONTENT_LENGTH`, `DEFAULT_ZOOM_LEVEL`
- Group related constants in dedicated files: `src/js/core/constants.js`

## Code Organization

### File Structure
```javascript
// File header with purpose
/**
 * NoteBehavior - Handles note interaction logic
 * Unified behavior for note clicks, selection, and edit mode requests.
 */

// Imports (grouped and sorted)
import { noteManager } from '../../services/noteManager.js';
import { displayAsViewMode } from '../../features/note/editViewMode.js';

// Constants (if any)
const DOUBLE_CLICK_DELAY = 300;

// Main class/function implementation
export class NoteBehavior {
  // Implementation
}

// Helper functions (if needed)
function isValidNoteElement(element) {
  // Helper implementation
}
```

### Function Organization
- **Single responsibility** - each function does one thing well
- **Pure functions** where possible - no side effects
- **Descriptive names** - function name explains what it does
- **JSDoc for public APIs** - document parameters and return values

```javascript
/**
 * Handle note double-click interaction
 * @param {HTMLElement} noteElement - The note element that was clicked
 * @param {Event} inputEvent - The original input event
 * @param {string} inputType - 'desktop' or 'touch'
 */
handleNoteDoubleClick(noteElement, inputEvent, inputType) {
  // Implementation
}
```

## Security Standards

### Input Validation
- **All user input** must be validated and sanitized
- **Use established patterns** like `defangPipeline.js` for content processing
- **Size limits** enforced on all user content

```javascript
// ✅ GOOD: Proper input validation
import { defangUserInput } from './markdown/defangPipeline.js';

function processNoteContent(userInput) {
  if (!userInput || typeof userInput !== 'string') {
    return '';
  }

  if (userInput.length > MAX_CONTENT_LENGTH) {
    throw new Error('Content exceeds maximum length');
  }

  return defangUserInput(userInput);
}
```

### XSS Prevention
- **Never use innerHTML** with user content
- **Use textContent** or established rendering functions
- **Whitelist HTML tags** in markdown renderer
- **Escape all user content** before processing

```javascript
// ✅ GOOD: Safe content handling
noteElement.textContent = userContent;

// ❌ BAD: XSS vulnerability
noteElement.innerHTML = userContent;
```

## Error Handling

### Consistent Patterns
- **Early return** for validation failures
- **Descriptive error messages** for debugging
- **Graceful degradation** where possible
- **Log errors** with context information

```javascript
// ✅ GOOD: Comprehensive error handling
export function createNote(noteData) {
  if (!noteData || !noteData.id) {
    console.warn('createNote: Invalid note data provided', noteData);
    return null;
  }

  try {
    const noteElement = noteFactory.create(noteData);
    return noteElement;
  } catch (error) {
    console.error('createNote: Failed to create note element', {
      noteData,
      error: error.message
    });
    return null;
  }
}
```

### Error Recovery
- **Provide fallbacks** for non-critical failures
- **User-friendly messages** for user-facing errors
- **Detailed logging** for debugging
- **Prevent cascading failures** through proper error boundaries

## Performance Standards

### DOM Operations
- **Batch DOM updates** using DocumentFragment
- **Cache DOM queries** for frequently accessed elements
- **Use event delegation** instead of individual listeners
- **Minimize reflows/repaints** by batching style changes

```javascript
// ✅ GOOD: Batched DOM operations
const fragment = document.createDocumentFragment();
notes.forEach(noteData => {
  const noteElement = createNoteElement(noteData);
  fragment.appendChild(noteElement);
});
canvas.appendChild(fragment);

// ❌ BAD: Individual DOM insertions
notes.forEach(noteData => {
  const noteElement = createNoteElement(noteData);
  canvas.appendChild(noteElement); // Triggers reflow each time
});
```

### Memory Management
- **Clean up event listeners** in component lifecycle
- **Remove DOM references** when elements are destroyed
- **Use WeakMap/WeakSet** for object associations
- **Avoid memory leaks** in closures and timers

## Testing Standards

### Test Structure
- **Arrange-Act-Assert** pattern for unit tests
- **Descriptive test names** explaining what is being tested
- **One assertion per test** for clear failure messages
- **Mock external dependencies** to isolate units

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

### Test Coverage
- **Aim for 80%+ coverage** on all new code
- **Test edge cases** and error conditions
- **Test integration points** between components
- **Include regression tests** for fixed bugs

## Code Comments

### When to Comment
- **Complex algorithms** that aren't immediately obvious
- **Business logic decisions** and their rationale
- **Integration points** between systems
- **Workarounds** with explanation of why they're needed

### Comment Style
- **JSDoc** for public APIs and interfaces
- **Inline comments** for complex logic explanation
- **TODO comments** for known technical debt (rare - prefer tickets)

```javascript
/**
 * Handle touch target expansion for mobile interactions
 * Mobile touch targets need to be larger than visual elements
 * to account for finger precision limitations
 */
expandTouchTarget(touch) {
  const EXPANSION_RADIUS = 20; // Matches iOS/Android touch standards
  // Implementation
}
```

## Import/Export Patterns

### Consistent Import Organization
1. **Third-party imports** first
2. **Internal imports** grouped by type
3. **Relative imports** last

```javascript
// Third-party (if any)
import Yjs from 'yjs';

// Core/services
import { eventBus } from '../../core/eventBus.js';
import { noteManager } from '../../services/noteManager.js';

// Features/utils
import { getCurrentMarkdownContent } from '../../features/note/editViewMode.js';
import { log } from '../../utils/utils.js';

// Relative imports
import { BaseAdapter } from './BaseAdapter.js';
```

### Export Patterns
- **Named exports** preferred over default exports
- **Consistent export style** within each module
- **Export interfaces** for service contracts

```javascript
// ✅ GOOD: Named exports
export class NoteBehavior { }
export { ORIGIN } from './DataProvider.js';

// ✅ ACCEPTABLE: Default export for main class
export default class DataProvider { }

// ❌ AVOID: Mixed patterns in same file
export default NoteBehavior;
export { helperFunction };
```

## Linting Configuration

### ESLint Rules
- **Security rules** enabled: `eslint-plugin-security`
- **Code quality** rules: complexity limits, consistent naming
- **ES6+ enforcement**: no CommonJS, prefer modern syntax
- **Import order** enforcement for consistency

### Prettier Configuration
- **2-space indentation** for JavaScript
- **Single quotes** for strings
- **Trailing commas** in multiline structures
- **80-character line limit** with flexibility for readability

## Anti-Patterns to Avoid

### Architecture Anti-Patterns
- **Mixed responsibilities** in adapters/behaviors
- **Direct DOM manipulation** in services
- **Global variables** or implicit dependencies
- **Circular dependencies** (monitored automatically)

### Performance Anti-Patterns
- **Excessive DOM queries** in loops
- **Memory leaks** from uncleaned listeners
- **Blocking operations** in main thread
- **Unnecessary re-renders** or layout thrashing

### Security Anti-Patterns
- **Unsafe innerHTML usage** with user content
- **Insufficient input validation**
- **Exposed sensitive data** in client-side code
- **Missing XSS protection** in content rendering

## Enforcement

### Automated Checks
- **ESLint** runs on every commit (husky hooks)
- **Prettier** formatting enforced in CI
- **Security scanning** with semgrep
- **Dependency analysis** for circular dependencies

### Manual Review
- **Code review required** for all changes
- **Architecture review** for significant changes
- **Security review** for user input handling
- **Performance review** for DOM-heavy code

## Related Documentation

- [Git Workflow](git-workflow.md) - Branch naming and commit standards
- [Testing Patterns](testing-patterns.md) - Detailed testing guidelines
- [Adapter-Behavior Pattern](../architecture/adapter-behavior-pattern.md) - System design principles