# Adapter-Behavior Pattern

## Context

The Adapter-Behavior pattern is MindMeld's core architecture for handling user interactions. It provides **clean separation** between input detection and business logic, eliminating code duplication while preserving platform-specific optimizations.

This pattern is implemented throughout `src/js/interactions/` and is fundamental to understanding how user actions become application behaviors.

## Core Principles

### 1. Single Responsibility Separation

- **Adapters**: Pure input detection and translation (`src/js/interactions/adapters/`)
- **Behaviors**: Pure business logic and coordination (`src/js/interactions/behaviors/`)
- **No mixed responsibilities** - adapters never emit business events, behaviors never handle platform input

### 2. Platform Abstraction

- **Desktop interactions** (mouse, keyboard) and **Touch interactions** (gestures) are completely different input mechanisms
- **Business logic** (note creation, editing, dragging) is identical regardless of input method
- Adapters translate platform-specific input into universal behavior calls

### 3. Behavior Reuse

- One behavior class handles the same interaction across all platforms
- Example: `NoteBehavior.requestEditMode()` works identically for desktop clicks and touch taps
- Zero code duplication between platforms

## Input Flow Architecture

```
User Interaction → Adapter (Input Detection) → Behavior (Business Logic) → EventBus → Services
```

**Example Flow:**
1. User double-taps note on mobile → `TouchAdapter.handleDoubleTap()`
2. TouchAdapter identifies note element → calls `NoteBehavior.handleNoteDoubleClick()`
3. NoteBehavior implements edit logic → emits `note.requestEdit` event
4. Services respond to event → UI updates to edit mode

## Component Responsibilities

### Adapters (Input Translation Layer)

**Location:** `src/js/interactions/adapters/`
**Purpose:** Detect platform-specific input patterns and delegate to appropriate behaviors

**DO:**
- ✅ Detect input events (clicks, taps, drags, gestures)
- ✅ Identify interaction targets (note, canvas, connector)
- ✅ Call appropriate behavior methods with normalized parameters

**DON'T:**
- ❌ **Never** emit business events directly
- ❌ **Never** contain business logic (selection, editing, creation)
- ❌ **Never** manipulate DOM or application state

**Example Implementation:**

```javascript
// DesktopAdapter.js - Input detection only
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

// TouchAdapter.js - Input detection only (same pattern)
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

### Behaviors (Business Logic Layer)

**Location:** `src/js/interactions/behaviors/`
**Purpose:** Handle interaction logic and coordinate with services

**DO:**
- ✅ Implement all business logic for interaction types
- ✅ Emit events to EventBus for service coordination
- ✅ Manage interaction state and validation
- ✅ Coordinate with services (noteManager, connectionManager, etc.)

**DON'T:**
- ❌ **Never** handle platform-specific input events directly
- ❌ **Never** contain input detection logic

**Example Implementation:**

```javascript
// NoteBehavior.js - Business logic only
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

## Interaction Types and Ownership

### Canvas Domain (Adapters → Behaviors)
- **Note Interactions** → `NoteBehavior` (selection, editing, movement)
- **Canvas Interactions** → `CanvasBehavior` (note creation, selection clearing)
- **Drag Operations** → `DragBehavior` (note movement, connection updates)
- **Multi-Selection** → `SelectionBoxBehavior` (selection box creation, multi-select)

### Page UI Domain (pageInteractions.js → Behaviors)
- **Menu Interactions** → `pageInteractions.js` → `MenuBehavior` (menu actions, business logic)
- **Navigation Elements** → `pageInteractions.js` (buttons, settings outside canvas)

## Domain Separation

**Canvas Adapters** handle only canvas-based interactions and do NOT interact with page UI elements like menus, navigation, or buttons outside the canvas.

**pageInteractions.js** handles page UI elements and delegates business logic to appropriate behaviors like MenuBehavior.

## Platform-Specific Optimizations

### DesktopAdapter Specializations

**File:** `src/js/interactions/adapters/DesktopAdapter.js`

- Precise pointer coordinates
- Right-click context menus
- Hover states and feedback
- Keyboard shortcuts

### TouchAdapter Specializations

**File:** `src/js/interactions/adapters/TouchAdapter.js`

- Hit target expansion (20px) for mobile
- Multi-touch gesture recognition (pinch, two-finger pan)
- Visual touch feedback and jiggle animations
- Long-press detection with timing

### TouchAdapter Native Implementation

TouchAdapter implements **native gesture recognition** as the single source of truth:

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

**Benefits:**
- ✅ **Single source of truth** for touch input (matches DesktopAdapter pattern)
- ✅ **No competing gesture systems** or event bus complexity
- ✅ **Clean console logs** - one user gesture = one detection message
- ✅ **Direct behavior delegation** without intermediate layers
- ✅ **Easier debugging** - single input detection point

## Testing Strategy

### Adapter Tests
**Focus:** Input detection - test that correct behavior methods are called with correct parameters

**Example:**
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

### Behavior Tests
**Focus:** Business logic - test state management, event emission, and service coordination

**Example:**
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

## Common Anti-Patterns to Avoid

1. **Bypassing Behaviors**: Adapters emitting business events directly
2. **Mixed Responsibilities**: Behaviors handling platform-specific input
3. **Code Duplication**: Same logic in multiple adapters instead of shared behavior
4. **Competing Systems**: Multiple gesture detection systems interfering with each other

## Implementation Guidelines

### Adding New Interactions

1. **Identify the domain**: Canvas interaction or Page UI?
2. **Create or extend behavior**: Handle business logic in appropriate behavior class
3. **Update adapters**: Add input detection in DesktopAdapter and TouchAdapter
4. **Test both layers**: Adapter input detection + Behavior business logic
5. **Update documentation**: Add to interaction ownership matrix

### Debugging Interaction Issues

1. **Check adapter layer**: Is input being detected correctly?
2. **Verify behavior delegation**: Are adapters calling the right behavior methods?
3. **Test business logic**: Is the behavior implementing the correct logic?
4. **Trace event flow**: Are events being emitted and handled correctly?

## Related Documentation

- [Testing Patterns](../development/testing-patterns.md) - Testing adapter and behavior layers