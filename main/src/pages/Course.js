import React, { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getCourseById } from '../data/courses';

/**
 * Course microsite component
 * Displays course-specific content with dynamic theming based on the course
 */
const Course = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const course = getCourseById(courseId);
  
  // Redirect to home if course doesn't exist
  useEffect(() => {
    if (!course) {
      navigate('/', { replace: true });
    } else {
      // Apply course-specific theme class to body for global theming
      document.body.classList.add(course.color);
      
      // Cleanup function to remove theme class when unmounting
      return () => {
        document.body.classList.remove(course.color);
      };
    }
  }, [course, navigate, courseId]);
  
  // Show loading state while checking if course exists
  if (!course) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading course content...</p>
      </div>
    );
  }
  
  return (
    <div className={`course-page ${course.color}`}>
      <header className="course-header">
        <Link to="/" className="back-link">
          &larr; Return to All Courses
        </Link>
        <h1>{course.title}</h1>
        <p className="course-description">{course.description}</p>
      </header>
      
      <main className="course-content container">
        <div className="row">
          <div className="col-12">
            <section className="course-overview section-card">
              <h2>Course Overview</h2>
              <p>{course.sections.overview}</p>
            </section>
          </div>
          
          <div className="col-md-6">
            <section className="course-resources section-card">
              <h2>Resources</h2>
              {course.sections.resources.length > 0 ? (
                <ul className="resources-list">
                  {course.sections.resources.map((resource, index) => (
                    <li key={index}>
                      <a 
                        href={resource.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="resource-link"
                      >
                        {resource.title}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No resources available for this course yet.</p>
              )}
              
              <div className="readme-link">
                <a 
                  href={`https://github.com/university/courses/blob/main/${courseId}/README.md`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn btn-outline"
                >
                  View Course README
                </a>
              </div>
            </section>
          </div>
          
          <div className="col-md-6">
            <section className="course-assignments section-card">
              <h2>Assignments</h2>
              {course.sections.assignments.length > 0 ? (
                <ul className="assignments-list">
                  {course.sections.assignments.map((assignment, index) => (
                    <li key={index} className="assignment-item">
                      <h3>{assignment.title}</h3>
                      <p className="due-date">Due: {new Date(assignment.dueDate).toLocaleDateString()}</p>
                      <p className="assignment-description">{assignment.description}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No assignments available for this course yet.</p>
              )}
            </section>
          </div>
          
          <div className="col-md-6">
            <section className="grade-checker section-card">
              <h2>Grade Checker</h2>
              <p className="placeholder-text">
                This feature will be available soon. Check back later to verify your grades for individual assignments.
              </p>
              <div className="placeholder-button">
                <button className="btn disabled" disabled>Check Grades</button>
              </div>
            </section>
          </div>
          
          <div className="col-md-6">
            <section className="grade-overview section-card">
              <h2>Overall Grade Overview</h2>
              <p className="placeholder-text">
                This feature will be available soon. Check back later to see your overall course progress.
              </p>
              <div className="placeholder-chart">
                <div className="chart-placeholder-text">Progress Chart Coming Soon</div>
              </div>
            </section>
          </div>
        </div>
      </main>
      
      <footer className="course-footer">
        <div className="container">
          <div className="row">
            <div className="col-12">
              <p>© 2025 University Name | {course.title} Course</p>
              <p>
                <Link to="/" className="footer-link">Home</Link> |
                <a href="#" className="footer-link">Privacy Policy</a> |
                <a href="#" className="footer-link">Terms of Use</a>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Course;
