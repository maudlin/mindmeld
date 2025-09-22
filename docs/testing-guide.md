# MindMeld Testing Guide

Concise reference guide pointing to working test examples and critical information.

## Quick Reference

For commands and test structure, see **[tests/README.md](../tests/README.md)**.

## Testing Patterns by Example

### E2E Testing Patterns

- **User workflows**: See [tests/e2e/smoke/core-workflows.spec.js](../tests/e2e/smoke/core-workflows.spec.js)
- **Cross-platform**: See [tests/e2e/integration/cross-platform.spec.js](../tests/e2e/integration/cross-platform.spec.js)
- **Accessibility**: See [tests/e2e/critical/accessibility-and-regression.spec.js](../tests/e2e/critical/accessibility-and-regression.spec.js)
- **Real-time collaboration**: See [tests/e2e/collaboration/server-connection-flow.spec.js](../tests/e2e/collaboration/server-connection-flow.spec.js)
- **Page Object Model**: See [tests/e2e/helpers/CanvasPage.js](../tests/e2e/helpers/CanvasPage.js)

### Unit Testing Patterns

- **Event system**: See [tests/unit/core/eventBus.test.js](../tests/unit/core/eventBus.test.js)
- **Data management**: See [tests/unit/data/](../tests/unit/data/) directory
- **User interactions**: See [tests/unit/interactions/](../tests/unit/interactions/) directory
- **Feature logic**: See [tests/unit/features/](../tests/unit/features/) directory
- **Collaboration services**: See [tests/unit/services/ServerConnectionService.test.js](../tests/unit/services/ServerConnectionService.test.js)
- **Data providers**: See [tests/unit/services/DataProviderService.test.js](../tests/unit/services/DataProviderService.test.js)

## Critical Information

### 🚨 Critical Regression Test

**File**: `tests/unit/data/refreshPersistenceRegression.test.js`

**Purpose**: Prevents data loss where page refreshes corrupt markdown content

**If this test fails**: **STOP** - Do not merge. Check that `getCurrentState()` uses `getCurrentMarkdownContent()` not `innerHTML`

### Security Testing

**Commands**: `npm run security` and `npm run security:fix`
**Hooks**: Automatic scanning on git commit via Husky
**Patterns**: See ESLint security rules in `.eslintrc.js`

## Common E2E Gotchas

### Timing Issues

```javascript
// ✅ Use CanvasPage helper (handles timing)
const note = await canvasPage.createNote(x, y);

// ❌ Raw double-clicks may fail
await page.mouse.dblclick(x, y);
```

### Content Editing

```javascript
// ✅ Use editNoteContent method
await canvasPage.editNoteContent(note, 'content');

// ❌ Raw clicks on editable content may fail
await note.click(); // then type
```

### SVG Elements

```javascript
// ✅ Check attachment, not visibility
await expect(svgPath).toBeAttached();

// ❌ SVG visibility can be unreliable
await expect(svgPath).toBeVisible();
```

## Contributing

When adding tests:

1. **Follow existing patterns** - Copy from similar working tests
2. **Use CanvasPage helper** - Don't duplicate interaction logic
3. **Test locally first** - Ensure reliability before committing
4. **Update this guide** - Add new gotchas or patterns discovered
