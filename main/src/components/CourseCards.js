import React from 'react';
import { Link } from 'react-router-dom';
import { getAllCourses } from '../data/courses.js';

/**
 * CourseCards component
 * Displays a grid of course cards as fallback when WebGL is not available
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
            className={`course-card ${course.id}`}
            aria-label={`View ${course.title} course details`}
          >
            <div className="course-card-content">
              <h2 className="course-card-title">{course.title}</h2>
              <p className="course-card-description">
                {course.shortDescription || course.description.substring(0, 100)}...
              </p>
              <div className="course-card-footer">
                <span className="course-card-view">View Course</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default CourseCards;
