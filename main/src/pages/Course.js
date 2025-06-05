import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getCourseById } from '../data/courses.js';
import Footer from '../components/Footer.js';

/**
 * Course page component
 * Displays detailed information for a specific course
 */
const Course = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  
  // Load course data and apply theme
  useEffect(() => {
    // Get course data
    const courseData = getCourseById(courseId);
    
    // If course not found, redirect to home
    if (!courseData) {
      navigate('/', { replace: true });
      return;
    }
    
    // Set course data
    setCourse(courseData);
    
    // Set document title for SEO
    document.title = `${courseData.title} | University Courses`;
    
    // Apply course-specific theme
    document.body.classList.add(`theme-${courseData.id}`);
    
    // Cleanup function to remove theme class when unmounting
    return () => {
      document.body.classList.remove(`theme-${courseData.id}`);
    };
  }, [courseId, navigate]);
  
  // If course data is still loading
  if (!course) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading course information...</p>
      </div>
    );
  }
  
  return (
    <div className={`course-page ${course.id}`}>
      <header className="course-header">
        <div className="container">
          <Link to="/" className="back-link">
            &larr; Back to All Courses
          </Link>
          <h1>{course.title}</h1>
          <p className="course-instructor">Instructor: {course.instructor}</p>
        </div>
      </header>
      
      <main id="main" className="course-content container">
        <div className="row">
          <div className="col-lg-8">
            <section className="course-section">
              <h2>Course Overview</h2>
              <p className="course-description">{course.description}</p>
              
              <div className="course-details">
                {course.overview.map((item, index) => (
                  <div key={index} className="overview-item">
                    <h3>{item.title}</h3>
                    <p>{item.content}</p>
                  </div>
                ))}
              </div>
            </section>
            
            <section className="course-section">
              <h2>Resources</h2>
              <div className="resources-list">
                {course.resources.map((resource, index) => (
                  <a 
                    key={index}
                    href={resource.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="resource-card"
                  >
                    <h3 className="resource-title">{resource.title}</h3>
                    <p className="resource-type">{resource.type}</p>
                  </a>
                ))}
              </div>
            </section>
          </div>
          
          <div className="col-lg-4">
            <div className="course-sidebar">
              <div className="course-progress">
                <h2>Progress Tracker</h2>
                <div className="progress-bar">
                  <div className="progress" style={{ width: '35%' }}></div>
                  <span className="progress-text">35% Complete</span>
                </div>
              </div>
              
              <div className="assignments-section">
                <h3>Assignments</h3>
                <ul className="assignments-list">
                  {course.assignments.map((assignment, index) => (
                    <li key={index} className="assignment-item">
                      <h4>{assignment.title}</h4>
                      <p className="due-date">Due: {assignment.dueDate}</p>
                      <div className="assignment-status">
                        {assignment.completed ? (
                          <span className="completed">Completed</span>
                        ) : (
                          <span className="pending">Pending</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="grades-section">
                <h3>Your Grades</h3>
                <p className="placeholder-text">
                  Grade information will be available once Google Apps Script integration is complete.
                </p>
                <button className="btn">Check Grades</button>
                
                <div className="grade-overview">
                  <h4>Overall Grade</h4>
                  <div className="grade-placeholder">
                    <span>--</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Course;
