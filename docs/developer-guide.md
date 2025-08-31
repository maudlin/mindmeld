# Developer Guide

## Get Started Fast

**Prerequisites:** Node.js (LTS), npm, Git

```bash
git clone https://github.com/maudlin/mindmeld.git
cd mindmeld
npm install
npm start
```

**Test it works:** `npm test && npm run test:e2e` (all should pass)

Before opening a PR, review the CI Quick Checklist below.

## Architecture Overview

**Bootstrap Architecture**: Clean initialization system with specialized modules  
**Event-driven**: Components communicate via central event bus (`src/js/core/eventBus.js`)  
**Service layer**: Clean separation with dependency injection (`src/js/services/`)  
**Factory pattern**: Pure, testable functions (`src/js/factories/`)  
**Zero circular deps**: Maintained via automated health checks  
**Enterprise data integrity**: Comprehensive corruption resistance with browser compatibility  
**Test coverage**: Comprehensive unit test suite with enterprise-grade data integrity testing

```
src/js/
├── app.js                    # Main entry point (2 dependencies)
├── core/
│   ├── bootstrap/           # Bootstrap system architecture
│   │   ├── AppBootstrap.js  # Main orchestrator
│   │   ├── DataBootstrap.js # Event bus, data store, state
│   │   ├── ServiceBootstrap.js # Business logic services
│   │   ├── UIBootstrap.js   # Canvas, UI components
│   │   └── InteractionBootstrap.js # Input, gestures, events
│   ├── eventBus.js          # Central communication hub
│   └── ...                  # Other core systems
├── services/                # Service layer (noteService, colorService)
├── factories/               # Pure factory functions
├── features/                # Feature modules (colorPicker, note, connection)
├── utils/                   # Utilities (browserDetection, mobileInteractions)
└── data/                    # Data management with enterprise-grade integrity
```

## Standards

**Code style**: ES6+, ESLint, Prettier  
**Naming**: camelCase files/functions, PascalCase classes, events as `noun.verb`  
**Git**: Branch as `feature/description`, conventional commits, use PR template  
**Security**: ESLint security plugins catch vulnerabilities

## Git Workflow & Branch Protection

**Branch Protection**: The `main` branch has comprehensive protection enabled:

- ✅ **Requires PR reviews** (1 approver minimum)
- ✅ **Requires up-to-date branches** (prevents the merge conflict scenario)
- ✅ **Requires linear history** (enforces clean commit history)
- ✅ **Dismisses stale reviews** on new commits
- ✅ **Requires conversation resolution** before merge

### Workflow Best Practices

**Starting New Work:**

1. **Always branch from latest main**: `git checkout main && git pull && git checkout -b feature/your-feature`
2. **Check for conflicting PRs**: Review open PRs that might modify similar files
3. **Use descriptive branch names**: `feature/MM-123-smoke-test-categorization`

**Creating Pull Requests:**

1. **Use PR template**: Automatically provided, includes dependency checks
2. **Verify independence**: Ensure your PR can be merged without dependencies
3. **Mark dependencies**: If your work depends on other open PRs, mark them clearly

**Handling Dependencies:**

- ✅ **Sequential approach**: Wait for infrastructure PRs to merge before starting overlapping work
- ✅ **Communication**: Coordinate with team when working on related areas
- ❌ **Avoid parallel overlapping work**: Prevents the complex rebase scenarios

**Branch Protection Benefits:**

- **Prevents merge conflicts**: "Require up-to-date branches" forces automatic conflict resolution
- **Maintains history quality**: Linear history requirement keeps commits clean
- **Ensures review**: All changes get proper code review before merge

### Common Scenarios

**Scenario 1: Your PR conflicts with main**

```bash
# Branch protection will require you to update before merge
git checkout your-branch
git rebase origin/main  # Resolve any conflicts
git push --force-with-lease origin your-branch
```

**Scenario 2: Working on dependent features**

1. Wait for base PR to merge to main
2. Branch from updated main for dependent work
3. This prevents the "wrong base branch" problem

**Scenario 3: Emergency hotfixes**

1. Still follow protection rules (no direct pushes to main)
2. Create hotfix PR with expedited review
3. Branch protection ensures quality even in emergencies

### Troubleshooting & Advanced Scenarios

For complex rebase situations, dependency detection, and branch protection issues, see:  
📖 **[Git Workflow Troubleshooting Guide](git-workflow-troubleshooting.md)**

## Testing & CI

**Testing**: See [Testing Guide](testing-guide.md) | Run `npm test` for current status  
**Advanced Patterns**: Mobile testing, device detection, and complex interaction patterns in [Testing Guide](testing-guide.md)  
**CI/CD**: See [CI/CD Guide](ci-cd.md) | All tests must pass in CI  
**CI stability and environment differences**: See [CI vs Local E2E Troubleshooting](ci-e2e-troubleshooting.md)  
**Commands**: See [Scripts Reference](scripts.md)

### CI Quick Checklist

- Pull latest main; branch from up-to-date main
- Lint and format check: `npm run lint && npm run format:check`
- Unit tests: `npm run test:unit`
- E2E tests (choose appropriate suite): see [Testing Environments](testing-environments.md)
- Security checks: `npm run security`
- If Playwright E2E is flaky locally, review [CI vs Local E2E Troubleshooting](ci-e2e-troubleshooting.md)
- Push and open PR; ensure CI is green before requesting review

## Architecture Health

Monitor architectural quality with these commands:

```bash
npm run health-check        # Full architecture assessment
npm run analyze:circular    # Circular dependency detection (critical)
npm run analyze:complexity  # Module complexity analysis
npm run test:coverage       # Current test coverage
npm run deps:check          # Dependency health check
```

**Health monitoring runs automatically** on PRs and weekly. All circular dependencies must be resolved before merging.

## Contributing

1. **Read** [Contributing Guidelines](../CONTRIBUTING.md)
2. **Create** feature branch, follow standards above
3. **Test** locally before submitting PR
4. **Document** any new patterns or features

## Version Management

**Semantic Versioning**: Use automated semver commands for releases

```bash
npm run version:patch   # Bug fixes (0.8.0 → 0.8.1)
npm run version:minor   # New features (0.8.0 → 0.9.0)
npm run version:major   # Breaking changes (0.8.0 → 1.0.0)
```

**Process**: Commands update `package.json` + sync HTML files automatically  
**Details**: See [Scripts Reference](scripts.md) for complete commands

## What's Where

- **Application Entry**: `src/js/app.js` - Main entry point (2 dependencies only)
- **Bootstrap System**: `src/js/core/bootstrap/` - Application initialization architecture
  - `AppBootstrap.js` - Main orchestrator with dependency chain management
  - `DataBootstrap.js` - Event bus, data store, state management initialization
  - `ServiceBootstrap.js` - Business logic services initialization
  - `UIBootstrap.js` - Canvas management and UI initialization
  - `InteractionBootstrap.js` - Input systems, gestures, event handling
- **Event Bus**: `src/js/core/eventBus.js` - Central communication hub
- **Services**: `src/js/services/` - Business logic layer
  - `colorService.js` - Color state management and validation
  - `noteService.js` - Note creation and manipulation
  - `connectionService.js` - Note connection handling
- **Features**: `src/js/features/` - UI components and interactions
  - `colorPicker/` - Color selection interface and events
  - `note/` - Note creation, editing, and color application
  - `connection/` - Connection drawing and management
- **Input Adapters**: `src/js/interactions/adapters/` - Platform-specific input handling
  - `BaseAdapter.js` - Abstract base for input adapters
  - `DesktopAdapter.js` - Mouse and keyboard interactions
  - `TouchAdapter.js` - Advanced touch and gesture interactions (Touch Mode)
  - `InputController.js` - Adapter selection and initialization
- **Gesture System**: `src/js/interactions/gestures/` - Touch gesture recognition
  - `GestureRecognizer.js` - Multi-touch gesture detection and state machine
  - `TouchState.js` - Touch point tracking and management
- **Mobile Interactions**: `src/js/utils/mobileInteractions.js` - Touch-friendly UI patterns
  - `setupMobileDropdown()` - Convert hover menus to touch-friendly dropdowns
  - `setupMobileModal()` - Consistent modal/overlay behavior with backdrop close
  - `setupTouchFeedback()` - Visual feedback for touch interactions
  - `isTouchDevice()` & `getViewportInfo()` - Device detection utilities
- **Data Layer**: `src/js/data/` - State management and persistence
  - Export/import includes color data via `cl` field
- **Health Monitoring**: [Architecture Health](architecture-health.md)
- **User Features**: [User Guide](user-guide.md)
- **Canvas Templates**: [Canvas Templates](canvas-templates.md)
- **Mobile Patterns**: [Mobile Interaction Patterns](mobile-interaction-patterns.md)

## Debugging Guide

### Touch Interaction Issues

**Problem**: Touch events not working or behaving inconsistently

**Debug steps:**

1. **Check element detection**:

```javascript
// Add to TouchAdapter.handleTap or relevant handler
console.log('🔥 Touch target debug:', {
  target: event.target,
  tagName: event.target?.tagName,
  className: event.target?.className,
  elementFromPoint: document.elementFromPoint(x, y),
});
```

2. **Verify CSS pointer events**:

```javascript
// Check computed styles for pointer-events
const computedStyle = getComputedStyle(element);
console.log('Pointer events:', computedStyle.pointerEvents);
```

3. **Trace event bubbling**:

```javascript
element.addEventListener('touchend', (event) => {
  console.log('Event path:', event.composedPath());
  console.log('Target vs currentTarget:', {
    target: event.target,
    currentTarget: event.currentTarget,
  });
});
```

### Event Handler Conflicts

**Problem**: Touch interactions work inconsistently or stop working after changes

**Common patterns:**

- TouchAdapter intercepting events before existing handlers
- `event.preventDefault()` called too early
- Event handler registration order dependencies

**Debug technique:**

```javascript
// Add to both TouchAdapter and desktop handlers
TouchAdapter.handleTap = function (touch) {
  console.log('TouchAdapter intercepted:', touch.target);
  // Check if you're calling preventDefault/stopPropagation
};

contextMenu.handleClick = function (event) {
  console.log('Desktop handler received:', event.target);
  // Verify event still has correct properties
};
```

### SVG Element Issues

**Problem**: SVG elements (PATH, circle) not responding to touch

**Check:**

1. CSS `pointer-events` configuration:

```css
#svg-container {
  pointer-events: none; /* Container should not intercept */
}

#svg-container path,
#svg-container circle,
#svg-container line {
  pointer-events: all; /* Elements should receive events */
}
```

2. Touch event handlers on SVG container:

```javascript
// SVG container should have touch handlers
svgContainer.addEventListener('touchend', this.handleClick);
```

### Regression Testing

When making touch-related changes:

1. **Manual test checklist**:
   - Test with `?mode=touch` parameter
   - Use browser dev tools mobile viewport
   - Test on actual mobile device
   - Verify desktop interactions still work

2. **Event handler audit**:

```javascript
// Check existing listeners in dev tools
getEventListeners(document.getElementById('svg-container'));
```

3. **Common regression patterns**:
   - New code intercepting existing event flows
   - CSS changes affecting `pointer-events`
   - Event handler registration order changes

### Performance Issues

**Problem**: Touch interactions feel laggy or unresponsive

**Optimization checklist:**

1. Use passive event listeners where possible:

```javascript
element.addEventListener('touchstart', handler, { passive: true });
```

2. Debounce expensive operations:

```javascript
const throttledUpdate = throttle(updateFunction, 16); // 60fps
```

3. Minimize DOM queries in touch handlers:

```javascript
// Cache elements instead of querying repeatedly
const cachedElement = document.querySelector('.target');
```

### Browser DevTools Tips

**Touch simulation:**

1. Open DevTools → Device Toolbar
2. Select mobile device or set custom viewport
3. Enable "Touch" option
4. Use `?mode=touch` parameter for MindMeld-specific touch mode

**Event debugging:**

1. Elements tab → Event Listeners panel
2. Console: `getEventListeners(element)`
3. Network tab: Check for event handler conflicts causing multiple requests

**Performance:**

1. Performance tab → Record during touch interactions
2. Look for long tasks during touch events
3. Check for memory leaks in touch event handlers
