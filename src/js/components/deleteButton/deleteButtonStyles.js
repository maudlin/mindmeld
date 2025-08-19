// src/js/components/deleteButton/deleteButtonStyles.js - Shared delete button component

/**
 * Shared delete button SVG markup with consistent styling
 * Used by both note delete buttons and connection delete buttons
 */
export const DELETE_BUTTON_SVG = `
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <line x1="3" y1="3" x2="17" y2="17"/>
    <line x1="17" y1="3" x2="3" y2="17"/>
  </svg>
`;

/**
 * Shared delete button CSS class names
 */
export const DELETE_BUTTON_CLASSES = {
  // Base class for all delete buttons
  BASE: 'shared-delete-button',
  // Context-specific classes
  NOTE: 'shared-delete-button--note',
  CONNECTION: 'shared-delete-button--connection',
  // State classes
  HOVER: 'shared-delete-button--hover',
  ACTIVE: 'shared-delete-button--active',
};

/**
 * Shared delete button configuration
 */
export const DELETE_BUTTON_CONFIG = {
  // Colors matching current implementation
  BACKGROUND_COLOR: 'rgba(255, 58, 48, 0.5)',
  BACKGROUND_COLOR_HOVER: 'rgba(255, 59, 48, 0.9)',
  BACKGROUND_COLOR_ACTIVE: 'rgba(255, 59, 48, 0.7)',
  ICON_COLOR: '#FFFFFF',

  // Sizes (can be overridden by context)
  SIZE_DEFAULT: '18px',
  SIZE_CONNECTION: '18px', // Same as note for consistency

  // Animation timing
  TRANSITION_DURATION: '120ms',
  ANIMATION_EASING: 'ease-out',
};
