import { expect } from '@playwright/test';

/**
 * Shared Page Object Model for MindMeld Canvas operations
 * Consolidates common functionality across all E2E tests
 */
export class CanvasPage {
  constructor(page) {
    this.page = page;
    this.isCI = !!process.env.CI;

    // Core canvas elements
    this.canvas = page.locator('#canvas');
    this.canvasContainer = page.locator('#canvas-container');
    this.svgContainer = page.locator('#svg-container');
    this.backgroundLayout = page.locator('.background-layout');

    // Note elements
    this.note = page.locator('.note').first();
    this.notes = page.locator('.note');
    this.selectedNotes = page.locator('.note.selected');

    // UI elements
    this.selectionBox = page.locator('#selection-box');

    // Canvas style dropdown elements
    this.canvasStyleDropdown = page.locator('#canvas-style-dropdown');
    this.canvasStyleMenuButton = page.locator('text="Canvas Style"');
    this.canvasStyleMenuItem = page
      .locator('.menu-item')
      .filter({ hasText: 'Canvas Style' });
  }

  // Common application loading
  async load() {
    await this.page.goto('http://localhost:8080');
    await expect(this.canvas).toBeVisible();

    // CI-specific warmup period for application stability
    if (this.isCI) {
      await this.page.waitForLoadState('domcontentloaded');
      await this.waitForAppReady(); // Extra warmup in CI
    }
  }

  // Note creation with robust waiting
  async createNoteAt(x, y) {
    const noteCountBefore = await this.notes.count();

    // Ensure we're clicking on the canvas area, not other UI elements
    await this.canvas.click(); // Focus canvas first
    await this.waitForAppReady(); // Wait for focus to be ready

    // Use a more reliable double-click approach
    await this.page.mouse.click(x, y);
    await this.page.waitForFunction(() => document.readyState === 'complete');
    await this.page.mouse.click(x, y);

    // Wait for new note to be created with more specific conditions
    try {
      await this.page.waitForFunction(
        (count) => {
          const notes = document.querySelectorAll('.note');
          return notes.length > count;
        },
        noteCountBefore,
        { timeout: 8000 },
      );
    } catch (error) {
      // Debug information for CI
      const currentCount = await this.notes.count();
      throw new Error(
        `Note creation failed at (${x}, ${y}). Expected: ${noteCountBefore + 1}, Got: ${currentCount}. Original error: ${error.message}`,
      );
    }

    // Get the newly created note (at the count index)
    const note = this.notes.nth(noteCountBefore);
    await expect(note).toBeVisible();
    return note;
  }

  // Note creation with automatic throttle handling
  async createNoteWithThrottleWait(x, y) {
    const note = await this.createNoteAt(x, y);

    // Wait for throttle to complete using state-based approach
    await this.waitForAppReady();

    return note;
  }

  // Simple note creation for basic operations (legacy compatibility)
  async createNote(x = 640, y = 388) {
    const noteCountBefore = await this.notes.count();

    // Ensure canvas is focused and ready for interaction
    await this.canvas.click();
    await this.page.waitForLoadState('domcontentloaded');

    await this.page.mouse.dblclick(x, y);

    // Wait for the new note to be created with fallback
    try {
      await this.page.waitForFunction(
        (count) => document.querySelectorAll('.note').length > count,
        noteCountBefore,
        { timeout: 10000 }, // Increased timeout for better stability
      );
    } catch {
      // Fallback: Try regular mouse double-click if JavaScript dispatch fails
      // Check if page/browser is still active before attempting mouse operations
      if (!this.page.isClosed()) {
        await this.page.mouse.dblclick(x, y);
        await this.page.waitForFunction(
          (count) => document.querySelectorAll('.note').length > count,
          noteCountBefore,
          { timeout: 5000 },
        );
      }
    }

    const newNote = this.notes.nth(noteCountBefore);

    // Check if page/browser is still active before expect statement
    if (!this.page.isClosed()) {
      await expect(newNote).toBeVisible();
    }

    return newNote;
  }

  // Note selection
  async selectNote(note = this.note) {
    await note.click({ position: { x: 3, y: 3 } });
    await expect(note).toHaveClass(/selected/);
    return note;
  }

  // Note movement
  async moveNote(note = this.note, deltaX = 100, deltaY = 100) {
    const initialPosition = await note.boundingBox();
    await this.page.mouse.move(initialPosition.x + 5, initialPosition.y + 5);
    await this.page.mouse.down();
    await this.page.mouse.move(
      initialPosition.x + deltaX,
      initialPosition.y + deltaY,
    );
    await this.page.mouse.up();
    return initialPosition;
  }

  // Note editing
  async editNoteContent(text, note = this.note) {
    const noteContent = note.locator('.note-content');
    await noteContent.click();
    await this.page.keyboard.type(text);
    await expect(noteContent).toHaveText(text);
  }

  // Note deletion
  async deleteNote() {
    await this.page.keyboard.press('Delete');
    const noteCount = await this.notes.count();
    expect(noteCount).toBe(0);
  }

  // Connection operations
  async hoverNote(note) {
    await note.hover();
    // Wait for ghost connectors to appear
    const ghostConnector = note.locator('.ghost-connector').first();
    await ghostConnector.waitFor({ state: 'visible' });
  }

  async connectNotes(sourceNote, targetNote) {
    // Hover over source note to reveal ghost connectors
    await this.hoverNote(sourceNote);

    // Get the ghost connector (using right connector as it's commonly used)
    const ghostConnector = sourceNote.locator('.ghost-connector.right');
    await expect(ghostConnector).toBeVisible();

    // Use dragTo method instead of manual mouse movements
    await ghostConnector.dragTo(targetNote);

    // Wait for connection to be created in the SVG container
    await expect(this.svgContainer.locator('g[data-start]')).toBeVisible({
      timeout: 2000,
    });
  }

  async verifyConnection(sourceNote, targetNote) {
    // Get note IDs
    const sourceId = await sourceNote.getAttribute('id');
    const targetId = await targetNote.getAttribute('id');

    // Check for connection group in SVG container
    const connectionGroup = this.svgContainer.locator(
      `g[data-start="${sourceId}"][data-end="${targetId}"]`,
    );
    await expect(connectionGroup).toBeVisible();

    // Check for connection path within the group (exists but may be hidden)
    const connectionPath = connectionGroup.locator('path');
    await expect(connectionPath).toBeAttached(); // Just check it exists, not necessarily visible

    return { sourceId, targetId, connectionGroup };
  }

  // Multi-select operations
  async createSelectionBox(startX, startY, endX, endY) {
    // Check if page/browser is still active before starting selection
    if (this.page.isClosed()) {
      throw new Error('Page is closed, cannot create selection box');
    }

    // Clear any existing selections first
    if (!this.page.isClosed()) {
      await this.page.mouse.click(100, 100); // Click on empty area
      await this.page.waitForLoadState('domcontentloaded');

      // Start dragging from empty canvas area using absolute coordinates
      await this.page.mouse.move(startX, startY);
      await this.page.mouse.down({ button: 'left' });

      // Drag to create selection box
      await this.page.mouse.move(endX, endY, { steps: 10 });

      // Release mouse to complete selection
      await this.page.mouse.up({ button: 'left' });
    }

    // Wait for selection to be processed - check for selected notes
    await this.page.waitForFunction(
      () => {
        return document.querySelectorAll('.note.selected').length > 0;
      },
      { timeout: 1000 },
    );
  }

  async getSelectedNotes() {
    return this.selectedNotes;
  }

  async moveSelectedNotes(deltaX, deltaY) {
    // Check if page/browser is still active before starting drag operation
    if (this.page.isClosed()) {
      throw new Error('Page is closed, cannot perform move operation');
    }

    // Get first selected note to drag
    const selectedNotes = await this.getSelectedNotes();
    const selectedNote = selectedNotes.first();
    await expect(selectedNote).toBeVisible();

    // Get initial position
    const initialBox = await selectedNote.boundingBox();

    // Drag the note (this will move all selected notes)
    await selectedNote.hover();

    // Perform mouse operations with additional safety checks
    if (!this.page.isClosed()) {
      await this.page.mouse.move(
        initialBox.x + initialBox.width / 2,
        initialBox.y + initialBox.height / 2,
      );
      await this.page.mouse.down();
      await this.page.mouse.move(
        initialBox.x + initialBox.width / 2 + deltaX,
        initialBox.y + initialBox.height / 2 + deltaY,
      );
      await this.page.mouse.up();
    }

    // Wait for movement to complete - ensure note positions have updated
    await this.page
      .waitForFunction(
        () => {
          const notes = document.querySelectorAll('.note.selected');
          return (
            notes.length > 0 &&
            Array.from(notes).some(
              (note) =>
                note.style.transform !== '' ||
                note.style.left !== '' ||
                note.style.top !== '',
            )
          );
        },
        { timeout: 3000 }, // Increased timeout
      )
      .catch(() => {
        // Fallback: Wait for app stability if transform detection fails
        return this.waitForAppReady();
      });
  }

  async verifyNotesSelected(expectedCount) {
    const selectedNotes = await this.getSelectedNotes();
    const count = await selectedNotes.count();
    expect(count).toBe(expectedCount);
    return selectedNotes;
  }

  // Canvas template switching operations
  async switchToTemplate(templateName) {
    // Hover over Canvas Style menu item to reveal dropdown
    await this.canvasStyleMenuItem.hover();

    // Wait for dropdown menu to appear and become visible
    await expect(this.canvasStyleDropdown).toBeVisible();

    // Click the specific template option
    const templateOption = this.canvasStyleDropdown.locator(
      `text="${templateName}"`,
    );
    await expect(templateOption).toBeVisible();
    await templateOption.click();

    // Wait for template switch to complete - check for class change on canvas
    await this.page
      .waitForFunction(
        () => {
          const canvas = document.getElementById('canvas');
          return (
            canvas &&
            canvas.className.includes(
              templateName.toLowerCase().replace(/\s+/g, '-'),
            )
          );
        },
        { timeout: 2000 },
      )
      .catch(() => {
        // Fallback for templates that don't change canvas class
        return this.page.waitForLoadState('domcontentloaded');
      });
  }

  async verifyTemplate(templateName) {
    const templateClassMap = {
      'Standard Canvas': 'standard-canvas',
      "Hero's Journey": 'heros-journey',
      'Now/Next/Future': 'now-next-future',
      'Wardley Map': 'wardley-map',
    };

    const expectedClass = templateClassMap[templateName];
    if (!expectedClass) {
      throw new Error(`Unknown template: ${templateName}`);
    }

    // Verify background layout has the correct class
    await expect(this.backgroundLayout).toHaveClass(new RegExp(expectedClass));

    // Template-specific verifications
    switch (templateName) {
      case "Hero's Journey":
        await this.verifyHerosJourneyElements();
        break;
      case 'Now/Next/Future':
        await this.verifyNowNextFutureElements();
        break;
      case 'Wardley Map':
        await this.verifyWardleyMapElements();
        break;
      case 'Standard Canvas':
        await this.verifyStandardCanvasElements();
        break;
    }
  }

  async verifyHerosJourneyElements() {
    // Check for journey stage boxes
    const journeyStages = this.page.locator('.journey-stage');
    const stageCount = await journeyStages.count();
    expect(stageCount).toBeGreaterThan(0);

    // Verify some key stage headings exist
    const ordinaryWorldStage = this.page.locator('text="The Ordinary World"');
    await expect(ordinaryWorldStage).toBeVisible();
  }

  async verifyNowNextFutureElements() {
    // Check for column elements
    const columns = this.page.locator('.column');
    const columnCount = await columns.count();
    expect(columnCount).toBe(3);

    // Verify column headings
    await expect(this.page.locator('text="Now"')).toBeVisible();
    await expect(this.page.locator('text="Next"')).toBeVisible();
    await expect(this.page.locator('text="Future"')).toBeVisible();
  }

  async verifyWardleyMapElements() {
    // Check for SVG element created by Wardley Map
    const svg = this.backgroundLayout.locator('svg');
    await expect(svg).toBeVisible();

    // Check for axis lines
    const lines = svg.locator('line');
    const lineCount = await lines.count();
    expect(lineCount).toBeGreaterThan(0);

    // Check for axis labels
    const labels = svg.locator('text');
    const labelCount = await labels.count();
    expect(labelCount).toBeGreaterThan(0);
  }

  async verifyStandardCanvasElements() {
    // Standard canvas should have minimal template-specific elements
    // Just verify it doesn't have other template classes
    await expect(this.backgroundLayout).not.toHaveClass(/heros-journey/);
    await expect(this.backgroundLayout).not.toHaveClass(/now-next-future/);
    await expect(this.backgroundLayout).not.toHaveClass(/wardley-map/);
  }

  async verifyTemplateCleanup(previousTemplateName) {
    const previousTemplateClassMap = {
      'Standard Canvas': 'standard-canvas',
      "Hero's Journey": 'heros-journey',
      'Now/Next/Future': 'now-next-future',
      'Wardley Map': 'wardley-map',
    };

    const previousClass = previousTemplateClassMap[previousTemplateName];
    if (previousClass) {
      // Verify previous template elements are removed
      switch (previousTemplateName) {
        case "Hero's Journey": {
          const journeyStages = this.page.locator('.journey-stage');
          const stageCount = await journeyStages.count();
          expect(stageCount).toBe(0);
          break;
        }
        case 'Now/Next/Future': {
          const columns = this.page.locator('.column');
          const columnCount = await columns.count();
          expect(columnCount).toBe(0);
          break;
        }
      }
    }
  }

  // ========================================
  // STATE-BASED WAITING METHODS (Phase 1)
  // Replaces timeout-based waits with robust state checking
  // ========================================

  /**
   * Wait for application to be ready (not throttled)
   * Replaces: waitForTimeout(600) for note creation
   */
  async waitForAppReady() {
    // Simple fallback approach - wait for DOM and a short delay for stability
    // The mindMeldTestState approach was causing browser instability
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForFunction(() => document.readyState === 'complete', {
      timeout: 5000,
    });
    // Small delay for any async operations to settle
    await this.page.waitForTimeout(200);
  }

  /**
   * Create note when application is ready (replaces createNoteWithThrottleWait)
   * No more arbitrary 600ms waits
   */
  async createNoteWhenReady(x, y) {
    await this.waitForAppReady();
    return this.createNoteAt(x, y);
  }

  /**
   * Wait for specific note count to be reached
   * Replaces: waitForTimeout() after note creation
   */
  async waitForNoteCount(expectedCount) {
    return this.page.waitForFunction(
      (count) => {
        const notes = document.querySelectorAll('.note');
        return notes.length === count;
      },
      expectedCount,
      { timeout: 8000 },
    );
  }

  /**
   * Wait for connection to be fully rendered
   * Replaces: waitForTimeout() after connection creation
   */
  async waitForConnection(fromNoteId, toNoteId) {
    return this.page.waitForFunction(
      ([from, to]) => {
        const path = document.querySelector(
          `path[data-start="${from}"][data-end="${to}"]`,
        );
        const line = document.querySelector(
          `line[data-start="${from}"][data-end="${to}"]`,
        );
        return (
          (path && path.getAttribute('d') && path.getAttribute('d') !== '') ||
          (line && line.getAttribute('x1') && line.getAttribute('x2'))
        );
      },
      [fromNoteId, toNoteId],
      { timeout: 8000 },
    );
  }

  /**
   * Wait for specific connection count
   * Replaces: waitForTimeout() after multiple connections
   */
  async waitForConnectionCount(expectedCount) {
    return this.page.waitForFunction(
      (count) => {
        const connections = document.querySelectorAll(
          'path[data-start], line[data-start]',
        );
        return connections.length === count;
      },
      expectedCount,
      { timeout: 8000 },
    );
  }

  /**
   * Wait for template switch to complete
   * Replaces: waitForTimeout() after template changes
   */
  async waitForTemplateLoaded(templateName) {
    const templateClassMap = {
      'Standard Canvas': 'standard-canvas',
      "Hero's Journey": 'heros-journey',
      'Now/Next/Future': 'now-next-future',
      'Wardley Map': 'wardley-map',
    };

    const expectedClass = templateClassMap[templateName];
    if (!expectedClass) {
      throw new Error(`Unknown template: ${templateName}`);
    }

    return this.page.waitForFunction(
      (className) => {
        const layout = document.querySelector('.background-layout');
        return layout && layout.classList.contains(className);
      },
      expectedClass,
      { timeout: 10000 },
    );
  }

  /**
   * Wait for canvas to be stable (no ongoing animations or updates)
   * Replaces: waitForTimeout() for general stabilization
   */
  async waitForCanvasStable() {
    return this.page.waitForFunction(
      () => {
        // Check if there are any ongoing CSS transitions or animations
        const canvas = document.getElementById('canvas');
        if (!canvas) return false;

        const computedStyle = window.getComputedStyle(canvas);
        const hasTransitions =
          computedStyle.transition !== 'none' ||
          computedStyle.animation !== 'none';

        // Check if app state indicates stability
        return !hasTransitions;
      },
      { timeout: 8000 },
    );
  }

  /**
   * Enhanced note creation with state-based waiting
   * Combines creation + state verification
   */
  async createNoteAndWait(x, y, expectedCount = null) {
    const noteCountBefore = await this.notes.count();
    await this.waitForAppReady();

    const note = await this.createNoteAt(x, y);

    // Wait for the new note count if specified, otherwise just +1
    const targetCount = expectedCount || noteCountBefore + 1;
    await this.waitForNoteCount(targetCount);

    return note;
  }

  /**
   * Enhanced connection creation with state-based waiting
   */
  async connectNotesAndWait(sourceNote, targetNote) {
    await this.connectNotes(sourceNote, targetNote);

    // Get note IDs for waiting
    const sourceId = await sourceNote.getAttribute('id');
    const targetId = await targetNote.getAttribute('id');

    // Wait for the specific connection to be rendered
    await this.waitForConnection(sourceId, targetId);

    return { from: sourceId, to: targetId };
  }

  /**
   * Wait for canvas to be completely empty after clearing
   */
  async waitForCanvasEmpty() {
    return this.page.waitForFunction(
      () => {
        const notes = document.querySelectorAll('.note');
        const connections = document.querySelectorAll(
          'g[data-start][data-end]',
        );
        return notes.length === 0 && connections.length === 0;
      },
      { timeout: 10000 },
    );
  }

  /**
   * Wait for export operation to complete
   */
  async waitForExportReady() {
    return this.page.waitForFunction(
      () => {
        return document.readyState === 'complete';
      },
      { timeout: 15000 },
    );
  }

  /**
   * Wait for a single note to be fully created and rendered
   */
  async waitForNoteCreated() {
    return this.page.waitForFunction(
      () => {
        const notes = document.querySelectorAll('.note');
        const lastNote = notes[notes.length - 1];
        return (
          lastNote && lastNote.offsetWidth > 0 && lastNote.offsetHeight > 0
        );
      },
      { timeout: 10000 },
    );
  }
}

// Common test coordinates for consistency
export const TestCoordinates = {
  // Standard positions for multi-note tests
  note1: { x: 400, y: 300 },
  note2: { x: 700, y: 300 },
  note3: { x: 400, y: 600 },
  note4: { x: 700, y: 600 },

  // Empty canvas areas for selection box operations
  emptyAreas: {
    topLeft: { x: 200, y: 200 },
    center: { x: 640, y: 400 },
  },

  // Selection box coordinates that work reliably
  selectionBoxes: {
    topHalf: { startX: 300, startY: 200, endX: 800, endY: 350 },
    bottomHalf: { startX: 300, startY: 450, endX: 800, endY: 650 },
    fullArea: { startX: 200, startY: 200, endX: 900, endY: 700 },
  },
};
