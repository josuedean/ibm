import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.js';
import './styles/main.scss';

// Get the base URL from the environment or use the repository name for GitHub Pages
const basename = import.meta.env.BASE_URL;

// Use HashRouter for GitHub Pages because it doesn't require server-side configuration
// This ensures routes work correctly when deployed to GitHub Pages
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
