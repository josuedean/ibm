import React, { useEffect } from 'react';
import Footer from '../components/Footer.js';

/**
 * About page component
 * Provides information about the university courses portal
 */
const About = () => {
  // Set document title for SEO
  useEffect(() => {
    document.title = 'About | University Courses Portal';
  }, []);
  
  return (
    <div className="about-page">
      <header className="about-header">
        <div className="container">
          <h1>About University Courses</h1>
        </div>
      </header>
      
      <main id="main" className="about-content container">
        <div className="row">
          <div className="col-lg-8 offset-lg-2">
            <section className="about-section">
              <h2>Our Mission</h2>
              <p>
                The University Courses Portal aims to provide an engaging and accessible platform
                for students to explore course offerings. Our interactive approach to course
                discovery helps students make informed decisions about their academic journey.
              </p>
            </section>
            
            <section className="about-section">
              <h2>Course Offerings</h2>
              <p>
                We currently offer five specialized courses designed to equip students with 
                practical skills for today's rapidly evolving professional landscape:
              </p>
              
              <ul className="about-course-list">
                <li>
                  <h3>Digital Literacy</h3>
                  <p>
                    Develop essential skills for navigating the digital landscape, from basic 
                    computing concepts to online safety and emerging technologies.
                  </p>
                </li>
                <li>
                  <h3>Accounting</h3>
                  <p>
                    Master the principles of financial accounting, from basic bookkeeping to 
                    advanced financial statement analysis.
                  </p>
                </li>
                <li>
                  <h3>Data Analysis</h3>
                  <p>
                    Learn to transform raw data into actionable insights using statistical 
                    methods, visualization techniques, and analytical tools.
                  </p>
                </li>
                <li>
                  <h3>Intro to Programming</h3>
                  <p>
                    Begin your programming journey with fundamental concepts, problem-solving 
                    techniques, and hands-on coding experience.
                  </p>
                </li>
                <li>
                  <h3>Global Logistics</h3>
                  <p>
                    Explore the complex systems of global supply chain management, transportation 
                    networks, and international trade logistics.
                  </p>
                </li>
              </ul>
            </section>
            
            <section className="about-section">
              <h2>Interactive Learning</h2>
              <p>
                Our portal embraces modern educational technology to create an engaging learning 
                experience. The interactive 3D course selection cube represents our commitment to 
                innovative approaches to education.
              </p>
              <p>
                Each course includes comprehensive resources, clearly structured assignments, 
                and will soon feature integrated grade tracking capabilities.
              </p>
            </section>
            
            <section className="about-section">
              <h2>Accessibility</h2>
              <p>
                We are committed to ensuring all students can access our educational resources. 
                Our platform complies with WCAG 2.1 AA standards and features alternative 
                navigation options for those using assistive technologies or devices with 
                limited capabilities.
              </p>
            </section>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default About;
