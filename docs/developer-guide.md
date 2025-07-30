# Developer Guide

## Overview

MindMeld is a sophisticated mind mapping application built with vanilla JavaScript, following an event-driven architecture with clean separation of concerns. This guide will help you get started with development and understand the project's standards and practices.

## Quick Start

### Prerequisites
- Node.js (LTS version)
- npm
- Git

### Setup
```bash
# Clone the repository
git clone https://github.com/maudlin/mindmeld.git
cd mindmeld

# Install dependencies
npm install

# Start development server
npm start

# Run tests
npm test && npm run test:e2e
```

## Project Architecture

### Directory Structure
```
src/
├── js/
│   ├── core/           # Core application logic
│   ├── services/       # Service layer with dependency injection
│   ├── factories/      # Pure factory functions
│   ├── features/       # Feature-specific modules
│   ├── data/          # Data management and storage
│   └── utils/         # Utility functions
├── css/               # Stylesheets
└── *.html            # Application pages
```

### Key Architectural Principles
- **Event-Driven Architecture**: Components communicate via the central event bus
- **Service Layer Pattern**: Clean separation with dependency injection
- **Factory Pattern**: Pure, testable functions for object creation
- **No Circular Dependencies**: Clean, maintainable import structure

## Development Standards

### Code Style
- **ES6+ JavaScript**: Use modern JavaScript features
- **ESLint**: Follow configured linting rules (`npm run lint`)
- **Prettier**: Code formatting (`npm run format`)
- **Security**: ESLint security plugins detect vulnerabilities

### Naming Conventions
- **Files**: camelCase for JS files, kebab-case for HTML/CSS/MD
- **Functions**: camelCase, descriptive names
- **Classes**: PascalCase
- **Constants**: UPPER_SNAKE_CASE
- **Events**: `noun.verb` format (e.g., `note.created`, `canvas.cleared`)

### Git Workflow
- **Branch naming**: `feature/description`, `fix/description`, `refactor/description`
- **Commits**: Follow conventional commit format
- **PRs**: Use provided PR template, include testing evidence

## Testing Strategy

See [Testing Guide](testing.md) for comprehensive testing documentation.

### Test Types
- **Unit Tests**: Core logic and pure functions (`npm run test:unit`)
- **E2E Tests**: User workflows with Playwright (`npm run test:e2e`)
- **Integration Tests**: Service interactions and event flows

### Testing Best Practices
- **E2E for UI**: Test user interactions end-to-end
- **Unit for Logic**: Test pure functions and business logic
- **Mock Sparingly**: The clean architecture makes most code easily testable

## CI/CD Process

See [CI/CD Guide](ci-cd.md) for detailed automation documentation.

### Automated Checks
- **Linting**: ESLint with security plugins
- **Formatting**: Prettier code style
- **Testing**: Unit and E2E test suites
- **Security**: Semgrep security scanning
- **Architecture**: Health checks and dependency analysis

## Contributing Workflow

1. **Read**: [Contributing Guidelines](../CONTRIBUTING.md)
2. **Setup**: Follow quick start above
3. **Develop**: Create feature branch, follow coding standards
4. **Test**: Ensure all tests pass locally
5. **Document**: Update relevant documentation
6. **Submit**: Create PR with clear description and testing evidence

## Useful Scripts

See [Scripts Reference](scripts.md) for complete command documentation.

### Development
```bash
npm start              # Start development server
npm run dev            # Alternative development command
npm run lint           # Run ESLint
npm run format         # Format code with Prettier
```

### Testing
```bash
npm test               # Run unit tests
npm run test:e2e       # Run E2E tests
npm run test:watch     # Run tests in watch mode
```

### Quality Assurance
```bash
npm run security       # Security-focused linting
npm run health-check   # Architecture health assessment
```

## Architecture References

- **Event Bus**: `src/js/core/eventBus.js` - Central event system
- **Services**: `src/js/services/` - Service layer implementations
- **Factories**: `src/js/factories/` - Pure factory functions
- **Health Monitoring**: [Architecture Health](architecture-health.md)

## Getting Help

- **Issues**: Check existing GitHub issues or create a new one
- **Documentation**: Browse the `docs/` directory
- **Testing**: Comprehensive guide in `../tests/README.md`
- **Architecture**: Review [Architecture Health](architecture-health.md)

## Next Steps

1. Explore the [User Guide](user-guide.md) to understand the application features
2. Review [Testing Documentation](testing.md) for testing approaches
3. Check [Canvas Templates](canvas-templates.md) for extending templates
4. Read [Contributing Guidelines](../CONTRIBUTING.md) before submitting changes