# Pull Request

## Summary

- [ ] Feature
- [ ] Bug fix
- [ ] Docs update
- [ ] Test infrastructure

## Checklist

- [ ] Tests added/updated where appropriate
- [ ] Lint and format pass locally (`npm run lint && npm run format:check`)
- [ ] Unit tests pass locally (`npm run test:unit`)
- [ ] E2E tests run locally (choose appropriate suite) — see docs/testing-environments.md
- [ ] Security checks pass locally (`npm run security`)
- [ ] Docs updated if needed:
  - [ ] Scripts or commands changed — update docs/scripts.md
  - [ ] Test suites/commands changed — update docs/testing-environments.md
  - [ ] CI stability guidance impacted — update docs/ci-e2e-troubleshooting.md
  - [ ] Documentation index — update docs/README.md if new docs were added

## Notes for Reviewers

- Related docs: link to any updated docs
- Dependencies: list any PRs this depends on
- Screenshots or recordings (if UI changes)

# Pull Request

## Summary

Brief description of changes and their purpose.

## Type of Change

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📚 Documentation update
- [ ] 🔧 Infrastructure/tooling change
- [ ] ♻️ Code refactoring (no functional changes)

## Dependencies & Workflow

- [ ] This PR is based on the **latest main branch**
- [ ] I've checked for **conflicting open PRs** that modify similar files
- [ ] This PR can be **merged independently** (no dependencies on other open PRs)
- [ ] If dependencies exist, list them here: _(PR #X, PR #Y)_

## Testing

- [ ] All existing tests pass locally (`npm test && npm run test:e2e`)
- [ ] New tests added for new functionality
- [ ] Manual testing completed for affected areas

## Code Quality

- [ ] Code follows project conventions and style guidelines
- [ ] Lint checks pass (`npm run lint`)
- [ ] Format checks pass (`npm run format:check`)
- [ ] Architecture health check passes (`npm run health-check`)

## Impact Assessment

- [ ] **Low impact**: Isolated changes, minimal risk
- [ ] **Medium impact**: Affects multiple components, requires careful review
- [ ] **High impact**: Major infrastructure changes, extensive testing needed

## Review Guidelines

### For Reviewers

- Verify this PR doesn't conflict with other open PRs
- Check that changes align with project architecture
- Ensure adequate test coverage for new functionality

### For Infrastructure Changes

- [ ] Changes preserve existing API contracts
- [ ] Migration path provided for breaking changes
- [ ] Performance impact assessed and acceptable

## Additional Context

Add any other context, screenshots, or relevant information here.

---

**⚠️ Note**: Branch protection requires this PR to be up-to-date with main before merging. If conflicts arise, please rebase against the latest main branch.
