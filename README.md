# MindMeld

[![CI Tests](https://github.com/maudlin/mindmeld/actions/workflows/ci.yml/badge.svg)](https://github.com/maudlin/mindmeld/actions/workflows/ci.yml)

MindMeld is a web-based mind mapping tool that allows users to create, organize, and connect notes in a flexible, freeform manner. Built with modern event-driven architecture, it provides an intuitive interface for visualizing ideas and their relationships.

**🌐 Live Demo**: [mind-meld.co](https://mind-meld.co/)

## Prerequisites

For development:
- Node.js LTS (v18+ recommended)
- npm
- Note: Playwright installs Chromium automatically on first install in non-production environments.

For hosting/deployment:
- None required beyond a static file host. The app is plain HTML/CSS/JS served from the `src/` directory and can be hosted on any static server or CDN (e.g., GitHub Pages, Netlify, Vercel static, Nginx).

## Quick Start

```bash
# Clone the repository
git clone https://github.com/maudlin/mindmeld.git
cd mindmeld

# Install dependencies and start development server
npm install && npm start
```

Visit `http://localhost:8080` to begin mind mapping.

### Mobile & Touch Support
MindMeld automatically detects your device capabilities and provides optimized interactions:

**Touch Device Features:**
- **Long-press and drag**: Move notes with visual "jiggle" feedback
- **Single-finger drag on canvas**: Multi-select lasso selection
- **Double-tap**: Create or edit notes
- **Two-finger gestures**: Pan and zoom canvas
- **Ghost connector enhancements**: Larger touch targets with visual feedback
- **Automatic adaptation**: No configuration needed - works seamlessly

## Key Features

- **Dynamic Note Creation**: Double-click to create notes anywhere on the canvas
- **Color-Coded Notes**: 4-color palette (yellow, pink, green, blue) with intuitive selection-based picker
- **Intelligent Connections**: Visual connections with directional arrows and real-time updates
- **Multi-Canvas Templates**: Standard Canvas, Hero's Journey, and custom templates
- **Advanced Selection**: Multi-select with group operations and touch-optimized lasso selection
- **Adaptive Touch Interface**: Automatic device detection with optimized mobile interactions
- **Data Management**: Export/import mind maps as JSON with full state preservation
- **Modern Architecture**: Event-driven design with zero circular dependencies

## Documentation

See the full documentation index in docs/README.md.

### For Users
- **[User Guide](docs/user-guide.md)** - Complete feature overview and usage instructions

### For Developers
- **[Developer Guide](docs/developer-guide.md)** - Architecture, setup, and development workflow
- **[Canvas Templates](docs/canvas-templates.md)** - How to implement new canvas template modules
- **[Contributing Guide](CONTRIBUTING.md)** - Code standards, testing, and contribution process
- **[Testing Guide](docs/testing.md)** - Philosophy, structure, and patterns
- **[Testing Environments](docs/testing-environments.md)** - Suites, commands, tags, and when to run which
- **[Scripts Reference](docs/scripts.md)** - Complete npm scripts documentation

### Technical Documentation
- **[CI/CD Guide](docs/ci-cd.md)** - GitHub Actions workflows and deployment
- **[CI vs Local E2E Troubleshooting](docs/ci-e2e-troubleshooting.md)** - Stabilizing tests across environments
- **[Git Workflow Troubleshooting](docs/git-workflow-troubleshooting.md)** - Rebases, branch protection, dependency handling
- **[Architecture Health](docs/architecture-health.md)** - Code quality monitoring and metrics

## Architecture

**Bootstrap Architecture**: Clean application initialization with specialized modules  
**Event-driven design**: Zero circular dependencies with central EventBus  
**Service layer**: Dependency injection with clear separation of concerns  
**Modular bootstrap**: DataBootstrap → ServiceBootstrap → UIBootstrap → InteractionBootstrap

**Health**: Run `npm run health-check` | **Tests**: Run `npm test`  
Details: [Developer Guide](docs/developer-guide.md)

## Development

```bash
npm install 6
 npm start  # Setup and run (port 8080)
```

Commands: [Scripts Reference](docs/scripts.md) | Setup: [Developer Guide](docs/developer-guide.md)

### Running Tests

- Unit tests: `npm run test:unit`
- E2E tests: `npm run test:e2e`
- CI/dev/smoke/critical suites and tag usage: see [Testing Environments](docs/testing-environments.md)
- Testing philosophy and patterns: see [Testing Guide](docs/testing.md)
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

ISC License. See [LICENSE](LICENSE) for details.
