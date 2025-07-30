# MindMeld

[![CI Tests](https://github.com/maudlin/mindmeld/actions/workflows/ci.yml/badge.svg)](https://github.com/maudlin/mindmeld/actions/workflows/ci.yml)

MindMeld is a web-based mind mapping tool that allows users to create, organize, and connect notes in a flexible, freeform manner. Built with modern event-driven architecture, it provides an intuitive interface for visualizing ideas and their relationships.

**🌐 Live Demo**: [mind-meld.co](https://mind-meld.co/)

## Quick Start

```bash
# Clone the repository
git clone https://github.com/maudlin/mindmeld.git
cd mindmeld

# Install dependencies and start development server
npm install && npm start
```

Visit `http://localhost:8080` to begin mind mapping.

## Key Features

- **Dynamic Note Creation**: Double-click to create notes anywhere on the canvas
- **Intelligent Connections**: Visual connections with directional arrows and real-time updates
- **Multi-Canvas Templates**: Standard Canvas, Hero's Journey, and custom templates
- **Advanced Selection**: Multi-select with group operations
- **Data Management**: Export/import mind maps as JSON with full state preservation
- **Modern Architecture**: Event-driven design with zero circular dependencies

## Documentation

### For Users
- **[User Guide](docs/user-guide.md)** - Complete feature overview and usage instructions
- **[Canvas Templates](docs/canvas-templates.md)** - Guide to different mind mapping templates

### For Developers
- **[Developer Guide](docs/developer-guide.md)** - Architecture, setup, and development workflow
- **[Contributing Guide](CONTRIBUTING.md)** - Code standards, testing, and contribution process
- **[Testing Guide](docs/testing.md)** - Unit and E2E testing strategy
- **[Scripts Reference](docs/scripts.md)** - Complete npm scripts documentation

### Technical Documentation
- **[CI/CD Guide](docs/ci-cd.md)** - GitHub Actions workflows and deployment
- **[Architecture Health](docs/architecture-health.md)** - Code quality monitoring and metrics
- **[Technical Debt](docs/technical-debt.md)** - Current improvements and roadmap

## Architecture

MindMeld features a modern, maintainable architecture:

- **Event-Driven Design**: Centralized event bus eliminates circular dependencies
- **Service Layer Pattern**: Clean separation with dependency injection
- **Factory Pattern**: Pure, testable functions for core operations
- **Modular Canvas System**: Template-based canvas types with extensible design

### Current Health: 96/100 (EXCELLENT)
- Zero circular dependencies
- Comprehensive test coverage (unit + E2E)
- Automated security scanning
- Performance monitoring

## Development

### Prerequisites
- Node.js (LTS)
- Modern web browser

### Local Setup
```bash
npm install           # Install dependencies
npm start            # Start development server (port 8080)
npm test             # Run unit tests
npm run test:e2e      # Run end-to-end tests
```

### Quality Tools
```bash
npm run lint         # ESLint with security rules
npm run format       # Prettier code formatting  
npm run health-check # Architecture analysis
npm run security     # Security-focused linting
```

## Data Format

Mind maps are stored as JSON with this structure:

```json
{
  "data": {
    "n": [
      { "i": "1", "p": [100, 200], "c": "Note content" }
    ],
    "c": [
      ["1", "2", 1]
    ]
  }
}
```

- **n**: Notes array (id, position, content)
- **c**: Connections array (from, to, type)
- **Connection types**: 0=none, 1=from→to, 2=to→from, 3=bidirectional

## License

Licensed under the same terms as the project. See project repository for details.
