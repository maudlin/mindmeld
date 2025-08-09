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
- **Color-Coded Notes**: 4-color palette (yellow, pink, green, blue) with intuitive selection-based picker
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

Event-driven design with zero circular dependencies. Service layer with dependency injection.

**Health**: 96/100 (EXCELLENT) | **Test Coverage**: 33.39% (significant improvement) | Details: [Architecture Health](docs/architecture-health.md)

### Test Coverage Status
- **Services**: 74.11% coverage (NoteService, ConnectionService at 100%)
- **Factories**: 90% coverage (comprehensive note creation testing)
- **Storage**: 97.87% coverage (event-driven storage management)
- **Event Bus**: 100% coverage (production-ready error handling)
- **Error Handling**: Comprehensive cascade failure prevention

*Recent Achievement*: Completed 7/8 major test coverage stories from MM-93 epic with substantial improvements in service layer and factory pattern testing.

## Development

```bash
npm install && npm start  # Setup and run (port 8080)
```

Commands: [Scripts Reference](docs/scripts.md) | Setup: [Developer Guide](docs/developer-guide.md)

## Data Format

Mind maps are stored as JSON with this structure:

```json
{
  "data": {
    "n": [
      { "i": "1", "p": [100, 200], "c": "Note content", "cl": "pink" }
    ],
    "c": [
      ["1", "2", 1]
    ]
  }
}
```

- **n**: Notes array (id, position, content, color)
- **c**: Connections array (from, to, type)
- **cl**: Color field (optional) - "yellow", "pink", "green", or "blue"
- **Connection types**: 0=none, 1=from→to, 2=to→from, 3=bidirectional

## License

Licensed under the same terms as the project. See project repository for details.
