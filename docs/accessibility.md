# Accessibility

This document outlines accessibility considerations for MindMeld with a focus on mobile/touch interactions and keyboard accessibility.

Mobile/touch considerations
- Larger touch targets (minimum ~44px) for interactive elements like ghost connectors and buttons.
- Visual feedback for touch interactions (e.g., jiggle animation, active states).
- Touch-friendly patterns for dropdowns and modals using utilities in src/js/utils/mobileInteractions.js.

Keyboard accessibility
- Ensure all interactive elements are focusable and operable via keyboard.
- Provide visible focus states for interactive elements.
- Prefer textContent over innerHTML for dynamic content to avoid XSS and improve screen reader compatibility.

Color and contrast
- Maintain sufficient contrast for text and interactive elements.
- Avoid using color alone to convey meaning (use labels, icons, or patterns where appropriate).

Announcements and ARIA
- Use appropriate ARIA roles for interactive components where needed.
- Ensure modals trap focus and announce their presence.

Testing
- Test with keyboard-only navigation.
- Test on mobile devices for touch target sizes and gestures.
- Consider automated checks with linters and browser dev tools.

Related docs
- Mobile Interaction Patterns (mobile-interaction-patterns.md)
- Developer Guide (developer-guide.md)
- Testing Guide (testing.md)

