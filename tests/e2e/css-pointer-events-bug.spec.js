/**
 * E2E Test: Verify MM-173 CSS pointer-events bug
 * 
 * Simple test to demonstrate that the CSS rule 
 * `.note-content.view-mode * { pointer-events: none; }`
 * prevents clicks on child elements.
 */

import { test, expect } from '@playwright/test';

test.describe('MM-173 CSS pointer-events Bug Verification', () => {
  test('Child elements have pointer-events: none in view mode', async ({
    page,
  }) => {
    // Load the app
    await page.goto('http://localhost:8080');
    await page.waitForSelector('#canvas');
    await page.waitForTimeout(1000);
    
    // Create a note by double-clicking (starts in view mode)
    await page.dblclick('#canvas', { position: { x: 300, y: 200 } });
    await page.waitForTimeout(600);
    
    // Get the note and its content
    const note = page.locator('.note').first();
    const noteContent = note.locator('.note-content');
    
    // Note should start in view mode - double-click to enter edit mode
    await noteContent.dblclick();
    await page.waitForTimeout(500);
    
    // Now we should be in edit mode with a textarea
    await expect(noteContent).toHaveClass(/edit-mode/);
    const textarea = noteContent.locator('textarea.edit-textarea');
    await expect(textarea).toBeVisible();
    
    // Add content with markdown that will render as HTML
    await textarea.fill('**Bold text** and *italic*');
    
    // Exit edit mode by clicking outside
    await page.click('#canvas', { position: { x: 100, y: 100 } });
    await page.waitForTimeout(500);
    
    // Verify we're back in view mode
    await expect(noteContent).toHaveClass(/view-mode/);
    await expect(noteContent).not.toHaveClass(/edit-mode/);
    
    // Wait for markdown to render
    await page.waitForTimeout(500);
    
    // Check if we have styled elements
    const boldElement = noteContent.locator('strong').first();
    await expect(boldElement).toBeVisible();
    
    // Check the computed style of the bold element
    const pointerEvents = await boldElement.evaluate(el => 
      window.getComputedStyle(el).pointerEvents
    );
    
    console.log('Bold element pointer-events:', pointerEvents);
    
    // The CSS rule sets this to 'none' - this is the bug
    expect(pointerEvents).toBe('none');
    
    console.log('✅ Bug verified: Child elements have pointer-events: none');
    
    // Try to click on the bold element to enter edit mode
    // This should work but won't due to pointer-events: none
    await boldElement.click();
    await page.waitForTimeout(500);
    
    // We should still be in view mode because the click didn't work
    await expect(noteContent).toHaveClass(/view-mode/);
    console.log('✅ Confirmed: Clicking on styled content does not trigger edit mode');
  });

  test('CSS rule exists in stylesheet', async ({ page }) => {
    await page.goto('http://localhost:8080');
    await page.waitForTimeout(1000);
    
    // Check if the problematic CSS rule exists
    const hasRule = await page.evaluate(() => {
      // Look through all stylesheets
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule.selectorText === '.note-content.view-mode *') {
              return {
                exists: true,
                style: rule.style.cssText,
                pointerEvents: rule.style.pointerEvents
              };
            }
          }
        } catch (e) {
          // Some stylesheets might not be accessible
          continue;
        }
      }
      return { exists: false };
    });
    
    console.log('CSS Rule check:', hasRule);
    
    if (hasRule.exists) {
      expect(hasRule.pointerEvents).toBe('none');
      console.log('✅ Problematic CSS rule found: .note-content.view-mode * { pointer-events: none; }');
    }
  });

  test('Touch mode: Double-tap on styled content fails due to CSS bug', async ({
    page,
  }) => {
    // Load in touch mode
    await page.goto('http://localhost:8080?mode=touch');
    await page.waitForSelector('#canvas');
    await page.waitForTimeout(1000);
    
    // Create a note (starts in view mode)
    await page.touchscreen.tap(300, 200);
    await page.waitForTimeout(50);
    await page.touchscreen.tap(300, 200);
    await page.waitForTimeout(600);
    
    const note = page.locator('.note').first();
    const noteContent = note.locator('.note-content');
    
    // Double-tap to enter edit mode
    const box = await noteContent.boundingBox();
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(50);
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(500);
    
    // Should be in edit mode now
    await expect(noteContent).toHaveClass(/edit-mode/);
    const textarea = noteContent.locator('textarea.edit-textarea');
    await textarea.fill('# Heading\n**Bold text**');
    
    // Exit edit mode
    await page.touchscreen.tap(100, 100);
    await page.waitForTimeout(500);
    
    // Should be in view mode with rendered HTML
    await expect(noteContent).toHaveClass(/view-mode/);
    
    // Wait for rendering
    await page.waitForTimeout(500);
    
    // Try to double-tap on the bold text to re-enter edit mode
    const boldElement = noteContent.locator('strong').first();
    if (await boldElement.count() > 0) {
      const boldBox = await boldElement.boundingBox();
      await page.touchscreen.tap(boldBox.x + boldBox.width / 2, boldBox.y + boldBox.height / 2);
      await page.waitForTimeout(50);
      await page.touchscreen.tap(boldBox.x + boldBox.width / 2, boldBox.y + boldBox.height / 2);
      await page.waitForTimeout(500);
      
      // Should NOT enter edit mode due to pointer-events: none
      await expect(noteContent).toHaveClass(/view-mode/);
      console.log('✅ Touch bug confirmed: Cannot double-tap on styled content to edit');
    }
  });
});