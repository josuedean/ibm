import React, { useState, useEffect } from 'react';
import Cube from '../components/Cube';
import CourseCards from '../components/CourseCards';
import { getAllCourses } from '../data/courses';

/**
 * Landing page component
 * Shows either the 3D Cube or fallback cards based on WebGL support
 */
const Landing = () => {
  const [webGLSupported, setWebGLSupported] = useState(null);
  const courses = getAllCourses();
  
  // Check for WebGL support on component mount
  useEffect(() => {
    const checkWebGLSupport = () => {
      try {
        const canvas = document.createElement('canvas');
        const hasWebGL = !!(
          window.WebGLRenderingContext && 
          (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
        );
        return hasWebGL;
      } catch (e) {
        return false;
      }
    };
    
    // Set WebGL support status
    setWebGLSupported(checkWebGLSupport());
  }, []);
  
  // Show loading state while checking WebGL support
  if (webGLSupported === null) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading courses...</p>
      </div>
    );
  }
  
  return (
    <div className="landing-page">
      <header className="landing-header">
        <h1>University Courses Portal</h1>
        <p>Explore our course offerings through the interactive display below</p>
      </header>
      
      <main className="landing-main">
        {webGLSupported ? (
          <div className="cube-wrapper">
            <Cube />
            <p className="interaction-hint">
              Click on any face of the cube to explore that course. Use arrow keys to rotate.
            </p>
          </div>
        ) : (
          <div className="fallback-wrapper">
            <p className="fallback-message">
              Explore our course offerings below:
            </p>
            <CourseCards />
          </div>
        )}
      </main>
      
      <section className="courses-preview">
        <h2>Available Courses</h2>
        <div className="courses-list">
          {courses.map(course => (
            <div key={course.id} className={`course-preview ${course.color}`}>
              <h3>{course.title}</h3>
              <p>{course.description.substring(0, 100)}...</p>
            </div>
          ))}
        </div>
      </section>
      
      <footer className="landing-footer">
        <p>© 2025 University Name | All Rights Reserved</p>
      </footer>
    </div>
  );
};

export default Landing;
