# Mobile Interaction Patterns

This document outlines consistent mobile-friendly interaction patterns used throughout MindMeld. These patterns ensure a seamless experience across desktop and mobile devices.

## Overview

Mobile devices have different interaction paradigms than desktop:
- **No hover state**: Touch devices don't have true hover, so hover-based UI must be converted to tap-based
- **Touch feedback**: Users expect visual feedback when touching elements
- **Click-away patterns**: Common mobile pattern for closing menus/modals
- **Escape key support**: Important for keyboard accessibility

## Available Utilities

All mobile interaction utilities are located in `src/js/utils/mobileInteractions.js`.

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