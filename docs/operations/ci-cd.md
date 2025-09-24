# CI/CD Guide

## Overview

MindMeld uses GitHub Actions for continuous integration and deployment, with comprehensive automated checks ensuring code quality, security, and functionality.

## CI Pipeline Architecture

### Automated Workflows

#### 1. CI Tests (`ci.yml`)

Runs on every push and pull request to main branches:

```yaml
# Triggered by
- push: [main, master]
- pull_request: [main, master]

# Jobs
1. test                    # Main testing pipeline
2. semgrep                 # Security scanning
```

#### 2. Architecture Health Check

Monitors code quality and architectural integrity:

- Circular dependency detection
- Code complexity analysis
- Architecture health scoring

#### 3. Changelog Generation

Automatically updates changelog after PR merges:

- Extracts PR titles and descriptions
- Categorizes changes (features, fixes, improvements)
- Updates `src/changelog.html`

## CI Test Pipeline

### Stage 1: Environment Setup

```bash
# Node.js LTS installation
- uses: actions/setup-node@v4
  with:
    node-version: lts/*

# Dependency installation
npm ci
```

### Stage 2: Code Quality

```bash
# Linting with security rules
npm run lint

# Code formatting verification
npm run format:check
```

### Stage 3: Testing

```bash
# Unit tests only (optimized for CI speed)
npm run test:unit
```

**CI Strategy**: Only unit tests run in CI for fast feedback. E2E tests run locally during development.

- **Unit tests**: Fast, comprehensive logic coverage
- **E2E tests**: Local development only (browser installation overhead avoided)

### Stage 4: Artifacts

- **Unit Test Coverage**: Generated for test analysis
- **Lint Reports**: Code quality and security analysis

## Security Scanning

### Semgrep Integration (CI + Local)

Automated security analysis with multiple rulesets (runs in CI, and can be run locally):

CI configuration uses common packs:

```yaml
config: >-
  p/security-audit      # General security patterns
  p/javascript          # JavaScript-specific rules
  p/owasp-top-ten       # OWASP security standards
```

Run locally before pushing:

```bash
npm run semgrep        # Runs Semgrep locally with the same rulepacks
```

### Security Features

- **SARIF Upload (CI)**: Results integrated with GitHub Security tab
- **Continuous Monitoring**: Scans all code changes
- **Vulnerability Detection**: SQL injection, XSS, object injection

### ESLint Security Rules

Local security scanning with immediate feedback:

```bash
npm run security      # Run security-focused linting
npm run security:fix  # Auto-fix security issues
```

### Pre-push Checks

The pre-push checks run formatting, linting, tests, and Semgrep locally:

```bash
npm run pre-push
```

## Branch Protection

### Main Branch Rules

- **Required Status Checks**: All CI tests must pass
- **Pull Request Reviews**: Code review required
- **Up-to-date branches**: Must be current with main
- **Security Scanning**: Must pass Semgrep analysis

### Development Workflow

1. **Feature Branch**: Create from main
2. **Development**: Local testing with `npm test` (unit + E2E)
3. **Local hooks**: Husky runs linting/format checks and security scans
4. **Pull Request**: Triggers CI pipeline (unit tests + security)
5. **Review**: Code review and CI validation
6. **Merge**: Automated changelog generation

## Local Development CI

### Local Hooks

Automated checks using Husky + lint-staged:

```bash
# On git commit:
1. ESLint security rules
2. Prettier formatting
3. Staged file validation
4. Security vulnerability detection
```

### Local CI Validation

```bash
# Full local validation (matches CI + E2E)
npm test

# CI validation only (matches CI exactly)
npm run lint && npm run format:check && npm run test:unit && npm run security
```

## Environment Configuration

### CI Environment Variables

- `NODE_ENV`: Set to test for CI runs
- `SEMGREP_APP_TOKEN`: Security scanning authentication
- `GITHUB_TOKEN`: Automated changelog and PR operations

### Browser Testing

- **Local Development**: Playwright E2E tests for comprehensive validation
- **CI**: Unit tests only (no browser dependencies)
- **Performance**: Fast CI feedback without browser installation overhead

## Deployment Process

### Static Site Deployment

Currently configured for GitHub Pages:

- **Source**: `src/` directory contains static assets
- **Build**: No build step required (vanilla JavaScript)
- **Deploy**: Manual deployment process

### Current Automation

- **Version Management**: Semantic versioning with `npm run version:*` commands
- **Build Synchronization**: Automatic HTML file updates and cache busting

### Future Automation

Planned enhancements:

- **Automated Deployment**: Deploy on main branch updates
- **Environment Branches**: Staging and production environments
- **Git Tagging**: Automated tag creation on releases

## Performance Monitoring

### CI Performance Metrics

- **Unit tests only** in CI for maximum speed
- **No browser dependencies** - eliminates Chromium installation time
- **Fast feedback** - complete CI runs in under 2 minutes

### Architecture Health

Automated monitoring via `health-check.sh`:

```bash
# Metrics tracked:
- Circular dependencies: 0 (target)
- Average dependencies per module: <5
- Code complexity scores
- Architecture grade: A+ (target)
```

## Troubleshooting CI Issues

### Common Failures

#### 1. Linting Errors

```bash
# Local debugging
npm run lint
npm run lint -- --fix

# Check specific rules
npm run security
```

#### 2. Test Failures

Run locally with verbose output:

```bash
npm run test:unit -- --verbose
```

- Testing patterns: see [Testing Patterns](../development/testing-patterns.md)

#### 3. Security Issues

```bash
# Review security warnings
npm run security

# Fix common issues
# - Use textContent instead of innerHTML
# - Validate dynamic imports
# - Sanitize user inputs
```

### CI Debugging Tools

- **GitHub Actions Logs**: Detailed execution logs
- **Playwright Reports**: Visual test failure analysis
- **Local Reproduction**: Match CI environment locally

## Optimization Strategies

### Test Performance

- **Smart Parallelization**: Optimal worker configuration
- **Test Isolation**: Independent test execution
- **Resource Management**: Efficient browser instance handling

### CI Efficiency

- **Dependency Caching**: npm modules cached between runs
- **Selective Execution**: Only run affected tests when possible
- **Artifact Management**: Cleanup and retention policies

## Security Best Practices

### Code Scanning

- **Pre-commit**: Immediate feedback on security issues
- **Pull Request**: Comprehensive security analysis
- **Continuous**: Ongoing monitoring of security landscape

### Vulnerability Management

- **Dependency Scanning**: npm audit integration
- **Code Pattern Detection**: ESLint security plugins
- **OWASP Compliance**: Industry standard security practices

## Maintenance and Updates

### Regular Tasks

- **Dependency Updates**: Monthly security updates
- **Action Updates**: Keep GitHub Actions current
- **Rule Updates**: Security rule maintenance

### Monitoring

- **CI Health**: Track success rates and performance
- **Security Alerts**: Respond to new vulnerabilities
- **Architecture Drift**: Prevent degradation over time

See [Developer Guide](../developer-guide.md) and [Testing Patterns](../development/testing-patterns.md).
