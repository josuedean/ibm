import React from 'react';
import { Link } from 'react-router-dom';
import { getAllCourses } from '../data/courses';

/**
 * CourseCards component
 * Displays all courses as cards in a responsive grid
 * Used as a fallback when WebGL is not supported or for mobile views
 */
const CourseCards = () => {
  const courses = getAllCourses();

  return (
    <div className="course-cards-container">
      <div className="course-cards-grid">
        {courses.map((course) => (
          <Link 
            to={`/${course.id}`} 
            key={course.id} 
            className={`course-card ${course.color}`}
            aria-label={`${course.title} course. Click to view details.`}
          >
            <div className="course-card-content">
              <h2 className="course-title">{course.title}</h2>
              <p className="course-description">{course.description}</p>
              <div className="course-card-overlay">
                <span className="view-course-text">View Course</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default CourseCards;
