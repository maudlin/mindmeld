// src/js/interactions/adapters/TouchAdapter.js

import { BaseAdapter } from './BaseAdapter.js';
import { GestureRecognizer } from '../gestures/GestureRecognizer.js';

/**
 * Touch input adapter for mobile and tablet interactions
 * Handles raw gesture detection and delegates interaction logic to behaviors
 *
 * REFACTORED: Only handles gesture recognition, all interaction logic moved to behaviors
 */
export class TouchAdapter extends BaseAdapter {
  constructor() {
    super();
    this.name = 'touch';

    // Core components
    this.gestureRecognizer = null;
    this.canvas = null;

    // Touch-specific settings
    this.HIT_TARGET_EXPANSION = 20; // pixels to expand hit targets for mobile
  }

  /**
   * Initialize touch-specific event listeners
   */
  async initializeEventListeners() {
    // Ensure eventBus is available
    if (!this.eventBus) {
      throw new Error('EventBus not initialized - call init() first');
    }

    // Get canvas element
    this.canvas = document.getElementById('canvas');
    if (!this.canvas) {
      throw new Error('Canvas element not found');
    }

    // Initialize gesture recognizer
    this.gestureRecognizer = new GestureRecognizer(this.eventBus);
    this.gestureRecognizer.initialize(this.canvas);

    // Set up raw gesture detection (no interaction logic)
    this.setupGestureDetection();

    // Set up touch-specific enhancements
    this.setupTouchEnhancements();

    console.log('TouchAdapter: Touch event listeners initialized successfully');
  }

  /**
   * Clean up touch event listeners
   */
  async destroyEventListeners() {
    // Clean up gesture recognizer
    if (this.gestureRecognizer) {
      this.gestureRecognizer.destroy();
      this.gestureRecognizer = null;
    }

    // Reset state
    this.canvas = null;

    console.log('TouchAdapter: Touch event listeners destroyed');
  }

  /**
   * Set up raw gesture detection - NO INTERACTION LOGIC
   * TODO: Will delegate to behaviors after behavior implementation
   */
  setupGestureDetection() {
    if (!this.gestureRecognizer) return;

    // Override gesture recognizer methods to detect gestures without handling them
    const originalEmitTap = this.gestureRecognizer.emitTap.bind(
      this.gestureRecognizer,
    );
    this.gestureRecognizer.emitTap = (touch) => {
      console.log('TouchAdapter: Tap detected', {
        x: touch.clientX,
        y: touch.clientY,
        target: touch.target?.tagName,
      });

      // TODO: Delegate to NoteBehavior
      // For now, just detect the gesture
      originalEmitTap(touch);
    };

    const originalEmitDoubleTap = this.gestureRecognizer.emitDoubleTap.bind(
      this.gestureRecognizer,
    );
    this.gestureRecognizer.emitDoubleTap = (touch) => {
      console.log('TouchAdapter: Double-tap detected', {
        x: touch.clientX,
        y: touch.clientY,
        target: touch.target?.tagName,
      });

      // TODO: Delegate to NoteBehavior
      // For now, just detect the gesture
      originalEmitDoubleTap(touch);
    };

    const originalEmitDragStart = this.gestureRecognizer.emitDragStart.bind(
      this.gestureRecognizer,
    );
    this.gestureRecognizer.emitDragStart = (touch) => {
      console.log('TouchAdapter: Drag start detected', {
        x: touch.clientX,
        y: touch.clientY,
        target: touch.target?.tagName,
      });

      // TODO: Delegate to DragBehavior
      // For now, just detect the gesture
      originalEmitDragStart(touch);
    };

    const originalEmitDragMove = this.gestureRecognizer.emitDragMove.bind(
      this.gestureRecognizer,
    );
    this.gestureRecognizer.emitDragMove = (touch) => {
      // TODO: Delegate to active DragBehavior
      // For now, just detect movement
      originalEmitDragMove(touch);
    };

    const originalEmitDragEnd = this.gestureRecognizer.emitDragEnd.bind(
      this.gestureRecognizer,
    );
    this.gestureRecognizer.emitDragEnd = (touch) => {
      console.log('TouchAdapter: Drag end detected');

      // TODO: Delegate to active DragBehavior
      // For now, just detect the gesture end
      originalEmitDragEnd(touch);
    };

    const originalEmitPinchStart = this.gestureRecognizer.emitPinchStart.bind(
      this.gestureRecognizer,
    );
    this.gestureRecognizer.emitPinchStart = (touches) => {
      console.log('TouchAdapter: Pinch start detected');

      // TODO: Delegate to zoom behavior (or keep as canvas-specific?)
      // For now, just detect the gesture
      originalEmitPinchStart(touches);
    };

    console.log('TouchAdapter: Raw gesture detection configured');
  }

  /**
   * Set up touch-specific UI enhancements (KEEP - this is platform-specific)
   */
  setupTouchEnhancements() {
    // Add touch-friendly feedback styles
    this.addTouchFeedbackStyles();

    // Enhance hit targets for touch
    this.enhanceHitTargets();

    // Disable text selection on touch devices
    document.body.style.webkitTouchCallout = 'none';
    document.body.style.webkitUserSelect = 'none';
    document.body.style.userSelect = 'none';
  }

  /**
   * Add CSS for touch feedback (KEEP - platform-specific)
   */
  addTouchFeedbackStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .touch-active {
        background-color: rgba(0, 0, 0, 0.1);
        transition: background-color 0.1s;
      }
      
      .note:active {
        transform: scale(0.98);
        transition: transform 0.1s;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Enhance hit targets for touch interaction (KEEP - platform-specific)
   */
  enhanceHitTargets() {
    const touchStyle = document.createElement('style');
    touchStyle.textContent = `
      @media (pointer: coarse) {
        .note {
          min-height: 44px; /* iOS minimum touch target */
          min-width: 44px;
        }
        
        .note-content {
          min-height: 44px;
        }
      }
    `;
    document.head.appendChild(touchStyle);
  }

  /**
   * Clear any active connection mode state (UTILITY - keep)
   */
  clearConnectionMode() {
    this.isConnectionMode = false;
    this.selectedConnector = null;

    // Remove any visual connection indicators
    document.querySelectorAll('.connection-mode').forEach((element) => {
      element.classList.remove('connection-mode');
    });
  }
}
