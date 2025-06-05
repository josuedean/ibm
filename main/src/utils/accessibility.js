/**
 * Accessibility utility functions
 * Helps ensure the site meets WCAG 2.1 AA standards
 */

/**
 * Focus trap for modal dialogs
 * Keeps focus within a specified element when tabbing
 * @param {HTMLElement} element - The element to trap focus within
 * @returns {Function} Cleanup function to remove event listeners
 */
export const createFocusTrap = (element) => {
  // Find all focusable elements within the container
  const getFocusableElements = () => {
    return Array.from(
      element.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
  };

  const handleKeyDown = (event) => {
    if (event.key !== 'Tab') return;

    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Shift + Tab: go to previous element or wrap to end
    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement.focus();
        event.preventDefault();
      }
    } 
    // Tab: go to next element or wrap to beginning
    else {
      if (document.activeElement === lastElement) {
        firstElement.focus();
        event.preventDefault();
      }
    }
  };

  // Add event listener
  element.addEventListener('keydown', handleKeyDown);

  // Return cleanup function
  return () => {
    element.removeEventListener('keydown', handleKeyDown);
  };
};

/**
 * Check contrast ratio between two colors
 * @param {string} foreground - Foreground color in hex format (#RRGGBB)
 * @param {string} background - Background color in hex format (#RRGGBB)
 * @returns {number} Contrast ratio (1:1 to 21:1)
 */
export const getContrastRatio = (foreground, background) => {
  // Convert hex to RGB
  const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
  };

  // Calculate relative luminance
  const getLuminance = (rgb) => {
    const [r, g, b] = rgb.map(val => {
      val = val / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const rgb1 = hexToRgb(foreground);
  const rgb2 = hexToRgb(background);
  
  const l1 = getLuminance(rgb1) + 0.05;
  const l2 = getLuminance(rgb2) + 0.05;
  
  // Return contrast ratio (higher number is better)
  return l1 > l2 ? l1 / l2 : l2 / l1;
};

/**
 * Announce a message to screen readers using ARIA live regions
 * @param {string} message - Message to announce
 * @param {string} priority - Priority level ('polite' or 'assertive')
 */
export const announceToScreenReader = (message, priority = 'polite') => {
  // Create or get existing live region
  let liveRegion = document.getElementById('a11y-announcer');
  
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'a11y-announcer';
    liveRegion.setAttribute('aria-live', priority);
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only'; // Screen reader only
    document.body.appendChild(liveRegion);
  }
  
  // Set the priority
  liveRegion.setAttribute('aria-live', priority);
  
  // Update content (after a small delay to ensure it's registered as a change)
  setTimeout(() => {
    liveRegion.textContent = message;
  }, 50);
};
