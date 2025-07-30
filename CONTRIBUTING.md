# Contributing to MindMeld

Thank you for your interest in contributing to MindMeld! This guide will help you get started with contributing to our mind mapping application.

## Table of Contents
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contributing Process](#contributing-process)
- [Code Standards](#code-standards)
- [Testing Requirements](#testing-requirements)
- [Documentation Guidelines](#documentation-guidelines)
- [Pull Request Process](#pull-request-process)
- [Getting Help](#getting-help)

## Getting Started

### Prerequisites
- Node.js (LTS version)
- npm
- Git
- Modern web browser for testing

### Quick Setup
```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/mindmeld.git
cd mindmeld

# Install dependencies
npm install

# Start development server
npm start

# Run tests to verify setup
npm test && npm run test:e2e
```

## Development Setup

### Project Structure
Familiarize yourself with the codebase structure:
```
src/js/
├── core/           # Core application logic
├── services/       # Service layer with dependency injection
├── factories/      # Pure factory functions
├── features/       # Feature-specific modules
├── data/          # Data management and storage
└── utils/         # Utility functions
```

### Development Workflow
1. **Fork** the repository
2. **Clone** your fork locally
3. **Create** a feature branch from main
4. **Develop** following our standards
5. **Test** your changes thoroughly
6. **Document** any changes
7. **Submit** a pull request

### Architecture Overview
MindMeld follows an event-driven architecture:
- **Event Bus**: Central communication system
- **Service Layer**: Clean separation with dependency injection
- **Factory Pattern**: Pure, testable functions
- **No Circular Dependencies**: Maintainable import structure

For detailed architecture information, see [Developer Guide](docs/developer-guide.md).

## Contributing Process

### Types of Contributions
We welcome various types of contributions:
- **Bug fixes**: Resolve issues and improve stability
- **Feature additions**: New functionality and enhancements
- **Documentation**: Improve guides, examples, and API docs
- **Testing**: Add test coverage and improve test reliability
- **Performance**: Optimize code and user experience

### Before You Start
1. **Check existing issues** to avoid duplicate work
2. **Create an issue** for significant changes to discuss approach
3. **Review the codebase** to understand current patterns
4. **Read documentation** in the `docs/` directory

## Code Standards

### JavaScript Guidelines
```javascript
// Use modern ES6+ features
const createNote = (x, y, content) => {
  return { id: generateId(), position: { x, y }, content };
};

// Follow naming conventions
const NOTE_CONTENT_LIMIT = 100;        // UPPER_SNAKE_CASE for constants
const canvasManager = new Manager();    // camelCase for variables
class NoteFactory {}                    // PascalCase for classes

// Use descriptive event names
eventBus.emit('note.created', { noteId: '123' });
eventBus.emit('canvas.cleared', { timestamp: Date.now() });
```

### Code Quality Tools
```bash
# Linting
npm run lint                # Check for issues
npm run lint -- --fix      # Auto-fix issues

# Formatting
npm run format              # Format all code
npm run format:check        # Verify formatting

# Security
npm run security            # Security-focused linting
npm run security:fix        # Fix security issues
```

### File Naming Conventions
- **JavaScript**: `camelCase.js`
- **HTML/CSS**: `kebab-case.html`, `kebab-case.css`
- **Markdown**: `kebab-case.md`
- **Constants**: Use descriptive names

## Testing Requirements

### Test Strategy
We use a multi-layered testing approach:
- **Unit Tests**: Core logic and pure functions (Jest)
- **E2E Tests**: User workflows and browser integration (Playwright)

### Writing Tests
```javascript
// Unit test example
test('should create note with correct properties', () => {
  const note = createNote(100, 200, 'Test content');
  expect(note).toEqual({
    id: expect.any(String),
    position: { x: 100, y: 200 },
    content: 'Test content'
  });
});

// E2E test example using Page Object Model
test('should create and connect notes', async ({ page }) => {
  const canvasPage = new CanvasPage(page);
  await canvasPage.load();
  
  const note1 = await canvasPage.createNoteAt(400, 300);
  const note2 = await canvasPage.createNoteAt(700, 300);
  await canvasPage.connectNotes(note1, note2);
  
  await canvasPage.verifyConnection(note1, note2);
});
```

### Test Requirements
- **All new features** must include appropriate tests
- **Bug fixes** should include regression tests
- **Use existing patterns** from `tests/e2e/helpers/CanvasPage.js`
- **Follow testing guide** in [Testing Documentation](docs/testing.md)

### Running Tests
```bash
# Run all tests
npm test && npm run test:e2e

# Run during development
npm run test:watch          # Unit tests in watch mode
npx playwright test --headed  # E2E tests with browser visible
```

## Documentation Guidelines

### Documentation Standards
- **Update relevant docs** when changing functionality
- **Include code examples** for new features
- **Use clear, concise language**
- **Follow existing formatting** and style

### Documentation Types
1. **API Documentation**: Inline code comments for complex functions
2. **User Documentation**: [`docs/user-guide.md`](docs/user-guide.md)
3. **Developer Documentation**: [`docs/developer-guide.md`](docs/developer-guide.md)
4. **Testing Documentation**: [`docs/testing.md`](docs/testing.md)

### Writing Documentation
```markdown
# Use clear headings
## Subsections for organization

### Code Examples
Provide working examples:
```javascript
// Example usage
const note = createNote(100, 200, 'Example');
```

### Links
Use relative links: [Developer Guide](docs/developer-guide.md)
```

## Pull Request Process

### Before Submitting
- [ ] Code follows project standards
- [ ] All tests pass locally
- [ ] Documentation is updated
- [ ] Commit messages are descriptive
- [ ] Changes are focused and atomic

### PR Template Checklist
When creating a pull request, ensure you:
- [ ] **Describe the change**: Clear summary of what and why
- [ ] **Reference issues**: Link to related GitHub issues
- [ ] **Include testing**: Describe how you tested the changes
- [ ] **Update documentation**: Document any user-facing changes
- [ ] **Check compatibility**: Ensure backwards compatibility

### PR Description Template
```markdown
## Summary
Brief description of the changes and motivation.

## Changes Made
- Specific change 1
- Specific change 2
- Documentation updates

## Testing
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed
- [ ] New tests added for new functionality

## Documentation
- [ ] Updated relevant documentation
- [ ] Added code comments where necessary
- [ ] Updated user guide if needed
```

### Review Process
1. **Automated checks**: CI pipeline runs all tests and quality checks
2. **Code review**: Maintainers review code quality and design
3. **Testing validation**: Verify tests cover the changes appropriately
4. **Documentation review**: Ensure documentation is complete and accurate

## Code Review Guidelines

### For Contributors
- **Respond promptly** to review feedback
- **Be open to suggestions** and learning opportunities
- **Ask questions** if feedback is unclear
- **Make focused changes** in response to feedback

### Review Criteria
- **Functionality**: Does the code work as intended?
- **Testing**: Are there appropriate tests?
- **Architecture**: Does it follow project patterns?
- **Performance**: Is it efficient and scalable?
- **Security**: Are there any security concerns?
- **Documentation**: Is it properly documented?

## Getting Help

### Resources
- **Documentation**: Browse the [`docs/`](docs/) directory
- **Issues**: Check [GitHub Issues](https://github.com/maudlin/mindmeld/issues) for existing problems
- **Discussions**: Use GitHub Discussions for questions and ideas
- **Testing Guide**: Detailed information in [`tests/README.md`](tests/README.md)

### Communication
- **Be respectful** and constructive in all interactions
- **Search existing issues** before creating new ones
- **Provide context** when asking questions
- **Include relevant details** like error messages, browser versions, etc.

### Debugging Help
```bash
# Common debugging commands
npm run lint                    # Check code quality
npm run test:unit -- --verbose  # Detailed test output
npx playwright test --debug     # Interactive E2E debugging
npm run health-check            # Architecture analysis
```

## Development Environment

### Recommended Tools
- **Code Editor**: VS Code with ESLint and Prettier extensions
- **Browser**: Chrome/Firefox with developer tools
- **Git GUI**: Optional, but helpful for complex merges

### Environment Setup
```bash
# Verify setup
node --version      # Should be LTS version
npm --version       # Should be recent
git --version       # Should be 2.0+

# Test environment
npm test           # Should pass
npm run test:e2e   # Should pass
npm run lint       # Should have no errors
```

## Recognition

We appreciate all contributions! Contributors will be:
- **Credited** in commit messages and pull request descriptions
- **Listed** in project acknowledgments
- **Invited** to participate in project discussions and decisions

## License

By contributing to MindMeld, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing to MindMeld! Your efforts help make mind mapping better for everyone.