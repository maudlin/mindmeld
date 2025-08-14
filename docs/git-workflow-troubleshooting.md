# Git Workflow Troubleshooting Guide

## Dependency Detection & Prevention

### Quick PR Dependency Check

Before creating a new PR, run this manual check:

```bash
# 1. Check what files you're modifying
git diff --name-only main..HEAD

# 2. Check open PRs for file conflicts
gh pr list --state open --json number,title,files

# 3. Look for overlapping file changes
# If you see the same files in multiple PRs, coordinate with the team
```

### Common File Conflict Areas

These files/directories are frequently modified and require coordination:

**High-Risk Areas:**
- Core testing infrastructure files (e.g., helpers, page objects)
- `package.json` - Scripts and dependencies  
- `docs/testing.md` - Test documentation
- `CLAUDE.md` - Development context
- Any files in `src/js/core/` - Core architecture

**Medium-Risk Areas:**
- Test spec files (`*.spec.js`, `*.test.js`)
- Service files (`src/js/services/`)
- Documentation files (`docs/*.md`)

### Dependency Resolution Strategies

**Strategy 1: Sequential Development (Recommended)**
```bash
# Wait for infrastructure PRs to merge first
git checkout main
git pull origin main
git checkout -b feature/your-dependent-work
```

**Strategy 2: Stacked PRs (Advanced)**
```bash
# Base your work on another open PR branch
git checkout feature/base-pr-branch
git checkout -b feature/dependent-work
# Rebase onto main after base PR merges
```

**Strategy 3: Coordinate with Team**
- Comment on related PRs about your intended changes
- Use draft PRs for early coordination
- Plan work sequencing in team meetings

## Branch Protection Troubleshooting

### "Branch is not up to date" Error

**What it means**: Another PR merged while yours was open

**Solution**:
```bash
git checkout your-branch
git fetch origin
git rebase origin/main
# Resolve any conflicts
git push --force-with-lease origin your-branch
```

### "Linear history required" Error

**What it means**: You have merge commits instead of a linear history

**Solution**:
```bash
# Use rebase instead of merge
git checkout your-branch  
git rebase origin/main  # Instead of git merge main
git push --force-with-lease origin your-branch
```

### "Required status checks failed" Error

**What it means**: Tests or lint checks are failing

**Solution**:
```bash
# Run checks locally first
npm test && npm run test:e2e
npm run lint
npm run format:check

# Fix any failures, then push
git add .
git commit -m "fix: resolve test failures"
git push origin your-branch
```

## Complex Rebase Scenarios

### Multiple Conflicted Commits

When rebasing creates conflicts across many commits:

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

### Preserving Important Work

When conflicts risk losing substantial changes:

```bash
# Create backup branch first
git checkout your-branch
git checkout -b your-branch-backup

# Then proceed with rebase on original branch
git checkout your-branch
git rebase origin/main
# If rebase goes wrong, restore from backup
```

### Large Infrastructure Changes

For substantial infrastructure work (like the E2E test infrastructure):

1. **Use detailed commit messages** explaining the "why" not just "what"
2. **Break into logical commits** that can be individually understood
3. **Document critical fixes** (like removing problematic methods)
4. **Test thoroughly** after each rebase step
5. **Preserve hard-won debugging knowledge** in commit messages

## Prevention Best Practices

### Before Starting Work

```bash
# 1. Sync with main
git checkout main && git pull origin main

# 2. Check open PRs  
gh pr list --state open

# 3. Coordinate if you see conflicts
# Comment on related PRs or discuss in team chat

# 4. Branch from clean main
git checkout -b feature/your-work
```

### During Development

```bash
# Regularly sync with main to avoid large conflicts
git fetch origin
git rebase origin/main

# Push regularly to backup your work
git push origin your-branch
```

### Before Creating PR

```bash
# Final sync and test
git rebase origin/main
npm test && npm run test:e2e && npm run lint
git push origin your-branch

# Create PR using template
gh pr create --template
```

## Team Communication

### PR Comments for Dependencies

When your PR depends on another:
```
## Dependencies
This PR depends on #123 (E2E infrastructure improvements) merging first.

**Files in common:**
- `tests/e2e/helpers/CanvasPage.js` - extends the infrastructure from #123
- `package.json` - adds test scripts building on #123

**Merge order:** #123 → this PR
```

### Coordinating Overlapping Work

When you discover file conflicts:
```
@teammate I see we're both modifying `CanvasPage.js`. 

My changes: Adding connection verification methods
Your changes: Browser closure protection

Suggest: Your infrastructure PR merges first, then I'll rebase and extend it.
```

This prevents the complex rebase scenario we encountered with PRs #71 and #72.