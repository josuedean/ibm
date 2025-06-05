import React, { useState, useEffect } from 'react';
import Cube from '../components/Cube.js';
import CourseCards from '../components/CourseCards.js';
import Footer from '../components/Footer.js';
import { getAllCourses } from '../data/courses.js';
import { isWebGLAvailable, isWebGLPerformant } from '../utils/webGLDetection.js';

/**
 * Landing page component
 * Displays either 3D cube or fallback cards based on WebGL support
 */
const Landing = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasWebGL, setHasWebGL] = useState(false);
  const courses = getAllCourses();

  // Check WebGL support on component mount
  useEffect(() => {
    // Set page title for SEO
    document.title = 'University Courses | Interactive Course Selection';
    
    // Check WebGL availability and performance
    const checkWebGL = async () => {
      const webGLAvailable = await isWebGLAvailable();
      
      // If WebGL is available, check if it's performant enough
      if (webGLAvailable) {
        const webGLPerformant = await isWebGLPerformant();
        setHasWebGL(webGLPerformant);
      } else {
        setHasWebGL(false);
      }
      
      // Finish loading regardless of result
      setIsLoading(false);
    };
    
    checkWebGL();
  }, []);

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="container">
          <h1>University Courses</h1>
          <p className="lead">
            Explore our interactive course selection and find the perfect path for your education
          </p>
        </div>
      </header>

      <main id="main" className="landing-content">
        <div className="container">
          <section className="interactive-section">
            <h2 className="section-title">Select a Course</h2>
            <p className="section-description">
              {hasWebGL 
                ? 'Rotate the cube and click on a face to explore that course' 
                : 'Choose a course from the options below'}
            </p>

            {isLoading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading course selection...</p>
              </div>
            ) : (
              <div className="course-selector">
                {hasWebGL ? <Cube /> : <CourseCards />}
              </div>
            )}
          </section>

          <section className="courses-preview">
            <h2 className="section-title">Available Courses</h2>
            <div className="courses-list">
              {courses.map(course => (
                <div key={course.id} className={`course-preview ${course.id}`}>
                  <h3>{course.title}</h3>
                  <p>{course.shortDescription || course.description.substring(0, 120)}...</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Landing;
