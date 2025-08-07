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
      await this.page.waitForTimeout(1500); // Extra warmup in CI
    }
  }

  // Note creation with robust waiting
  async createNoteAt(x, y) {
    const noteCountBefore = await this.notes.count();

    // Ensure we're clicking on the canvas area, not other UI elements
    await this.canvas.click(); // Focus canvas first
    await this.page.waitForTimeout(100); // Small delay to ensure focus

    // Use a more reliable double-click approach
    await this.page.mouse.click(x, y);
    await this.page.waitForTimeout(50);
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

    // Wait for the 500ms throttle to complete plus buffer time
    // This is simpler and more reliable than checking for throttle indicators
    await this.page.waitForTimeout(800);

    return note;
  }

  // Alternative note creation method using JavaScript events (for problematic environments)
  async createNoteViaJavaScript(x, y) {
    const noteCountBefore = await this.notes.count();

    // Create note via JavaScript dispatch instead of mouse events
    await this.page.evaluate(
      ({ x, y }) => {
        const canvas = document.getElementById('canvas');
        if (canvas) {
          const event = new MouseEvent('dblclick', {
            clientX: x,
            clientY: y,
            bubbles: true,
            cancelable: true,
          });
          canvas.dispatchEvent(event);
        }
      },
      { x, y },
    );

    // Wait for note creation with fallback
    try {
      await this.page.waitForFunction(
        (count) => document.querySelectorAll('.note').length > count,
        noteCountBefore,
        { timeout: 10000 }, // Increased timeout
      );
    } catch {
      // Fallback: Try regular mouse double-click if JavaScript dispatch fails
      await this.page.mouse.dblclick(x, y);
      await this.page.waitForFunction(
        (count) => document.querySelectorAll('.note').length > count,
        noteCountBefore,
        { timeout: 5000 },
      );
    }

    const note = this.notes.nth(noteCountBefore);
    await expect(note).toBeVisible();
    return note;
  }

  // Simple note creation for basic operations (legacy compatibility)
  async createNote(x = 640, y = 388) {
    await this.page.mouse.dblclick(x, y);
    await expect(this.note).toBeVisible();
    return this.note;
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
    // Clear any existing selections first
    await this.page.mouse.click(100, 100); // Click on empty area
    await this.page.waitForLoadState('domcontentloaded');

    // Start dragging from empty canvas area using absolute coordinates
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down({ button: 'left' });

    // Drag to create selection box
    await this.page.mouse.move(endX, endY, { steps: 10 });

    // Release mouse to complete selection
    await this.page.mouse.up({ button: 'left' });

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
    // Get first selected note to drag
    const selectedNotes = await this.getSelectedNotes();
    const selectedNote = selectedNotes.first();
    await expect(selectedNote).toBeVisible();

    // Get initial position
    const initialBox = await selectedNote.boundingBox();

    // Drag the note (this will move all selected notes)
    await selectedNote.hover();
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
        // Fallback: Just wait a bit if transform detection fails
        return this.page.waitForTimeout(500);
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
