# MindMeld

[![CI Tests](https://github.com/maudlin/mindmeld/actions/workflows/ci.yml/badge.svg)](https://github.com/maudlin/mindmeld/actions/workflows/ci.yml)

MindMeld is a web-based mind mapping tool that allows users to create, organize, and connect notes in a flexible, freeform manner. Built with modern event-driven architecture, it provides an intuitive interface for visualizing ideas and their relationships on both desktop and mobile devices.

**🌐 Live Demo**: [mind-meld.co](https://mind-meld.co/)  
**📱 Status**: V1.0 - Production Ready with Full Touch Support

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

### Mobile & Touch Support ✨

MindMeld features a **fully optimized touch interface** with:
- **Fine-grained pinch zoom** - Smooth, Google Maps-style zooming from 1x to 5x
- **Multi-touch gestures** - Pan, zoom, and select with natural finger movements
- **Touch-friendly UI** - Larger targets, context menus, and connection controls
- **Responsive design** - Seamless experience across phones, tablets, and desktops

See [User Guide](docs/user-guide.md) for complete interaction details.

## Key Features

- **Cross-Platform Design**: Optimized for desktop mouse, trackpad, and mobile touch interactions
- **Dynamic Note Creation**: Double-click (desktop) or tap (mobile) to create notes anywhere
- **Fine-Grained Zoom**: Smooth pinch-to-zoom with decimal precision (1.0x to 5.0x)
- **Color-Coded Notes**: 4-color palette (yellow, pink, green, blue) with intuitive picker
- **Smart Connections**: Directional arrows with context menus for easy type switching
- **Multi-Canvas Templates**: Standard Canvas, Hero's Journey, and extensible template system
- **Advanced Selection**: Multi-select with group operations and touch-optimized selection
- **Data Management**: Export/import mind maps as JSON with full state preservation
- **Modern Architecture**: Event-driven design with zero circular dependencies
- **Enterprise-Grade Data Integrity**: Comprehensive corruption resistance and browser compatibility
- **Secure Markdown System**: XSS-protected rendering with zero HTML injection

## Documentation

See the full documentation index in docs/README.md.

### For Users

- **[User Guide](docs/user-guide.md)** - Complete feature overview and usage instructions

### For Developers

- **[Developer Guide](docs/developer-guide.md)** - Architecture, setup, and development workflow
- **[Canvas Templates](docs/canvas-templates.md)** - How to implement new canvas template modules
- **[Contributing Guide](CONTRIBUTING.md)** - Code standards, testing, and contribution process
- **[Testing Guide](docs/testing-guide.md)** - Comprehensive testing documentation, patterns, and best practices
- **[Testing Environments](docs/testing-environments.md)** - Suites, commands, tags, and when to run which
- **[Scripts Reference](docs/scripts.md)** - Complete npm scripts documentation

### Technical Documentation

- **[CI/CD Guide](docs/ci-cd.md)** - GitHub Actions workflows and deployment
- **[CI vs Local E2E Troubleshooting](docs/ci-e2e-troubleshooting.md)** - Stabilizing tests across environments
- **[Developer Guide - Git Workflow](docs/developer-guide.md#troubleshooting--advanced-scenarios)** - Rebases, branch protection, dependency handling
- **[Architecture Health](docs/architecture-health.md)** - Code quality monitoring and metrics

## Architecture

**Bootstrap Architecture**: Clean application initialization with specialized modules  
**Event-driven design**: Zero circular dependencies with central EventBus  
**Cross-platform interactions**: Unified touch and desktop input handling  
**Modular bootstrap**: DataBootstrap → ServiceBootstrap → UIBootstrap → InteractionBootstrap

**Health**: Run `npm run health-check` | **Tests**: Run `npm test`  
Details: [Developer Guide](docs/developer-guide.md)

## Development

```bash
npm install && npm start  # Setup and run (port 8080)
```

Complete setup and commands: [Developer Guide](docs/developer-guide.md)

### Running Tests

```bash
npm test && npm run test:e2e  # Run all tests
```

See [Testing Guide](docs/testing-guide.md) for comprehensive testing documentation.

## Data Format

Mind maps are stored as JSON with this structure:

```json
{
  "data": {
    "n": [{ "i": "1", "p": [100, 200], "c": "Note content", "cl": "pink" }],
    "c": [["1", "2", 1]]
  }
}
```

- **n**: Notes array (id, position, content, color)
- **c**: Connections array (from, to, type)
- **cl**: Color field (optional) - "yellow", "pink", "green", or "blue"
- **Connection types**: 0=none, 1=from→to, 2=to→from, 3=bidirectional

## License

ISC License. See [LICENSE](LICENSE) for details.
