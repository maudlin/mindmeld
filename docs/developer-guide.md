# Developer Guide

## Quick Start

**Prerequisites:** Node.js (LTS), npm, Git

```bash
git clone https://github.com/maudlin/mindmeld.git
cd mindmeld
npm install
npm start
```

**Test it works:** `npm test && npm run test:e2e` (all should pass)

Before opening a PR, review the [Git Workflow](development/git-workflow.md) and CI Quick Checklist.

## Architecture Overview

MindMeld uses a **clean, layered architecture** with these core principles:

- **Bootstrap Architecture**: Clean initialization with specialized modules
- **Event-driven**: Components communicate via central event bus
- **Adapter-Behavior Pattern**: Separation of input detection from business logic
- **DataProvider Abstraction**: Pluggable storage backends (Local, Yjs)
- **Zero circular dependencies**: Maintained via automated health checks
- **Security-first**: Comprehensive XSS prevention and content validation

```
src/js/
├── app.js                    # Main entry point (2 dependencies)
├── core/bootstrap/           # Initialization system
├── interactions/adapters/    # Platform-specific input (Desktop/Touch)
├── interactions/behaviors/   # Business logic coordination
├── services/                 # Service layer with dependency injection
├── features/                 # UI components and interactions
├── data/providers/           # Storage abstraction layer
└── utils/                    # Cross-platform utilities
```

## Core Documentation

### Architecture
- [Adapter-Behavior Pattern](architecture/adapter-behavior-pattern.md) - Input/business logic separation
- [Data Providers](architecture/data-providers.md) - Storage abstraction and provider patterns
- [Mobile Architecture](architecture/mobile-architecture.md) - Touch system implementation

### Development
- [Coding Standards](development/coding-standards.md) - Style, patterns, and conventions
- [Git Workflow](development/git-workflow.md) - Branching, auto-versioning, and CI processes
- [Testing Patterns](development/testing-patterns.md) - Unit, integration, and E2E testing approaches

### Operations
- [CI/CD](operations/ci-cd.md) - Build, test, and deployment processes
- [Architecture Health](operations/architecture-health.md) - Monitoring and quality metrics

## Reference Documentation

### Component Guides
- [File Structure Reference](reference/file-structure.md) - Complete codebase navigation

### Specialized Topics
- [Mobile Architecture](architecture/mobile-architecture.md) - Touch system implementation
- [User Guide](user-guide.md) - End-user functionality reference

## Essential Commands

```bash
# Development
npm start                     # Start development server (port 8080)
npm test                      # Run all tests
npm run lint                  # Check code style
npm run health-check          # Architecture assessment

# Testing
npm run test:unit             # Unit tests only
npm run test:e2e              # E2E tests (local only)
npm run ci:local              # Full CI check locally

# Quality
npm run analyze:circular      # Check for circular dependencies
npm run security              # Security audit
npm run format:check          # Verify code formatting
```

## Getting Started Workflow

1. **Set up development environment** following Quick Start above
2. **Read Architecture Overview** to understand system design
3. **Review Coding Standards** for style and patterns
4. **Understand Git Workflow** for branching and versioning
5. **Run health checks** to ensure environment is working

## Contributing

1. **Read** [Contributing Guidelines](../CONTRIBUTING.md)
2. **Follow** [Git Workflow](development/git-workflow.md) for branching
3. **Apply** [Coding Standards](development/coding-standards.md)
4. **Test** locally before submitting PR
5. **Document** any new patterns or architectural changes

## Documentation Standards

All documentation follows these principles for optimal LLM and human consumption:

- **200-400 lines** per file for focused content
- **Cross-references** with clear linking between related concepts
- **Code examples** with file locations and line references
- **Implementation patterns** with concrete examples
- **Anti-patterns** clearly documented to avoid common mistakes

## Need Help?

- **Architecture questions**: Start with [Adapter-Behavior Pattern](architecture/adapter-behavior-pattern.md)
- **Testing problems**: See [Testing Patterns](development/testing-patterns.md)
- **Build/CI issues**: Review [CI/CD](operations/ci-cd.md)

This guide provides comprehensive coverage of MindMeld's architecture and development practices. Each section links to detailed documentation designed for both human developers and LLM-assisted development workflows.