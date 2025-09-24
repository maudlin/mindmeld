# MindMeld Documentation Index

This comprehensive index helps both end users and developers find the right documentation quickly. Documents are organized by audience and purpose with clear navigation paths.

## 🚀 Quick Start Paths

### For New Users
1. **[User Guide](user-guide.md)** - Complete feature overview and usage instructions
2. **Mobile Features** - Touch interactions covered in User Guide

### For New Developers
1. **[Developer Guide](developer-guide.md)** - Architecture, setup, and workflow overview
2. **[Testing Patterns](development/testing-patterns.md)** - Comprehensive testing documentation
3. **[Coding Standards](development/coding-standards.md)** - Style and patterns

### For Contributors
1. **[Contributing Guide](../CONTRIBUTING.md)** - Code standards and contribution process
2. **[Git Workflow](development/git-workflow.md)** - Branching, versioning, and advanced Git scenarios

## 📚 Complete Documentation Catalog

### 👥 User Documentation
- **[User Guide](user-guide.md)** - Complete feature overview and usage instructions
  - Basic features (notes, connections, colors)
  - Mobile and touch interactions
  - Tips and best practices

### 🛠️ Developer Documentation

#### Architecture & Design
- **[Developer Guide](developer-guide.md)** - System overview and navigation
- **[Adapter-Behavior Pattern](architecture/adapter-behavior-pattern.md)** - Input/business logic separation
- **[Data Providers](architecture/data-providers.md)** - Storage abstraction layer
- **[Mobile Architecture](architecture/mobile-architecture.md)** - Touch system implementation

#### Development Practices
- **[Coding Standards](development/coding-standards.md)** - Style, patterns, and conventions
- **[Git Workflow](development/git-workflow.md)** - Branching, auto-versioning, and CI processes
- **[Testing Patterns](development/testing-patterns.md)** - Unit, integration, and E2E testing

#### Operations & Maintenance
- **[CI/CD Guide](operations/ci-cd.md)** - Build, test, and deployment processes
- **[Architecture Health](operations/architecture-health.md)** - Quality monitoring and metrics

#### Reference Documentation
- **[File Structure Reference](reference/file-structure.md)** - Complete codebase navigation

#### Specialized Topics
- **[Scripts Reference](scripts.md)** - Complete npm scripts documentation
- **[Accessibility](accessibility.md)** - Accessibility patterns and mobile optimization
- **[Client-Server Architecture](client-server.md)** - Server communication patterns

## 🎯 Finding the Right Document

### By Task Type

| Task | Primary Document | Supporting Documents |
|------|-----------------|-------------------|
| **Learning to use MindMeld** | [User Guide](user-guide.md) | - |
| **Setting up for development** | [Developer Guide](developer-guide.md) | [Scripts Reference](scripts.md) |
| **Understanding architecture** | [Developer Guide](developer-guide.md) | [Adapter-Behavior Pattern](architecture/adapter-behavior-pattern.md) |
| **Writing tests** | [Testing Patterns](development/testing-patterns.md) | - |
| **Mobile/touch features** | [User Guide](user-guide.md) (users)<br>[Mobile Architecture](architecture/mobile-architecture.md) (devs) | [Accessibility](accessibility.md) |
| **Git workflow issues** | [Git Workflow](development/git-workflow.md) | - |
| **CI/CD configuration** | [CI/CD Guide](operations/ci-cd.md) | [Scripts Reference](scripts.md) |
| **Code standards** | [Coding Standards](development/coding-standards.md) | [Git Workflow](development/git-workflow.md) |

### By Audience

**End Users**: User Guide covers everything needed
**New Developers**: Developer Guide → Architecture docs → Development practices
**Experienced Contributors**: Testing Patterns + specific technical docs as needed
**DevOps/Maintainers**: Operations guides + Architecture Health

## 📖 Documentation Structure

### Architecture Documentation (`docs/architecture/`)
Comprehensive system design and technical implementation details:
- System overview and principles
- Component interaction patterns
- Security architecture
- Mobile and touch systems
- Data management patterns

### Development Documentation (`docs/development/`)
Practical development practices and workflows:
- Code standards and style guides
- Git workflow and versioning
- Testing strategies and patterns
- Debugging and troubleshooting

### Operations Documentation (`docs/operations/`)
Deployment, monitoring, and maintenance:
- CI/CD pipelines
- Quality monitoring
- Version management
- Performance optimization

### Reference Documentation (`docs/reference/`)
Detailed reference material:
- Complete file structure navigation
- Service layer documentation
- API and event system references

## 🔗 Cross-References

Documents are extensively cross-linked to provide context and related information:

- **Bidirectional linking** between related concepts
- **File location references** with specific line numbers where relevant
- **Implementation examples** with concrete code samples
- **Related documentation** sections in each file

## 📏 Documentation Standards

All documentation follows these principles for optimal consumption:

- **200-400 lines** per file for focused content
- **Context sections** explaining how each document fits in the system
- **Code examples** with file locations and implementation details
- **Cross-references** with clear linking between related concepts
- **LLM-optimized** structure for AI-assisted development

## 🆕 Recent Improvements

### January 2025 Restructure
- **✅ Modular documentation** - Focused files replace monolithic guides
- **✅ Clear navigation** - Logical organization by audience and purpose
- **✅ Eliminated duplication** - Single source of truth for each topic
- **✅ Cross-platform coverage** - Mobile and desktop development patterns
- **✅ LLM optimization** - Structured for AI-assisted development workflows

This index provides comprehensive coverage of MindMeld's architecture and development practices, designed for both human developers and LLM-assisted development workflows.