# Product Requirements Document (PRD)
Landing Page & Course Microsites for University Courses  
Digital Literacy • Accounting • Data Analysis • Intro to Programming • Global Logistics

---

## 1. Purpose & Goals
1. Provide an engaging single‐entry landing page that visually advertises the five courses.
2. Offer an intuitive, consistent structure for each course microsite so students can quickly find resources, assignments, and grades.
3. Ensure strong visual identity through color theory while maintaining accessibility and performance.

---

## 2. Stakeholders
• Client / Instructor (Product Owner)
• Lead Web Designer (Cascade)
• Frontend Engineer
• Google Apps Script Developer (grades integration)
• Students (end users)

---

## 3. User Personas & Stories
**Persona A – Curious Applicant**
"As a prospective student, I want to spin the cube and click on a course face to learn more, so I can decide whether to enroll."

**Persona B – Enrolled Student**
"As a current student, I need quick access to assignments, resources, and my grade overview, so I can stay on track."

**Persona C – Low-Vision User**
"As a user with visual impairments, I need high-contrast text, alt text, and keyboard alternatives to mouse rotation, so I can navigate the site independently."

---

## 4. Functional Requirements

### 4.1 Landing Page
FR-L1  Display a WebGL cube rendered with Three.js (v0.158+).  
FR-L2  Each of the six faces shows a PNG banner (five courses + university logo/home).  
FR-L3  Faces include descriptive `alt` text and ARIA labeling.  
FR-L4  Cube reacts to mouse-drag / touch-drag rotation; auto-rotate pauses on hover/focus.  
FR-L5  Clicking / tapping a face routes (client-side or full reload) to the associated course microsite URL.  
FR-L6  Provide keyboard controls (← ↑ → ↓ to rotate, *Enter* to select highlighted face).  
FR-L7  Graceful fallback: if WebGL unsupported, display static stacked course cards.  

### 4.2 Course Microsite (Template used 5×)
FR-C1  Consistent responsive layout (12-column grid).  
 • Hero banner in course color scheme  
 • Nav bar: Resources | Assignments | Grade Checker | Overview  
FR-C2  "Resources" section: list of external/internal links (markdown driven).  
FR-C3  "README" link: points to course GitHub/Drive document (opens new tab).  
FR-C4  "Assignments" section: card list with due dates & brief descriptions.  
FR-C5  "Grade Checker" CTA button: links to Google Apps Script web app (placeholder for now).  
FR-C6  "Overall Grade Overview" panel: embeds Apps Script iframe or placeholder table.  
FR-C7  Sticky footer with instructor contact & copyright.  

### 4.3 Admin / Content Editing
FR-A1  All course data (resources, assignments) stored in structured JSON/Markdown for easy updates, managed within the project's GitHub repository.  
FR-A2  Color variables in a central SCSS/LESS file.  

---

## 5. Non-Functional Requirements

NFR-1  Accessibility: WCAG 2.1 AA – color contrast ≥ 4.5 : 1, alt text, ARIA roles.  
NFR-2  Performance: Largest Contentful Paint < 2.5 s on 4G; cube texture PNG ≤ 150 kB each.  
NFR-3  SEO: Server-side rendered meta tags; prerender critical content.  
NFR-4  Responsiveness: Mobile-first; cube collapses to card list on screens < 480 px.  
NFR-5  Browser Support: Last 2 versions of Chrome, Firefox, Safari, Edge.  

---

## 6. Visual & Brand Guidelines

### 6.1 Master Palette Logic
Base hue set derived from university brand blue (#004A99). Each course receives a triadic or analogous harmony to create cohesion while retaining individuality.

| Course                 | Primary               | Secondary             | Accent                | Rationale             |
|------------------------|-----------------------|-----------------------|-----------------------|-----------------------|
| Digital Literacy       | #1E90FF (Dodger Blue) | #E0F4FF               | #005FAD               | Modern / tech-forward |
| Accounting             | #4CAF50 (Medium Green)| #E8F6E9               | #1B5E20               | Trust, stability      |
| Data Analysis          | #9C27B0 (Amethyst)    | #F4E8F8               | #5E1770               | Insights, creativity  |
| Intro to Programming   | #FF9800 (Amber)       | #FFF3E0               | #C66900               | Energy, learning      |
| Global Logistics       | #FF5252 (Coral Red)   | #FFECEC               | #B71C1C               | Movement, urgency     |

Typography:  
• Heading: "Inter" SemiBold, fallback "Arial"  
• Body: "Inter" Regular, fallback "Helvetica"  

Component tokens (spacing, radius, shadows) documented in `design/figma`.  

---

## 7. Technical Stack

• Three.js for 3-D cube  
• Vite + React 19 (or vanilla JS if no framework preferred)  
• SCSS for theming (CSS variables output)  
• Router (React Router / plain hash) for course navigation  
• Google Apps Script for grade endpoints (future)  
• Hosting: GitHub Pages  

---

## 8. Information Architecture

/ (Landing)  
 └─ /digital-literacy  
 └─ /accounting  
 └─ /data-analysis  
 └─ /intro-programming  
 └─ /global-logistics  

---

## 9. Success Metrics

1. Bounce rate on landing page < 30 %.  
2. Time to interactive ≤ 2 s on broadband.  
3. ≥ 95 % students report "easy to find assignments/resources" in survey.  
4. 0 critical accessibility violations in aXe scan.  

---

## 10. Risks & Mitigations

| Risk                      | Impact             | Mitigation                               |
|---------------------------|--------------------|------------------------------------------|
| WebGL not supported       | Users blocked      | Provide static fallback cards            |
| Color contrast fails      | Accessibility issue| Use automated contrast checks in CI      |
| Google Apps Script quotas | Grade checker fails| Cache results, document limitations      |

---

## 11. Timeline (T-Day = project kickoff)

| Phase                                  | Deliverables                                  | Duration |
|----------------------------------------|-----------------------------------------------|----------|
| T-Day + 3d                             | Low-fi wireframes (landing & template)        | 3 days   |
| T + 7d                                 | Hi-fi Figma mockups incl. color palette approval| 4 days   |
| T + 14d                                | Prototype landing page w/ interactive cube    | 1 week   |
| T + 21d                                | Course template implemented with dummy data   | 1 week   |
| T + 24d                                | Accessibility & performance pass              | 3 days   |
| T + 28d                                | Handoff & launch                              | 4 days   |

---

## 12. Open Questions

1. Should the sixth cube face link back to the university homepage or serve another purpose?
2. Will course content be version-controlled (e.g., Git repo) or edited via CMS? (Partially answered by GitHub hosting, but refers to *editing workflow*)
3. *Preferred hosting platform (university subdomain, Netlify, etc.)? -> Answered: GitHub Pages.*
4. *Any branding guidelines from the university that supersede the proposed palette? -> Answered: No, the proposed palette is approved.*

---

### Approval
Sign-off from Product Owner and Technical Lead confirms acceptance of this PRD and authorizes the design/development work.
