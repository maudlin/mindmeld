# TouchAdapter Native Gesture Detection Refactor Plan

## Current Problem

TouchAdapter violates the **Adapter-Behavior architecture** by running two competing gesture recognition systems:

1. **GestureRecognizer** → emits `gesture.tap` events (4 per double-tap)
2. **Native double-tap detector** → handles double-tap separately

**Result**: Conflicting systems create log noise, spurious events, and architectural violations.

## Root Cause Analysis

**Issue**: TouchAdapter is not the "single source of truth" for input detection like DesktopAdapter is.

**Current Flow** (Broken):
```
Raw Touch → GestureRecognizer → gesture events → TouchAdapter → Behaviors
         ↳ Native detector → TouchAdapter → Behaviors
```

**Intended Flow** (Per Architecture Doc):
```
Raw Touch → TouchAdapter (detects ALL gestures) → Behaviors
```

## Proposed Solution

### Phase 1: Make TouchAdapter the Single Gesture Authority

**Remove** GestureRecognizer entirely and implement native detection for all gestures within TouchAdapter, matching the DesktopAdapter pattern.

**Target Architecture**:
```javascript
class TouchAdapter {
  // Single gesture detection point (like DesktopAdapter)
  setupNativeTouchHandlers() {
    this.canvas.addEventListener('touchstart', this.handleTouch.bind(this));
    this.canvas.addEventListener('touchmove', this.handleTouch.bind(this));
    this.canvas.addEventListener('touchend', this.handleTouch.bind(this));
  }

  handleTouch(event) {
    const gesture = this.recognizeGesture(event);
    const target = this.identifyTarget(event);
    
    // Clean routing (like DesktopAdapter.handleDoubleClick)
    switch (gesture.type) {
      case 'tap':
        this.routeTap(target, gesture);
        break;
      case 'doubletap':
        this.routeDoubleTap(target, gesture);
        break;
      case 'longpress':
        this.routeLongPress(target, gesture);
        break;
      case 'drag':
        this.routeDrag(target, gesture);
        break;
      case 'pinch':
        this.routePinch(target, gesture);
        break;
    }
  }
}
```

### Required Gesture Detection

Based on user requirements and existing functionality:

1. **Tap Detection**: Single finger touch → release
2. **Double-tap Detection**: Two taps within 300ms, <30px apart ✅ (already working)
3. **Long Press Detection**: Touch held >500ms without movement
4. **Drag Detection**: Touch → move >15px → continuous tracking
5. **Pinch Detection**: Two finger zoom/scale (for canvas zoom)

### Implementation Strategy

#### Step 1: Implement Native Gesture Recognition
- Create `TouchGestureRecognizer` class within TouchAdapter
- Implement state machine for gesture detection
- Handle multi-touch scenarios (pinch, two-finger pan)

#### Step 2: Clean Delegation Routing
```javascript
routeDoubleTap(target, gesture) {
  if (target.note) {
    this.noteBehavior.handleNoteDoubleClick(target.element, gesture, 'touch');
  } else if (target.canvas) {
    this.canvasBehavior.handleCanvasDoubleClick(gesture, 'touch');
  }
}
```

#### Step 3: Remove GestureRecognizer Dependencies
- Remove GestureRecognizer initialization
- Remove `gesture.*` event listeners
- Clean up unused imports and methods

#### Step 4: Preserve Touch-Specific Features
- Hit target expansion (20px)
- Touch feedback styling
- Platform-specific optimizations

## Expected Benefits

### Immediate Fixes
- ✅ No more duplicate gesture processing
- ✅ Clean console logs (4 taps → 1 double-tap)
- ✅ No more spurious long press events
- ✅ Proper event suppression during gestures

### Architectural Improvements
- ✅ TouchAdapter becomes single authority (like DesktopAdapter)
- ✅ Clean separation: TouchAdapter detects, Behaviors handle logic
- ✅ Easier debugging (single input detection point)
- ✅ Consistent with architecture documentation

### Future Benefits
- ✅ Easy to add new touch gestures
- ✅ Predictable gesture handling
- ✅ Better test coverage (focused testing)
- ✅ Reduced complexity

## Implementation Risks & Mitigations

### Risk 1: Breaking Existing Gestures
**Mitigation**: Implement one gesture at a time, test thoroughly
- Start with double-tap (already working)
- Add tap detection with proper single/double differentiation
- Progressive rollout of other gestures

### Risk 2: Missing Edge Cases
**Mitigation**: Reference existing GestureRecognizer logic for edge cases
- Multi-touch handling
- Touch cancellation
- Gesture timeouts

### Risk 3: Performance Impact
**Mitigation**: TouchAdapter native detection should be faster than event bus
- Direct method calls vs event emission
- No intermediate event bus overhead

## Testing Strategy

### Unit Tests
- TouchAdapter gesture recognition accuracy
- Proper behavior delegation
- Edge case handling (multi-touch, cancellation)

### E2E Tests  
- All existing touch interaction tests should pass
- Clean console logs (verify no duplicate processing)
- Cross-platform consistency (touch behavior matches desktop intent)

## Success Criteria

1. **Clean Logs**: Single user double-tap → single "Native double-tap detected" log
2. **All Tests Pass**: No regression in existing touch functionality  
3. **Architecture Compliance**: TouchAdapter as single gesture authority
4. **No Spurious Events**: Long press only fires when intended

## Future Documentation Updates

### Add to `docs/adapter-behavior-architecture.md`:

#### TouchAdapter Native Gesture Detection
```markdown
### TouchAdapter Implementation Note

TouchAdapter implements **native gesture recognition** rather than using an intermediate 
gesture recognition layer. This matches the DesktopAdapter pattern of being the single 
source of input detection truth.

**Why Native**: Touch gestures require complex timing and multi-touch coordination that 
is best handled directly in the adapter rather than through event bus intermediaries.

**Gesture Support**:
- Single tap, Double tap, Long press
- Drag (single and multi-finger)
- Pinch/zoom, Two-finger pan
```

## Rollback Plan

If issues arise, rollback is straightforward:
1. Re-enable GestureRecognizer initialization
2. Re-add `gesture.*` event listeners  
3. Disable native gesture detection
4. Revert to previous working state

The current native double-tap detection will be preserved as a fallback.

---

**Recommendation**: Proceed with Phase 1 implementation, starting with gesture consolidation while preserving all existing functionality.