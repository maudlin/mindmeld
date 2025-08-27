/**
 * E2E Test: Touch interactions with styled content
 * 
 * Tests that touch interactions work properly with styled markdown content,
 * including clicking on styled elements to enter edit mode and note creation.
 */

import { test, expect } from '@playwright/test';
import { CanvasPage } from './helpers/CanvasPage.js';

test.describe('Touch Interactions - Styled Content', () => {
  test('Touch mode should allow tapping on styled content to enter edit mode', async ({
    page,
  }) => {
    const canvasPage = new CanvasPage(page);
    
    // Load in touch mode (same as existing touch tests)
    await canvasPage.load('touch');
    await page.waitForTimeout(1000);
    
    // Create a note (starts in edit mode with textarea)
    const note = await canvasPage.createNote(300, 200);
    const noteContent = note.locator('.note-content');
    
    // Wait for edit mode and find the textarea
    await expect(noteContent).toHaveClass(/edit-mode/);
    const textarea = noteContent.locator('textarea.edit-textarea');
    
    // Add styled markdown content to the textarea
    await textarea.fill('# Heading\n**Bold text** and *italic text*');
    
    // Exit edit mode
    await page.locator('#canvas').click({ position: { x: 100, y: 100 } });
    await page.waitForTimeout(500);
    
    // Verify we're in view mode
    await expect(noteContent).toHaveClass(/view-mode/);
    
    // Try to tap on the bold text element to enter edit mode
    const boldText = noteContent.locator('strong').first();
    await expect(boldText).toBeVisible();
    
    // Double-tap on styled content should enter edit mode
    await boldText.tap();
    await page.waitForTimeout(50);
    await boldText.tap(); // Double-tap for edit mode in touch
    
    await page.waitForTimeout(500);
    
    // Should successfully enter edit mode
    await expect(noteContent).toHaveClass(/edit-mode/);
    await expect(noteContent).not.toHaveClass(/view-mode/);
  });

  test('Touch mode should allow double-tap on canvas to create notes', async ({
    page,
  }) => {
    const canvasPage = new CanvasPage(page);
    
    // Load in touch mode
    await canvasPage.load('touch');
    await page.waitForTimeout(1000);
    
    // Create a note first (this works)
    const firstNote = await canvasPage.createNote(200, 200);
    await expect(firstNote).toBeVisible();
    
    // The note should be in edit mode with a textarea
    const noteContent = firstNote.locator('.note-content');
    await expect(noteContent).toHaveClass(/edit-mode/);
    const textarea = noteContent.locator('textarea.edit-textarea');
    await textarea.fill('# Test Note');
    await page.locator('#canvas').click({ position: { x: 100, y: 100 } });
    await page.waitForTimeout(500);
    
    // Create a second note by double-tapping on canvas
    await page.touchscreen.tap(400, 300);
    await page.waitForTimeout(50);
    await page.touchscreen.tap(400, 300);
    
    await page.waitForTimeout(800); // Respect throttle
    
    // Check if second note was created
    const notes = page.locator('.note');
    await expect(notes).toHaveCount(2);
  });

  test('Desktop mode - clicking styled content enters edit mode', async ({
    page,
  }) => {
    const canvasPage = new CanvasPage(page);
    
    // Load in desktop mode (default)
    await canvasPage.load();
    await page.waitForTimeout(1000);
    
    // Create a note (starts in edit mode with textarea)
    const note = await canvasPage.createNote(300, 200);
    const noteContent = note.locator('.note-content');
    
    // Wait for edit mode and find the textarea
    await expect(noteContent).toHaveClass(/edit-mode/);
    const textarea = noteContent.locator('textarea.edit-textarea');
    
    // Add styled markdown content to the textarea
    await textarea.fill('# Heading\n**Bold text** and *italic text*');
    
    // Exit edit mode
    await page.locator('#canvas').click({ position: { x: 100, y: 100 } });
    await page.waitForTimeout(500);
    
    // Verify we're in view mode
    await expect(noteContent).toHaveClass(/view-mode/);
    
    // Click on the bold text element to enter edit mode
    const boldText = noteContent.locator('strong').first();
    await expect(boldText).toBeVisible();
    
    // Click should enter edit mode
    await boldText.click();
    await page.waitForTimeout(500);
    
    // Should successfully enter edit mode
    await expect(noteContent).toHaveClass(/edit-mode/);
  });

});