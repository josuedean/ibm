# DB Table Visualizer

## Overview

DB Table Visualizer is a web application that allows you to visualize database tables from CSV files. Upload one or more CSV files (with the first column as the primary key), and the app will display each file as a draggable table window. It automatically detects foreign key relationships between tables and visually connects them with relationship lines.

## Features

- **CSV Upload:** Easily upload multiple CSV files.
- **Draggable Tables:** Move tables around the canvas for a custom layout.
- **Relationship Visualization:** Automatically detects foreign keys and draws connecting lines between tables.
- **Zoom Controls:** Zoom in and out to adjust your view.
- **Data Validation:** Highlights rows with errors (red) and warnings (orange) based on CSV data validation.
- **Responsive Design:** Optimized for different screen sizes.

## Technologies Used

- **HTML, CSS, and JavaScript**
- **PapaParse:** For CSV file parsing.
- **Interact.js:** For drag-and-drop functionality.
- **jsPlumb:** For drawing relationship connections.

## How to Use

1. **Open the App:** Open `index.html` in your preferred web browser.
2. **Upload CSV Files:** Click the "Upload CSV Files" button to select one or more CSV files.
3. **View Tables:** Each CSV file will be displayed as a separate table window with a fixed header and scrollable content.
4. **Interact:** Drag tables around the canvas, use the zoom controls to adjust your view, and see relationship lines update in real-time.
5. **Validation Log:** Check the incremental log for any data validation warnings or errors, which are also reflected by highlighting problematic rows in the tables.

## Customization

- **Styling:** Modify `style.css` to change the appearance of the UI elements.
- **Functionality:** Enhance or customize the behavior by updating the JavaScript code in `app.js`.

## License

This project is licensed under the [MIT License](LICENSE).

## Acknowledgements

- [PapaParse](https://www.papaparse.com/)
- [Interact.js](https://interactjs.io/)
- [jsPlumb](https://jsplumbtoolkit.com/)
