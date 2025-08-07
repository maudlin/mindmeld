# Developer Guide

## Get Started Fast

**Prerequisites:** Node.js (LTS), npm, Git

```bash
git clone https://github.com/maudlin/mindmeld.git
cd mindmeld
npm install
npm start
```

**Test it works:** `npm test && npm run test:e2e`

## Architecture Overview

**Event-driven**: Components communicate via central event bus (`src/js/core/eventBus.js`)  
**Service layer**: Clean separation with dependency injection (`src/js/services/`)  
**Factory pattern**: Pure, testable functions (`src/js/factories/`)  
**Zero circular deps**: Maintained via automated health checks

```
src/js/
├── core/          # Event bus, core logic  
├── services/      # Service layer
├── factories/     # Pure factory functions
├── features/      # Feature modules
└── data/          # Data management
```

## Standards

**Code style**: ES6+, ESLint, Prettier  
**Naming**: camelCase files/functions, PascalCase classes, events as `noun.verb`  
**Git**: Branch as `feature/description`, conventional commits, use PR template  
**Security**: ESLint security plugins catch vulnerabilities  

## Testing & CI

**Testing**: See [Testing Guide](testing.md)  
**CI/CD**: See [CI/CD Guide](ci-cd.md)  
**Commands**: See [Scripts Reference](scripts.md)

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

- **Event Bus**: `src/js/core/eventBus.js`
- **Services**: `src/js/services/`  
- **Health Monitoring**: [Architecture Health](architecture-health.md)
- **User Features**: [User Guide](user-guide.md)
- **Canvas Templates**: [Canvas Templates](canvas-templates.md)