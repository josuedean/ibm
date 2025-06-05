import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing.js';
import Course from './pages/Course.js';
import About from './pages/About.js';
import Navigation from './components/Navigation.js';
import SkipLink from './components/SkipLink.js';
import './styles/main.scss';

/**
 * Main application component
 * Sets up routes and global layout
 */
function App() {
  return (
    <div className="app">
      <SkipLink />
      <Navigation />
      
      <div className="content">
        <Routes>
          {/* Landing page (home) route */}
          <Route path="/" element={<Landing />} />
          
          {/* Course routes with dynamic courseId parameter */}
          <Route path="/:courseId" element={<Course />} />
          
          {/* About page route */}
          <Route path="/about" element={<About />} />
          
          {/* Catch-all redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
