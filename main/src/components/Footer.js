import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Footer component
 * Provides consistent footer across all pages
 */
const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="main-footer">
      <div className="container">
        <div className="row">
          <div className="col-md-4">
            <h3>University Courses</h3>
            <p>Providing quality education through interactive learning experiences.</p>
          </div>
          
          <div className="col-md-4">
            <h3>Quick Links</h3>
            <ul className="footer-links">
              <li>
                <Link to="/">Home</Link>
              </li>
              <li>
                <Link to="/digital-literacy">Digital Literacy</Link>
              </li>
              <li>
                <Link to="/accounting">Accounting</Link>
              </li>
              <li>
                <Link to="/data-analysis">Data Analysis</Link>
              </li>
              <li>
                <Link to="/intro-programming">Intro to Programming</Link>
              </li>
              <li>
                <Link to="/global-logistics">Global Logistics</Link>
              </li>
            </ul>
          </div>
          
          <div className="col-md-4">
            <h3>Contact</h3>
            <address>
              <p>University Campus</p>
              <p>123 Education Avenue</p>
              <p>Knowledge City, KN 54321</p>
              <p>Email: info@university.edu</p>
            </address>
            
            <div className="social-links">
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                <span className="social-icon">𝕏</span>
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                <span className="social-icon">f</span>
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                <span className="social-icon">in</span>
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                <span className="social-icon">▶</span>
              </a>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; {currentYear} University Name. All Rights Reserved.</p>
          <p>
            <a href="#" className="footer-legal-link">Privacy Policy</a> | 
            <a href="#" className="footer-legal-link">Terms of Use</a> | 
            <a href="#" className="footer-legal-link">Accessibility</a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
