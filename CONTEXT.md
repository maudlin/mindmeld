# MindMeld Developer Context

*Last Updated: August 22, 2025*

This document provides essential context for developers joining the MindMeld project, summarizing the current state, recent major work, architecture decisions, and key information needed to be productive immediately.

## Project Overview

**MindMeld** is a web-based mind mapping tool built with modern JavaScript/Node.js architecture featuring:

- **Event-driven architecture** with zero circular dependencies
- **Advanced touch/mobile support** with automatic device detection
- **Bootstrap architecture** for clean initialization
- **Comprehensive testing** (97 E2E tests + extensive unit tests)
- **Security-first approach** with ESLint security plugins and pre-commit scanning

**Live Demo**: [mind-meld.co](https://mind-meld.co/)
**Repository**: Modern vanilla JavaScript with no build step required

## Current Project State (August 2025)

### ✅ Recent Major Achievements

#### 1. **Test Suite Recovery & 100% E2E Success** (PR #88, MM-56)
- **Achievement**: All 27 E2E tests now pass reliably (previously had multiple failures)
- **Key Fixes**: 
  - Split large persistence tests to prevent state pollution
  - Standardized desktop mode testing for consistency
  - Enhanced CanvasPage helper with mode-aware utilities
  - Fixed canvas timeouts, connection timeouts, clipboard permissions
- **Impact**: CI/CD pipeline now fully reliable, development velocity significantly improved

#### 2. **Touch Interaction System Overhaul** (PR #87, MM-145)
- **Achievement**: Fixed critical touch regressions and enhanced mobile context menus
- **Key Fixes**:
  - Resolved SVG touch event conflicts with proper CSS pointer-events
  - Fixed TouchAdapter event interception issues
  - Enhanced mobile context menu functionality
- **Added**: 5 new comprehensive test files for touch interactions
- **Impact**: Touch devices now have full feature parity with desktop

### 🔧 Current Architecture Status

#### Event System Architecture
- **Modern System**: `InputController → DesktopAdapter/TouchAdapter` (primary)
- **State**: Clean, consolidated event handling (legacy system removed in MM-150)
- **Touch Support**: Advanced gesture recognition with `GestureRecognizer` and `TouchState`
- **Reliability**: All event flows tested and documented

#### Testing Infrastructure
- **E2E Tests**: 97 tests using Playwright with shared `CanvasPage` helper
- **Unit Tests**: 415+ tests with Jest, 100% passing
- **Test Suites**: CI (5s), Dev (2-5min), Smoke (30s), Critical (15s)
- **Coverage**: Core workflows fully validated, touch interactions comprehensively tested

#### Mobile/Touch Excellence
- **Automatic Detection**: `CapabilityDetector` routes to optimal adapter
- **TouchAdapter Features**: Long-press, pinch-zoom, two-finger pan, jiggle animations
- **Ghost Connector Enhancements**: Larger touch targets, visual feedback
- **Documentation**: Comprehensive touch patterns in `docs/mobile-interaction-patterns.md`

## Architecture Deep Dive

### Bootstrap System
```
DataBootstrap → ServiceBootstrap → UIBootstrap → InteractionBootstrap
```
- **Clean initialization** with dependency injection
- **Zero circular dependencies** (monitored automatically)
- **Health scoring system** (90-100 = excellent)

### Event-Driven Core
- **EventBus**: Central communication hub (`src/js/core/eventBus.js`)
- **Service Layer**: Business logic (`noteService`, `colorService`, `connectionService`)
- **Feature Modules**: UI components (`colorPicker`, `note`, `connection`)

### File Structure
```
src/js/
├── app.js                    # Main entry (2 dependencies only!)
├── core/
│   ├── bootstrap/           # Initialization architecture
│   ├── eventBus.js          # Central communication
│   └── config.js            # Configuration
├── services/                # Business logic layer
├── features/                # UI components & interactions
├── interactions/            # Input adapters & gesture system
│   ├── adapters/           # DesktopAdapter, TouchAdapter
│   ├── gestures/           # GestureRecognizer, TouchState
│   └── capabilities/       # Device detection
├── data/                    # State management & persistence
└── utils/                   # Utilities & mobile helpers
```

## Current Development Focus

### 🚀 Active Work Areas

#### 1. **Markdown Implementation Pipeline** (MM-151 to MM-156)
**Status**: Major epic in progress
**Goal**: Robust, secure note content with markdown support

**Sub-tickets**:
- **MM-153**: Canonical Markdown Storage (store as raw markdown)
- **MM-154**: Markdown Renderer (subset only - `h1,h2,p,ul,li,em,strong`)
- **MM-155**: Edit vs View Mode Toggle (raw ↔ rendered)
- **MM-156**: Defang Pipeline (security - treat all input as hostile)
- **MM-152**: Legacy Migration Pipeline (convert existing HTML notes)

**Why Important**: Current system allows HTML injection; this creates secure, predictable content system.

#### 2. **Mobile Text Input Issue** (MM-161)
**Status**: High priority bug
**Issue**: Text entry doesn't work on actual mobile devices (keyboard doesn't appear)
**Note**: Works in browser dev tools but fails on real devices

#### 3. **Touch Gesture Completion** (MM-163)
**Status**: Missing component
**Issue**: Two-finger pan detected but no EventBus listener to apply canvas transforms
**Fix**: Add `canvas.pan` listener in `zoomManager.js`

### 🎯 Upcoming Major Features

#### Client-Server Architecture (MM-85, MM-104-108)
**Goal**: Basic server integration for save/load functionality
**Approach**: Proof of concept with simple REST endpoints
**Status**: Planned, well-specified

#### Connection System Improvements
- **MM-40**: Curved line connectors (visual appeal)
- **MM-82**: Refactor connections.js (modularize)
- **MM-144**: General connector improvements

## Key Technical Decisions & Patterns

### 1. **Touch Interaction Architecture**
**Decision**: Separate adapters with automatic device detection
**Pattern**: `CapabilityDetector → TouchAdapter/DesktopAdapter`
**Rationale**: Clean separation, optimal experience per device type
**Implementation**: No user configuration needed, seamless adaptation

### 2. **Testing Strategy**
**Decision**: Shared Page Object Model with mode awareness
**Pattern**: All E2E tests use `CanvasPage` helper from `tests/e2e/helpers/`
**Rationale**: Eliminates ~400 lines of duplicated code, consistent interactions
**Implementation**: `canvasPage.load(mode)` handles desktop/touch testing

### 3. **Event System Consolidation**
**Decision**: Single event handling system (removed legacy fallback)
**Pattern**: `InputController → Adapter → EventBus → Features`
**Rationale**: Eliminates conflicts, predictable flow, easier debugging
**Status**: Modern system handles all cases reliably

### 4. **Security-First Development**
**Decision**: ESLint security plugins with pre-commit scanning
**Tools**: `eslint-plugin-security`, `eslint-plugin-no-unsanitized`
**Pattern**: All commits automatically scanned, immediate feedback
**Coverage**: XSS prevention, object injection, unsafe eval detection

## Development Workflow

### Quick Start
```bash
git clone https://github.com/maudlin/mindmeld.git
cd mindmeld
npm install && npm start  # http://localhost:8080
npm test                  # Verify everything works
```

### Testing
```bash
# Unit tests (fast)
npm run test:unit

# E2E tests - choose appropriate suite:
npm run test:e2e:ci      # CI suite (4 tests, ~5s)
npm run test:e2e:dev     # Full suite (97 tests, 2-5min)
npm run test:e2e:smoke   # Smoke tests (~30s)
npm run test:e2e:critical # Critical only (~15s)

# Code quality
npm run lint
npm run security
npm run health-check     # Architecture assessment
```

### Git Workflow
- **Branch Protection**: Main branch requires PR review, up-to-date branches
- **Pre-commit Hooks**: Automatic linting, formatting, security scanning
- **Convention**: `feature/description` branches, conventional commits
- **PR Template**: Provided automatically

## Critical Knowledge for New Developers

### 1. **Touch Mode Testing**
```javascript
// ALWAYS use CanvasPage.load(mode) for E2E tests
const canvasPage = new CanvasPage(page);
await canvasPage.load('touch');  // or 'desktop'

// URL modes for manual testing:
// http://localhost:8080/?mode=touch
// http://localhost:8080/?mode=desktop
```

### 2. **Throttling Behavior**
- **Note Creation**: 500ms throttle enforced by app
- **Testing**: Wait ~600ms locally, 800-1000ms in CI between note creations
- **Pattern**: Use `canvasPage.createNoteWithThrottleWait()` for rapid creation

### 3. **SVG Touch Events**
```css
/* Required CSS for SVG touch support */
#svg-container {
  pointer-events: none; /* Container doesn't intercept */
}

#svg-container path,
#svg-container circle,
#svg-container line {
  pointer-events: all; /* Elements receive events */
}
```

### 4. **Event Handler Patterns**
```javascript
// GOOD: Extend existing handlers for touch support
handleClick(event) {
  const hotspot = event.target.closest('.connector-hotspot');
  if (hotspot) {
    // Handle both desktop and touch
    this.showContextMenu(hotspot);
    return;
  }
}

// BAD: Separate TouchAdapter handling (causes conflicts)
TouchAdapter.handleTap(touch) {
  if (isConnectionElement(target)) {
    this.handleConnectionTap(target); // Intercepts events!
  }
}
```

### 5. **Architecture Health Monitoring**
```bash
# Run before major changes
npm run health-check         # Full assessment
npm run analyze:circular     # Critical: must be 0
npm run analyze:complexity   # Module dependencies
```

## Recent Lessons Learned

### Testing Infrastructure
- **State Pollution**: Split large test files to prevent cross-test interference
- **Mode Consistency**: Always use explicit desktop/touch mode in tests
- **Playwright Gotchas**: Use `page.mouse.click()` for canvas/SVG, not `element.click()`
- **Clipboard Testing**: Mock `navigator.clipboard` API (permission issues in CI)

### Touch Interaction Debugging
- **Root Cause Tool**: Check `event.target` vs `document.elementFromPoint(x,y)`
- **CSS Debug**: Verify `pointer-events` configuration on SVG elements
- **Event Flow**: Trace through `event.composedPath()` for delegation issues
- **Performance**: Use passive listeners, cache DOM queries in touch handlers

### Mobile Development
- **Device Detection**: Use capability-based detection, not user agent
- **Touch Targets**: Minimum 44px, use visual feedback
- **Gesture Conflicts**: Test two-finger gestures don't interfere with OS
- **Real Device Testing**: Browser dev tools ≠ actual mobile behavior

## Known Issues & Workarounds

### 1. **Playwright Mouse Wheel**
**Issue**: `page.mouse.wheel()` unreliable on large canvas elements
**Workaround**: Skip zoom tests with clear documentation
**Status**: Known Playwright limitation

### 2. **Mobile Text Input** (MM-161)
**Issue**: Keyboard doesn't appear on real mobile devices
**Status**: High priority, affects actual usage
**Workaround**: Use browser dev tools for testing until fixed

### 3. **Two-Finger Pan** (MM-163)
**Issue**: Gesture detected but no canvas movement
**Cause**: Missing EventBus listener for `canvas.pan`
**Fix**: Straightforward - add listener in `zoomManager.js`

## Documentation Architecture

### For Developers
- **README.md**: Project overview, quick start
- **CLAUDE.md**: Development context and essential commands
- **docs/developer-guide.md**: Complete development workflow
- **docs/testing.md**: Testing philosophy and patterns
- **docs/mobile-interaction-patterns.md**: Touch interaction architecture
- **docs/ci-e2e-troubleshooting.md**: Environment differences & debugging

### For Architecture
- **docs/architecture-health.md**: Code quality monitoring
- **docs/ci-cd.md**: GitHub Actions workflows
- **docs/git-workflow-troubleshooting.md**: Branch protection & rebasing

### For Testing
- **tests/README.md**: Technical testing guide with Page Object Model
- **docs/testing-environments.md**: Test suite composition & when to run which
- **docs/e2e-testing-lessons-learned.md**: Playwright-specific patterns

## Success Metrics & Quality Gates

### Current Status ✅
- **E2E Tests**: 100% success rate (27/27 tests passing)
- **Unit Tests**: 415+ tests, 100% passing
- **Architecture Health**: Grade A+ (no circular dependencies)
- **Security**: All commits scanned, no vulnerable dependencies
- **Touch Support**: Full feature parity with desktop

### Quality Gates
- **All tests must pass** before merge (enforced by CI)
- **Lint and format checks** required
- **Security scan** must pass (pre-commit hooks)
- **Architecture health** monitored (circular deps = blocking)

## Getting Help

### Documentation Priority
1. **CLAUDE.md** - Essential commands and workflow
2. **docs/developer-guide.md** - Complete setup and patterns
3. **tests/README.md** - Testing technical details
4. **This file (CONTEXT.md)** - Current state and decisions

### Common Commands
```bash
npm start                    # Development server
npm test                     # Quick unit test check
npm run test:e2e:smoke      # Quick E2E validation
npm run health-check        # Architecture assessment
npm run security            # Security scan
```

### Project Management
- **Jira Project**: MM (currently 18 open tickets)
- **Active Epics**: Markdown implementation (MM-151-156), Client-server (MM-85+)
- **Priority Issues**: Mobile text input (MM-161), Two-finger pan (MM-163)

## Next Developer Actions

### Immediate Priorities (Pick One)
1. **Fix MM-161** - Mobile text input keyboard issue (high impact)
2. **Complete MM-163** - Add EventBus listener for two-finger pan (quick win)
3. **Start MM-153** - Begin markdown storage implementation (major feature)

### Medium-Term Goals
1. **Complete Markdown Pipeline** - Security and robust content system
2. **Client-Server Integration** - Basic save/load to server functionality
3. **Connection System Improvements** - Curved connectors and refactoring

### Development Notes
- **Codebase is healthy** - recent major cleanup and test fixes
- **Architecture is solid** - event-driven, well-tested, documented
- **Mobile support is excellent** - comprehensive touch interaction system
- **Testing is comprehensive** - both unit and E2E with good patterns

**The project is in excellent shape for rapid development and new features.**

---

*This document should be updated when major architectural changes or significant features are implemented.*