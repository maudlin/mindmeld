// src/js/interactions/gestures/TouchState.js

/**
 * Manages touch state for gesture recognition
 * Tracks individual touches and their properties for multi-touch gestures
 */
export class TouchState {
  constructor() {
    this.reset();
  }

  /**
   * Reset all touch state
   */
  reset() {
    this.touches = new Map(); // touchId -> touch data
    this.startTime = 0;
    this.lastEventTime = 0;
    this.gestureType = null;
    this.isActive = false;
  }

  /**
   * Add or update touch point
   * @param {Touch} touch - Touch object from TouchEvent
   */
  addTouch(touch) {
    const touchData = {
      id: touch.identifier,
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      lastX: touch.clientX,
      lastY: touch.clientY,
      startTime: Date.now(),
      lastMoveTime: Date.now(),
    };

    this.touches.set(touch.identifier, touchData);

    if (this.touches.size === 1) {
      this.startTime = touchData.startTime;
      this.isActive = true;
    }

    this.lastEventTime = Date.now();
  }

  /**
   * Update existing touch point
   * @param {Touch} touch - Touch object from TouchEvent
   */
  updateTouch(touch) {
    const touchData = this.touches.get(touch.identifier);
    if (!touchData) return;

    touchData.lastX = touchData.currentX;
    touchData.lastY = touchData.currentY;
    touchData.currentX = touch.clientX;
    touchData.currentY = touch.clientY;
    touchData.lastMoveTime = Date.now();

    this.lastEventTime = Date.now();
  }

  /**
   * Remove touch point
   * @param {number} touchId - Touch identifier
   */
  removeTouch(touchId) {
    this.touches.delete(touchId);
    this.lastEventTime = Date.now();

    if (this.touches.size === 0) {
      this.isActive = false;
    }
  }

  /**
   * Get current touch count
   * @returns {number} Number of active touches
   */
  getTouchCount() {
    return this.touches.size;
  }

  /**
   * Get touch by ID
   * @param {number} touchId - Touch identifier
   * @returns {Object|undefined} Touch data
   */
  getTouch(touchId) {
    return this.touches.get(touchId);
  }

  /**
   * Get primary touch (first touch)
   * @returns {Object|undefined} Primary touch data
   */
  getPrimaryTouch() {
    const touchIds = Array.from(this.touches.keys());
    return touchIds.length > 0 ? this.touches.get(touchIds[0]) : undefined;
  }

  /**
   * Get all touches as array
   * @returns {Array} Array of touch data
   */
  getAllTouches() {
    return Array.from(this.touches.values());
  }

  /**
   * Calculate total movement distance for primary touch
   * @returns {number} Distance in pixels
   */
  getTotalMovement() {
    const primary = this.getPrimaryTouch();
    if (!primary) return 0;

    const dx = primary.currentX - primary.startX;
    const dy = primary.currentY - primary.startY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get gesture duration
   * @returns {number} Duration in milliseconds
   */
  getDuration() {
    return this.lastEventTime - this.startTime;
  }

  /**
   * Calculate distance between two touches (for pinch gestures)
   * @returns {number|null} Distance in pixels, null if less than 2 touches
   */
  getTouchDistance() {
    const touches = this.getAllTouches();
    if (touches.length < 2) return null;

    const dx = touches[1].currentX - touches[0].currentX;
    const dy = touches[1].currentY - touches[0].currentY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate center point between all touches
   * @returns {Object|null} {x, y} coordinates, null if no touches
   */
  getCenterPoint() {
    const touches = this.getAllTouches();
    if (touches.length === 0) return null;

    const sumX = touches.reduce((sum, touch) => sum + touch.currentX, 0);
    const sumY = touches.reduce((sum, touch) => sum + touch.currentY, 0);

    return {
      x: sumX / touches.length,
      y: sumY / touches.length,
    };
  }

  /**
   * Check if gesture is likely a tap (minimal movement, short duration)
   * @param {number} maxMovement - Maximum movement threshold (pixels)
   * @param {number} maxDuration - Maximum duration threshold (ms)
   * @returns {boolean} True if gesture appears to be a tap
   */
  isLikelyTap(maxMovement = 10, maxDuration = 500) {
    return (
      this.getTotalMovement() <= maxMovement &&
      this.getDuration() <= maxDuration
    );
  }

  /**
   * Check if gesture is likely a long press
   * @param {number} minDuration - Minimum duration threshold (ms)
   * @param {number} maxMovement - Maximum movement threshold (pixels)
   * @returns {boolean} True if gesture appears to be a long press
   */
  isLikelyLongPress(minDuration = 500, maxMovement = 10) {
    return (
      this.getDuration() >= minDuration &&
      this.getTotalMovement() <= maxMovement
    );
  }
}
