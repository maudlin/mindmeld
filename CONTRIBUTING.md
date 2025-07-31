# Contributing to MindMeld

## Quick Start

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

Run before submitting: `npm run lint && npm run format && npm test && npm run test:e2e`  
Commands: See [Scripts Reference](docs/scripts.md)

## Testing

New features need tests. Bug fixes need regression tests.  
Use `CanvasPage` helper for E2E tests.  
Details: [Testing Guide](docs/testing.md)

## Documentation

Update docs when changing functionality. Keep it concise and pragmatic.

## Pull Requests

**Before submitting**: Run quality checks above, update docs, write focused commits  
**PR description**: What changed, why, how tested  
**Review process**: CI runs automatically, maintainers review code quality

## Getting Help

Check [`docs/`](docs/) directory or [GitHub Issues](https://github.com/maudlin/mindmeld/issues). Be respectful and search before asking.

Thanks for contributing! 🚀