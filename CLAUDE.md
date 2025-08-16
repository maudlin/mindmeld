# MindMeld Development Context

## Project Overview
Web-based mind mapping tool with JavaScript/Node.js architecture. Event-driven system with clean separation between services, features, and UI components.

## Essential Commands
- `npm start`: Start development server (http://localhost:8080)
- `npm test`: Run unit tests (Jest)
- `npm run test:e2e`: Run E2E tests (Playwright)
- `npm run lint`: Check code style
- `npm run format:check`: Verify formatting
- `npm run health-check`: Architecture health assessment

## Testing Guidelines
- **E2E Tests**: Always use `createNote()` from CanvasPage helper
- **Throttling**: Add `await page.waitForTimeout(800)` between note creations
- **CI Stability**: Some tests need `await page.waitForTimeout(1000)` after page load
- **Browser Issues**: Use helper methods, avoid direct DOM manipulation in tests

## Code Style
- ES6+ modules (import/export), no CommonJS
- camelCase for files/functions, PascalCase for classes
- Events named as `noun.verb` (e.g., `note.created`)
- Clean dependency injection patterns
- **Mobile patterns**: Use `src/js/utils/mobileInteractions.js` for touch-friendly UI

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

## Key Files
- `src/js/app.js`: Main entry (minimal dependencies)
- `tests/e2e/helpers/CanvasPage.js`: E2E test utilities
- `playwright.config.js`: E2E configuration with CI optimizations

## Documentation
- **README.md**: Start here for project overview and setup
- **/docs folder**: Comprehensive guides including:
  - `testing.md`: Complete testing patterns and debugging
  - `developer-guide.md`: Architecture and contribution guidelines
  - `mobile-interaction-patterns.md`: Touch-friendly UI patterns and utilities
  - `ci-e2e-troubleshooting.md`: CI/CD troubleshooting guide
  - Additional specialized documentation

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