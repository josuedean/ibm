# Attendance Tracker

Simple static site for recording student attendance via Google Apps Script.

## Files

- `index.html` – Login form for students.
- `script.js` – Sends login data to the Apps Script backend.
- `styles.css` – Basic styling.
- `apps_script.gs` – Google Apps Script to validate credentials and store attendance.

## Setup

1. Create two Google Sheets:
   - **Credentials Sheet** with columns `ID` and `Password` (header row). Fill each row with the student's ID and their plain text password.
   - **Attendance Sheet** with columns `ID`, `Timestamp`, `IP`.

2. Deploy `apps_script.gs` as a web app in the same Google account. Update the sheet IDs in the script. When deploying, set **Who has access** to *Anyone* so the static site can call it.
3. In `script.js`, replace `YOUR_GOOGLE_APPS_SCRIPT_DEPLOYMENT_URL` with your deployment URL.
4. Host these files (e.g., GitHub Pages) and direct students to `index.html`.
   The browser uses a simple GET request to send credentials, so CORS preflights are avoided and Apps Script's default headers suffice.

This system logs the student ID, time, and IP address when the credentials match.
