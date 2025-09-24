# Git Workflow & Auto-Versioning

## Context

MindMeld uses an advanced Git workflow with **automatic versioning**, **branch protection**, and **intelligent dependency management**. This system ensures high code quality while automating tedious versioning tasks.

## Branch Protection

The `main` branch has comprehensive protection enabled:

- ✅ **Requires PR reviews** (1 approver minimum)
- ✅ **Requires up-to-date branches** (prevents merge conflicts)
- ✅ **Requires linear history** (enforces clean commit history)
- ✅ **Dismisses stale reviews** on new commits
- ✅ **Requires conversation resolution** before merge

## Auto-Versioning System

### Smart Branch Naming

MindMeld uses **smart branch naming** to automatically handle version bumping and cache busting. The system detects branch type and increments version accordingly.

#### 🚀 **Feature Branches** → Minor Version Bump

```bash
feat/touch-pinch-zoom-fine-grained-control    # ✅ 0.11.0 → 0.12.0
feature/new-markdown-editor                   # ✅ 0.11.0 → 0.12.0
```

#### 🐛 **Bugfix Branches** → Patch Version Bump

```bash
fix/touch-pinch-zoom-fine-grained-control     # ✅ 0.11.0 → 0.11.1
bugfix/connection-drag-performance             # ✅ 0.11.0 → 0.11.1
```

#### ⚡ **Performance Branches** → Patch Version Bump

```bash
perf/canvas-rendering-optimization             # ✅ 0.11.0 → 0.11.1
performance/memory-leak-fixes                  # ✅ 0.11.0 → 0.11.1
```

#### 💥 **Breaking Changes** → Major Version Bump

```bash
major/new-data-format                          # ✅ 0.11.0 → 1.0.0
breaking/api-restructure                       # ✅ 0.11.0 → 1.0.0
```

#### 🎯 **Explicit Version Control** → Custom Bump Type

```bash
feat/major/breaking-api-changes                # ✅ 0.11.0 → 1.0.0
fix/minor/significant-refactor                 # ✅ 0.11.0 → 0.12.0
perf/patch/micro-optimization                  # ✅ 0.11.0 → 0.11.1
```

#### 🔧 **Other Branches** → No Version Bump

```bash
chore/update-dependencies                      # ⚪ No version change
docs/update-readme                            # ⚪ No version change
test/add-e2e-coverage                         # ⚪ No version change
refactor/cleanup-utils                        # ⚪ No version change
```

### How Auto-Versioning Works

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

**What Gets Updated:**
- `package.json` version field
- HTML meta tags (`app-version`, `build-date`)
- Cache busting parameters (`?v=0.12.0`)
- Automatic commit with version changes

## Workflow Best Practices

### Starting New Work

1. **Always branch from latest main**: `git checkout main && git pull && git checkout -b feature/your-feature`
2. **Check for conflicting PRs**: Review open PRs that might modify similar files
3. **Use descriptive branch names**: `feature/MM-123-mobile-test-coverage`
4. **Choose branch names carefully** - they determine version bump type

### Creating Pull Requests

1. **Use PR template**: Automatically provided, includes dependency checks
2. **Verify independence**: Ensure your PR can be merged without dependencies
3. **Mark dependencies**: If your work depends on other open PRs, mark them clearly
4. **Check version changes**: Review the auto-generated version commit

### Handling Dependencies

- ✅ **Sequential approach**: Wait for infrastructure PRs to merge before starting overlapping work
- ✅ **Communication**: Coordinate with team when working on related areas
- ❌ **Avoid parallel overlapping work**: Prevents complex rebase scenarios

### Branch Protection Benefits

- **Prevents merge conflicts**: "Require up-to-date branches" forces automatic conflict resolution
- **Maintains history quality**: Linear history requirement keeps commits clean
- **Ensures review**: All changes get proper code review before merge

## Manual Override & Examples

### Skip Auto-Versioning

```bash
# Skip versioning for this push
git push --no-verify

# Manual version bump
npm run version:patch   # or minor/major
git add package.json src/index.html
git commit -m "chore: manual version bump"
git push
```

### Typical Development Workflows

**Feature Development:**
```bash
# Start feature
git checkout -b feat/dark-mode-toggle
# ... make changes ...
git commit -m "feat: add dark mode toggle component"
git push -u origin feat/dark-mode-toggle
# → Auto-bumps to 0.12.0, creates PR with version included
```

**Bugfix:**
```bash
# Start bugfix
git checkout -b fix/zoom-button-alignment
# ... make changes ...
git commit -m "fix: correct zoom button positioning in mobile"
git push -u origin fix/zoom-button-alignment
# → Auto-bumps to 0.11.1, creates PR with version included
```

## Dependency Management

### Detection & Prevention

**Quick PR Dependency Check** - Before creating a new PR:

```bash
# 1. Check what files you're modifying
git diff --name-only main..HEAD

# 2. Check open PRs for file conflicts
gh pr list --state open --json number,title,files

# 3. Look for overlapping file changes
# If you see the same files in multiple PRs, coordinate with the team
```

**High-Risk Conflict Areas:**
- Core testing infrastructure files (helpers, page objects)
- `package.json` - Scripts and dependencies
- Any files in `src/js/core/` - Core architecture
- Test spec files (`*.spec.js`, `*.test.js`)
- Documentation files (`docs/*.md`)

**Resolution Strategies:**

1. **Sequential Development (Recommended)**: Wait for infrastructure PRs to merge first
2. **Stacked PRs (Advanced)**: Base work on another open PR branch, rebase after merge
3. **Team Coordination**: Comment on related PRs, use draft PRs for early coordination

## Common Scenarios

### Scenario 1: PR Conflicts with Main

```bash
# Branch protection will require you to update before merge
git checkout your-branch
git fetch origin
git rebase origin/main
# Resolve any conflicts
git push --force-with-lease origin your-branch
```

### Scenario 2: Working on Dependent Features

1. Wait for base PR to merge to main
2. Branch from updated main for dependent work
3. This prevents the "wrong base branch" problem

### Scenario 3: Emergency Hotfixes

1. Still follow protection rules (no direct pushes to main)
2. Create hotfix PR with expedited review
3. Branch protection ensures quality even in emergencies

## Troubleshooting

### Branch Protection Errors

**"Branch is not up to date" Error:**
```bash
git checkout your-branch
git fetch origin
git rebase origin/main
# Resolve any conflicts
git push --force-with-lease origin your-branch
```

**"Linear history required" Error:**
```bash
# Use rebase instead of merge
git checkout your-branch
git rebase origin/main  # Instead of git merge main
git push --force-with-lease origin your-branch
```

**"Required status checks failed" Error:**
```bash
# Run checks locally first
npm test && npm run test:e2e
npm run lint && npm run format:check

# Fix any failures, then push
git add .
git commit -m "fix: resolve test failures"
git push origin your-branch
```

### Complex Rebase Scenarios

**Multiple Conflicted Commits:**
```bash
# Start interactive rebase
git rebase -i origin/main

# For each conflict:
# 1. Resolve conflicts in files
# 2. git add resolved-files
# 3. git rebase --continue
# 4. Repeat until done

# Force push when complete
git push --force-with-lease origin your-branch
```

**Preserving Important Work:**
```bash
# Create backup branch first
git checkout your-branch
git checkout -b your-branch-backup

# Then proceed with rebase on original branch
git checkout your-branch
git rebase origin/main
# If rebase goes wrong, restore from backup
```

## Team Communication Patterns

### PR Dependency Comments

```markdown
## Dependencies
This PR depends on #123 (E2E infrastructure improvements) merging first.

**Files in common:**
- `tests/e2e/helpers/CanvasPage.js` - extends the infrastructure from #123
- `package.json` - adds test scripts building on #123

**Merge order:** #123 → this PR
```

### Coordinating Overlapping Work

```markdown
@teammate I see we're both modifying `CanvasPage.js`.

My changes: Adding connection verification methods
Your changes: Browser closure protection

Suggest: Your infrastructure PR merges first, then I'll rebase and extend it.
```

## CI Quick Checklist

Before opening a PR:

- Pull latest main; branch from up-to-date main
- Lint and format check: `npm run lint && npm run format:check`
- Unit tests: `npm run test:unit`
- E2E tests: `npm run test:e2e` (local development only)
- Security checks: `npm run security`
- Push and open PR; ensure CI is green before requesting review

## Related Documentation

- [Coding Standards](coding-standards.md) - Style and naming conventions
- [CI/CD](../operations/ci-cd.md) - Build and deployment processes
- [Testing Patterns](testing-patterns.md) - Test requirements for PRs
