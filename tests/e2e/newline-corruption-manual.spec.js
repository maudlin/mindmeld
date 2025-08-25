/**
 * E2E Test: Manual Testing Scenario for Newline Corruption
 *
 * This test reproduces the exact scenario from manual testing:
 * 1. Create note
 * 2. Enter edit mode
 * 3. Type: "# heading one" + Enter + "## heading two"
 * 4. Check that newlines are preserved in real-time
 */

import { test, expect } from '@playwright/test';

test.describe('Newline Corruption - Manual Testing Scenario', () => {
  let page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('http://localhost:8080');

    // Wait for app initialization
    await page.waitForSelector('#canvas');
    await page.waitForTimeout(1000);
  });

  test('MANUAL SCENARIO: Typing "# heading one\\n## heading two" should preserve newlines in real-time @critical', async () => {
    // Step 1: Create a note by double-clicking on canvas
    const canvas = page.locator('#canvas');
    await canvas.dblclick({ position: { x: 300, y: 200 } });

    // Wait for note creation and ensure it enters edit mode
    const note = page.locator('.note').first();
    const noteContent = note.locator('.note-content');
    await expect(noteContent).toBeVisible();

    // Should start in edit mode for new notes
    await expect(noteContent).toHaveAttribute('contenteditable', 'true');

    // Step 2: Clear any existing content and type the exact manual scenario
    await noteContent.click();
    await noteContent.fill(''); // Clear

    // Type the exact sequence from manual testing
    await noteContent.type('# heading one');

    // Check content after first part
    let currentContent = noteContent;
    console.log(
      'Content after "# heading one":',
      JSON.stringify(currentContent),
    );
    await expect(currentContent).toHaveText('# heading one');

    // Press Enter to add newline
    await noteContent.press('Enter');

    // Check content immediately after Enter
    currentContent = noteContent;
    console.log('Content after Enter:', JSON.stringify(currentContent));
    await expect(currentContent).toHaveText('# heading one\n');

    // Type second heading
    await noteContent.type('## heading two');

    // CRITICAL CHECK: Content should have both lines with newline
    currentContent = noteContent;
    console.log('Final content:', JSON.stringify(currentContent));

    // This is the failing assertion from manual testing
    await expect(currentContent).toHaveText('# heading one\n## heading two');
    expect(currentContent).toContain('\n');
    expect(currentContent.split('\n')).toHaveLength(2);
  });

  test('MANUAL SCENARIO: Edit existing note with markdown should preserve newlines @critical', async () => {
    // Create note with content first
    const canvas = page.locator('#canvas');
    await canvas.dblclick({ position: { x: 300, y: 200 } });

    const note = page.locator('.note').first();
    const noteContent = note.locator('.note-content');

    // Add initial content
    await noteContent.click();
    await noteContent.fill('# Initial Header');

    // Exit edit mode by clicking outside
    await canvas.click({ position: { x: 100, y: 100 } });

    // Verify we're in view mode
    await expect(noteContent).toHaveAttribute('contenteditable', 'false');
    await expect(noteContent).toHaveClass(/view-mode/);

    // NOW: Click to edit existing note (this is where corruption typically happens)
    await noteContent.click();

    // Should be back in edit mode
    await expect(noteContent).toHaveAttribute('contenteditable', 'true');
    await expect(noteContent).toHaveClass(/edit-mode/);

    // Clear content and type multiline markdown
    await noteContent.selectAll();
    await noteContent.type('# heading one');
    await noteContent.press('Enter');
    await noteContent.type('## heading two');

    // Check real-time content
    const currentContent = noteContent;
    console.log(
      'Content in existing note edit:',
      JSON.stringify(currentContent),
    );

    await expect(currentContent).toHaveText('# heading one\n## heading two');
    expect(currentContent).toContain('\n');
    expect(currentContent.split('\n')).toHaveLength(2);
  });

  test('CLASS STATE BUG: Note should never have both view-mode and edit-mode classes @critical', async () => {
    const canvas = page.locator('#canvas');
    await canvas.dblclick({ position: { x: 300, y: 200 } });

    const note = page.locator('.note').first();
    const noteContent = note.locator('.note-content');

    // Should start in edit mode only
    await expect(noteContent).toHaveClass(/edit-mode/);
    await expect(noteContent).not.toHaveClass(/view-mode/);

    // Exit edit mode
    await canvas.click({ position: { x: 100, y: 100 } });
    await page.waitForTimeout(500);

    // Should be in view mode only
    await expect(noteContent).toHaveClass(/view-mode/);
    await expect(noteContent).not.toHaveClass(/edit-mode/);

    // Enter edit mode again
    await noteContent.click();
    await page.waitForTimeout(500);

    // Should be in edit mode only (not both)
    await expect(noteContent).toHaveClass(/edit-mode/);
    await expect(noteContent).not.toHaveClass(/view-mode/);

    // Get all classes to debug
    const allClasses = await noteContent.getAttribute('class');
    console.log('All classes:', allClasses);

    // CRITICAL: Should never have both classes
    expect(allClasses).not.toMatch(/view-mode.*edit-mode|edit-mode.*view-mode/);
  });
});
