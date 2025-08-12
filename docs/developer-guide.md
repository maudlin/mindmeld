# Developer Guide

## Get Started Fast

**Prerequisites:** Node.js (LTS), npm, Git

```bash
git clone https://github.com/maudlin/mindmeld.git
cd mindmeld
npm install
npm start
```

**Test it works:** `npm test && npm run test:e2e` (all should pass)

## Architecture Overview

**Bootstrap Architecture**: Clean initialization system with specialized modules  
**Event-driven**: Components communicate via central event bus (`src/js/core/eventBus.js`)  
**Service layer**: Clean separation with dependency injection (`src/js/services/`)  
**Factory pattern**: Pure, testable functions (`src/js/factories/`)  
**Zero circular deps**: Maintained via automated health checks  
**Test coverage**: Run `npm run test:coverage` for current status

```
src/js/
├── app.js                    # Main entry point (2 dependencies)
├── core/
│   ├── bootstrap/           # Bootstrap system architecture
│   │   ├── AppBootstrap.js  # Main orchestrator
│   │   ├── DataBootstrap.js # Event bus, data store, state
│   │   ├── ServiceBootstrap.js # Business logic services
│   │   ├── UIBootstrap.js   # Canvas, UI components
│   │   └── InteractionBootstrap.js # Input, gestures, events
│   ├── eventBus.js          # Central communication hub
│   └── ...                  # Other core systems
├── services/                # Service layer (noteService, colorService)
├── factories/               # Pure factory functions
├── features/                # Feature modules (colorPicker, note, connection)
└── data/                    # Data management (with color persistence)
```

## Standards

**Code style**: ES6+, ESLint, Prettier  
**Naming**: camelCase files/functions, PascalCase classes, events as `noun.verb`  
**Git**: Branch as `feature/description`, conventional commits, use PR template  
**Security**: ESLint security plugins catch vulnerabilities  

## Testing & CI

**Testing**: See [Testing Guide](testing.md) | Run `npm test` for current status  
**CI/CD**: See [CI/CD Guide](ci-cd.md) | All tests must pass in CI  
**Commands**: See [Scripts Reference](scripts.md)

## Architecture Health

Monitor architectural quality with these commands:

```bash
npm run health-check        # Full architecture assessment
npm run analyze:circular    # Circular dependency detection (critical)
npm run analyze:complexity  # Module complexity analysis
npm run test:coverage       # Current test coverage
npm run deps:check          # Dependency health check
```

**Health monitoring runs automatically** on PRs and weekly. All circular dependencies must be resolved before merging.

## Contributing

1. **Read** [Contributing Guidelines](../CONTRIBUTING.md)
2. **Create** feature branch, follow standards above
3. **Test** locally before submitting PR
4. **Document** any new patterns or features

## Version Management

**Semantic Versioning**: Use automated semver commands for releases

```bash
npm run version:patch   # Bug fixes (0.8.0 → 0.8.1)
npm run version:minor   # New features (0.8.0 → 0.9.0)
npm run version:major   # Breaking changes (0.8.0 → 1.0.0)
```

**Process**: Commands update `package.json` + sync HTML files automatically  
**Details**: See [Scripts Reference](scripts.md) for complete commands

## What's Where

- **Application Entry**: `src/js/app.js` - Main entry point (2 dependencies only)
- **Bootstrap System**: `src/js/core/bootstrap/` - Application initialization architecture
  - `AppBootstrap.js` - Main orchestrator with dependency chain management
  - `DataBootstrap.js` - Event bus, data store, state management initialization
  - `ServiceBootstrap.js` - Business logic services initialization
  - `UIBootstrap.js` - Canvas management and UI initialization
  - `InteractionBootstrap.js` - Input systems, gestures, event handling
- **Event Bus**: `src/js/core/eventBus.js` - Central communication hub
- **Services**: `src/js/services/` - Business logic layer
  - `colorService.js` - Color state management and validation
  - `noteService.js` - Note creation and manipulation  
  - `connectionService.js` - Note connection handling
- **Features**: `src/js/features/` - UI components and interactions
  - `colorPicker/` - Color selection interface and events
  - `note/` - Note creation, editing, and color application
  - `connection/` - Connection drawing and management
- **Data Layer**: `src/js/data/` - State management and persistence
  - Export/import includes color data via `cl` field
- **Health Monitoring**: [Architecture Health](architecture-health.md)
- **User Features**: [User Guide](user-guide.md)
- **Canvas Templates**: [Canvas Templates](canvas-templates.md)