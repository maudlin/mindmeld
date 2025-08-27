/**
 * EventDelegationManager - Centralized event delegation for note interactions
 *
 * Purpose: Replace CSS pointer-events hack with proper JavaScript event delegation
 * to handle clicks on styled content elements within notes.
 *
 * This solves the MM-173 bug where `pointer-events: none` on child elements
 * prevents proper interaction with styled content in both touch and desktop modes.
 *
 * @module EventDelegationManager
 */

import { eventBus } from './eventBus.js';

class EventDelegationManager {
  constructor() {
    this.delegatedHandlers = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize event delegation on the canvas
   * Sets up centralized event listeners that handle all note interactions
   */
  initialize() {
    if (this.isInitialized) {
      console.warn('EventDelegationManager already initialized');
      return;
    }

    const canvas = document.getElementById('canvas');
    if (!canvas) {
      console.error('EventDelegationManager: Canvas element not found');
      return;
    }

    // Set up delegated click handling for all note content
    this.setupClickDelegation(canvas);

    // Set up delegated double-click handling
    this.setupDoubleClickDelegation(canvas);

    // Set up touch event delegation for mobile
    this.setupTouchDelegation(canvas);

    this.isInitialized = true;
    console.log('EventDelegationManager initialized');
  }

  /**
   * Set up delegated click handling
   * Captures clicks on any element within note-content and handles appropriately
   */
  setupClickDelegation(canvas) {
    // Use capture phase to intercept events before they're blocked
    canvas.addEventListener(
      'click',
      (event) => {
        // CRITICAL FIX: event.target is wrong in capture phase, use actual clicked element
        const actualElement = document.elementFromPoint(
          event.clientX,
          event.clientY,
        );
        const target = actualElement || event.target;

        console.log('🔥 EventDelegationManager: Click detected', {
          target: target.tagName,
          targetClass: target.className,
          targetText: target.textContent?.substring(0, 20),
          targetId: target.id,
          capturePhase: true,
          eventPhase: event.eventPhase, // 1=capture, 2=at-target, 3=bubble
          currentTarget: event.currentTarget?.tagName,
          currentTargetId: event.currentTarget?.id,
          clientX: event.clientX,
          clientY: event.clientY,
        });

        // Also check what elementFromPoint returns for comparison
        const elementAtPoint = document.elementFromPoint(
          event.clientX,
          event.clientY,
        );
        console.log('🔥 EventDelegationManager: Element at click coordinates', {
          elementAtPoint: elementAtPoint?.tagName,
          elementAtPointClass: elementAtPoint?.className,
          elementAtPointId: elementAtPoint?.id,
          elementAtPointText: elementAtPoint?.textContent?.substring(0, 20),
        });

        // Check if click is within a note-content element
        const noteContent = this.findNoteContent(target);

        console.log('🔥 EventDelegationManager: Found note-content?', {
          found: !!noteContent,
          noteContentClass: noteContent?.className,
          isViewMode: noteContent?.classList.contains('view-mode'),
        });

        if (!noteContent) return;

        // Check if we're in view mode
        if (!noteContent.classList.contains('view-mode')) return;

        // Emit event for EditModeController to handle
        const noteElement = noteContent.closest('.note');
        if (noteElement) {
          const noteId = noteElement.dataset.id;

          // Only prevent event propagation for styled elements, not direct note-content clicks
          const isDirectNoteContentClick = target === noteContent;
          if (!isDirectNoteContentClick) {
            // This is a click on a styled child element - prevent DesktopAdapter from processing
            event.preventDefault();
            event.stopPropagation();
          }

          // For single click, we might want to select the note
          // Let the adapter handle this through EventBus
          eventBus.emit('note.delegatedClick', {
            noteId,
            noteElement,
            noteContent,
            originalTarget: target,
            event,
          });
        }
      },
      true,
    ); // Use capture phase
  }

  /**
   * Set up delegated double-click handling
   * Handles double-clicks on styled content to trigger edit mode
   */
  setupDoubleClickDelegation(canvas) {
    canvas.addEventListener(
      'dblclick',
      (event) => {
        // CRITICAL FIX: event.target is wrong in capture phase, use actual clicked element
        const actualElement = document.elementFromPoint(
          event.clientX,
          event.clientY,
        );
        const target = actualElement || event.target;

        console.log('🔥 EventDelegationManager: Double-click detected', {
          target: target.tagName,
          targetClass: target.className,
          targetText: target.textContent?.substring(0, 20),
        });

        // Check if double-click is within a note-content element
        const noteContent = this.findNoteContent(target);

        console.log('🔥 EventDelegationManager: Found note-content?', {
          found: !!noteContent,
          noteContentClass: noteContent?.className,
          isViewMode: noteContent?.classList.contains('view-mode'),
        });

        if (!noteContent) return;

        // Check if we're in view mode
        if (!noteContent.classList.contains('view-mode')) return;

        // Prevent default to avoid text selection
        event.preventDefault();
        event.stopPropagation();

        const noteElement = noteContent.closest('.note');
        if (noteElement) {
          const noteId = noteElement.dataset.id;

          // Emit event to trigger edit mode
          eventBus.emit('note.requestEdit', {
            noteId,
            noteElement,
            trigger: 'delegated-dblclick',
            originalTarget: target,
          });

          console.log(
            'EventDelegationManager: Delegated double-click to enter edit mode',
            {
              noteId,
              originalTarget: target.tagName,
            },
          );
        }
      },
      true,
    ); // Use capture phase
  }

  /**
   * Set up touch event delegation for mobile devices
   * Handles touch events on styled content
   */
  setupTouchDelegation(canvas) {
    let touchStartTime = 0;
    let touchStartTarget = null;
    let lastTapTime = 0;
    let lastTapTarget = null;

    // Handle touchstart
    canvas.addEventListener(
      'touchstart',
      (event) => {
        if (event.touches.length !== 1) return;

        touchStartTime = Date.now();
        touchStartTarget = event.touches[0].target;
      },
      true,
    );

    // Handle touchend for tap detection
    canvas.addEventListener(
      'touchend',
      (event) => {
        if (!touchStartTarget) return;

        const touchDuration = Date.now() - touchStartTime;
        const target = event.changedTouches[0].target;

        // Check if this is a tap (not a long press or drag)
        if (touchDuration < 500 && target === touchStartTarget) {
          const noteContent = this.findNoteContent(target);
          if (!noteContent || !noteContent.classList.contains('view-mode')) {
            return;
          }

          const currentTime = Date.now();
          const timeSinceLastTap = currentTime - lastTapTime;

          // Check for double-tap
          if (timeSinceLastTap < 300 && lastTapTarget === target) {
            // Double-tap detected
            event.preventDefault();

            const noteElement = noteContent.closest('.note');
            if (noteElement) {
              const noteId = noteElement.dataset.id;

              eventBus.emit('note.requestEdit', {
                noteId,
                noteElement,
                trigger: 'delegated-double-tap',
                originalTarget: target,
              });

              console.log(
                'EventDelegationManager: Delegated double-tap to enter edit mode',
                {
                  noteId,
                  hasNoteElement: !!noteElement,
                  targetTag: target.tagName,
                },
              );
            }

            // Reset double-tap detection
            lastTapTime = 0;
            lastTapTarget = null;
          } else {
            // Single tap - might be selection
            const noteElement = noteContent.closest('.note');
            if (noteElement) {
              const noteId = noteElement.dataset.id;

              eventBus.emit('note.delegatedTap', {
                noteId,
                noteElement,
                noteContent,
                originalTarget: target,
                event,
              });
            }

            // Update for next potential double-tap
            lastTapTime = currentTime;
            lastTapTarget = target;
          }
        }

        // Reset
        touchStartTarget = null;
        touchStartTime = 0;
      },
      true,
    );
  }

  /**
   * Find the note-content element from a target element
   * Walks up the DOM tree to find the containing note-content
   *
   * @param {Element} target - The event target
   * @returns {Element|null} The note-content element or null
   */
  findNoteContent(target) {
    console.log('🔥 EventDelegationManager: findNoteContent debug', {
      target: target?.tagName,
      targetClass: target?.className,
      parentClass: target?.parentElement?.className,
      grandParentClass: target?.parentElement?.parentElement?.className,
    });

    // Check if target itself is note-content
    if (target.classList && target.classList.contains('note-content')) {
      console.log('🔥 EventDelegationManager: Target itself is note-content');
      return target;
    }

    // Walk up the DOM tree to find note-content
    const noteContent = target.closest ? target.closest('.note-content') : null;

    console.log('🔥 EventDelegationManager: Closest search result', {
      found: !!noteContent,
      foundClass: noteContent?.className,
    });

    // If closest didn't work, try manual traversal
    if (!noteContent) {
      let current = target.parentElement;
      while (current) {
        console.log('🔥 EventDelegationManager: Manual traversal', {
          element: current.tagName,
          className: current.className,
        });

        if (current.classList && current.classList.contains('note-content')) {
          console.log(
            '🔥 EventDelegationManager: Found note-content via manual traversal',
          );
          return current;
        }
        current = current.parentElement;
      }
    }

    return noteContent;
  }

  /**
   * Register a custom delegated handler
   * Allows other modules to add specific delegated event handling
   *
   * @param {string} eventType - The event type to delegate
   * @param {string} selector - CSS selector for delegation
   * @param {Function} handler - Handler function
   */
  registerHandler(eventType, selector, handler) {
    const key = `${eventType}-${selector}`;

    if (!this.delegatedHandlers.has(key)) {
      this.delegatedHandlers.set(key, []);
    }

    this.delegatedHandlers.get(key).push(handler);
  }

  /**
   * Clean up event delegation
   * Called when the app is being destroyed or reset
   */
  destroy() {
    // In a full implementation, we'd remove event listeners here
    this.delegatedHandlers.clear();
    this.isInitialized = false;
  }
}

// Export singleton instance
export const eventDelegationManager = new EventDelegationManager();
