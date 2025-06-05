# Execution Plan
University Courses Website Project  
Digital Literacy • Accounting • Data Analysis • Intro to Programming • Global Logistics

## Project Organization

This execution plan follows the detailed PRD and is structured as follows:
- Phase 1: Initial Setup & Design
- Phase 2: Landing Page Development 
- Phase 3: Course Microsite Template Development
- Phase 4: Content Population, Finalization & Launch

---

## Phase 1: Initial Setup & Design (T-Day to T + 7 Days)

### Task 1.1: Initialize Project Repository on GitHub
- Create a new public GitHub repository
- Setup initial folder structure:
  - `docs/` - For PRD.md, design assets
  - `src/` - For source code
  - `public/` - For static assets like PNGs
- Add `.gitignore` for Node.js, OS-specific files
- Create initial README.md

### Task 1.2: Wireframing (Low-Fidelity) (Complete by T-Day + 3 Days)
- Create layouts for:
  - Landing page (cube interaction + fallback view)
  - Course microsite template (all sections)
- Tools: Balsamiq, Excalidraw, or hand sketches
- Store wireframes in `docs/wireframes/`

### Task 1.3: High-Fidelity Mockups & Palette Finalization (Complete by T + 7 Days)
- Create detailed designs in Figma:
  - Landing page mockup (desktop & mobile)
  - Course microsite template (desktop & mobile)
  - Design cube face PNGs for all 5 courses + university logo
- Document style guide covering:
  - Color palettes
  - Typography
  - Component spacing
  - Drop shadows and other effects

---

## Phase 2: Landing Page Development (Complete by T + 14 Days)

### Task 2.1: Setup Frontend Development Environment
- Initialize project with Vite + React
- Install dependencies:
  - Three.js
  - React Router
  - SCSS
- Configure ESLint and Prettier

### Task 2.2: Implement 3D Interactive Cube
- Create Three.js scene setup
- Implement texture loading for course PNGs
- Add mouse/touch drag rotation
- Set up auto-rotation with pause on hover/focus

### Task 2.3: Implement Navigation & Routing
- Make cube faces clickable
- Set up routing to course microsite placeholders
- Create navigation component shared across all pages

### Task 2.4: Implement Accessibility Features for Cube
- Add keyboard controls (arrow keys + Enter)
- Implement ARIA labels and alt text
- Ensure focus states are visible

### Task 2.5: Implement WebGL Fallback
- Create static card layout for fallback
- Add WebGL detection logic
- Test on browsers with WebGL disabled

### Task 2.6: Basic Styling & Responsiveness for Landing Page
- Implement responsive layout
- Apply cube-to-card-list transition for small screens
- Test across various viewport sizes

---

## Phase 3: Course Microsite Template Development (Complete by T + 21 Days)

### Task 3.1: Develop Microsite Template Structure
- Build reusable components:
  - Header with course-specific hero
  - Navigation bar
  - Content area sections
  - Footer

### Task 3.2: Implement Dynamic Content & Theming
- Create JSON/Markdown structure for course data
- Set up SCSS variables for course-specific theming
- Implement theme provider or CSS variable system

### Task 3.3: Build Microsite Sections
- Develop "Resources" section with link list
- Create "README" link component
- Build "Assignments" cards layout
- Add placeholders for "Grade Checker" button
- Create "Overall Grade Overview" panel/iframe

### Task 3.4: Ensure Microsite Responsiveness
- Test template on various screen sizes
- Implement breakpoints for mobile, tablet, desktop
- Ensure consistent navigation experience on all devices

---

## Phase 4: Content Population, Finalization & Launch (Complete by T + 28 Days)

### Task 4.1: Populate All Course Content
- Create or gather content for all 5 courses:
  - Resources links
  - Assignment descriptions
  - README content
  - Grade checker placeholder

### Task 4.2: Accessibility & Performance Audit (Complete by T + 24 Days)
- Test with accessibility tools (Axe, WAVE)
- Check color contrasts
- Optimize images with TinyPNG
- Measure LCP & TTI performance metrics
- Fix any issues identified

### Task 4.3: SEO Basics
- Add appropriate metadata
- Implement social media preview cards
- Create sitemap.xml

### Task 4.4: Cross-Browser Testing
- Test on Chrome, Firefox, Safari, Edge
- Test mobile vs desktop views
- Document and fix any compatibility issues

### Task 4.5: Final Review & Client Approval
- Conduct final walkthrough with client
- Document any change requests
- Make final adjustments

### Task 4.6: Deployment to GitHub Pages
- Configure GitHub Pages settings
- Set up custom domain if required
- Verify deployed site is working properly

### Task 4.7: Documentation Update
- Finalize README.md with:
  - Project overview
  - Local development instructions
  - Content update process
  - Future implementation notes for Google Apps Script integration

---

## Project File Structure

```
university-courses/
├── README.md                # Project documentation
├── PRD.md                   # Product Requirements Document
├── exe_plan.md              # This execution plan
├── .gitignore               # Git ignore file
├── package.json             # Dependencies and scripts
├── vite.config.js           # Vite configuration
├── index.html               # Entry point HTML
├── docs/                    # Documentation
│   ├── wireframes/          # Low-fi wireframes
│   └── designs/             # High-fi designs & assets
├── src/                     # Source code
│   ├── main.jsx             # App entry point
│   ├── App.jsx              # Main app component
│   ├── components/          # Reusable components
│   │   ├── Cube.jsx         # 3D Cube component
│   │   ├── Navigation.jsx   # Navigation component
│   │   └── ...
│   ├── pages/              
│   │   ├── Landing.jsx      # Landing page with cube
│   │   └── Course.jsx       # Course template component
│   ├── styles/              # SCSS styles
│   │   ├── main.scss        # Main stylesheet
│   │   ├── _variables.scss  # Color variables
│   │   └── ...
│   ├── data/                # Course content data
│   │   ├── digital-literacy.json
│   │   ├── accounting.json
│   │   └── ...
│   └── utils/               # Utility functions
├── public/                  # Static assets
│   ├── images/              # Course images
│   │   ├── cube-faces/      # Cube textures
│   │   └── course-banners/  # Course hero images
│   └── favicon.ico          # Favicon
└── dist/                    # Build output (generated)
```

---

## Task Assignment & Dependencies

| Task ID | Dependencies | Assignee | Est. Hours |
|---------|-------------|----------|------------|
| 1.1     | None        | Dev Lead | 2          |
| 1.2     | 1.1         | Designer | 8          |
| 1.3     | 1.2         | Designer | 16         |
| 2.1     | 1.1         | Dev      | 4          |
| 2.2     | 2.1         | Dev      | 12         |
| ...     | ...         | ...      | ...        |

---

## Tools & Resources

- **Design**: Figma, Adobe Photoshop/Illustrator
- **Development**: VS Code, Chrome DevTools
- **Version Control**: Git, GitHub
- **Testing**: Lighthouse, Axe, BrowserStack
- **Assets**: Google Fonts, Unsplash (for placeholder images)

---

## Milestones & Check-ins

- **Milestone 1**: Design approval (T + 7d)
- **Milestone 2**: Interactive landing page demo (T + 14d)
- **Milestone 3**: Course template with placeholder content (T + 21d)
- **Milestone 4**: Full site review and launch (T + 28d)

Weekly status check-ins scheduled for [day] at [time].

---

*Note: This execution plan is a living document and may be revised as the project progresses.*
