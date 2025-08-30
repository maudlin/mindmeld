# Adapter-Behavior Architecture Guide

## Overview

MindMeld uses a **clean separation** between input detection and business logic through the **Adapter-Behavior pattern**. This architecture eliminates code duplication while preserving platform-specific optimizations.

## Core Principles

### 1. **Single Responsibility Separation**

- **Adapters**: Pure input detection and translation
- **Behaviors**: Pure business logic and coordination
- **No mixed responsibilities** - adapters never emit business events, behaviors never handle platform input

### 2. **Platform Abstraction**

- **Desktop interactions** (mouse, keyboard) and **Touch interactions** (gestures) are completely different input mechanisms
- **Business logic** (note creation, editing, dragging) is identical regardless of input method
- Adapters translate platform-specific input into universal behavior calls

### 3. **Behavior Reuse**

- One behavior class handles the same interaction across all platforms
- Example: `NoteBehavior.requestEditMode()` works identically for desktop clicks and touch taps
- Zero code duplication between platforms

## Architecture Components

### Input Flow

```
User Interaction → Adapter (Input Detection) → Behavior (Business Logic) → EventBus → Services
```

### Component Responsibilities

#### **Adapters** (Input Translation Layer)

**Purpose**: Detect platform-specific input patterns and delegate to appropriate behaviors

**Responsibilities**:

- ✅ Detect input events (clicks, taps, drags, gestures)
- ✅ Identify interaction targets (note, canvas, connector)
- ✅ Call appropriate behavior methods with normalized parameters
- ❌ **Never** emit business events directly
- ❌ **Never** contain business logic (selection, editing, creation)
- ❌ **Never** manipulate DOM or application state

**Examples**:

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

// TouchAdapter - Input detection only
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

#### **Behaviors** (Business Logic Layer)

**Purpose**: Handle interaction logic and coordinate with services

**Responsibilities**:

- ✅ Implement all business logic for interaction types
- ✅ Emit events to EventBus for service coordination
- ✅ Manage interaction state and validation
- ✅ Coordinate with services (noteManager, connectionManager, etc.)
- ❌ **Never** handle platform-specific input events directly
- ❌ **Never** contain input detection logic

**Examples**:

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

// CanvasBehavior - Business logic only
handleCanvasDoubleClick(inputEvent, inputType) {
  // Business logic: create note at position
  this.eventBus.emit('note.createAtPosition', {
    canvas: document.getElementById('canvas'),
    event: {
      clientX: inputEvent.clientX,
      clientY: inputEvent.clientY,
      type: inputType === 'desktop' ? 'dblclick' : 'doubletap'
    },
    inputType
  });
}
```

## Interaction Types and Ownership

### **Note Interactions** → `NoteBehavior`

- **Single click/tap**: Note selection
- **Double click/tap**: Edit mode entry
- **Click/tap + drag**: Note movement (coordinates with DragBehavior)
- **Right click/long press**: Context menu

### **Canvas Interactions** → `CanvasBehavior` (Future)

- **Double click/tap**: Note creation
- **Click/tap + drag**: Selection box (coordinates with SelectionBoxBehavior)
- **Single click/tap**: Clear selections

### **Drag Operations** → `DragBehavior`

- **Note dragging**: Single and multi-note movement
- **Connection updates**: During note drag operations
- **Drag state management**: Start, update, end, cancel

### **Multi-Selection** → `SelectionBoxBehavior`

- **Selection box creation**: Visual selection rectangle
- **Live selection feedback**: Highlight notes during drag
- **Selection finalization**: Apply selections on drag end

## Platform Differences (Preserved in Adapters)

### **DesktopAdapter Specializations**

```javascript
// Desktop-specific optimizations
class DesktopAdapter {
  // Precise pointer coordinates
  handlePointerDown(event) {
    /* Fine pointer control */
  }

  // Right-click context menus
  handleRightClick(event) {
    /* Desktop context menu patterns */
  }

  // Hover states for desktop
  handlePointerMove(event) {
    /* Hover feedback */
  }

  // Keyboard shortcuts
  handleKeyDown(event) {
    /* Desktop keyboard patterns */
  }
}
```

### **TouchAdapter Specializations**

```javascript
// Touch-specific optimizations
class TouchAdapter {
  // Hit target expansion for mobile
  expandTouchTarget(touch) {
    /* 20px hit target expansion */
  }

  // Gesture recognition
  handlePinch(touches) {
    /* Multi-touch zoom */
  }

  // Touch feedback
  addTouchFeedbackStyles() {
    /* Visual touch feedback */
  }

  // Long press detection
  handleLongPress(touch) {
    /* Touch-specific timing */
  }
}
```

### **TouchAdapter Native Gesture Detection Implementation**

TouchAdapter implements **native gesture recognition** rather than using an intermediate gesture recognition layer. This matches the DesktopAdapter pattern of being the single source of input detection truth.

**Why Native**: Touch gestures require complex timing and multi-touch coordination that is best handled directly in the adapter rather than through event bus intermediaries.

```javascript
class TouchAdapter {
  // Single gesture detection point (like DesktopAdapter)
  setupNativeTouchHandlers() {
    this.canvas.addEventListener('touchstart', this.boundHandlers.touchStart);
    this.canvas.addEventListener('touchmove', this.boundHandlers.touchMove);
    this.canvas.addEventListener('touchend', this.boundHandlers.touchEnd);
    this.canvas.addEventListener('touchcancel', this.boundHandlers.touchCancel);
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

  // Clean routing (like DesktopAdapter.handleDoubleClick)
  handleDoubleTap(touch) {
    const noteElement = touch.target.closest('.note');
    if (noteElement) {
      // Direct delegation to behavior - no business logic here
      this.noteBehavior.handleNoteDoubleClick(noteElement, touch, 'touch');
    } else if (this.isCanvasClick(touch.target)) {
      // Direct delegation to behavior - no business logic here
      this.canvasBehavior.handleCanvasDoubleClick(touch, 'touch');
    }
  }
}
```

**Gesture Support**:
- Single tap, Double tap, Long press
- Drag (single-finger with movement threshold detection)
- Selection box (drag on canvas)
- Future: Pinch/zoom, Two-finger pan

**Architectural Benefits**:
- ✅ **Single source of truth** for touch input (matches DesktopAdapter pattern)
- ✅ **No competing gesture systems** or event bus complexity
- ✅ **Clean console logs** - one user gesture = one log message
- ✅ **Direct behavior delegation** without intermediate layers
- ✅ **Easier debugging** - single input detection point
- ✅ **Consistent with architecture documentation**

## Implementation Guidelines

### **DO: Clean Adapter Implementation**

```javascript
// DesktopAdapter - Native browser event handling
class DesktopAdapter {
  handleDoubleClick(event) {
    // ✅ Input detection
    const noteElement = event.target.closest('.note');

    // ✅ Target identification
    if (noteElement) {
      // ✅ Behavior delegation
      this.noteBehavior.handleNoteDoubleClick(noteElement, event, 'desktop');
    }
  }
}

// TouchAdapter - Native touch event handling (same pattern)
class TouchAdapter {
  handleDoubleTap(touch) {
    // ✅ Input detection (native touch timing)
    const noteElement = touch.target.closest('.note');

    // ✅ Target identification
    if (noteElement) {
      // ✅ Behavior delegation (same method, different input type)
      this.noteBehavior.handleNoteDoubleClick(noteElement, touch, 'touch');
    } else if (this.isCanvasClick(touch.target)) {
      // ✅ Canvas double-tap delegation
      this.canvasBehavior.handleCanvasDoubleClick(touch, 'touch');
    }
  }
}
```

### **DON'T: Mixed Responsibilities**

```javascript
class DesktopAdapter {
  handleDoubleClick(event) {
    // ❌ Don't emit business events from adapters
    this.eventBus.emit('note.createAtPosition', {...});

    // ❌ Don't manipulate DOM from adapters
    noteElement.classList.add('selected');

    // ❌ Don't implement business logic in adapters
    if (noteElement.classList.contains('edit-mode')) {
      return; // This belongs in NoteBehavior
    }
  }
}
```

### **DON'T: Competing Gesture Systems (Anti-Pattern)**

```javascript
// ❌ ANTI-PATTERN - Competing gesture detection systems
class TouchAdapter {
  initialize() {
    // ❌ Multiple input detection sources
    this.gestureRecognizer = new GestureRecognizer(this.eventBus);
    this.setupNativeTouchHandlers(); // Both systems compete!
    
    // ❌ Event bus complexity with duplicate processing
    this.eventBus.on('gesture.doubletap', (event) => {
      this.handleDoubleTap(event.touch); // Processed multiple times
    });
    
    // ❌ Native handler also processes same touches
    this.canvas.addEventListener('touchstart', (event) => {
      this.handleNativeDoubleTap(event.touches[0]); // Conflict!
    });
  }
}

// Result: 4 tap events + 1 double-tap = 5 log messages per user gesture ❌
```

### **DO: Clean Behavior Implementation**

```javascript
class NoteBehavior {
  handleNoteDoubleClick(noteElement, event, inputType) {
    // ✅ Business logic validation
    if (this.isNoteInEditMode(noteElement)) {
      return;
    }

    // ✅ State management
    this.ensureNoteSelected(noteElement);

    // ✅ Event emission
    this.eventBus.emit('note.requestEdit', {
      noteId: noteElement.id,
      inputType,
    });
  }
}
```

### **DON'T: Platform-Specific Code in Behaviors**

```javascript
class NoteBehavior {
  handleNoteDoubleClick(noteElement, event, inputType) {
    // ❌ Don't handle input differences in behaviors
    if (inputType === 'touch') {
      // Touch-specific logic belongs in TouchAdapter
    }

    // ❌ Don't access raw DOM events in behaviors
    if (event.touches) {
      // Platform detection belongs in adapters
    }
  }
}
```

## Error Handling and Debugging

### **Adapter Debugging**

```javascript
// Log input detection, not business outcomes
console.log('DesktopAdapter: Double-click detected', {
  target: event.target.tagName,
  coordinates: { x: event.clientX, y: event.clientY },
});
```

### **Behavior Debugging**

```javascript
// Log business logic outcomes, not input details
console.log('NoteBehavior: Edit mode requested', {
  noteId: noteElement.id,
  wasSelected: noteElement.classList.contains('selected'),
});
```

## Testing Strategy

### **Adapter Tests**: Focus on input detection

```javascript
describe('DesktopAdapter', () => {
  test('should delegate note double-clicks to NoteBehavior', () => {
    // Test that correct behavior method is called with correct parameters
    const mockNoteBehavior = { handleNoteDoubleClick: jest.fn() };
    adapter.noteBehavior = mockNoteBehavior;

    adapter.handleDoubleClick(mockClickEvent);

    expect(mockNoteBehavior.handleNoteDoubleClick).toHaveBeenCalled();
  });
});
```

### **Behavior Tests**: Focus on business logic

```javascript
describe('NoteBehavior', () => {
  test('should select note before requesting edit mode', () => {
    const unselectedNote = createMockNote();

    behavior.handleNoteDoubleClick(unselectedNote, mockEvent, 'desktop');

    expect(noteManager.selectNote).toHaveBeenCalledWith(unselectedNote);
    expect(eventBus.emit).toHaveBeenCalledWith(
      'note.requestEdit',
      expect.any(Object),
    );
  });
});
```

## Migration Guide

### **From Direct Event Emission** (Old Pattern)

```javascript
// Old: Direct event emission from adapter
handleDoubleClick(event) {
  this.eventBus.emit('note.createAtPosition', {...}); // ❌
}
```

### **To Behavior Delegation** (New Pattern)

```javascript
// New: Behavior delegation from adapter
handleDoubleClick(event) {
  this.canvasBehavior.handleCanvasDoubleClick(event, 'desktop'); // ✅
}
```

## Common Anti-Patterns to Avoid

1. **Bypassing Behaviors**: Adapters emitting business events directly
2. **Mixed Responsibilities**: Behaviors handling platform-specific input
3. **Code Duplication**: Same logic in multiple adapters instead of shared behavior
4. **State Inconsistency**: Adapters manipulating application state directly
5. **Platform Leakage**: Platform-specific code in behaviors

## Benefits of This Architecture

### **For Developers**

- **Single Source of Truth**: Each interaction type has one authoritative implementation
- **Easy Debugging**: Clear separation makes issues easier to trace
- **Faster Development**: Behavior reuse eliminates duplicate implementation
- **Platform Freedom**: Easy to add new input methods (VR, voice, etc.)

### **For Testing**

- **Focused Tests**: Test input detection separately from business logic
- **Better Coverage**: Easier to achieve comprehensive test coverage
- **Reliable Mocks**: Clear interfaces make mocking straightforward
- **Fast Execution**: Business logic tests don't need DOM manipulation

### **For Maintenance**

- **Predictable Changes**: Input changes affect adapters, business changes affect behaviors
- **Safe Refactoring**: Clear boundaries reduce unintended side effects
- **Easy Extensions**: New platforms or interactions follow established patterns
- **Reduced Bugs**: Single implementation eliminates platform-specific inconsistencies

## TouchAdapter Native Implementation Success

### **Phase 1 Completion: Architecture Compliance Achieved**

The TouchAdapter has been successfully refactored to comply with the **Adapter-Behavior architecture** principles:

**✅ Before (Architectural Violation)**:
```
Raw Touch → GestureRecognizer → gesture.* events → TouchAdapter → Behaviors
         ↳ Native detector → TouchAdapter → Behaviors
```
*Result*: Competing systems, 4+ log messages per gesture, architectural violations

**✅ After (Architecture Compliant)**:
```
Raw Touch → TouchAdapter (single source of truth) → Behaviors
```
*Result*: Clean single-source detection, 1 log message per gesture, matches DesktopAdapter pattern

### **Key Achievements**

**Architectural Consistency**:
- ✅ TouchAdapter now matches DesktopAdapter as **single source of input truth**
- ✅ **No competing gesture systems** or event bus complexity
- ✅ **Direct behavior delegation** without intermediate layers
- ✅ **Clean console logs** - one user gesture = one detection message

**Functional Success**:
- ✅ **10/10 manual gestures working**: tap, double-tap, long press, drag, selection box
- ✅ **Native gesture detection**: double-tap, long press, drag with proper timing and thresholds
- ✅ **State management**: proper gesture lifecycle with cleanup and conflict prevention
- ✅ **Platform-specific optimizations preserved**: hit target expansion, touch feedback

**Development Benefits**:
- ✅ **Easier debugging**: single input detection point with clear logging
- ✅ **Predictable behavior**: gestures work consistently across all scenarios  
- ✅ **Maintainable code**: follows established DesktopAdapter patterns
- ✅ **Future extensibility**: ready for Phase 2 features (multi-touch, pinch/zoom)

---

This architecture ensures MindMeld's interaction system remains maintainable, testable, and extensible while delivering optimal user experiences across all platforms.
