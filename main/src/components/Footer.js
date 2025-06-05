import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Footer component
 * Provides consistent footer content with university info, links, contact details
 */
const Footer = () => {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-column">
            <h3>University Name</h3>
            <p>Providing quality education and innovative learning experiences for students worldwide.</p>
            <p>Est. 1985</p>
          </div>

          <div className="footer-column">
            <h3>Quick Links</h3>
            <ul className="footer-links">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/about">About</Link></li>
              <li><a href="#">Faculty</a></li>
              <li><a href="#">Campus Life</a></li>
              <li><a href="#">Events</a></li>
            </ul>
          </div>

          <div className="footer-column">
            <h3>Contact</h3>
            <address>
              <p>123 University Ave<br />Education City, ST 12345</p>
              <p><strong>Phone:</strong> (123) 456-7890</p>
              <p><strong>Email:</strong> <a href="mailto:info@university.edu">info@university.edu</a></p>
            </address>
          </div>

          <div className="footer-column">
            <h3>Follow Us</h3>
            <div className="social-icons">
              <a href="#" aria-label="Facebook"><i className="fab fa-facebook-f"></i></a>
              <a href="#" aria-label="Twitter"><i className="fab fa-twitter"></i></a>
              <a href="#" aria-label="Instagram"><i className="fab fa-instagram"></i></a>
              <a href="#" aria-label="LinkedIn"><i className="fab fa-linkedin-in"></i></a>
              <a href="#" aria-label="YouTube"><i className="fab fa-youtube"></i></a>
            </div>
            <div className="newsletter">
              <h4>Subscribe to Newsletter</h4>
              <form>
                <input type="email" placeholder="Your email address" aria-label="Your email address" />
                <button type="submit" aria-label="Subscribe">Subscribe</button>
              </form>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <div className="copyright">
            <p>&copy; {new Date().getFullYear()} University Name. All rights reserved.</p>
          </div>
          <div className="legal">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Accessibility</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
