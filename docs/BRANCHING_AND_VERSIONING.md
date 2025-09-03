# Branching and Auto-Versioning Guide

## Overview

MindMeld uses **smart branch naming** to automatically handle version bumping and cache busting. When you push certain types of branches, the system automatically increments the version and updates cache-busting parameters.

## Branch Naming Conventions

### 🚀 **Feature Branches** → Minor Version Bump
```bash
feat/touch-pinch-zoom-fine-grained-control    # ✅ 0.11.0 → 0.12.0
feature/new-markdown-editor                   # ✅ 0.11.0 → 0.12.0
```

### 🐛 **Bugfix Branches** → Patch Version Bump  
```bash
fix/touch-pinch-zoom-fine-grained-control     # ✅ 0.11.0 → 0.11.1
bugfix/connection-drag-performance             # ✅ 0.11.0 → 0.11.1
```

### ⚡ **Performance Branches** → Patch Version Bump
```bash
perf/canvas-rendering-optimization             # ✅ 0.11.0 → 0.11.1
performance/memory-leak-fixes                  # ✅ 0.11.0 → 0.11.1
```

### 💥 **Breaking Changes** → Major Version Bump
```bash
major/new-data-format                          # ✅ 0.11.0 → 1.0.0
breaking/api-restructure                       # ✅ 0.11.0 → 1.0.0
```

### 🔧 **Other Branches** → No Version Bump
```bash
chore/update-dependencies                      # ⚪ No version change
docs/update-readme                            # ⚪ No version change  
test/add-e2e-coverage                         # ⚪ No version change
refactor/cleanup-utils                        # ⚪ No version change
```

## How It Works

### Automatic Process
1. **Push branch** with appropriate naming convention
2. **Pre-push hook detects** branch type
3. **Version script runs** (`npm run version:minor/patch/major`)
4. **Cache busting updated** in `src/index.html`:
   ```html
   <link rel="stylesheet" href="css/styles.css?v=0.12.0" />
   <script type="module" src="js/app.js?v=0.12.0"></script>
   ```
5. **Version commit added** to your branch automatically
6. **Normal pre-push checks** run (format, lint, tests)

### What Gets Updated
- `package.json` version field
- HTML meta tags (`app-version`, `build-date`)  
- Cache busting parameters (`?v=0.12.0`)
- Automatic commit with version changes

### Sample Output
```bash
$ git push -u origin feat/new-feature

🔍 Feature branch detected: feat/new-feature
📦 Auto-bumping minor version for new feature...
Version updated to: v0.12.0 (2025-09-03) (meta tags written)
[feat/new-feature abc123d] chore: bump version for feature release
✅ Pre-push checks passed - should pass in CI
```

## Benefits

- ✅ **Version in PR**: Changes included in the branch, not post-merge
- ✅ **Cache busting**: Automatic browser cache invalidation  
- ✅ **No manual steps**: Just name your branch correctly
- ✅ **Semantic versioning**: Follows semver automatically
- ✅ **Branch protection**: No additional commits needed after merge

## Manual Override

If you need to skip auto-versioning or handle special cases:

```bash
# Skip versioning for this push
git push --no-verify

# Manual version bump
npm run version:patch   # or minor/major
git add package.json src/index.html  
git commit -m "chore: manual version bump"
git push
```

## Examples

### Typical Feature Development
```bash
# Start feature
git checkout -b feat/dark-mode-toggle
# ... make changes ...
git commit -m "feat: add dark mode toggle component"
git push -u origin feat/dark-mode-toggle
# → Auto-bumps to 0.12.0, creates PR with version included
```

### Typical Bugfix  
```bash  
# Start bugfix
git checkout -b fix/zoom-button-alignment
# ... make changes ...
git commit -m "fix: correct zoom button positioning in mobile"
git push -u origin fix/zoom-button-alignment  
# → Auto-bumps to 0.11.1, creates PR with version included
```

## Team Guidelines

1. **Choose branch names carefully** - they determine version bump type
2. **Use descriptive names** - `feat/user-authentication` not `feat/auth`
3. **One feature per branch** - don't mix features and fixes
4. **Check version changes** - review the auto-generated version commit
5. **Test after version bump** - ensure cache busting works correctly

---

This system ensures consistent versioning and eliminates manual cache-busting maintenance! 🚀