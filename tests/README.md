# MindMeld Testing

Optimized test suite providing fast, reliable feedback for core user workflows.

## 🚀 Quick Start

```bash
# Run all tests (unit + E2E)
npm test

# Unit tests only (fast - for CI)
npm run test:unit

# E2E tests only (local development)
npm run test:e2e
```

## 📊 Test Suite Overview

| Test Type      | Count    | Time | Purpose                            |
| -------------- | -------- | ---- | ---------------------------------- |
| **Unit Tests** | 9 suites | ~6s  | Logic, components, data management |
| **E2E Tests**  | 9 tests  | ~7s  | User workflows, cross-platform     |
| **Total**      | Combined | ~14s | Complete validation                |

## 📁 Test Structure

```
tests/
├── unit/                     # Fast unit tests
│   ├── data/                 # Storage, persistence logic
│   ├── features/             # Note creation, editing, UI
│   ├── interactions/         # Behaviors, gestures
│   └── services/             # Notifications, events
│
├── e2e/                      # Optimized E2E tests
│   ├── smoke/                # Core user workflows (3 tests)
│   ├── integration/          # Cross-platform workflows (3 tests)
│   ├── critical/             # Accessibility & regression (3 tests)
│   └── helpers/              # Shared utilities (CanvasPage)
│
└── e2e-archived/             # Original tests (preserved)
```

## 🎯 E2E Test Categories

### Smoke Tests (3 tests)

- **Complete Note Lifecycle** - Create, edit, persist across sessions
- **Multi-Note and Color Workflow** - Multiple notes, color changes
- **Basic Menu Functionality** - Export, import, template switching

### Integration Tests (3 tests)

- **Desktop: Basic note creation** - Mouse interactions, canvas workflow
- **Desktop: Color picker integration** - Color selection, visual feedback
- **Touch: Mode loads and initializes** - Touch mode detection, gestures

### Critical Tests (3 tests)

- **App starts cleanly** - Initialization, basic functionality
- **Color picker accessibility** - ARIA compliance, keyboard navigation
- **Kebab menu accessibility** - Menu accessibility, functionality

## 🛠 Development Workflow

### Local Development

```bash
# Quick validation
npm test              # Run everything (~14s)

# Focused testing
npm run test:unit     # Unit tests only (~6s)
npm run test:e2e      # E2E tests only (~7s)
```

### CI/Production

```bash
npm run test:unit     # Unit tests only (CI optimized)
```

## 📚 Documentation

- **[Testing Guide](../docs/testing-guide.md)** - Complete testing documentation _(if exists)_
- **[Developer Guide](../docs/developer-guide.md)** - Architecture and development workflow _(if exists)_

## 🔧 Test Utilities

### CanvasPage Helper

Standardized page object for reliable E2E interactions:

- `createNote()` - Reliable note creation
- `editNoteContent()` - Stable content editing
- `selectColor()` - Consistent color selection
- `openKebabMenu()` - Menu interaction patterns

### Best Practices

- Use `editNoteContent()` for content changes (not raw clicks)
- Wait for state changes with `waitForNoteCount()`, `waitForAppReady()`
- Avoid arbitrary timeouts - use condition-based waiting
- Test user workflows, not implementation details
