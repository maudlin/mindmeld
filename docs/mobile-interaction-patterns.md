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
  - **Gesture Recognition**: Advanced multi-touch gesture detection with GestureRecognizer
  - **Event Consolidation**: Unified event handling for complex touch interactions  
  - **Canvas Integration**: Direct integration with zoom, pan, and selection systems
  - **Visual Feedback**: Touch-optimized visual responses including jiggle animations
  - **Enhanced Ghost Connectors**: Larger touch targets with visual feedback

- **DesktopAdapter** for desktop-first devices with traditional mouse/keyboard optimization

## Touch Device Interactions (Automatic)

### Refined Touch Interaction Model

TouchAdapter implements a sophisticated interaction model automatically activated for touch-first devices:

#### Core Interaction Patterns

**Single-Finger Gestures:**
- **Tap**: Select notes, activate UI elements
- **Double-tap on canvas**: Create new notes  
- **Double-tap on notes**: Enter edit mode
- **Long-press**: Prepare for note movement with jiggle animation (500ms hold time)
- **Drag on canvas**: Multi-select lasso selection
- **Long-press and drag**: Move notes after long-press detection with visual feedback

**Two-Finger Gestures:**
- **Pinch**: Zoom in/out with scale detection
- **Two-finger drag**: Canvas panning
- **Combined gestures**: Simultaneous zoom and pan

#### Technical Implementation

```javascript
// TouchAdapter usage (automatically activated for touch-first devices)
// Device detection via CapabilityDetector

// The system automatically:
// 1. Detects device capabilities using media queries
// 2. Routes to TouchAdapter for touch-first devices  
// 3. Enables advanced gesture recognition with GestureRecognizer
// 4. Provides visual feedback including jiggle animations
// 5. Enhances ghost connectors for touch interaction
// 6. Integrates seamlessly with zoom/pan systems
```

#### Gesture State Machine

The TouchAdapter uses a sophisticated state machine for gesture recognition:

1. **Touch Start**: Detect touch points and initialize gesture tracking
2. **Movement Detection**: Analyze movement patterns for gesture classification
3. **Long-Press Detection**: Timer-based detection for note movement prep
4. **Multi-Touch Handling**: Coordinate multiple simultaneous touch points
5. **Gesture Completion**: Execute appropriate actions based on gesture type
6. **Visual Feedback**: Jiggle animations and enhanced ghost connector displays

### Enhanced Touch Features (Recent Updates)

The TouchAdapter system includes several advanced features for improved mobile experience:

#### Ghost Connector Enhancements
- **Automatic sizing**: Ghost connectors adapt to device type (larger on touch devices)
- **Visual feedback**: Selected connectors show enhanced glow effects with scaling transforms
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
  onClose: (dropdown) => console.log('Closed:', dropdown)
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
  onClose: (modal) => console.log('Modal closed')
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
  duration: 150
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
  singleDropdown: true
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
  preventScroll: true
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
  dropdownSelector: '.dropdown'
});
```

## Related Documentation

- [Developer Guide](developer-guide.md) - Overall development patterns
- [Testing Guide](testing.md) - Testing mobile interactions
- [Accessibility Guide](accessibility.md) - Mobile accessibility considerations

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
  .mobile-only { display: block; }
  .desktop-only { display: none; }
}

@media (min-width: 769px) {
  .mobile-only { display: none; }
  .desktop-only { display: block; }
}

/* Touch-safe spacing */
.touch-safe {
  min-height: 44px;
  min-width: 44px;
  padding: 12px;
}
```