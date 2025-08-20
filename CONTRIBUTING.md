# Contributing to MindMeld

## Quick Start

Before contributing, please familiarize yourself with:
- docs/README.md — Documentation index (start here)
- docs/testing-environments.md — How to run the right test suites locally and in CI
- docs/ci-e2e-troubleshooting.md — CI vs local Playwright stability guidance

Fork → Clone → `npm install && npm start` → Develop → Test → Submit PR

```bash
git clone https://github.com/YOUR_USERNAME/mindmeld.git
cd mindmeld && npm install && npm start
```

## Standards

**Code**: ES6+, camelCase, events as `noun.verb`  
**Testing**: Unit tests for logic, E2E for workflows  
**Architecture**: Event-driven, zero circular deps  

See [Developer Guide](docs/developer-guide.md) for setup details.

## Code Quality

Run before submitting: `npm run lint && npm run format && npm test && npm run test:e2e && npm run semgrep`  
Commands: See [Scripts Reference](docs/scripts.md)

### Security scanning (Semgrep)
- Local: `npm run semgrep` (uses the same packs as CI: p/security-audit, p/javascript, p/owasp-top-ten)
- CI: Runs automatically in GitHub Actions and uploads SARIF to the Security tab

Tip: Semgrep is also part of the `pre-push` script, so it will run before you push.

## Testing

**Requirements**: New features need tests. Bug fixes need regression tests.  
**E2E Testing**: Use `CanvasPage` helper for consistent E2E tests  

See [Testing Guide](docs/testing.md) for patterns and [Developer Guide](docs/developer-guide.md) for architecture.

## Documentation

Update docs when changing functionality. Keep it concise and pragmatic.

## Releases

**Version bumps**: Use semver commands for releases

```bash
npm run version:patch   # Bug fixes
npm run version:minor   # New features  
npm run version:major   # Breaking changes
```

**Process**: Maintainers handle releases after PR merge

## Pull Requests

**Before submitting**: Run quality checks above, update docs, write focused commits  
**PR description**: What changed, why, how tested  
**Review process**: CI runs automatically, maintainers review code quality

## Getting Help

Check [`docs/`](docs/) directory or [GitHub Issues](https://github.com/maudlin/mindmeld/issues). Be respectful and search before asking.

Thanks for contributing! 🚀