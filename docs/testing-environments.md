# Testing Environments

This project uses different test suites optimized for different environments and purposes.

## Test Suites Overview

### CI Suite (`npm run test:e2e:ci`)
**Purpose**: Fast, essential tests for GitHub Actions CI  
**Runtime**: ~5 seconds  
**Tests**: 4 critical tests covering core functionality  
**Files**: 
- `basic.spec.js` - Page load and core UI
- `note-operations.spec.js` - Note CRUD operations  
- `menu-functionality.spec.js` - Menu interactions
- `color-picker-basic.spec.js` - Color picker basics

**Why**: CI environments have limited resources and need fast feedback. This suite ensures core functionality works without the overhead of comprehensive testing.

### Dev Suite (`npm run test:e2e:dev`)  
**Purpose**: Comprehensive testing for local development  
**Runtime**: ~2-5 minutes  
**Tests**: 97 tests covering all functionality  
**Files**: All E2E test files

**Why**: Local development can handle longer test runs and needs comprehensive coverage to catch regressions across all features.

### Smoke Tests (`npm run test:e2e:smoke`)
**Purpose**: Quick validation of critical user workflows  
**Runtime**: ~30 seconds  
**Tests**: All tests marked with `@smoke` tag

### Critical Tests (`npm run test:e2e:critical`)  
**Purpose**: Essential functionality that must never break  
**Runtime**: ~15 seconds  
**Tests**: All tests marked with `@critical` tag

## Usage

### For CI/GitHub Actions
```bash
npm run test:ci  # Runs unit tests + CI E2E suite
```

### For Local Development
```bash
npm run test:e2e:dev     # Full E2E test suite
npm run test:e2e:smoke   # Quick smoke tests
npm run test:unit        # Unit tests only
```

### For Quick Validation
```bash
npm run test:e2e:ci      # Same tests as CI
npm run test:e2e:critical # Critical functionality only
```

## Configuration

Test suites are configured in `playwright.config.js` using Playwright projects:

- **CI Project**: Specific test files + smoke/critical tags
- **Dev Project**: All test files with relaxed timeouts  
- **Default Project**: Standard Chromium testing

## Chromium Installation

- **CI**: Chromium installed fresh each run for consistency
- **Local**: Chromium cached after `npm install` for speed

This approach provides:
✅ Fast CI feedback (5s vs 10+ minutes)  
✅ Comprehensive local testing  
✅ No functionality gaps  
✅ Optimal resource usage per environment