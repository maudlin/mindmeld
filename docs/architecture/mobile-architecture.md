# Mobile Architecture

## Context

MindMeld implements a sophisticated mobile-first architecture with adaptive touch interactions. This document covers the technical implementation details of the touch system, capability detection, and mobile optimization patterns.

**Related:** [Adapter-Behavior Pattern](adapter-behavior-pattern.md) | [User Guide](../user-guide.md#mobile-features)

## Adaptive Touch Architecture

### Capability Detection System

**File:** `src/js/interactions/capabilities/detector.js`

The system automatically determines device capabilities and routes to the appropriate interaction adapter:

```javascript
const detector = new CapabilityDetector();
const capabilities = detector.detect();

if (capabilities.primaryInput === 'touch') {
  // TouchAdapter with native gesture recognition
  controller.useAdapter('touch');
} else {
  // DesktopAdapter with mouse/keyboard optimization
  controller.useAdapter('desktop');
}
```

### Touch-First vs Desktop-First Detection

**Touch-First Devices:**
- Primary touch capability (`navigator.maxTouchPoints > 0`)
- Mobile viewport characteristics
- Touch-optimized UI patterns activated
- Full TouchAdapter gesture system enabled

**Desktop-First Devices:**
- Mouse/keyboard primary input
- Traditional hover states and right-click context menus
- Optional touch support where available

## TouchAdapter Architecture

### Native Gesture Recognition

**File:** `src/js/interactions/adapters/TouchAdapter.js`

TouchAdapter implements **native gesture detection** as single source of truth:

```javascript
class TouchAdapter {
  setupNativeTouchHandlers() {
    this.canvas.addEventListener('touchstart', this.boundHandlers.touchStart);
    this.canvas.addEventListener('touchmove', this.boundHandlers.touchMove);
    this.canvas.addEventListener('touchend', this.boundHandlers.touchEnd);
  }

  touchStart(event) {
    const touch = event.touches[0];
    const now = Date.now();

    // Double-tap detection (300ms window, 30px tolerance)
    if (this.lastTap &&
        (now - this.lastTap.time) <= 300 &&
        this.calculateDistance(touch, this.lastTap) <= 30) {
      this.handleDoubleTap(touch);
      return;
    }

    // Long-press detection (500ms threshold)
    this.longPressTimer = setTimeout(() => {
      this.handleLongPress(touch);
    }, 500);
  }
}
```

### Core Interaction Patterns

#### Single-Finger Gestures

**Tap Detection:**
- Basic selection and UI activation
- Target expansion (20px radius) for finger precision
- Visual feedback with touch highlighting

**Double-Tap Recognition:**
- 300ms time window between taps
- 30px spatial tolerance for finger movement
- Used for note creation and edit mode activation

**Long-Press Detection:**
- 500ms hold threshold
- Visual feedback with jiggle animation
- Initiates drag mode for note movement

```javascript
// Long-press implementation with visual feedback
handleLongPress(touch) {
  const noteElement = this.findNoteElement(touch);

  if (noteElement) {
    // Visual feedback: jiggle animation
    noteElement.classList.add('jiggle-animation');

    // Enable drag mode
    this.dragBehavior.enableDragMode(noteElement, touch);
  }
}
```

#### Multi-Touch Gestures

**Pinch-to-Zoom:**
- Two-finger scale detection
- Smooth zoom with decimal precision (1.0x to 5.0x)
- Center point calculation for natural zooming

**Two-Finger Pan:**
- Canvas navigation during zoom
- Momentum and inertia effects
- Boundary detection and constraints

```javascript
// Multi-touch gesture processing
processTwoFingerGesture(touches) {
  const [touch1, touch2] = touches;

  // Calculate pinch scale
  const currentDistance = this.calculateDistance(touch1, touch2);
  const scale = currentDistance / this.lastPinchDistance;

  // Calculate center point
  const centerX = (touch1.clientX + touch2.clientX) / 2;
  const centerY = (touch1.clientY + touch2.clientY) / 2;

  this.viewportBehavior.handlePinchZoom(scale, centerX, centerY);
}
```

## Mobile UI Patterns

### Touch Target Optimization

**Hit Target Expansion:**
```javascript
// Expand touch targets for finger precision
expandTouchTarget(touch) {
  const EXPANSION_RADIUS = 20; // 20px radius
  const elements = document.elementsFromPoint(touch.clientX, touch.clientY);

  // Find best target within expansion area
  return this.findBestTouchTarget(elements, touch, EXPANSION_RADIUS);
}
```

**Visual Touch Feedback:**
```javascript
// Provide immediate visual feedback for touch interactions
provideTouchFeedback(element, touch) {
  element.classList.add('touch-highlight');

  setTimeout(() => {
    element.classList.remove('touch-highlight');
  }, 150); // Brief highlight duration
}
```

### Mobile-Optimized Components

**Touch-Friendly Dropdowns:**

**File:** `src/js/utils/mobileInteractions.js`

```javascript
export function setupMobileDropdown(element) {
  if (isTouchDevice()) {
    // Convert hover menus to touch-activated
    element.addEventListener('touchstart', (e) => {
      e.preventDefault();
      element.classList.toggle('dropdown-open');
    });

    // Close on outside tap
    document.addEventListener('touchstart', (e) => {
      if (!element.contains(e.target)) {
        element.classList.remove('dropdown-open');
      }
    });
  }
}
```

**Modal Touch Behavior:**
```javascript
export function setupMobileModal(modal) {
  // Backdrop close functionality
  modal.addEventListener('touchstart', (e) => {
    if (e.target === modal) { // Backdrop click
      modal.classList.remove('modal-open');
    }
  });

  // Prevent scroll-through on modal content
  modal.querySelector('.modal-content').addEventListener('touchmove', (e) => {
    e.stopPropagation();
  });
}
```

## Connection Creation System

### Ghost Connector Touch Interface

**Enhanced Visual System:**
- Ghost connectors appear on note selection
- Tap-to-tap connection workflow
- Visual connection mode feedback

```javascript
// Touch-optimized connection creation
handleConnectionMode(noteElement) {
  // Show all ghost connectors when in connection mode
  const allNotes = document.querySelectorAll('.note');
  allNotes.forEach(note => {
    if (note !== noteElement) {
      const ghostConnector = note.querySelector('.ghost-connector');
      ghostConnector.classList.add('connection-mode-visible');
    }
  });

  // Set connection source
  this.connectionSource = noteElement;
  this.isConnectionMode = true;
}
```

**Connection Completion:**
```javascript
// Complete connection on target note tap
completeConnection(targetNote) {
  if (this.isConnectionMode && this.connectionSource) {
    this.connectionBehavior.createConnection(
      this.connectionSource,
      targetNote,
      1 // Default connection type
    );

    this.exitConnectionMode();
  }
}
```

## Performance Optimizations

### Touch Event Handling

**Passive Event Listeners:**
```javascript
// Use passive listeners where possible for better scroll performance
this.canvas.addEventListener('touchstart', this.handleTouchStart, {
  passive: true
});

this.canvas.addEventListener('touchmove', this.handleTouchMove, {
  passive: false // Need preventDefault for canvas interactions
});
```

**Event Delegation:**
```javascript
// Single event listener for all touch interactions
canvas.addEventListener('touchend', (event) => {
  const touch = event.changedTouches[0];
  const target = this.expandTouchTarget(touch);

  // Route to appropriate handler based on target
  if (target.classList.contains('note')) {
    this.handleNoteTap(target, touch);
  } else if (target.classList.contains('ghost-connector')) {
    this.handleConnectorTap(target, touch);
  } else {
    this.handleCanvasTap(touch);
  }
});
```

### Memory Management

**Touch State Cleanup:**
```javascript
// Clean up touch-related timers and state
cleanup() {
  if (this.longPressTimer) {
    clearTimeout(this.longPressTimer);
    this.longPressTimer = null;
  }

  if (this.doubleTapTimer) {
    clearTimeout(this.doubleTapTimer);
    this.doubleTapTimer = null;
  }

  this.touchHistory.clear();
}
```

## Cross-Platform Compatibility

### Input Method Abstraction

Both TouchAdapter and DesktopAdapter implement the same behavior interface:

```javascript
// Unified behavior calls regardless of input method
handleNoteDoubleAction(noteElement, inputEvent, inputType) {
  // inputType: 'touch' or 'desktop'
  // Same business logic, different input detection
  this.noteBehavior.handleNoteDoubleClick(noteElement, inputEvent, inputType);
}
```

### Platform-Specific Optimizations

**Touch Specializations:**
- Hit target expansion (20px radius)
- Visual feedback and animations
- Multi-touch gesture recognition
- Long-press detection with timing

**Desktop Specializations:**
- Precise pointer coordinates
- Right-click context menus
- Hover states and feedback
- Keyboard shortcuts

## Device Detection Utilities

### Touch Capability Detection

**File:** `src/js/utils/mobileInteractions.js`

```javascript
export function isTouchDevice() {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  );
}

export function getViewportInfo() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio || 1,
    orientation: screen.orientation?.angle || 0
  };
}
```

### Responsive Breakpoints

```javascript
export function getDeviceCategory() {
  const width = window.innerWidth;

  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}
```

## Testing Mobile Interactions

### Touch Event Simulation

```javascript
// Test touch gesture recognition
test('TouchAdapter detects double-tap correctly', async () => {
  const adapter = new TouchAdapter(mockBehaviors);
  const mockTouch = { clientX: 100, clientY: 200 };

  // Simulate first tap
  adapter.handleTouchEnd({ touches: [], changedTouches: [mockTouch] });

  // Simulate second tap within 300ms window
  await new Promise(resolve => setTimeout(resolve, 200));
  adapter.handleTouchEnd({ touches: [], changedTouches: [mockTouch] });

  expect(mockBehaviors.canvas.handleCanvasDoubleClick).toHaveBeenCalled();
});
```

### Cross-Platform Test Patterns

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
    await page.waitForTimeout(50);
    await page.touchscreen.tap(200, 200);

    await expect(page.locator('.note')).toBeVisible();
  });
});
```

## Related Documentation

- [Adapter-Behavior Pattern](adapter-behavior-pattern.md) - Input detection architecture
- [User Guide](../user-guide.md) - User-facing mobile interaction instructions
- [Testing Patterns](../development/testing-patterns.md) - Mobile testing strategies
- [File Structure Reference](../reference/file-structure.md) - Mobile interaction files