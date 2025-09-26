# File Structure Reference

## Context

This document provides a complete navigation guide for the MindMeld codebase. Use this as a reference to understand where different functionality lives and how components are organized.

## Application Entry Points

### Main Entry
- **`src/js/app.js`** - Main application entry point (2 dependencies only)
- **`src/index.html`** - HTML entry with cache busting and meta tags

### Bootstrap System
**Location:** `src/js/core/bootstrap/`

- **`AppBootstrap.js`** - Main orchestrator with dependency chain management
- **`DataBootstrap.js`** - Event bus, data store, state management initialization
- **`ServiceBootstrap.js`** - Business logic services initialization
- **`UIBootstrap.js`** - Canvas management and UI initialization
- **`InteractionBootstrap.js`** - Input systems, gestures, event handling
- **`BaseBootstrap.js`** - Abstract base class for all bootstrap modules

## Core System Architecture

### Event & Communication
- **`src/js/core/eventBus.js`** - Central communication hub for all components
- **`src/js/core/config.js`** - Application configuration and constants
- **`src/js/core/constants.js`** - Shared constants and enums
- **`src/js/core/featureFlags.js`** - Feature flag management system

### Canvas & UI Management
- **`src/js/core/canvasModule.js`** - Canvas functionality and management
- **`src/js/core/canvasManager.js`** - High-level canvas operations coordination
- **`src/js/core/canvasInitialization.js`** - Canvas setup and initialization logic
- **`src/js/core/uiSetup.js`** - UI component initialization and coordination

## Service Layer

**Location:** `src/js/services/`

### Core Services
- **`colorService.js`** - Color state management and validation
- **`noteService.js`** - Note creation, manipulation, and lifecycle
- **`noteManager.js`** - Note selection state management (being consolidated)
- **`noteIdService.js`** - Unique note ID generation and management
- **`noteEventService.js`** - Note event coordination (being consolidated)
- **`connectionService.js`** - Note connection handling and validation
- **`PersistenceService.js`** - Single source of truth for all state persistence

### Specialized Services
- **`markdownContentService.js`** - Markdown processing and content handling
- **`notificationManager.js`** - User notification and message management
- **`canvasStateService.js`** - Canvas state persistence and management
- **`zoomStateService.js`** - Zoom level state and viewport management

### Server & Collaboration
- **`serverConnectionService.js`** - Server connectivity and status management
- **`serverClient.js`** - HTTP client for server communication
- **`mapsApi.js`** - Server API client for mind map operations
- **`mapSafetyService.js`** - Data validation and safety checks

### Data Management
- **`DataProviderService.js`** - Data provider abstraction service (singleton)

## Data Layer

**Location:** `src/js/data/`

### Data Providers
**Location:** `src/js/data/providers/`

- **`DataProvider.js`** - Abstract base class with provider contract
- **`LocalJSONProvider.js`** - Local storage implementation (production)
- **`YjsProvider.js`** - Real-time collaboration implementation (foundation)

### Data Management
- **`dataStore.js`** - Application state management and persistence
- **`observableState.js`** - Reactive state management system
- **`canonicalStorage.js`** - Canonical data format and validation
- **`DataProviderCompatibility.js`** - Provider compatibility layer

## Interaction System

### Input Adapters
**Location:** `src/js/interactions/adapters/`

- **`BaseAdapter.js`** - Abstract base for all input adapters
- **`DesktopAdapter.js`** - Mouse and keyboard interactions
- **`TouchAdapter.js`** - Advanced touch and gesture interactions (Touch Mode)

### Interaction Behaviors
**Location:** `src/js/interactions/behaviors/`

- **`NoteBehavior.js`** - Note interaction business logic
- **`CanvasBehavior.js`** - Canvas interaction business logic
- **`DragBehavior.js`** - Drag and drop behavior coordination
- **`ConnectionBehavior.js`** - Connection creation and manipulation
- **`SelectionBoxBehavior.js`** - Multi-selection box behavior
- **`ViewportBehavior.js`** - Viewport and zoom behavior management
- **`MenuBehavior.js`** - Menu interaction business logic
- **`ToolbarBehavior.js`** - Toolbar interaction coordination

### Controllers & Coordination
- **`InputController.js`** - Input adapter selection and initialization
- **`InteractionController.js`** - High-level interaction coordination
- **`pageInteractions.js`** - Page UI element interactions (outside canvas)

### Gesture System
**Location:** `src/js/interactions/gestures/`

- **`TouchState.js`** - Touch point tracking and state management
- **`GestureRecognizer.js`** - Multi-touch gesture detection and state machine (if present)

### Capabilities
**Location:** `src/js/interactions/capabilities/`

- **`detector.js`** - Platform and capability detection

## Feature Modules

**Location:** `src/js/features/`

### Note Management
**Location:** `src/js/features/note/`

- **`note.js`** - Core note functionality and coordination
- **`editViewMode.js`** - Edit/view mode transitions and content extraction
- **`EditModeController.js`** - Edit mode state management
- **`noteColorApplication.js`** - Note color handling and application
- **`ghostConnectors.js`** - Visual connection preview system

### Connection Management
**Location:** `src/js/features/connection/`

- **`connectionManager.js`** - Connection lifecycle management
- **`connectionCreation.js`** - Connection creation logic and validation
- **`connectionUpdate.js`** - Connection modification and updates
- **`connectionUtils.js`** - Connection utility functions and helpers

### UI Components
- **`colorPicker/colorPickerEvents.js`** - Color selection interface and events

### Content Processing
**Location:** `src/js/features/markdown/`

- **`markdownRenderer.js`** - Safe HTML generation from markdown
- **`defangPipeline.js`** - Security-first content processing pipeline

### Server Features
- **`serverConnection/serverConnectionBehavior.js`** - Server connection behavior
- **`mapSelection/mapSelectionBehavior.js`** - Map selection interface behavior

### Specialized Features
- **`zoom/viewportAdapter.js`** - Viewport zoom adaptation logic

## Utility Modules

**Location:** `src/js/utils/`

- **`utils.js`** - General utility functions and helpers
- **`browserDetection.js`** - Browser and platform detection utilities
- **`deviceUtils.js`** - Device-specific utility functions
- **`mobileInteractions.js`** - Touch-friendly UI patterns and utilities

### Mobile Interaction Utilities

Functions available in `mobileInteractions.js`:

- **`setupMobileDropdown()`** - Convert hover menus to touch-friendly dropdowns
- **`setupMobileModal()`** - Consistent modal/overlay behavior with backdrop close
- **`setupTouchFeedback()`** - Visual feedback for touch interactions
- **`isTouchDevice()`** - Device detection utility
- **`getViewportInfo()`** - Viewport information and responsive utilities

## Factory Pattern

**Location:** `src/js/factories/`

- **`noteFactory.js`** - Pure factory functions for note creation

## Coordinate System

**Location:** `src/js/core/coordinates/`

- **`coordinateService.js`** - Coordinate transformation service
- **`CoordinateTransform.js`** - Coordinate transformation calculations
- **`CoordinateConfig.js`** - Coordinate system configuration
- **`CoordinateCache.js`** - Coordinate calculation caching

## Accessibility

**Location:** `src/js/accessibility/`

- **`adaptiveHelp.js`** - Adaptive help and accessibility features

## File Organization Patterns

### Naming Conventions
- **camelCase** for files and functions: `noteManager.js`, `handleDoubleClick()`
- **PascalCase** for classes: `NoteBehavior`, `DataProvider`
- **Descriptive names** that indicate functionality and purpose

### Directory Structure Logic
- **`core/`** - Fundamental system components used throughout app
- **`services/`** - Business logic and data management
- **`interactions/`** - User input handling and behavior coordination
- **`features/`** - UI components and feature-specific logic
- **`utils/`** - Shared utility functions
- **`data/`** - Data persistence and state management

### Import Patterns
Most modules follow this import structure:

```javascript
// Third-party imports (rare)
import ThirdPartyLib from 'library';

// Core system imports
import { eventBus } from '../../core/eventBus.js';

// Service layer imports
import { noteManager } from '../../services/noteManager.js';

// Feature/utility imports
import { getCurrentMarkdownContent } from '../../features/note/editViewMode.js';

// Relative imports
import { BaseClass } from './BaseClass.js';
```

## Key Integration Points

### Bootstrap Chain
`AppBootstrap` → `DataBootstrap` → `ServiceBootstrap` → `UIBootstrap` → `InteractionBootstrap`

### Input Flow
`User Action` → `Adapter` → `Behavior` → `EventBus` → `Services` → `UI Update`

### Data Flow
`User Action` → `Behavior` → `DataProvider` → `Storage` → `Change Event` → `UI Update`

### Stable Components
- Bootstrap system architecture
- Adapter-Behavior pattern implementation
- DataProvider abstraction layer
- Core coordinate and event systems

## Related Documentation

- [Adapter-Behavior Pattern](../architecture/adapter-behavior-pattern.md) - Interaction architecture
- [Data Providers](../architecture/data-providers.md) - Data layer architecture
- [Coding Standards](../development/coding-standards.md) - File organization standards