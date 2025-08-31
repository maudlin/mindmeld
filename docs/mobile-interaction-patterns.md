# Mobile Interaction Patterns

This document outlines the mobile-friendly interaction patterns used throughout MindMeld, including the advanced TouchAdapter system for refined touch interactions.

## Overview

MindMeld provides adaptive mobile interactions that automatically detect your device capabilities:

1. **Automatic Detection**: Advanced capability detection determines optimal interaction mode
2. **Touch-First Devices**: Full touch-optimized interaction system with enhanced visual feedback
3. **Desktop-First Devices**: Traditional mouse/keyboard interactions with optional touch support

### Adaptive Touch Architecture

The system uses the **CapabilityDetector** (`src/js/interactions/capabilities/detector.js`) to automatically determine device capabilities and route to the appropriate adapter:

- **TouchAdapter** (`src/js/interactions/adapters/TouchAdapter.js`) for touch-first devices:
  - **Native Gesture Detection**: Single source of truth for all touch gesture recognition (like DesktopAdapter)
  - **Direct Behavior Delegation**: Clean routing to behaviors without intermediate event bus complexity
  - **Canvas Integration**: Direct integration with zoom, pan, and selection systems  
  - **Visual Feedback**: Touch-optimized visual responses including jiggle animations
  - **Enhanced Ghost Connectors**: Tap-to-tap connection creation with visual connection mode

- **DesktopAdapter** for desktop-first devices with traditional mouse/keyboard optimization

## Touch Device Interactions (Automatic)

### Native Touch Interaction Model

TouchAdapter implements a **native gesture detection system** as single source of truth, automatically activated for touch-first devices:

#### Core Interaction Patterns

**Single-Finger Gestures:**

- **Tap**: Select notes, activate UI elements
- **Double-tap on canvas**: Create new notes
- **Double-tap on notes**: Enter edit mode
- **Long-press**: Prepare for note movement with jiggle animation (500ms hold time)
- **Drag on canvas**: Multi-select lasso selection
- **Long-press and drag**: Move notes after long-press detection with visual feedback
- **Tap ghost connector**: Enter connection mode (all ghost connectors become visible)
- **Tap note during connection mode**: Complete connection between source and target notes
- **Tap canvas during connection mode**: Cancel connection creation

**Two-Finger Gestures:**

- **Pinch**: Zoom in/out with scale detection
- **Two-finger drag**: Canvas panning
- **Combined gestures**: Simultaneous zoom and pan

#### ⚠️ **Architecture Note: Native Gesture Detection**

**NEW APPROACH**: TouchAdapter now uses **native gesture detection** as single source of truth, eliminating competing gesture systems and state machine conflicts:

```javascript
// ✅ NATIVE APPROACH - Direct touch event handling (like DesktopAdapter)
setupNativeTouchHandlers() {
  this.canvas.addEventListener('touchstart', this.boundHandlers.touchStart);
  this.canvas.addEventListener('touchmove', this.boundHandlers.touchMove);
  this.canvas.addEventListener('touchend', this.boundHandlers.touchEnd);
}

// Direct gesture recognition with clean state management
touchStart: (event) => {
  const touch = event.touches[0];
  const now = Date.now();
  
  // Double-tap detection with proper timing
  if (this.lastTap && 
      (now - this.lastTap.time) <= 300 &&
      distance <= 30) {
    this.handleDoubleTap(touch);
    return;
  }
  
  // Store tap for potential double-tap
  this.lastTap = { time: now, x: touch.clientX, y: touch.clientY };
  
  // Start long press timer
  this.longPressTimer = setTimeout(() => {
    this.handleLongPress(touch);
  }, 500);
}
```

**Benefits of Native Approach**:

- ✅ **Single source of truth** (like DesktopAdapter pattern)
- ✅ **No competing gesture systems** or event bus complexity  
- ✅ **Clean console logs** - one gesture = one log message
- ✅ **Direct behavior delegation** without intermediate layers
- ✅ **Easier debugging** - single input detection point

#### Technical Implementation

```javascript
// TouchAdapter usage (automatically activated for touch-first devices)
// Device detection via CapabilityDetector

// The system automatically:
// 1. Detects device capabilities using media queries
// 2. Routes to TouchAdapter for touch-first devices
// 3. Enables native gesture recognition as single source of truth
// 4. Provides visual feedback including jiggle animations
// 5. Enhances ghost connectors for touch interaction
// 6. Integrates seamlessly with zoom/pan systems
```

#### Native Gesture State Machine

The TouchAdapter uses a **direct gesture detection system** (no intermediate layers):

1. **Touch Start**: Direct native touch event handling with timing detection
2. **Movement Detection**: Real-time distance calculation for drag threshold detection  
3. **Long-Press Detection**: Native setTimeout-based detection for note movement prep
4. **Gesture Classification**: Direct routing based on touch patterns and timing
5. **Behavior Delegation**: Clean delegation to appropriate behaviors (NoteBehavior, DragBehavior, etc.)
6. **Visual Feedback**: Jiggle animations and enhanced ghost connector displays

**Key Difference**: Unlike complex event bus systems, native detection routes **directly** to behaviors, matching the DesktopAdapter pattern.

### Enhanced Touch Features (Recent Updates)

The TouchAdapter system includes several advanced features for improved mobile experience:

#### Connection Creation System (ConnectionBehavior)

**Platform-Specific Connection Patterns:**

**Desktop Connection Flow:**

- Click ghost connector → immediate drag line follows cursor
- Drag to target note → connection creates on mouse release
- Drag to empty space → cancels connection

**Touch Connection Flow:**

- Tap ghost connector → enters "connection mode"
- **Visual feedback**: ALL ghost connectors become visible on all notes
- Tap any note → completes connection between source and target
- Tap canvas → cancels connection mode
- **CSS class**: `.connection-mode` added to body during active connection mode

**Implementation Details:**

```javascript
// ConnectionBehavior handles both desktop and touch patterns
// Desktop: immediate drag interaction
connectionBehavior.startDesktopDrag(sourceNote, event, 'desktop');

// Touch: tap-to-tap with visual mode indication
connectionBehavior.startTouchDrag(sourceNote, event, 'touch');
// This automatically calls showAllGhostConnectors()
```

**CSS Requirements for Connection Mode:**

```css
/* Normal state - ghost connectors hidden */
.ghost-connector {
  opacity: 0;
  visibility: hidden;
}

/* Connection mode - show all ghost connectors */
.connection-mode .ghost-connector {
  opacity: 1 !important;
  visibility: visible !important;
}

/* Source note visual feedback */
.connection-source {
  border: 2px dashed #007acc;
  animation: pulse-connection 1s infinite;
}
```

#### Ghost Connector Enhancements

- **Automatic sizing**: Ghost connectors adapt to device type (larger on touch devices)
- **Visual feedback**: Connection mode shows all ghost connectors simultaneously
- **Touch-friendly targets**: Expanded hit areas for easier connection creation
- **CSS transitions**: Smooth animations scoped to touch devices only using `@media (pointer: coarse)`

#### Jiggle Animation System

- **Ready-to-drag feedback**: Notes show subtle jiggle animation after long-press timeout
- **Visual confirmation**: Users know when a note is ready to be moved
- **Automatic cleanup**: Animation automatically removes after completion or cancellation
- **Touch-only activation**: Animation only appears on touch devices

#### Advanced Device Detection

- **CapabilityDetector**: Uses CSS media queries to detect device capabilities
- **Desktop-first priority**: Hybrid devices (laptops with touchscreens) prefer desktop interactions
- **Touch-first detection**: Pure touch devices (phones, tablets) get full touch optimization
- **Automatic routing**: No user configuration needed - seamless adaptation

```javascript
// Example: How the system detects device capabilities
const detector = new CapabilityDetector();

// Desktop-first devices (laptops with touchscreens)
if (detector.isDesktopFirst()) {
  // Use DesktopAdapter - mouse/keyboard optimized
  // Touch support as secondary
}

// Touch-first devices (phones, tablets)
if (detector.isTouchFirst()) {
  // Use TouchAdapter - touch optimized
  // Enhanced ghost connectors, jiggle animations, etc.
}
```

## Standard Mode Utilities

For basic mobile compatibility, these utilities are available in `src/js/utils/mobileInteractions.js`:

### 1. Mobile Dropdowns (`setupMobileDropdown`)

Converts hover-based dropdown menus to touch-friendly click-to-open/click-away-to-close behavior.

**Usage:**

```javascript
import { setupMobileDropdown } from '../utils/mobileInteractions.js';

// Basic usage
setupMobileDropdown('.menu-item');

// With options
setupMobileDropdown('.menu-item', {
  dropdownSelector: '.dropdown',
  preventDefaultClick: true,
  singleDropdown: true,
  onOpen: (dropdown) => console.log('Opened:', dropdown),
  onClose: (dropdown) => console.log('Closed:', dropdown),
});
```

**Features:**

- Click menu item to toggle dropdown
- Click outside to close
- Escape key to close
- Only one dropdown open at a time (configurable)
- Maintains desktop hover compatibility

**Example Implementation:**
See `src/js/core/uiSetup.js` - About menu dropdown behavior.

### 2. Mobile Modals (`setupMobileModal`)

Provides consistent modal/overlay behavior with touch-friendly interactions.

**Usage:**

```javascript
import { setupMobileModal } from '../utils/mobileInteractions.js';

setupMobileModal('#open-button', '#modal', '#close-button', {
  backdropClose: true,
  escapeClose: true,
  preventScroll: true,
  onOpen: (modal) => console.log('Modal opened'),
  onClose: (modal) => console.log('Modal closed'),
});
```

**Features:**

- Click backdrop to close (configurable)
- Escape key to close
- Prevents body scrolling when open
- Proper ARIA attributes
- Customizable callbacks

### 3. Touch Feedback (`setupTouchFeedback`)

Adds visual feedback for touch interactions on buttons and interactive elements.

**Usage:**

```javascript
import { setupTouchFeedback } from '../utils/mobileInteractions.js';

// Add touch feedback to all buttons
setupTouchFeedback('button', {
  feedbackClass: 'touch-active',
  duration: 150,
});
```

**CSS Required:**

```css
.touch-active {
  transform: scale(0.95);
  opacity: 0.8;
  transition: all 0.1s ease;
}
```

### 4. Device Detection Utilities

Helper functions for responsive behavior.

**Usage:**

```javascript
import { isTouchDevice, getViewportInfo } from '../utils/mobileInteractions.js';

if (isTouchDevice()) {
  // Touch-specific behavior
}

const viewport = getViewportInfo();
if (viewport.isMobile) {
  // Mobile-specific behavior
}
```

## Touch Event Architecture Patterns

Based on real-world debugging experiences, these patterns ensure robust touch interactions:

### Pattern 1: Event Delegation vs Direct Handling

**Principle:** Leverage existing desktop event systems rather than replacing them.

**Example: Connection Context Menu**

- **Desktop**: `mousemove` over connector-hotspot shows context menu
- **Touch**: Extend existing `handleClick` to detect connector-hotspot taps

```javascript
// Good: Extend existing desktop handler
handleClick(event) {
  // First check for connector-hotspot (touch equivalent of mousemove)
  const hotspot = event.target.closest('.connector-hotspot');
  if (hotspot) {
    event.preventDefault();
    this.show(hotspot);
    return;
  }

  // Then handle menu item clicks (existing logic)
  const menuItem = event.target.closest('.menu-item');
  if (!menuItem) return;
  // ... existing logic
}

// Bad: Separate touch handling that conflicts
TouchAdapter.handleTap(touch) {
  if (isConnectionElement(target)) {
    // This intercepted events before they reached existing handlers
    this.handleConnectionTap(target);
    return; // Prevented event bubbling
  }
}
```

**Why this works:**

- Reuses existing SVG container event delegation
- Maintains single source of truth for menu logic
- No event handler conflicts or race conditions

### Pattern 2: SVG Touch Events

**Problem:** SVG elements often don't receive touch events properly.

**Solution:** Explicit CSS and event handler configuration.

```css
/* Ensure SVG container allows selective event handling */
#svg-container {
  pointer-events: none; /* Container doesn't intercept */
}

/* Enable events on specific SVG elements */
#svg-container line,
#svg-container circle,
#svg-container path {
  pointer-events: all; /* Elements can receive events */
}
```

```javascript
// Add touch support to SVG event handlers
attachClickHandler(element) {
  element.addEventListener('click', this.handleClick);

  // Add touch support for mobile devices
  element.addEventListener('touchstart', (event) => {
    event.stopPropagation();
  }, { passive: true });

  element.addEventListener('touchend', this.handleClick);
}
```

### Pattern 3: TouchAdapter Integration Guidelines

**When to use TouchAdapter:**

- New touch-specific gestures (pinch, long-press, multi-touch)
- Canvas-level interactions (pan, zoom, selection)
- Note movement and connection creation

**When NOT to use TouchAdapter:**

- Extending existing UI element interactions
- Context menus that already have desktop handlers
- Button clicks and form interactions

**Example: Proper TouchAdapter boundaries**

```javascript
// TouchAdapter handles canvas-level gestures
handleTap(touch) {
  // Check for ghost connector (delegates to ConnectionBehavior)
  if (target.classList.contains('ghost-connector')) {
    this.handleGhostConnectorTap(touch, target);
    return;
  }

  // Check for note interaction (connection mode vs selection)
  const noteElement = target.closest('.note');
  if (noteElement) {
    // Check if we're in connection mode first
    if (this.connectionBehavior && this.connectionBehavior.isConnecting) {
      // Complete connection between source and this note
      this.connectionBehavior.handleTouchNoteTap(noteElement);
      return;
    }

    // Normal note selection (TouchAdapter responsibility)
    this.handleNoteTap(noteElement, touch);
    return;
  }

  // Canvas interaction (cancel connection mode if active)
  if (target.id === 'canvas' || target.closest('#canvas')) {
    if (this.connectionBehavior && this.connectionBehavior.isConnecting) {
      this.connectionBehavior.cancel();
      return;
    }
  }
}
```

## E2E Testing Patterns for Styled Content

### Pattern 4: Styled Content Click Detection

**Problem:** E2E tests fail on styled content while manual testing works perfectly.

**Root Cause Discovery:**

- Empty/unstyled notes: E2E tests pass ✅
- Styled content with HTML: E2E tests fail ❌
- Manual testing: All scenarios work ✅

**Technical Analysis:**

```javascript
// Test scenarios that reveal the pattern
test('Empty note works in E2E', () => {
  // ✅ PASSES: Note with no content, click detection works
  noteContent.innerHTML = '';
  await noteContent.click(); // Works
});

test('Styled content fails in E2E', () => {
  // ❌ FAILS: Note with rendered HTML, click detection fails
  noteContent.innerHTML = '<h1>Header</h1><p><strong>Bold</strong></p>';
  await noteContent.click(); // Doesn't trigger edit mode
});
```

**Playwright vs Real User Clicks:**

- **Real user clicks**: `event.target` properly bubbles through HTML elements
- **Playwright `.click()`**: May target child HTML elements directly
- **Detection logic**: `target.closest('.note-content')` works differently

**Solution Pattern:**

```javascript
// Robust click detection for both E2E and manual testing
handleClick(event) {
  const target = event.target;

  // Check multiple scenarios for reliable detection
  const noteContent = target.classList.contains('note-content')
    ? target
    : target.closest('.note-content');

  // Additional E2E-specific checks may be needed
  if (noteContent) {
    // Process edit mode request
  }
}
```

**CSS Requirements:**

```css
/* Ensure minimum clickable areas for E2E testing */
.note {
  min-height: 40px; /* Prevent container collapse */
}

.note-content {
  min-height: 24px; /* Ensure child element has clickable area */
}
```

**Testing Strategy:**

```javascript
// Comprehensive test matrix for regression prevention
const scenarios = [
  { name: 'Empty note', content: '', shouldPass: true },
  { name: 'Plain text', content: 'Simple text', shouldPass: true },
  { name: 'Styled HTML', content: '<h1>Header</h1>', shouldPass: true },
  {
    name: 'Nested HTML',
    content: '<p><strong><em>Deep</em></strong></p>',
    shouldPass: true,
  },
];

scenarios.forEach((scenario) => {
  test(`Click detection: ${scenario.name}`, async () => {
    await setupNote(scenario.content);
    await noteContent.click();
    await expect(noteContent).toHaveClass(/edit-mode/);
  });
});
```

## Debugging Touch Interactions

Common issues and debugging techniques learned from real-world troubleshooting:

### 1. Element Detection Issues

**Symptom:** "Touch events aren't reaching the right elements"

**Debug technique:**

```javascript
// Add to TouchAdapter or event handlers
console.log('🔥 Touch target debug:', {
  target: target,
  tagName: target?.tagName,
  className: target?.className,
  elementFromPoint: document.elementFromPoint(x, y),
});
```

**Common causes:**

- CSS `pointer-events: none` on wrong elements
- Z-index layering preventing event detection
- Missing touch event handlers on SVG elements

### 2. Event Handler Conflicts

**Symptom:** "Touch interactions work inconsistently or stop working"

**Debug technique:**

```javascript
// Trace event flow through multiple handlers
handleTap(touch) {
  console.log('TouchAdapter intercepted tap');
  // Make sure you're not preventing other handlers
}

handleClick(event) {
  console.log('SVG container received click');
  // Check if event was already handled
}
```

**Common causes:**

- TouchAdapter intercepting events before they reach existing handlers
- `event.preventDefault()` or `event.stopPropagation()` called too early
- Multiple event handlers competing for same elements

### 3. Event Bubbling Issues

**Problem:** Touch events don't bubble the same way as expected

**Solution:** Verify event delegation path

```javascript
// Test event bubbling path
element.addEventListener('touchend', (event) => {
  console.log('Touch event path:', event.composedPath());
  console.log('Event target:', event.target);
  console.log('Current target:', event.currentTarget);
});
```

## Regression Testing Patterns

Patterns to prevent touch interaction regressions:

### 1. Manual Testing Checklist

When making touch-related changes:

1. Test in browser with `?mode=touch` parameter
2. Use browser dev tools mobile viewport
3. Test on actual mobile device
4. Verify existing desktop interactions still work

### 2. Event Handler Audit

Before adding new touch handlers:

1. Check existing event listeners: `getEventListeners(element)` in dev tools
2. Verify you're not duplicating existing functionality
3. Test event bubbling isn't being disrupted

### 3. Common Regression Patterns

**Pattern A: New TouchAdapter code intercepting existing events**

- **Fix**: Check if existing desktop handlers can be extended instead
- **Test**: Verify both touch and desktop interactions work

**Pattern B: CSS changes affecting pointer events**

- **Fix**: Use specific selectors rather than broad `pointer-events` changes
- **Test**: Verify all interactive elements still respond to touch

**Pattern C: Event handler order dependencies**

- **Fix**: Use event delegation rather than direct element handlers
- **Test**: Verify interactions work regardless of handler registration order

## Design Patterns

### Pattern 1: Dropdown Menus

**Problem:** Hover-based menus don't work on touch devices.

**Solution:**

1. Convert to click-to-open behavior
2. Add click-away-to-close
3. Support escape key
4. Maintain desktop hover compatibility

**Implementation:**

```javascript
// In component setup
setupMobileDropdown('.menu-item', {
  dropdownSelector: '.dropdown',
  singleDropdown: true,
});
```

### Pattern 2: Context Menus

**Problem:** Right-click context menus need touch alternatives.

**Solution:**

1. Long-press to open on mobile
2. Click-away to close
3. Position intelligently within viewport

**Implementation:**

```javascript
// Custom context menu setup
element.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  showContextMenu(e.clientX, e.clientY);
});

// Touch support
let longPressTimer;
element.addEventListener('touchstart', (e) => {
  longPressTimer = setTimeout(() => {
    const touch = e.touches[0];
    showContextMenu(touch.clientX, touch.clientY);
  }, 500);
});

element.addEventListener('touchend', () => {
  clearTimeout(longPressTimer);
});
```

### Pattern 3: Modal Dialogs

**Problem:** Modals need consistent touch interaction patterns.

**Solution:**

1. Backdrop click to close
2. Escape key support
3. Prevent body scroll
4. Focus management

**Implementation:**

```javascript
setupMobileModal('#trigger', '#modal', '.close-button', {
  backdropClose: true,
  escapeClose: true,
  preventScroll: true,
});
```

## Best Practices

### 1. Progressive Enhancement

- Start with basic functionality that works everywhere
- Add mobile enhancements as layers
- Ensure keyboard accessibility

### 2. Touch Targets

- Minimum 44px touch targets
- Add padding around small interactive elements
- Use `setupTouchFeedback` for visual confirmation

### 3. Viewport Considerations

- Use `getViewportInfo()` for responsive decisions
- Test on actual devices, not just browser dev tools
- Consider different screen orientations

### 4. Performance

- Use passive event listeners where possible
- Debounce resize handlers
- Minimize DOM queries in touch handlers

## Testing Mobile Patterns

### Manual Testing

1. Test on actual mobile devices
2. Verify all interactive elements are reachable
3. Check touch target sizes
4. Confirm click-away behavior works

### Automated Testing

```javascript
// Example E2E test for mobile dropdown
test('Mobile dropdown behavior', async ({ page }) => {
  // Set mobile viewport
  await page.setViewportSize({ width: 375, height: 667 });

  // Test click to open
  await page.click('.menu-item');
  await expect(page.locator('.dropdown')).toBeVisible();

  // Test click away to close
  await page.click('body');
  await expect(page.locator('.dropdown')).not.toBeVisible();
});
```

## Migration Guide

### Converting Existing Hover Menus

1. Identify hover-based interactions
2. Replace custom implementations with `setupMobileDropdown`
3. Add appropriate CSS for mobile states
4. Test on mobile devices

### Before:

```javascript
// Old hover-only implementation
menuItem.addEventListener('mouseenter', () => {
  dropdown.style.display = 'block';
});
menuItem.addEventListener('mouseleave', () => {
  dropdown.style.display = 'none';
});
```

### After:

```javascript
// New mobile-friendly implementation
setupMobileDropdown('.menu-item', {
  dropdownSelector: '.dropdown',
});
```

## Related Documentation

- [Developer Guide](developer-guide.md) - Overall development patterns
- [Testing Guide](testing-guide.md) - Testing mobile interactions
- [Accessibility](accessibility.md) - Mobile/touch accessibility and keyboard considerations

## CSS Utilities

Consider adding these utility classes for consistent mobile behavior:

```css
/* Touch feedback utility */
.touch-feedback {
  transition: transform 0.1s ease;
}

.touch-feedback:active {
  transform: scale(0.95);
}

/* Mobile-only visibility */
@media (max-width: 768px) {
  .mobile-only {
    display: block;
  }
  .desktop-only {
    display: none;
  }
}

@media (min-width: 769px) {
  .mobile-only {
    display: none;
  }
  .desktop-only {
    display: block;
  }
}

/* Touch-safe spacing */
.touch-safe {
  min-height: 44px;
  min-width: 44px;
  padding: 12px;
}
```
