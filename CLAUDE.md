# MindMeld Development Context

## AI Assistant Quick Brief

**Architecture**: Event-driven JavaScript mind mapping tool with Bootstrap system, Adapter-Behavior pattern, and DataProvider abstraction. Zero circular dependencies enforced.

**Development Rules**: All work needs Jira tickets (MM project). Always TDD (red/green/refactor). Branch naming: feat/fix/doc/test-[ticket-id]-[name]. Cannot merge to main without PR.

**Critical Commands**: `npm test && npm run test:e2e` (all must pass), `npm run health-check` (architecture), `npm run ci:local` (before push).

**Documentation**: Start at `docs/README.md` for navigation. Architecture patterns in `docs/architecture/`, testing in `docs/development/testing-patterns.md`.

**Quality**: Never skip failing tests. Use CanvasPage helpers for E2E. Mobile testing has 500ms throttling. Security-first with XSS prevention.

## Project Overview

Web-based mind mapping tool with JavaScript/Node.js architecture. Event-driven system with clean separation between services, features, and UI components.

## General rules
- This is linked to Jira project MM
- All work should have a ticket unless it is a minor fix. Branches should be named as feat/fix/doc/test-[ticket-id]-[name] for tracking
- Refer to tickets in commits and PRs
- Prefer TDD where possible - review existing tests and code before starting to create. ALWAYS red/green/refactor
- You cannot merge to main without a PR. Always create a branch, push to remote, create a PR, then request the merge from the user.

## Essential Commands

- `npm start`: Start development server (http://localhost:8080)
- `npm test`: Run unit tests (Jest)
- `npm run test:e2e`: Run E2E tests (Playwright)
- `npm run lint`: Check code style
- `npm run format:check`: Verify formatting
- `npm run health-check`: Architecture health assessment

## Testing Guidelines

- **Throttling**: The app enforces a 500ms note-creation throttle. Use ~600ms between creations locally and 800–1000ms in CI.
- **CI Stability**: Some tests need `await page.waitForTimeout(1000)` after page load
- **Browser Issues**: Use helper methods, avoid direct DOM manipulation in tests
- **DO NOT** skip failing tests for convenience, or refactor tests to pass. Quality is queen.
- Always run npm run ci:local before pushing a branch to remote - this prevents discovering failures in CI.

## Code Style

- ES6+ modules (import/export), no CommonJS
- camelCase for files/functions, PascalCase for classes
- Events named as `noun.verb` (e.g., `note.created`)
- Clean dependency injection patterns
- Document in code, but avoid parenthetical comments (like this that add uneccessary detail)
- Don't use ticket IDs (eg MM-2xx) in code comments UNLESS they're temporary and to be removed

## Architecture

- **Bootstrap system**: `src/js/core/bootstrap/` - initialization modules
- **Event bus**: `src/js/core/eventBus.js` - central communication
- **Services**: `src/js/services/` - business logic layer
- **Features**: `src/js/features/` - UI components
- **Zero circular dependencies** - monitored automatically

## Git Workflow

- Branch: `feature/description`
- All tests must pass before merge
- Use conventional commits
- PR template provided
- Do NOT skip pre-commit tests

## Key Files

- `src/js/app.js`: Main entry (minimal dependencies)
- `README.md` : start here for information about the app
- `docs/README.md` : start here for detailed information about test standards
- `playwright.config.js`: E2E configuration with CI optimizations

## Documentation Structure

**Start Points:**
- **README.md**: Project overview and setup
- **docs/README.md**: Complete documentation index with navigation paths
- **docs/developer-guide.md**: Concise architecture overview and workflow

**Key Documentation Paths:**
- **Architecture**: `docs/architecture/` - Core patterns (Adapter-Behavior, DataProviders, Mobile)
- **Development**: `docs/development/` - Standards, testing, Git workflow
- **Operations**: `docs/operations/` - CI/CD, architecture health monitoring
- **Reference**: `docs/reference/` - File structure navigation

**Critical Patterns:**
- **Adapter-Behavior**: `docs/architecture/adapter-behavior-pattern.md` - Input/business logic separation
- **Testing**: `docs/development/testing-patterns.md` - TDD patterns, mobile testing, security tests
- **Mobile**: `docs/architecture/mobile-architecture.md` - TouchAdapter, gesture recognition

## Project Management

- **Code**: GitHub repository
- **Tickets**: Managed in Jira

## Task Management

- **New Tasks**: Create Jira tickets for all development work
- **Related Tasks**: Group multiple related tasks under Jira epics
- **Work Progress**: Move tickets to "In Progress" when starting work
- **Task Completion**: Move tickets to "Done" only after user confirmation

## Common Issues

- **"Notes at same position"**: Missing throttle delay between creations
- **"Browser context closed"**: Use CanvasPage helpers, not direct DOM
- **CI test failures**: Usually need stability delays

## Version Management

- `npm run version:patch|minor|major`: Automated semver with HTML sync
- Updates both package.json and HTML version references

## Health Monitoring

Run `npm run health-check` for full architecture assessment. Circular dependencies are automatically detected and must be resolved.
