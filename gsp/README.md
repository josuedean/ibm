# Student Schedule Visualizer

A web-based application for visualizing student availability from a centralized Google Sheet, focusing on the date range of April 1, 2025 to June 30, 2025.

## Features

- View individual and group schedules
- Three visualization modes:
  - **Calendar View**: Weekly calendar with availability blocks
  - **List/Table View**: Tabular representation of availability
  - **Timeline View**: Horizontal time bars for each user and day
- Highlight overlapping available time slots across selected users
- Integration with Google Sheets via Google Apps Script

## Project Structure

- `index.html` - Main application interface
- `styles.css` - Styling for the application
- `app.js` - Main application logic
- `apps_script.gs` - Google Apps Script for fetching data from Google Sheets

## Setup Instructions

### Google Sheet Setup

1. Create a Google Sheet with the following columns:
   - `name` - Student name
   - `day` - Day of the week (Monday, Tuesday, etc.)
   - `available_start_time` - Start time in 12-hour format (e.g., "12:00 PM")
   - `available_end_time` - End time in 12-hour format (e.g., "3:00 PM")

2. Populate the sheet with student availability data

### Google Apps Script Setup

1. Open your Google Sheet
2. Go to Extensions > Apps Script
3. Create a new script file
4. Copy the contents of `apps_script.gs` into the script editor
5. Replace `YOUR_SHEET_ID_HERE` with your Google Sheet ID (found in the sheet URL)
6. Save the script
7. Deploy as a web app:
   - Click "Deploy" > "New deployment"
   - Select type "Web app"
   - Set "Execute as" to "Me"
   - Set "Who has access" to "Anyone"
   - Click "Deploy"
   - Copy the web app URL

### Frontend Setup

1. Update `app.js` with your Google Apps Script web app URL:
   - Find the function `fetchScheduleData()`
   - Replace `YOUR_GOOGLE_APPS_SCRIPT_DEPLOYMENT_URL` with your web app URL
   - Uncomment the fetch code section and remove the sample data

2. Host the application files (index.html, styles.css, app.js) on a web server or open locally in a browser

## Usage

1. Open the application in a web browser
2. Select students from the dropdown to view their schedules
3. Use the view selector to switch between different visualization modes
4. Overlapping availability among selected students will be highlighted automatically

## Technology Stack

- HTML/CSS/JavaScript
- FullCalendar for calendar visualization
- Day.js for date/time handling
- Google Apps Script for backend integration

## Date Range

This application is specifically configured for the date range of April 1, 2025 to June 30, 2025. Availability is assumed to repeat weekly during this period.

## Development Notes

- For testing purposes, the application includes sample data
- To use real data, update the Google Apps Script configuration and uncomment the fetch code in app.js
