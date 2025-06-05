import React from 'react';

/**
 * SkipLink component
 * Provides keyboard users a way to skip navigation and go directly to the main content
 * This is an important accessibility feature for keyboard and screen reader users
 */
const SkipLink = () => {
  return (
    <a 
      href="#main" 
      className="skip-link"
      onFocus={(e) => e.currentTarget.classList.add('visible')}
      onBlur={(e) => e.currentTarget.classList.remove('visible')}
    >
      Skip to main content
    </a>
  );
};

export default SkipLink;
