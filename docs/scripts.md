# Scripts Reference

## Overview

MindMeld includes a comprehensive set of npm scripts for development, testing, building, and maintenance. This guide documents all available commands and their usage.

## Development Scripts

### Server and Development
```bash
# Start development server
npm start
# Alias: npm run dev
# Serves the application locally for development

# Alternative development server
npm run dev
# Same as npm start, provides local development environment
```

## Code Quality Scripts

### Linting
```bash
# Run ESLint on all JavaScript files
npm run lint

# Run ESLint with automatic fixes
npm run lint -- --fix

# Security-focused linting
npm run security

# Auto-fix security issues where possible
npm run security:fix
```

### Code Formatting
```bash
# Format all code with Prettier
npm run format

# Check if code formatting is correct
npm run format:check

# Format specific files
npm run format -- "src/**/*.js"
```

## Testing Scripts

### Unit Testing
```bash
# Run all unit tests
npm test
# Alias: npm run test:unit

# Run unit tests only
npm run test:unit

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:unit -- --coverage

# Run specific test file
npm run test:unit -- --testPathPattern=eventBus
```

### End-to-End Testing
```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests in headed mode (visible browser)
npx playwright test --headed

# Run specific E2E test
npx playwright test tests/e2e/menu-functionality.spec.js

# Debug E2E tests interactively
npx playwright test --debug

# Run E2E tests with specific browser
npx playwright test --project=chromium
```

### Combined Testing
```bash
# Run all tests (unit + E2E)
npm test && npm run test:e2e

# Quick test validation
npm run test:quick  # (if configured)
```

## Build and Deployment Scripts

### Production Build
```bash
# Currently using vanilla JavaScript (no build step required)
# Static files served directly from src/

# Validate production readiness
npm run validate
```

### Version Management
```bash
# Semver Version Bumping (NEW - Automated)
npm run version:patch   # 0.8.0 -> 0.8.1 (bug fixes)
npm run version:minor   # 0.8.0 -> 0.9.0 (new features)
npm run version:major   # 0.8.0 -> 1.0.0 (breaking changes)

# Manual Version Management (Legacy)
node scripts/update-version.js     # Sync version to HTML files
node scripts/generate-changelog.js # Generate changelog from PRs

# Example: Release new feature
npm run version:minor  # Updates package.json + HTML files automatically
```

## Quality Assurance Scripts

### Architecture Health
```bash
# Run comprehensive architecture health check
npm run health-check

# Check for circular dependencies
npx madge --circular src/

# Analyze dependency complexity
npx madge --summary src/
```

### Security Scanning
```bash
# Run security-focused ESLint rules
npm run security

# Fix auto-fixable security issues
npm run security:fix

# Check for vulnerable dependencies
npm audit

# Fix vulnerable dependencies
npm audit fix
```

## Utility Scripts

### Dependencies
```bash
# Install all dependencies
npm install
# Alias: npm i

# Install dependencies for CI (no dev dependencies in production)
npm ci

# Update dependencies
npm update

# Check for outdated packages
npm outdated
```

### Cleanup
```bash
# Clean node_modules and reinstall
rm -rf node_modules package-lock.json && npm install

# Clear test artifacts
rm -rf test-results/ playwright-report/

# Clear coverage reports
rm -rf coverage/
```

## Custom Development Scripts

### Local Development Helpers
```bash
# Watch files and run tests automatically
npm run test:watch

# Start development with file watching
npm run dev:watch  # (if configured)

# Validate code before committing
npm run pre-commit
```

### Debugging
```bash
# Run tests with verbose output
npm run test:unit -- --verbose

# Debug specific test file
npm run test:unit -- --testPathPattern=eventBus --verbose

# E2E debugging with browser developer tools
npx playwright test --debug
```

## Script Combinations

### Pre-commit Validation
```bash
# Complete validation before committing
npm run lint && npm run format:check && npm test

# Quick validation
npm run security && npm run test:unit
```

### CI Simulation
```bash
# Simulate CI pipeline locally
npm run lint
npm run format:check
npm run test:unit
npm run test:e2e
npm run security
```

### Release Preparation
```bash
# Prepare for release
npm run lint -- --fix
npm run format
npm test && npm run test:e2e
npm run health-check
npm run security
```

## Environment-Specific Scripts

### Development Environment
```bash
NODE_ENV=development npm start
NODE_ENV=development npm test
```

### Production Environment
```bash
NODE_ENV=production npm run validate
NODE_ENV=production npm run security
```

### Testing Environment
```bash
NODE_ENV=test npm run test:unit
NODE_ENV=test npm run test:e2e
```

## Script Configuration

### Jest Configuration
Unit test scripts use configuration from `jest.config.js`:
```javascript
// Key configurations:
- testEnvironment: 'jsdom'
- roots: ['<rootDir>/tests/unit']
- coverage thresholds defined
```

### Playwright Configuration
E2E test scripts use configuration from `playwright.config.js`:
```javascript
// Key configurations:
- testDir: './tests/e2e'
- parallel execution
- multiple browsers
- automatic server startup
```

### ESLint Configuration
Linting scripts use configuration from `eslint.config.js`:
```javascript
// Key features:
- Security plugins
- Prettier integration
- Custom rules for project
```

## Advanced Usage

### Script Parameters
```bash
# Pass additional parameters to underlying tools
npm run lint -- --ext .js,.jsx
npm run test:unit -- --watch --coverage
npm run test:e2e -- --project=firefox
```

### Environment Variables
```bash
# Set environment variables for scripts
DEBUG=true npm run test:e2e
HEADLESS=false npm run test:e2e
```

### Parallel Execution
```bash
# Run multiple scripts in parallel
npm run lint & npm run test:unit & wait

# Using npm-run-all (if installed)
npm-run-all --parallel lint test:unit
```

## Troubleshooting

### Common Issues
1. **Permission Errors**: Ensure proper file permissions
2. **Port Conflicts**: Check if development server port is available
3. **Cache Issues**: Clear npm cache with `npm cache clean --force`
4. **Dependency Issues**: Run `npm ci` for clean dependency installation

### Debug Mode
```bash
# Enable debug output for npm scripts
npm run test:unit --verbose
DEBUG=* npm run test:e2e
```

### Performance Optimization
```bash
# Use npm ci instead of npm install in CI
npm ci

# Run tests with appropriate worker count
npm run test:e2e -- --workers=4
```

For development setup details, see [Developer Guide](developer-guide.md).
For testing specifics, see [Testing Guide](testing.md).
For CI/CD automation, see [CI/CD Guide](ci-cd.md).