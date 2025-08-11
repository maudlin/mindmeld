// tests/helpers/journeyHelpers.js
/**
 * E2E user journey building blocks for comprehensive workflow testing
 * Focus on complete user stories rather than individual interactions
 */

export class MindMapJourney {
  constructor(page, canvasPage) {
    this.page = page;
    this.canvasPage = canvasPage;
    this.journey = [];
    this.state = {
      notes: [],
      connections: [],
      currentTemplate: 'Standard Canvas',
    };
  }

  /**
   * Start a creative mind mapping session
   * @param {string} topic - The main topic for the session
   */
  async startCreativeSession(topic = 'Project Planning') {
    await this.canvasPage.load();
    this.journey.push({ action: 'load', topic });

    // Create central idea
    const centralNote = await this.canvasPage.createNoteWithThrottleWait(
      400,
      300,
    );
    await this.canvasPage.editNoteContent(topic, centralNote);

    this.state.notes.push({
      id: centralNote.id || 'central',
      content: topic,
      position: [400, 300],
      role: 'central',
    });

    this.journey.push({ action: 'create_central_note', content: topic });
    return this;
  }

  /**
   * Add related concepts branching from main ideas
   * @param {Array} concepts - Array of concept objects with content and position
   */
  async addConcepts(concepts) {
    for (const concept of concepts) {
      const note = await this.canvasPage.createNoteWithThrottleWait(
        concept.x || concept.position[0],
        concept.y || concept.position[1],
      );

      if (concept.content) {
        await this.canvasPage.editNoteContent(concept.content, note);
      }

      if (concept.color) {
        await this.canvasPage.setNoteColor(note, concept.color);
      }

      this.state.notes.push({
        id: note.id || `note-${this.state.notes.length}`,
        content: concept.content,
        position: [
          concept.x || concept.position[0],
          concept.y || concept.position[1],
        ],
        color: concept.color,
        role: concept.role || 'concept',
      });

      this.journey.push({
        action: 'add_concept',
        content: concept.content,
        color: concept.color,
      });
    }
    return this;
  }

  /**
   * Connect related concepts with directional arrows
   * @param {Array} connections - Array of connection definitions
   */
  async createConnectionsFlow(connections) {
    for (const conn of connections) {
      const sourceNote =
        this.findNoteByContent(conn.from) || this.findNoteByRole(conn.from);
      const targetNote =
        this.findNoteByContent(conn.to) || this.findNoteByRole(conn.to);

      if (sourceNote && targetNote) {
        await this.canvasPage.connectNotes(
          this.page.locator(`#${sourceNote.id}`),
          this.page.locator(`#${targetNote.id}`),
        );

        this.state.connections.push({
          from: sourceNote.id,
          to: targetNote.id,
          type: conn.type || 'arrow',
        });

        this.journey.push({
          action: 'create_connection',
          from: conn.from,
          to: conn.to,
          type: conn.type,
        });
      }
    }
    return this;
  }

  /**
   * Organize ideas using color coding
   * @param {Object} colorScheme - Mapping of colors to meanings
   */
  async applyColorCoding(colorScheme) {
    for (const [color, criteria] of Object.entries(colorScheme)) {
      const matchingNotes = this.state.notes.filter((note) =>
        criteria.content
          ? criteria.content.some((c) => note.content.includes(c))
          : criteria.role === note.role,
      );

      for (const note of matchingNotes) {
        const noteElement = this.page.locator(`#${note.id}`);
        await this.canvasPage.setNoteColor(noteElement, color);
        note.color = color;
      }

      this.journey.push({
        action: 'apply_color_coding',
        color,
        criteria,
        noteCount: matchingNotes.length,
      });
    }
    return this;
  }

  /**
   * Switch to a specific canvas template
   * @param {string} templateName - Template to switch to
   */
  async switchTemplate(templateName) {
    await this.canvasPage.switchToTemplate(templateName);
    this.state.currentTemplate = templateName;

    this.journey.push({
      action: 'switch_template',
      template: templateName,
    });
    return this;
  }

  /**
   * Export the mind map and verify data integrity
   */
  async exportAndVerify() {
    // Trigger export
    await this.canvasPage.exportMindMap();

    // Verify all elements are preserved
    await this.verifyMindMapIntegrity();

    this.journey.push({
      action: 'export_and_verify',
      noteCount: this.state.notes.length,
      connectionCount: this.state.connections.length,
      template: this.state.currentTemplate,
    });
    return this;
  }

  /**
   * Verify the current state matches expected mind map structure
   */
  async verifyMindMapIntegrity() {
    // Verify note count
    const actualNoteCount = await this.page.locator('.note').count();
    if (actualNoteCount !== this.state.notes.length) {
      throw new Error(
        `Expected ${this.state.notes.length} notes, found ${actualNoteCount}`,
      );
    }

    // Verify connection count
    const actualConnectionCount = await this.page
      .locator('path[data-start], line[data-start]')
      .count();
    if (actualConnectionCount !== this.state.connections.length) {
      throw new Error(
        `Expected ${this.state.connections.length} connections, found ${actualConnectionCount}`,
      );
    }

    // Verify specific note content
    for (const expectedNote of this.state.notes) {
      const noteElement = this.page.locator(`#${expectedNote.id}`);
      const hasExpectedText = await noteElement.textContent();
      if (!hasExpectedText.includes(expectedNote.content)) {
        throw new Error(
          `Note ${expectedNote.id} does not contain expected text: ${expectedNote.content}`,
        );
      }

      if (expectedNote.color) {
        const hasColorClass = await noteElement.evaluate(
          (el, color) => el.classList.contains(`color-${color}`),
          expectedNote.color,
        );
        if (!hasColorClass) {
          throw new Error(
            `Note ${expectedNote.id} does not have expected color class: color-${expectedNote.color}`,
          );
        }
      }
    }

    return true;
  }

  /**
   * Get journey summary for reporting
   */
  getJourneySummary() {
    return {
      totalActions: this.journey.length,
      actions: this.journey,
      finalState: this.state,
      template: this.state.currentTemplate,
    };
  }

  // Helper methods
  findNoteByContent(content) {
    return this.state.notes.find((note) =>
      note.content.toLowerCase().includes(content.toLowerCase()),
    );
  }

  findNoteByRole(role) {
    return this.state.notes.find((note) => note.role === role);
  }
}

/**
 * Pre-defined journey templates for common user workflows
 */
export const JourneyTemplates = {
  /**
   * Creative brainstorming session workflow
   */
  creativeBrainstorming: async (page, canvasPage) => {
    const journey = new MindMapJourney(page, canvasPage);

    return journey
      .startCreativeSession('Product Ideas')
      .addConcepts([
        {
          content: 'Mobile App',
          position: [300, 200],
          color: 'green',
          role: 'feature',
        },
        {
          content: 'Web Platform',
          position: [500, 200],
          color: 'green',
          role: 'feature',
        },
        {
          content: 'User Research',
          position: [200, 400],
          color: 'blue',
          role: 'research',
        },
        {
          content: 'Market Analysis',
          position: [600, 400],
          color: 'blue',
          role: 'research',
        },
      ])
      .createConnectionsFlow([
        { from: 'central', to: 'Mobile App' },
        { from: 'central', to: 'Web Platform' },
        { from: 'User Research', to: 'Mobile App' },
        { from: 'Market Analysis', to: 'Web Platform' },
      ])
      .applyColorCoding({
        green: { role: 'feature' },
        blue: { role: 'research' },
        pink: { content: ['urgent', 'priority'] },
      });
  },

  /**
   * Project planning with Hero's Journey template
   */
  projectPlanning: async (page, canvasPage) => {
    const journey = new MindMapJourney(page, canvasPage);

    return journey
      .startCreativeSession('Project Launch')
      .switchTemplate("Hero's Journey")
      .addConcepts([
        { content: 'Discovery Phase', position: [200, 300], color: 'yellow' },
        { content: 'Development', position: [400, 200], color: 'green' },
        { content: 'Testing', position: [600, 300], color: 'blue' },
        { content: 'Launch', position: [400, 500], color: 'pink' },
      ])
      .createConnectionsFlow([
        { from: 'Discovery Phase', to: 'Development', type: 'arrow' },
        { from: 'Development', to: 'Testing', type: 'arrow' },
        { from: 'Testing', to: 'Launch', type: 'arrow' },
      ]);
  },

  /**
   * Collaborative template switching workflow
   */
  templateSwitching: async (page, canvasPage) => {
    const journey = new MindMapJourney(page, canvasPage);

    return journey
      .startCreativeSession('Multi-Template Test')
      .addConcepts([
        { content: 'Concept A', position: [300, 250] },
        { content: 'Concept B', position: [500, 350] },
      ])
      .switchTemplate("Hero's Journey")
      .verifyMindMapIntegrity() // Ensure notes preserved
      .switchTemplate('Now, Next, Future')
      .verifyMindMapIntegrity() // Ensure notes still preserved
      .switchTemplate('Standard Canvas');
  },
};

/**
 * Journey builder for custom workflows
 * @param {Object} page - Playwright page object
 * @param {Object} canvasPage - CanvasPage helper instance
 * @returns {MindMapJourney} New journey instance
 */
export function createJourney(page, canvasPage) {
  return new MindMapJourney(page, canvasPage);
}
