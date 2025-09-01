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

#### Dependency Detection & Prevention

**Quick PR Dependency Check** - Before creating a new PR:

```bash
# 1. Check what files you're modifying
git diff --name-only main..HEAD

# 2. Check open PRs for file conflicts
gh pr list --state open --json number,title,files

# 3. Look for overlapping file changes
# If you see the same files in multiple PRs, coordinate with the team
```

**High-Risk Conflict Areas:**
- Core testing infrastructure files (helpers, page objects)
- `package.json` - Scripts and dependencies
- Any files in `src/js/core/` - Core architecture
- Test spec files (`*.spec.js`, `*.test.js`)
- Documentation files (`docs/*.md`)

**Dependency Resolution Strategies:**

1. **Sequential Development (Recommended)**: Wait for infrastructure PRs to merge first
2. **Stacked PRs (Advanced)**: Base work on another open PR branch, rebase after merge
3. **Team Coordination**: Comment on related PRs, use draft PRs for early coordination

#### Branch Protection Error Resolution

**"Branch is not up to date" Error:**
```bash
git checkout your-branch
git fetch origin
git rebase origin/main
# Resolve any conflicts
git push --force-with-lease origin your-branch
```

**"Linear history required" Error:**
```bash
# Use rebase instead of merge
git checkout your-branch
git rebase origin/main  # Instead of git merge main
git push --force-with-lease origin your-branch
```

**"Required status checks failed" Error:**
```bash
# Run checks locally first
npm test && npm run test:e2e
npm run lint && npm run format:check

# Fix any failures, then push
git add .
git commit -m "fix: resolve test failures"
git push origin your-branch
```

#### Complex Rebase Scenarios

**Multiple Conflicted Commits:**
```bash
# Start interactive rebase
git rebase -i origin/main

# For each conflict:
# 1. Resolve conflicts in files
# 2. git add resolved-files
# 3. git rebase --continue
# 4. Repeat until done

# Force push when complete
git push --force-with-lease origin your-branch
```

**Preserving Important Work:**
```bash
# Create backup branch first
git checkout your-branch
git checkout -b your-branch-backup

# Then proceed with rebase on original branch
git checkout your-branch
git rebase origin/main
# If rebase goes wrong, restore from backup
```

#### Team Communication Patterns

**PR Dependency Comments:**
```
## Dependencies
This PR depends on #123 (E2E infrastructure improvements) merging first.

**Files in common:**
- `tests/e2e/helpers/CanvasPage.js` - extends the infrastructure from #123
- `package.json` - adds test scripts building on #123

**Merge order:** #123 → this PR
```

**Coordinating Overlapping Work:**
```
@teammate I see we're both modifying `CanvasPage.js`.

My changes: Adding connection verification methods
Your changes: Browser closure protection

Suggest: Your infrastructure PR merges first, then I'll rebase and extend it.
```

## Testing & CI

**Testing**: See [Testing Guide](testing-guide.md) | Run `npm test` for current status  
**Advanced Patterns**: Mobile testing, device detection, and complex interaction patterns in [Testing Guide](testing-guide.md)  
**CI/CD**: See [CI/CD Guide](ci-cd.md) | All tests must pass in CI  
**Commands**: See [Scripts Reference](scripts.md)

### CI Quick Checklist

- Pull latest main; branch from up-to-date main
- Lint and format check: `npm run lint && npm run format:check`
- Unit tests: `npm run test:unit`
- E2E tests: `npm run test:e2e` (local development only)
- Security checks: `npm run security`
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

## Adapter-Behavior Architecture

MindMeld uses a **clean separation** between input detection and business logic through the **Adapter-Behavior pattern**. This architecture eliminates code duplication while preserving platform-specific optimizations.

### Core Principles

#### 1. Single Responsibility Separation

- **Adapters**: Pure input detection and translation
- **Behaviors**: Pure business logic and coordination
- **No mixed responsibilities** - adapters never emit business events, behaviors never handle platform input

#### 2. Platform Abstraction

- **Desktop interactions** (mouse, keyboard) and **Touch interactions** (gestures) are completely different input mechanisms
- **Business logic** (note creation, editing, dragging) is identical regardless of input method
- Adapters translate platform-specific input into universal behavior calls

#### 3. Behavior Reuse

- One behavior class handles the same interaction across all platforms
- Example: `NoteBehavior.requestEditMode()` works identically for desktop clicks and touch taps
- Zero code duplication between platforms

### Input Flow Architecture

```
User Interaction → Adapter (Input Detection) → Behavior (Business Logic) → EventBus → Services
```

### Component Responsibilities

#### Adapters (Input Translation Layer)

**Purpose**: Detect platform-specific input patterns and delegate to appropriate behaviors

**DO**:
- ✅ Detect input events (clicks, taps, drags, gestures)
- ✅ Identify interaction targets (note, canvas, connector)
- ✅ Call appropriate behavior methods with normalized parameters

**DON'T**:
- ❌ **Never** emit business events directly
- ❌ **Never** contain business logic (selection, editing, creation)
- ❌ **Never** manipulate DOM or application state

**Example Implementation**:

```javascript
// DesktopAdapter - Input detection only
handleDoubleClick(event) {
  const noteElement = event.target.closest('.note');

  if (noteElement) {
    // Delegate to behavior - no business logic here
    this.noteBehavior.handleNoteDoubleClick(noteElement, event, 'desktop');
  } else if (this.isCanvasClick(event.target)) {
    // Delegate to behavior - no business logic here
    this.canvasBehavior.handleCanvasDoubleClick(event, 'desktop');
  }
}

// TouchAdapter - Input detection only (same pattern)
handleDoubleTap(touch) {
  const target = this.expandTouchTarget(touch);
  const noteElement = target.closest('.note');

  if (noteElement) {
    // Same behavior call, different input type
    this.noteBehavior.handleNoteDoubleClick(noteElement, touch, 'touch');
  } else {
    // Same behavior call, different input type
    this.canvasBehavior.handleCanvasDoubleClick(touch, 'touch');
  }
}
```

#### Behaviors (Business Logic Layer)

**Purpose**: Handle interaction logic and coordinate with services

**DO**:
- ✅ Implement all business logic for interaction types
- ✅ Emit events to EventBus for service coordination
- ✅ Manage interaction state and validation
- ✅ Coordinate with services (noteManager, connectionManager, etc.)

**DON'T**:
- ❌ **Never** handle platform-specific input events directly
- ❌ **Never** contain input detection logic

**Example Implementation**:

```javascript
// NoteBehavior - Business logic only
handleNoteDoubleClick(noteElement, inputEvent, inputType) {
  // Business logic: ensure note is selected
  if (!noteElement.classList.contains('selected')) {
    noteManager.selectNote(noteElement);
  }

  // Business logic: request edit mode
  this.eventBus.emit('note.requestEdit', {
    noteId: noteElement.id,
    noteElement,
    inputType
  });
}
```

### Interaction Types and Ownership

- **Note Interactions** → `NoteBehavior` (selection, editing, movement)
- **Canvas Interactions** → `CanvasBehavior` (note creation, selection clearing)
- **Drag Operations** → `DragBehavior` (note movement, connection updates)
- **Multi-Selection** → `SelectionBoxBehavior` (selection box creation, multi-select)

### Platform-Specific Optimizations

#### DesktopAdapter Specializations
- Precise pointer coordinates
- Right-click context menus
- Hover states and feedback
- Keyboard shortcuts

#### TouchAdapter Specializations
- Hit target expansion (20px) for mobile
- Multi-touch gesture recognition (pinch, two-finger pan)
- Visual touch feedback and jiggle animations
- Long-press detection with timing

### TouchAdapter Native Implementation

TouchAdapter implements **native gesture recognition** as the single source of truth, matching the DesktopAdapter pattern:

```javascript
class TouchAdapter {
  // Single gesture detection point (like DesktopAdapter)
  setupNativeTouchHandlers() {
    this.canvas.addEventListener('touchstart', this.boundHandlers.touchStart);
    this.canvas.addEventListener('touchmove', this.boundHandlers.touchMove);
    this.canvas.addEventListener('touchend', this.boundHandlers.touchEnd);
  }

  // Direct gesture recognition with clean routing
  touchStart: (event) => {
    const touch = event.touches[0];
    const now = Date.now();
    
    // Double-tap detection
    if (this.lastTap && 
        (now - this.lastTap.time) <= 300 &&
        distance <= 30) {
      this.handleDoubleTap(touch);
      return;
    }
    
    // Long press timer
    this.longPressTimer = setTimeout(() => {
      this.handleLongPress(touch);
    }, 500);
  }
}
```

**Benefits**:
- ✅ **Single source of truth** for touch input (matches DesktopAdapter pattern)
- ✅ **No competing gesture systems** or event bus complexity
- ✅ **Clean console logs** - one user gesture = one detection message
- ✅ **Direct behavior delegation** without intermediate layers
- ✅ **Easier debugging** - single input detection point

### Architecture Testing Strategy

#### Adapter Tests
Focus on input detection - test that correct behavior methods are called with correct parameters

#### Behavior Tests
Focus on business logic - test state management, event emission, and service coordination

### Common Anti-Patterns to Avoid

1. **Bypassing Behaviors**: Adapters emitting business events directly
2. **Mixed Responsibilities**: Behaviors handling platform-specific input
3. **Code Duplication**: Same logic in multiple adapters instead of shared behavior
4. **Competing Systems**: Multiple gesture detection systems interfering with each other

## Markdown Parsing Architecture

MindMeld implements a **security-first markdown rendering system** with comprehensive data corruption resistance. This architecture was built in response to **MM-174: CRITICAL Page Refresh Corrupts Markdown Content**, preventing data loss through multiple layers of protection.

### Core Architecture

```
User Input → Defang Pipeline → Storage → Retrieval → Markdown Renderer → Safe HTML
     ↑                                                        ↓
     └─────────── Edit Mode Content Extraction ←──────────────┘
```

### Core Principles

1. **Defang-First**: ALL input passes through security defang before storage
2. **Markdown-Only Storage**: Only markdown is persisted, never HTML
3. **Safe Rendering**: HTML generation happens only at render time with whitelisted tags
4. **Round-Trip Integrity**: Content maintains fidelity through edit/view cycles

### Key Components

#### 1. Defang Pipeline (`src/js/features/markdown/defangPipeline.js`)

**Primary security boundary** for ALL content with:

- **Size enforcement**: 10KB maximum input prevents DoS attacks
- **Dangerous URI removal**: `javascript:`, `data:`, `vbscript:` schemes stripped
- **Safe HTML parsing**: Uses DOMParser for security when `isHtml=true`
- **Whitespace preservation**: Maintains markdown structure through normalization

```javascript
// Critical security check
if (text.length > MAX_INPUT_SIZE) {
  return ''; // Reject oversized input
}

// Dangerous URI removal
result = result.replace(DANGEROUS_URI_SCHEMES, '');
```

#### 2. Markdown Renderer (`src/js/features/markdown/markdownRenderer.js`)

**Safe HTML generation** with:

- **Supported elements**: Headers (`# H1`, `## H2`), emphasis (`*italic*`, `**bold**`), lists (`- item`)
- **Security-first**: HTML escape ALL text content before processing
- **Whitelisted tags only**: `['h1', 'h2', 'p', 'ul', 'li', 'em', 'strong']`
- **No attributes**: Zero attributes or inline styles ever output

```javascript
// 1. HTML escape ALL text content first
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// 2. Generate only whitelisted HTML tags
const ALLOWED_TAGS = ['h1', 'h2', 'p', 'ul', 'li', 'em', 'strong'];
```

#### 3. Content Extraction (`src/js/features/note/editViewMode.js`)

**Critical for data integrity** - `getCurrentMarkdownContent()` function:

```javascript
export function getCurrentMarkdownContent(noteContent) {
  // NEW: Check if noteContent itself is a textarea (revolutionary architecture)
  if (noteContent.tagName === 'TEXTAREA' && 
      noteContent.classList.contains('edit-textarea')) {
    return noteContent.value; // Direct access to textarea value
  }

  // View mode: Use stored markdown from dataset
  return noteContent.dataset.markdown || '';
}
```

**Why this matters:**
- **Edit mode**: Returns raw text user is typing (markdown)
- **View mode**: Returns stored markdown from dataset, NOT rendered HTML
- **Never returns HTML**: Prevents the MM-174 corruption cycle

### Revolutionary Textarea-Replaces-Div Architecture

MindMeld implements a breakthrough **"element replacement"** architecture for seamless edit/view mode transitions:

**View Mode**:
```html
<div class="note-content view-mode">Rendered HTML content</div>
```

**Edit Mode**:
```html
<textarea class="note-content edit-mode edit-textarea">Raw markdown</textarea>
```

**Key Benefits**:
- ✅ **Event delegation works**: Textarea IS .note-content, so all existing click handlers work
- ✅ **Focus management**: No interference from parent divs or other UI elements
- ✅ **Clean transitions**: Element replacement creates seamless view/edit switching
- ✅ **CSS inheritance**: Textarea inherits exact same styling as div

### Data Corruption Prevention (MM-174)

Multiple layers prevent the corruption cycle where markdown becomes HTML:

**Original Problem**:
- `# H1` (markdown) → `<h1>H1</h1>` (HTML in storage) → `H1` (plain text after defanging)

**Prevention Layers**:
1. **Content Extraction**: `getCurrentMarkdownContent()` never returns HTML
2. **Storage Validation**: Only markdown persisted to localStorage
3. **Render Separation**: HTML generation happens only at display time
4. **Dataset Backup**: `data-markdown` attribute preserves source

### Security Hardening

#### Input Validation
- **Size limits**: 10KB maximum prevents DoS attacks
- **Type coercion**: All input safely converted to string
- **Null handling**: Graceful handling of null/undefined input

#### XSS Protection
- **HTML sanitization**: DOMParser with script/style removal
- **Attribute stripping**: No attributes ever output in final HTML
- **URI scheme filtering**: Dangerous URIs removed from ANY context

```javascript
const DANGEROUS_URI_SCHEMES = /\b(?:javascript|data|vbscript):[^\s]*/gi;
result = result.replace(DANGEROUS_URI_SCHEMES, '');
```

### Performance & Robustness

- **O(n) processing**: Linear time complexity for all operations
- **No regex backtracking**: Manual parsing prevents catastrophic backtracking
- **Memory efficient**: Line-by-line processing, limited recursion
- **Graceful degradation**: Unsupported markdown becomes plain text

### Integration Points

**Data Store** (`src/js/data/dataStore.js`):
```javascript
export function getCurrentState() {
  const notes = Array.from(document.querySelectorAll('.note')).map((noteElement) => {
    const noteContent = noteElement.querySelector('.note-content');
    
    // CRITICAL: Use getCurrentMarkdownContent, never innerHTML
    const content = getCurrentMarkdownContent(noteContent) || '';
    
    return {
      id: noteElement.id,
      content: content, // Always markdown, never HTML
      // ... position data
    };
  });
}
```

### Critical Maintenance Guidelines

- **Never bypass defang**: All user content MUST pass through security pipeline
- **Preserve line structure**: Newlines are critical for markdown parsing
- **Maintain dataset**: Always keep `data-markdown` in sync with display
- **Test refresh cycles**: Any storage changes must be tested across page refreshes

### Testing Requirements

**Regression Tests** (`tests/unit/data/refreshPersistenceRegression.test.js`):
- **Purpose**: Prevent return of MM-174 data corruption bug
- **Critical**: These tests MUST PASS always

**Security Tests** (`tests/unit/features/markdown/defangPipeline.test.js`):
- XSS vector prevention (15+ attack patterns tested)
- Size limit enforcement
- Dangerous URI scheme removal

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
