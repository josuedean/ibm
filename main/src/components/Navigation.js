import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getAllCourses } from '../data/courses';

/**
 * Navigation component
 * Provides consistent navigation header across all pages
 * Includes responsive mobile menu
 */
const Navigation = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const courses = getAllCourses();
  
  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  // Close mobile menu after clicking a link
  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };
  
  return (
    <nav className="main-navigation">
      <div className="container">
        <div className="nav-wrapper">
          <Link to="/" className="nav-logo" onClick={closeMobileMenu}>
            University Courses
          </Link>
          
          <button 
            className={`mobile-menu-toggle ${mobileMenuOpen ? 'active' : ''}`}
            onClick={toggleMobileMenu}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </button>
          
          <div className={`nav-menu ${mobileMenuOpen ? 'open' : ''}`}>
            <Link 
              to="/" 
              className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}
              onClick={closeMobileMenu}
            >
              Home
            </Link>
            
            <div className="nav-dropdown">
              <button className="nav-dropdown-toggle">
                Courses <span className="dropdown-arrow">▼</span>
              </button>
              <div className="nav-dropdown-content">
                {courses.map(course => (
                  <Link 
                    key={course.id}
                    to={`/${course.id}`}
                    className={`nav-dropdown-item ${location.pathname === `/${course.id}` ? 'active' : ''}`}
                    onClick={closeMobileMenu}
                  >
                    {course.title}
                  </Link>
                ))}
              </div>
            </div>
            
            <Link 
              to="/about" 
              className={`nav-item ${location.pathname === '/about' ? 'active' : ''}`}
              onClick={closeMobileMenu}
            >
              About
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
