# Broken Tests After ConnectionBehavior Implementation

**Status**: Tests broken due to E2E configuration issues after MM-182 event system refactor + ConnectionBehavior implementation  
**Manual Testing**: ✅ All functionality works correctly in manual testing  
**Root Cause**: Test configuration/timing issues, not implementation problems  
**Date**: December 29, 2025

## Summary

The ConnectionBehavior implementation is functionally complete and working correctly:

- ✅ Desktop connections (click-and-drag)
- ✅ Touch connections (tap-to-tap with visual mode)
- ✅ Canvas double-click/double-tap note creation
- ✅ Note double-click/double-tap to enter edit mode
- ✅ All core interactions working manually

However, E2E tests are failing due to configuration/timing issues with the new adapter-behavior architecture.

## Failed Tests (5 main failures, 9 interrupted)

### Core Canvas Interaction Failures

```
❌ [chromium] › tests/e2e/css-pointer-events-bug.spec.js:12:3 › MM-173 CSS pointer-events Bug Verification › Child elements have pointer-events: none in view mode
   Error: TimeoutError: page.dblclick: Timeout 5000ms exceeded.
   Issue: <html lang="en">…</html> intercepts pointer events

❌ [chromium] › tests/e2e/css-pointer-events-bug.spec.js:79:3 › MM-173 CSS pointer-events Bug Verification › CSS rule exists in stylesheet
   Error: Expected: "none", Received: ""
   Issue: CSS expectations may have changed with new architecture

❌ [chromium] › tests/e2e/css-pointer-events-bug.spec.js:115:3 › MM-173 CSS pointer-events Bug Verification › Touch mode: Double-tap on styled content fails due to CSS bug
   Error: TimeoutError: locator.boundingBox: Timeout 5000ms exceeded.
   Issue: Touch simulation timing differences
```

### Export/Import Workflow Failures

```
❌ [chromium] › tests/e2e/color-picker-export-import.spec.js:14:3 › Color Picker - Export/Import Workflow › Should maintain colors in export/import workflow
   Issue: Likely timing issues with new event flow
```

### State Persistence Failures

```
❌ [chromium] › tests/e2e/comprehensive-state-persistence.spec.js:24:3 › Comprehensive State Persistence › Should persist complete state across page refresh
   Issue: State management timing changes with adapter-behavior pattern
```

### Connection/Delete Button Failures

```
❌ [chromium] › tests/e2e/delete-button-interactions.spec.js:35:3 › Delete Button Interactions › Should delete connection via left-click on delete button @critical
   Issue: Connection deletion interactions affected by ConnectionBehavior changes
```

## Interrupted Tests (Test Runner Stopped Early)

### Edit/View Mode Toggle Tests

```
⚠️ [chromium] › tests/e2e/edit-view-mode-toggle.spec.js:69:3 › MM-155: Edit vs View Mode Toggle › Clicking note switches from view mode to edit mode @smoke @critical
⚠️ [chromium] › tests/e2e/edit-view-mode-toggle.spec.js:269:3 › MM-155: Edit vs View Mode Toggle › Empty content handling in both modes
⚠️ [chromium] › tests/e2e/edit-view-mode-toggle.spec.js:314:3 › MM-155: Edit vs View Mode Toggle › Mode toggle works on mobile/touch devices @mobile
⚠️ [chromium] › tests/e2e/edit-view-mode-toggle.spec.js:361:3 › MM-155: Edit vs View Mode Toggle › Keyboard shortcuts for edit mode (Enter, Escape, Ctrl+Enter)
```

### Kebab Menu Tests

```
⚠️ [chromium] › tests/e2e/kebab-menu.spec.js:6:5 › Kebab Menu Functionality › Basic Menu Interactions › Should open and close kebab menu by clicking button
⚠️ [chromium] › tests/e2e/kebab-menu.spec.js:39:5 › Kebab Menu Functionality › Basic Menu Interactions › Should close menu when clicking outside
⚠️ [chromium] › tests/e2e/kebab-menu.spec.js:54:5 › Kebab Menu Functionality › Basic Menu Interactions › Should close menu when pressing Escape key
```

### Color Picker Multi-Note Tests

```
⚠️ [chromium] › tests/e2e/color-picker-multiple-notes.spec.js:14:3 › Color Picker - Multiple Notes › Should handle color persistence with multiple notes
```

## Test Results Summary

- **51 passed** ✅
- **5 failed** ❌ (main issues)
- **9 interrupted** ⚠️ (test runner stopped)
- **212 did not run** (stopped after max failures reached)
- **1 skipped**

## Common Error Patterns

### 1. Canvas Double-Click Detection Issues

**Pattern**: `<html lang="en">…</html> intercepts pointer events`
**Likely Cause**: Event delegation changes in adapter-behavior architecture
**Fix Needed**: Update test selectors or event simulation timing

### 2. CSS Expectations Changed

**Pattern**: Expected CSS rules/classes not found
**Likely Cause**: CSS classes or pointer-events behavior changed with new architecture  
**Fix Needed**: Update CSS expectations in tests

### 3. Touch Simulation Timing

**Pattern**: Timeouts on touch interactions in E2E vs working manual touch
**Likely Cause**: Browser touch simulation doesn't match real device timing
**Fix Needed**: Adjust touch interaction delays in test helpers

### 4. Event Flow Timing Changes

**Pattern**: Tests expecting immediate responses, but new architecture has different timing
**Likely Cause**: Adapter → Behavior → EventBus → Service flow has different timing than old direct events
**Fix Needed**: Add appropriate `waitForTimeout()` or better state waiting

## Recommended Fix Approach

### Phase 1: Core Canvas Interactions

1. Fix canvas double-click detection in tests
2. Update CSS expectations for pointer-events
3. Verify CanvasBehavior delegation is properly tested

### Phase 2: Connection System Tests

1. Update connection creation tests for new tap-to-tap (touch) vs click-and-drag (desktop) patterns
2. Verify ConnectionBehavior integration with existing connection management
3. Test ghost connector visibility changes

### Phase 3: Touch Simulation Improvements

1. Review touch test helpers for timing adjustments
2. Add proper state waiting instead of fixed timeouts
3. Verify mobile/touch device test configurations

### Phase 4: Edit Mode & UI Component Tests

1. Update edit/view mode toggle tests for new adapter behavior
2. Fix kebab menu and color picker interaction tests
3. Verify keyboard shortcut handling with new event flow

## Architecture Notes for Test Fixes

### New Event Flow Pattern

```
Old: User Input → Direct DOM Event → Service Logic
New: User Input → Adapter (Input Detection) → Behavior (Logic) → EventBus → Service
```

**Impact**: Tests expecting immediate DOM changes may need to wait for the full event flow to complete.

### ConnectionBehavior Specifics

```
Desktop: Click ghost connector → immediate drag → release on target
Touch: Tap ghost connector → visual mode (all ghost connectors show) → tap target note
```

**Impact**: Connection creation tests need to account for different desktop vs touch patterns.

### Adapter-Behavior State Management

- Behaviors maintain interaction state
- Adapters are stateless input translators
- InteractionController orchestrates behavior lifecycle

**Impact**: Tests checking interaction state may need to query behaviors instead of adapters.

## Priority Order

1. **High**: Canvas double-click/double-tap (blocks note creation tests)
2. **High**: Connection system tests (core functionality)
3. **Medium**: Edit/view mode toggle (user workflow critical)
4. **Medium**: Touch simulation timing (affects mobile testing)
5. **Low**: UI component tests (kebab menu, color picker - secondary features)

---

## Recent Touch Interaction Issues (Post-ConnectionBehavior)

### Issue: Double-Tap Edit Mode Flakiness

**Status**: 🔄 **In Progress** - Dual tracking system implemented but issue persists  
**Date**: August 29, 2025

**Problem**: Touch double-tap to enter edit mode is unreliable

- Sometimes works perfectly (201ms timing, 0px distance)
- Sometimes fails completely (only sees individual taps)

**Root Cause Analysis**:

- Canvas taps interfere with note double-tap detection
- Single timing system caused cross-contamination between target types

**Fix Attempt**: Implemented separate timing tracking in GestureRecognizer

- `lastNoteTapTime/Position` for note targets
- `lastCanvasTapTime/Position` for canvas targets
- Target classification logic for notes vs canvas vs other

**Test Scenarios**:

```javascript
describe('Touch Double-Tap Reliability', () => {
  it('should enter edit mode after double-tapping note', async () => {
    await page.tap('.note'); // Select note
    await page.tap('.note'); // Double-tap to edit
    await expect(page.locator('.note-content.edit-mode')).toBeVisible();
  });

  it('should enter edit mode after canvas interaction', async () => {
    await page.tap('.note'); // Select note
    await page.tap('.note'); // Double-tap to edit (success)
    await page.tap('#canvas'); // Exit edit mode
    await page.tap('.note'); // Select note again
    await page.tap('.note'); // Double-tap to edit (should work)
    await expect(page.locator('.note-content.edit-mode')).toBeVisible();
  });

  it('should create note after double-tapping canvas', async () => {
    await page.tap('.note'); // Select a note
    await page.tap('#canvas'); // Deselect
    await page.tap('#canvas'); // Double-tap canvas
    await page.tap('#canvas'); // (should create note)
    await expect(page.locator('.note')).toHaveCount(2);
  });

  it('should not interfere between canvas and note double-taps', async () => {
    // Test the specific failure scenario
    await page.tap('.note'); // Tap note
    await page.tap('.note'); // Double-tap note → edit mode
    await expect(page.locator('.note-content.edit-mode')).toBeVisible();

    await page.tap('#canvas'); // Exit edit mode
    await expect(page.locator('.note-content.edit-mode')).not.toBeVisible();

    await page.tap('.note'); // Tap note
    await page.tap('.note'); // Double-tap note → should enter edit mode
    await expect(page.locator('.note-content.edit-mode')).toBeVisible();
  });
});
```

**Expected Behavior**:

- Note double-taps should always enter edit mode
- Canvas double-taps should always create notes
- Canvas taps should not interfere with subsequent note double-taps
- Note taps should not interfere with subsequent canvas double-taps

**Current Status**: Fix implemented but not working - need console log analysis

---

**Next Steps**: Work through broken tests after all manual functionality is confirmed working correctly.
