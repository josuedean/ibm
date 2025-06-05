import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { getAllCourses } from '../data/courses.js';

/**
 * Navigation component
 * Provides site navigation with responsive mobile menu and dropdown for courses
 */
const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();
  const courses = getAllCourses();
  
  // Close mobile menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  return (
    <nav className="main-nav">
      <div className="container">
        <div className="nav-container">
          <Link to="/" className="nav-logo">
            University Courses
          </Link>
          
          <button 
            className={`nav-toggle ${isMenuOpen ? 'open' : ''}`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-expanded={isMenuOpen}
            aria-label="Toggle navigation menu"
          >
            <span className="toggle-bar"></span>
            <span className="toggle-bar"></span>
            <span className="toggle-bar"></span>
          </button>
          
          <div className={`nav-links-container ${isMenuOpen ? 'open' : ''}`}>
            <ul className="nav-links">
              <li>
                <NavLink to="/" end>Home</NavLink>
              </li>
              <li className="dropdown" ref={dropdownRef}>
                <button 
                  className={`dropdown-toggle ${isDropdownOpen ? 'open' : ''}`}
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  aria-expanded={isDropdownOpen}
                >
                  Courses <span className="dropdown-icon">▼</span>
                </button>
                <ul className={`dropdown-menu ${isDropdownOpen ? 'show' : ''}`}>
                  {courses.map((course) => (
                    <li key={course.id}>
                      <NavLink 
                        to={`/${course.id}`}
                        className={({ isActive }) => isActive ? 'active' : ''}
                      >
                        {course.title}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </li>
              <li>
                <NavLink to="/about">About</NavLink>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
