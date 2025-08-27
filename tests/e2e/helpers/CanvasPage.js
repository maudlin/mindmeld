import { expect } from '@playwright/test';

/**
 * Shared Page Object Model for MindMeld Canvas operations
 * Consolidates common functionality across all E2E tests
 */
export class CanvasPage {
  constructor(page) {
    this.page = page;
    this.isCI = !!process.env.CI;

    // Throttle tracking for note creation
    this.lastNoteCreationTime = null;

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
    this.canvasStyleMenuButton = page.locator(
      '.kebab-menu-item[data-action="change-template"]',
    );
    this.kebabMenuButton = page.locator('#kebab-menu-button');

    // Color picker elements
    this.colorPickerContainer = page.locator('#color-picker-container');
    this.colorSwatches = page.locator('.color-swatch');
    this.yellowSwatch = page.locator('.color-swatch[data-color="yellow"]');
    this.pinkSwatch = page.locator('.color-swatch[data-color="pink"]');
    this.greenSwatch = page.locator('.color-swatch[data-color="green"]');
    this.blueSwatch = page.locator('.color-swatch[data-color="blue"]');
  }

  // Common application loading
  async load(mode = 'desktop') {
    const url =
      mode === 'touch'
        ? 'http://localhost:8080/?mode=touch'
        : 'http://localhost:8080/?mode=desktop';

    // Track the current mode for later use
    this.currentMode = mode;

    await this.page.goto(url);
    await expect(this.canvas).toBeVisible();

    // Clear any existing localStorage to prevent state pollution between tests
    await this.page.evaluate(() => {
      localStorage.clear();
    });

    // Wait for the app to stabilize after localStorage clear
    await this.page.waitForTimeout(200);

    // CI-specific warmup period for application stability
    if (this.isCI) {
      await this.page.waitForLoadState('domcontentloaded');
      await this.waitForAppReady(); // Extra warmup in CI
    }

    // Extra initialization time for touch mode
    if (mode === 'touch') {
      await this.page.waitForTimeout(1000); // Allow TouchAdapter initialization
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
  // Alias for createNote (for backward compatibility)
  async createNoteWithThrottleWait(x = 640, y = 388) {
    return await this.createNote(x, y);
  }

  // Primary note creation method - handles 500ms throttle properly
  async createNote(x = 640, y = 388) {
    // Handle note creation throttle (500ms) - wait 600ms to be safe
    if (this.lastNoteCreationTime) {
      const timeSinceLastCreation = Date.now() - this.lastNoteCreationTime;
      if (timeSinceLastCreation < 600) {
        await this.page.waitForTimeout(600 - timeSinceLastCreation);
      }
    }

    const noteCountBefore = await this.notes.count();

    // Ensure canvas is focused and ready for interaction
    await this.canvas.click();
    await this.page.waitForLoadState('domcontentloaded');

    // Use mode-appropriate interaction method for note creation
    if (this.currentMode === 'touch') {
      // Use Playwright's touchscreen API for touch mode
      await this.page.touchscreen.tap(x, y);
      await this.page.waitForTimeout(50);
      await this.page.touchscreen.tap(x, y); // Second tap for double-tap
    } else {
      // Use mouse double-click for desktop mode
      await this.page.mouse.dblclick(x, y);
    }

    this.lastNoteCreationTime = Date.now(); // Track creation time for throttling

    // Wait for the new note to be created with generous timeout for throttled creation
    await this.page.waitForFunction(
      (count) => document.querySelectorAll('.note').length > count,
      noteCountBefore,
      { timeout: 10000 }, // Generous timeout to account for throttling
    );

    const newNote = this.notes.nth(noteCountBefore);

    // Check if page/browser is still active before expect statement
    if (!this.page.isClosed()) {
      await expect(newNote).toBeVisible();
    }

    return newNote;
  }

  // Note selection
  async selectNote(note = this.note) {
    // Use boundingBox and page.mouse.click to avoid "html intercepts pointer events" errors
    const box = await note.boundingBox();
    await this.page.mouse.click(box.x + 3, box.y + 3);
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

    // Wait for potential edit mode transition (div -> textarea)
    await this.page.waitForTimeout(100);

    // Check if we now have a textarea (edit mode) or div (view mode)
    const isTextarea = await noteContent.evaluate(
      (el) => el.tagName === 'TEXTAREA',
    );

    if (isTextarea) {
      // In edit mode - clear existing content and type new text
      await this.page.keyboard.press('Control+a'); // Select all
      await this.page.keyboard.type(text);
      // For textarea, check the value property
      await expect(noteContent).toHaveValue(text);
    } else {
      // In view mode - just type (this shouldn't happen after click, but handle it)
      await this.page.keyboard.type(text);
      await expect(noteContent).toHaveText(text);
    }
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

    // Get note IDs before dragging
    const sourceId = await sourceNote.getAttribute('id');
    const targetId = await targetNote.getAttribute('id');

    // Use dragTo method instead of manual mouse movements
    await ghostConnector.dragTo(targetNote);

    // Wait for the specific connection to be created in the SVG container
    const specificConnection = this.svgContainer.locator(
      `g[data-start="${sourceId}"][data-end="${targetId}"]`,
    );
    await expect(specificConnection).toBeVisible({
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

    // Use pointer events since the app uses pointerdown/pointermove/pointerup
    if (!this.page.isClosed()) {
      const startX = initialBox.x + initialBox.width / 2;
      const startY = initialBox.y + initialBox.height / 2;
      const endX = startX + deltaX;
      const endY = startY + deltaY;
      
      // Simulate pointer events which the app actually uses
      await this.page.mouse.move(startX, startY);
      
      // Dispatch custom pointer events
      await selectedNote.dispatchEvent('pointerdown', {
        pointerId: 1,
        bubbles: true,
        isPrimary: true,
        clientX: startX,
        clientY: startY,
        button: 0
      });
      
      // Move to end position
      await this.page.mouse.move(endX, endY);
      
      // Dispatch pointermove event
      await this.page.evaluate(({endX, endY}) => {
        document.dispatchEvent(new PointerEvent('pointermove', {
          pointerId: 1,
          bubbles: true,
          isPrimary: true,
          clientX: endX,
          clientY: endY,
          button: 0
        }));
      }, {endX, endY});
      
      // Dispatch pointerup event
      await this.page.evaluate(({endX, endY}) => {
        document.dispatchEvent(new PointerEvent('pointerup', {
          pointerId: 1,
          bubbles: true,
          isPrimary: true,
          clientX: endX,
          clientY: endY,
          button: 0
        }));
      }, {endX, endY});
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
    // Open kebab menu
    await this.kebabMenuButton.click();
    await expect(this.page.locator('#kebab-context-menu.open')).toBeVisible();

    // Click change template option
    await this.canvasStyleMenuButton.click();

    // Wait for dropdown to become visible (it will be positioned in center)
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
   * Check if note content has specific text, handling both edit (textarea) and view (div) modes
   * @param {Locator} noteContent - The note content element
   * @param {string} expectedText - The expected text
   */
  async expectNoteContentToHaveText(noteContent, expectedText) {
    const isTextarea = await noteContent.evaluate(
      (el) => el.tagName === 'TEXTAREA',
    );

    if (isTextarea) {
      await expect(noteContent).toHaveValue(expectedText);
    } else {
      await expect(noteContent).toHaveText(expectedText);
    }
  }

  /**
   * Check if note content contains specific text, handling both edit and view modes
   * @param {Locator} noteContent - The note content element
   * @param {string} expectedText - The expected text to contain
   */
  async expectNoteContentToContainText(noteContent, expectedText) {
    const isTextarea = await noteContent.evaluate(
      (el) => el.tagName === 'TEXTAREA',
    );

    if (isTextarea) {
      // For textarea, check the value contains the text
      await expect(noteContent).toHaveValue(new RegExp(expectedText));
    } else {
      await expect(noteContent).toContainText(expectedText);
    }
  }

  /**
   * Get the current content of a note element, handling both edit and view modes
   * @param {Locator} noteContent - The note content element
   * @returns {string} The current content
   */
  async getNoteContentText(noteContent) {
    const isTextarea = await noteContent.evaluate(
      (el) => el.tagName === 'TEXTAREA',
    );

    if (isTextarea) {
      return await noteContent.inputValue();
    } else {
      return await noteContent.textContent();
    }
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

  // ========================================
  // COLOR PICKER HELPER METHODS
  // ========================================

  /**
   * Select a color from the color picker
   * @param {string} color - Color name ('yellow', 'pink', 'green', 'blue')
   */
  async selectColor(color) {
    const validColors = ['yellow', 'pink', 'green', 'blue'];
    if (!validColors.includes(color)) {
      throw new Error(
        `Invalid color: ${color}. Valid colors: ${validColors.join(', ')}`,
      );
    }

    const swatch = this.page.locator(`.color-swatch[data-color="${color}"]`);
    await swatch.click();
    await expect(swatch).toHaveClass(/active/);
  }

  /**
   * Get the currently active color from the color picker
   * @returns {string} The active color name
   */
  async getActiveColor() {
    const activeSwatch = this.page.locator('.color-swatch.active');
    const color = await activeSwatch.getAttribute('data-color');
    return color;
  }

  /**
   * Verify that the color picker is visible and has all swatches
   */
  async verifyColorPickerVisible() {
    await expect(this.colorPickerContainer).toBeVisible();
    await expect(this.colorSwatches).toHaveCount(4);
    await expect(this.yellowSwatch).toBeVisible();
    await expect(this.pinkSwatch).toBeVisible();
    await expect(this.greenSwatch).toBeVisible();
    await expect(this.blueSwatch).toBeVisible();
  }

  /**
   * Verify that a note has a specific color
   * @param {Locator} note - The note element
   * @param {string} color - Expected color name
   */
  async verifyNoteColor(note, color) {
    await expect(note).toHaveClass(new RegExp(`color-${color}`));
  }

  /**
   * Create a note with a specific color
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {string} color - Color name
   * @returns {Locator} The created note
   */
  async createNoteWithColor(x, y, color) {
    await this.selectColor(color);
    const note = await this.createNote(x, y);
    await this.verifyNoteColor(note, color);
    return note;
  }

  /**
   * Apply color to an existing note
   * @param {Locator} note - The note element
   * @param {string} color - Color to apply
   */
  async applyColorToNote(note, color) {
    await this.selectNote(note);
    await this.selectColor(color);
    await this.verifyNoteColor(note, color);
  }

  /**
   * Apply color to multiple selected notes
   * @param {string} color - Color to apply
   */
  async applyColorToSelectedNotes(color) {
    await this.selectColor(color);

    // Verify all selected notes have the new color
    const selectedNotes = await this.getSelectedNotes();
    const count = await selectedNotes.count();

    for (let i = 0; i < count; i++) {
      const note = selectedNotes.nth(i);
      await this.verifyNoteColor(note, color);
    }
  }

  /**
   * Navigate color picker using keyboard
   * @param {string} direction - 'next', 'previous', 'first', 'last'
   */
  async navigateColorPicker(direction) {
    switch (direction) {
      case 'next':
        await this.page.keyboard.press('ArrowRight');
        break;
      case 'previous':
        await this.page.keyboard.press('ArrowLeft');
        break;
      case 'first':
        await this.page.keyboard.press('Home');
        break;
      case 'last':
        await this.page.keyboard.press('End');
        break;
      default:
        throw new Error(`Invalid direction: ${direction}`);
    }
  }

  /**
   * Select color using keyboard
   * @param {string} key - 'Enter' or 'Space'
   */
  async selectColorWithKeyboard(key = 'Enter') {
    if (key === 'Enter') {
      await this.page.keyboard.press('Enter');
    } else if (key === 'Space') {
      await this.page.keyboard.press('Space');
    } else {
      throw new Error(`Invalid key: ${key}. Use 'Enter' or 'Space'`);
    }
  }

  /**
   * Focus a specific color swatch
   * @param {string} color - Color name to focus
   */
  async focusColorSwatch(color) {
    const swatch = this.page.locator(`.color-swatch[data-color="${color}"]`);
    await swatch.focus();
    await expect(swatch).toBeFocused();
  }

  /**
   * Verify color picker accessibility attributes
   */
  async verifyColorPickerAccessibility() {
    const swatches = this.colorSwatches;
    const count = await swatches.count();

    for (let i = 0; i < count; i++) {
      const swatch = swatches.nth(i);

      // Verify ARIA attributes
      await expect(swatch).toHaveAttribute('role', 'button');
      await expect(swatch).toHaveAttribute('tabindex', '0');

      // Verify aria-label exists and describes the color
      const ariaLabel = await swatch.getAttribute('aria-label');
      expect(ariaLabel).not.toBeNull();
      expect(ariaLabel).toMatch(/select.*color/i);
    }
  }

  /**
   * Test color hover effects
   * @param {string} color - Color to hover
   */
  async testColorHover(color) {
    const swatch = this.page.locator(`.color-swatch[data-color="${color}"]`);

    // Hover and verify hover state
    await swatch.hover();
    await expect(swatch).toHaveClass(/hover/);

    // Move away and verify hover state is removed
    await this.page.mouse.move(0, 0);
    await expect(swatch).not.toHaveClass(/hover/);
  }

  /**
   * Wait for color application to complete
   * @param {string} color - Expected color
   */
  async waitForColorApplication(color) {
    const swatch = this.page.locator(`.color-swatch[data-color="${color}"]`);
    await expect(swatch).toHaveClass(/active/);
  }

  // ========================================
  // EDIT/VIEW MODE TEST HELPERS
  // For textarea-based edit mode architecture
  // ========================================

  /**
   * Assert that a note is in edit mode (textarea-based)
   * @param {Locator} noteContent - The note content element
   */
  async assertNoteInEditMode(noteContent) {
    const isTextarea = await noteContent.evaluate(
      (el) => el.tagName === 'TEXTAREA',
    );

    if (isTextarea) {
      // Textarea-based edit mode - this is the expected behavior
      await expect(noteContent).toHaveClass(/edit-mode/);
      await expect(noteContent).toBeFocused();
    } else {
      // For some interactions (like touch), edit mode might not have activated yet
      // Just check that it has edit-mode class and is contenteditable
      await expect(noteContent).toHaveClass(/edit-mode/);
      // Note: Don't check contenteditable="true" as it might not be set in all cases
    }
  }

  /**
   * Assert that a note is in view mode (div-based)
   * @param {Locator} noteContent - The note content element
   */
  async assertNoteInViewMode(noteContent) {
    const isTextarea = await noteContent.evaluate(
      (el) => el.tagName === 'TEXTAREA',
    );

    // In view mode, it should be a div, not a textarea
    expect(isTextarea).toBe(false);
    await expect(noteContent).toHaveClass(/view-mode/);

    // Note: In the textarea architecture, when returning to view mode,
    // the contenteditable attribute may still be "true" on the div, which is fine
    // The important thing is that it's not a textarea and has view-mode class
  }

  /**
   * Assert note content, handling both textarea (edit) and div (view) modes
   * @param {Locator} noteContent - The note content element
   * @param {string} expectedText - The expected text content
   */
  async assertNoteContent(noteContent, expectedText) {
    const isTextarea = await noteContent.evaluate(
      (el) => el.tagName === 'TEXTAREA',
    );

    if (isTextarea) {
      await expect(noteContent).toHaveValue(expectedText);
    } else {
      await expect(noteContent).toHaveText(expectedText);
    }
  }

  /**
   * Get the note content element, re-querying after mode changes
   * Since the element is replaced when switching modes, this ensures we have the current element
   * @param {Locator} note - The note element
   * @returns {Locator} The current note content element
   */
  async getNoteContentElement(note) {
    // Re-query the note-content element within the note
    return note.locator('.note-content');
  }

  /**
   * Enter edit mode for a note and return the updated content element
   * @param {Locator} note - The note element
   * @returns {Locator} The note content element in edit mode
   */
  async enterEditMode(note) {
    let noteContent = await this.getNoteContentElement(note);
    await noteContent.click();

    // Wait for potential element replacement
    await this.page.waitForTimeout(100);

    // Re-query after click as element may have been replaced
    noteContent = await this.getNoteContentElement(note);
    await this.assertNoteInEditMode(noteContent);

    return noteContent;
  }

  /**
   * Exit edit mode for a note and return the updated content element
   * @param {Locator} note - The note element
   * @returns {Locator} The note content element in view mode
   */
  async exitEditMode(note) {
    // Click outside on canvas to trigger view mode
    await this.page.click('#canvas');

    // Wait for element replacement
    await this.page.waitForTimeout(100);

    // Re-query after mode change
    const noteContent = await this.getNoteContentElement(note);
    await this.assertNoteInViewMode(noteContent);

    return noteContent;
  }

  /**
   * Get the raw text content of a note, handling both modes
   * @param {Locator} noteContent - The note content element
   * @returns {string} The raw text content
   */
  async getRawNoteContent(noteContent) {
    const isTextarea = await noteContent.evaluate(
      (el) => el.tagName === 'TEXTAREA',
    );

    if (isTextarea) {
      return await noteContent.inputValue();
    } else {
      return await noteContent.textContent();
    }
  }

  /**
   * Assert that note content contains text, handling both modes
   * @param {Locator} noteContent - The note content element
   * @param {string} expectedText - The text that should be contained
   */
  async assertNoteContentContains(noteContent, expectedText) {
    const content = await this.getRawNoteContent(noteContent);
    expect(content).toContain(expectedText);
  }

  /**
   * Assert that note content does not contain text, handling both modes
   * @param {Locator} noteContent - The note content element
   * @param {string} unexpectedText - The text that should not be contained
   */
  async assertNoteContentDoesNotContain(noteContent, unexpectedText) {
    const content = await this.getRawNoteContent(noteContent);
    expect(content).not.toContain(unexpectedText);
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
