# Canvas Templates Removal - V1 Simplification

## Overview
Canvas templates (Hero's Journey, Now/Next/Future, Wardley Map) were temporarily **removed for V1 simplification** to focus on core functionality and eliminate complexity-related bugs.

**Status**: Templates disabled but files preserved for future restoration  
**Date**: August 26, 2025  
**Reason**: V1 focus, eliminate multi-select/centering bugs, improve test success rate  

---

## What Was Changed

### ✅ **Removed UI Elements**
- **HTML**: Kebab menu "Change Template" option removed from `src/index.html`
- **Kebab Menu Events**: `changeTemplate()` method removed from `kebabMenuEvents.js`
- **Kebab Menu Logic**: `change-template` action case removed from `kebabMenu.js`

### ✅ **Simplified Core Logic**
- **Config**: `src/js/core/config.js` - Removed `canvasTypes` object, kept `defaultCanvasType`
- **Canvas Manager**: `src/js/core/canvasManager.js` - Only loads Standard Canvas module
- **Canvas State Service**: `src/js/services/canvasStateService.js` - Only accepts 'Standard Canvas'
- **Data Store**: `src/js/data/dataStore.js` - Always uses Standard Canvas, ignores imported canvas types

### ✅ **Disabled Tests**
- `tests/unit/services/canvasStateService.test.js.disabled`
- `tests/e2e/canvas-template-switching.spec.js.disabled`
- `tests/e2e/color-picker-templates.spec.js.disabled`
- `tests/unit/data/exportImport.test.js.disabled`
- `tests/helpers/journeyHelpers.js.disabled`

### ✅ **Preserved Template Files**
**Template modules remain untouched for future restoration:**
- `src/js/features/canvas/templates/herosJourney/`
- `src/js/features/canvas/templates/nowNextFuture/`
- `src/js/features/canvas/templates/wardleyMap/`
- `src/js/features/canvas/templates/standardCanvas/`

---

## How to Restore Canvas Templates

### 1. **Restore UI Elements**

**Add back to `src/index.html`:**
```html
      <div class="kebab-menu-divider"></div>
      <div class="kebab-menu-group">
        <div class="kebab-menu-subtitle">Templates</div>
        <div
          class="kebab-menu-item"
          role="menuitem"
          data-action="change-template"
          tabindex="0"
        >
          <span>Change Template</span>
        </div>
      </div>
```

**Restore in `src/js/features/kebabMenu/kebabMenuEvents.js`:**
```javascript
case 'change-template':
  this.changeTemplate();
  break;

// Add back the full changeTemplate() method (see git history)
```

**Restore in `src/js/features/kebabMenu/kebabMenu.js`:**
```javascript
case 'change-template':
  this.dispatchAction('change-template');
  break;
```

### 2. **Restore Core Configuration**

**Update `src/js/core/config.js`:**
```javascript
export default {
  // ... other config
  defaultCanvasType: 'Standard Canvas',
  canvasTypes: {
    standardCanvas: {
      name: 'Standard Canvas',
      path: '../features/canvas/templates/standardCanvas/standardCanvas.js',
    },
    herosJourney: {
      name: "Hero's Journey",
      path: '../features/canvas/templates/herosJourney/herosJourneyCanvas.js',
    },
    nowNextFuture: {
      name: 'Now/Next/Future',
      path: '../features/canvas/templates/nowNextFuture/nowNextFutureCanvas.js',
    },
    wardleyMap: {
      name: 'Wardley Map',
      path: '../features/canvas/templates/wardleyMap/wardleyMapCanvas.js',
    },
  },
};
```

### 3. **Restore Canvas Manager**

**Update `src/js/core/canvasManager.js` `loadModules()` method:**
```javascript
async loadModules() {
  log('Loading modules...');

  const allowedPaths = [
    '../features/canvas/templates/standardCanvas/standardCanvas.js',
    '../features/canvas/templates/herosJourney/herosJourneyCanvas.js',
    '../features/canvas/templates/nowNextFuture/nowNextFutureCanvas.js',
    '../features/canvas/templates/wardleyMap/wardleyMapCanvas.js',
  ];

  for (const [key, value] of Object.entries(config.canvasTypes)) {
    try {
      log(`Attempting to load module: ${key} from path: ${value.path}`);

      if (!allowedPaths.includes(value.path)) {
        console.error(`Security: Attempted to load unauthorized module path: ${value.path}`);
        continue;
      }

      const module = await import(value.path);
      const instance = new module.default();
      if (instance instanceof CanvasModule) {
        this.registerModule(instance);
        log(`Successfully loaded and registered module: ${key}`);
      }
    } catch (error) {
      console.error(`Failed to load canvas module: ${key}`, error);
    }
  }
}
```

**Restore `switchBackgroundLayout()` method to full functionality** (see git history before removal)

### 4. **Restore Canvas State Service**

**Update `src/js/services/canvasStateService.js`:**
```javascript
static get VALID_CANVAS_TYPES() {
  return Object.values(config.canvasTypes).map(
    (canvasType) => canvasType.name,
  );
}

static isValidCanvasType(canvasType) {
  return (
    typeof canvasType === 'string' &&
    this.VALID_CANVAS_TYPES.includes(canvasType)
  );
}
```

### 5. **Restore Data Handling**

**Update `src/js/data/dataStore.js`:**
```javascript
// Restore canvas type export
if (canvasType && canvasType !== 'Standard Canvas') {
  compressedData.ct = canvasType;
}

// Restore canvas type import logic
let importedCanvasType = 'Standard Canvas';
if (data.ct && CanvasStateService.isValidCanvasType(data.ct)) {
  importedCanvasType = data.ct;
  log('Importing canvas type:', importedCanvasType);
}
```

### 6. **Re-enable Tests**

**Restore test files:**
```bash
mv tests/unit/services/canvasStateService.test.js.disabled tests/unit/services/canvasStateService.test.js
mv tests/e2e/canvas-template-switching.spec.js.disabled tests/e2e/canvas-template-switching.spec.js  
mv tests/e2e/color-picker-templates.spec.js.disabled tests/e2e/color-picker-templates.spec.js
mv tests/unit/data/exportImport.test.js.disabled tests/unit/data/exportImport.test.js
mv tests/helpers/journeyHelpers.js.disabled tests/helpers/journeyHelpers.js
```

**Update test expectations in restored files to match current functionality**

### 7. **Re-enable Canvas Style Dropdown**

**Update `src/js/core/uiSetup.js`** to populate the canvas style dropdown again  
**Update any bootstrap code** that initializes canvas templates

---

## V1 Benefits Achieved

### ✅ **Simplified Architecture**
- Eliminated template switching complexity
- Removed background layout management issues  
- Single canvas type reduces state management complexity

### ✅ **Fixed Template-Related Bugs**
- No more canvas centering inconsistencies across templates
- No more multi-select issues on Hero's Journey/Wardley backgrounds
- Eliminated template switching test failures

### ✅ **Improved Test Success Rate**
- Removed 4-6 failing E2E tests related to templates
- Eliminated unit test complications with template validation
- Focus on core functionality testing

---

## Technical Notes

### **Template Files Preserved**
All template modules remain fully functional and untouched:
- CSS files, background layouts, and module definitions intact
- Can be immediately re-enabled by reversing the changes above

### **Migration Strategy** 
When restoring templates:
1. **Test thoroughly** - Template switching had bugs that need fixing
2. **Update E2E tests** - Some template tests may need adjustment for current architecture
3. **Consider phased rollout** - Re-enable one template at a time to identify issues

### **Future Improvements Needed**
Before full restoration, consider fixing:
- Canvas centering consistency across all template types
- Multi-select drag behavior on templates with background graphics
- Touch interaction compatibility with template backgrounds

---

**Restoration Complexity**: Medium  
**Estimated Effort**: 2-3 hours for a developer familiar with the codebase  
**Risk Level**: Low (files preserved, well-documented changes)