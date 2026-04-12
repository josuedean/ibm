// Global variables
let tables = [];
let jsPlumbInstance;
let currentZoom = 1.0; // Global zoom level to use in dragging and zoom controls

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize jsPlumb, and attach it to the same container that is scaled
    jsPlumbInstance = jsPlumb.getInstance({
        Connector: ['Bezier', { curviness: 50 }],
        PaintStyle: { 
            stroke: '#3498db', 
            strokeWidth: 2,
            outlineStroke: 'transparent',
            outlineWidth: 4
        },
        EndpointStyle: { radius: 5, fill: '#3498db' },
        HoverPaintStyle: { stroke: '#2980b9', strokeWidth: 3 },
        EndpointHoverStyle: { fill: '#2980b9' },
        // Change the container to 'tables-layer' (the one being scaled)
        Container: 'tables-layer'
    });

    // Set up the file input event listener
    document.getElementById('csv-upload').addEventListener('change', handleFileUpload);
    
    // Initialize drag functionality for future elements
    initDragFunctionality();
    
    // Initialize zoom controls
    initZoomControls();
});

// Handle file upload
function handleFileUpload(event) {
    const files = event.target.files;
    
    if (files.length === 0) {
        return;
    }

    // Clear any existing messages
    clearMessages();
    
    // Store file names for processing
    const fileNames = Array.from(files).map(file => file.name.replace('.csv', ''));
    
    // Remove any existing tables with the same file name (for re-uploading)
    removeTablesForFiles(fileNames);
    
    // Parse each file
    Array.from(files).forEach(file => {
        parseCSV(file);
    });
    
    // Reset the file input value to allow re-uploading the same file
    event.target.value = '';
}

// Remove tables associated with specific files
function removeTablesForFiles(fileNames) {
    // Remove from the DOM
    fileNames.forEach(fileName => {
        const tableElement = document.getElementById(`table-${fileName}`);
        if (tableElement) {
            // Remove any jsPlumb connections for this table
            if (jsPlumbInstance) {
                jsPlumbInstance.remove(tableElement);
            }
            // Remove the element
            tableElement.remove();
        }
    });
    
    // Remove from the tables array
    tables = tables.filter(table => !fileNames.includes(table.name));
    
    // Redraw relationships for remaining tables
    if (tables.length > 1) {
        detectForeignKeys();
        updateTableVisualization();
        drawRelationships();
    }
}

// New incremental validation function
function incrementalValidateData(data, tableName) {
    let messages = [];
    const headers = Object.keys(data[0]);
    // Initialize type counters per column
    let typeCounts = {};
    headers.forEach(header => {
         typeCounts[header] = { number: 0, date: 0, string: 0, boolean: 0 };
    });
    
    // Count types from all rows
    data.forEach((row, rowIndex) => {
         headers.forEach(header => {
             const detected = detectDataType(row[header]);
             typeCounts[header][detected]++;
         });
    });
    
    // Determine suggested type (most frequent) per column
    let suggestedTypes = {};
    headers.forEach(header => {
         let counts = typeCounts[header];
         let suggested = 'string';
         
         // Find the type with the highest count for this column
         const maxType = Object.entries(counts).reduce((max, [type, count]) => 
             count > max.count ? {type, count} : max, 
             {type: 'string', count: -1}
         );
         
         suggestedTypes[header] = maxType.type;
    });
    
    // Incrementally validate each row
    data.forEach((row, rowIndex) => {
         headers.forEach(header => {
              const detected = detectDataType(row[header]);
              if (row[header] === '' || row[header] === null || row[header] === undefined) {
                    messages.push(`Error in "${tableName}": Row ${rowIndex + 1}, column "${header}" is blank.`);
              } else if (detected !== suggestedTypes[header]) {
                    messages.push(`Warning in "${tableName}": Row ${rowIndex + 1}, column "${header}" - expected ${suggestedTypes[header]}, found ${detected}.`);
              }
         });
    });
    
    // Validate primary key uniqueness (assumed to be the first header)
    const primaryKey = headers[0];
    const primaryKeyValues = data.map(row => row[primaryKey]);
    if (new Set(primaryKeyValues).size !== primaryKeyValues.length) {
         messages.push(`Error in "${tableName}": Duplicate values found in primary key column "${primaryKey}".`);
    }
    
    return { valid: messages.length === 0, messages, suggestedTypes };
}

// Parse CSV file using PapaParse
function parseCSV(file) {
    Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: function(results) {
            if (results.errors.length > 0) {
                // Show parsing errors in the log instead of as messages
                let errorMessages = results.errors.map(error => `Error parsing "${file.name}": ${error.message} at row ${error.row}`);
                showIncrementalLog(errorMessages, "error");
                return;
            }
            
            if (results.data.length === 0 || Object.keys(results.data[0]).length === 0) {
                // Show empty file error in the log
                showIncrementalLog([`Error: "${file.name}" has no data or valid headers.`], "error");
                return;
            }
            
            // Extract table name from file name
            const fileName = file.name.split('.')[0];
            
            // Use incremental validation
            const validationResult = incrementalValidateData(results.data, fileName);
            
            // Build a mapping of row issues (error takes precedence over warning)
            let rowIssues = {};
            validationResult.messages.forEach(msg => {
                const match = msg.match(/Row (\d+)/);
                if (match) {
                    const rowIndex = parseInt(match[1], 10) - 1;
                    if (msg.toLowerCase().includes('error')) {
                        rowIssues[rowIndex] = 'error';
                    } else if (msg.toLowerCase().includes('warning')) {
                        // Only assign warning if no error exists already for that row
                        if (rowIssues[rowIndex] !== 'error') {
                            rowIssues[rowIndex] = 'warning';
                        }
                    }
                }
            });

            // Store the validated table data and attach the suggestedTypes
            const tableData = {
                name: fileName,
                data: results.data,
                headers: Object.keys(results.data[0]),
                primaryKey: Object.keys(results.data[0])[0],
                foreignKeys: [],
                suggestedTypes: validationResult.suggestedTypes,
                rowIssues: rowIssues  // New property to hold row-level issues
            };
            
            // Add or replace table
            const existingTableIndex = tables.findIndex(t => t.name === fileName);
            if (existingTableIndex !== -1) {
                tables[existingTableIndex] = tableData;
                const existingTable = document.getElementById(`table-${fileName}`);
                if (existingTable) {
                    existingTable.parentNode.removeChild(existingTable);
                }
            } else {
                tables.push(tableData);
            }
            
            // Create the table visualization with tooltips for data types
            createTableWindow(tableData);
            
            // Display the incremental log with any warnings/errors
            if (validationResult.messages.length > 0) {
                showIncrementalLog(validationResult.messages);
            }
            
            // If more than one table exists, update relationships
            if (tables.length > 1) {
                detectForeignKeys();
                updateTableVisualization();
                drawRelationships();
            }
        },
        error: function(error) {
            // Show parsing error in the log
            showIncrementalLog([`Error parsing file: ${error}`], "error");
        }
    });
}

// Validate the CSV data (legacy function, if needed)
function validateData(data, tableName) {
    // Check for blank cells
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        for (const key in row) {
            if (row[key] === '' || row[key] === null || row[key] === undefined) {
                return {
                    valid: false,
                    message: `Error in "${tableName}": Blank cell found in row ${i + 1}, column "${key}".`
                };
            }
        }
    }
    
    // Detect column data types
    const columnTypes = {};
    const headers = Object.keys(data[0]);
    
    // Determine data type of each column based on first row
    headers.forEach(header => {
        columnTypes[header] = detectDataType(data[0][header]);
    });
    
    // Validate that all rows conform to detected types
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        for (const header of headers) {
            const detectedType = detectDataType(row[header]);
            if (detectedType !== columnTypes[header]) {
                return {
                    valid: false,
                    message: `Error in "${tableName}": Data type mismatch in row ${i + 1}, column "${header}". Expected ${columnTypes[header]}, found ${detectedType}.`
                };
            }
        }
    }
    
    // Validate primary key (first column) uniqueness
    const primaryKey = headers[0];
    const primaryKeyValues = data.map(row => row[primaryKey]);
    const uniqueValues = new Set(primaryKeyValues);
    
    if (uniqueValues.size !== primaryKeyValues.length) {
        return {
            valid: false,
            message: `Error in "${tableName}": Duplicate values found in primary key column "${primaryKey}".`
        };
    }
    
    return { valid: true };
}

// Detect data type of a value
function detectDataType(value) {
    // Convert value to string and trim whitespace
    const str = (value === null || value === undefined) ? "" : value.toString().trim();

    // Check for empty or null value first.
    if (str === "") {
        return "null";
    }
    
    // Check for boolean using explicit comparisons
    if (str === "true" || str === "false" ||
        str === "True" || str === "False" ||
        str === "TRUE" || str === "FALSE") {
        return "boolean";
    }
    
    // Check for number (integer, decimal, or scientific notation)
    if (/^-?\d+(\.\d+)?(e-?\d+)?$/i.test(str)) {
        return "number";
    }
    
    // Check for ISO date format (YYYY-MM-DD) with optional time
    // e.g. "2025-04-01" or "2025-04-01T14:30:00"
    if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/i.test(str)) {
        let timestamp = Date.parse(str);
        if (!isNaN(timestamp)) {
            return "date";
        }
    }
    
    // Check for common date formats with slashes or dashes (e.g., DD/MM/YYYY or MM/DD/YYYY)
    if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}$/.test(str)) {
        const parts = str.split(/[\/-]/);
        // Assume parts: [day, month, year]. Adjust if you expect a different order.
        let day = parseInt(parts[0], 10);
        let month = parseInt(parts[1], 10);
        let year = parseInt(parts[2], 10);
        // Adjust two-digit year (this is heuristic; adjust as needed)
        if (year < 100) {
            year += 2000;
        }
        const dateObj = new Date(year, month - 1, day);
        // Validate that the date components match
        if (dateObj.getFullYear() === year &&
            dateObj.getMonth() + 1 === month &&
            dateObj.getDate() === day) {
            return "date";
        }
    }
    
    // Fallback to string if no other type matches.
    return "string";
}

// Detect foreign keys by comparing header names across tables
function detectForeignKeys() {
    // Clear existing foreign key detections
    tables.forEach(table => {
        table.foreignKeys = [];
    });
    
    // Compare header names across tables
    for (let i = 0; i < tables.length; i++) {
        const tableA = tables[i];
        
        for (let j = 0; j < tables.length; j++) {
            if (i === j) continue;
            
            const tableB = tables[j];
            
            // Skip the primary key column (first column) when comparing
            for (let k = 1; k < tableA.headers.length; k++) {
                const headerA = tableA.headers[k];
                
                // Check if this header matches any other table's header
                if (tableB.headers.includes(headerA)) {
                    // Add to foreign keys if not already present
                    if (!tableA.foreignKeys.some(fk => fk.column === headerA && fk.referencesTable === tableB.name)) {
                        tableA.foreignKeys.push({
                            column: headerA,
                            referencesTable: tableB.name,
                            referencesColumn: headerA
                        });
                    }
                }
            }
        }
    }
}

// Create a draggable table window
function createTableWindow(tableData) {
    const tablesLayer = document.getElementById('tables-layer');
    
    // Create table window container
    const tableWindow = document.createElement('div');
    tableWindow.className = 'table-window';
    tableWindow.id = `table-${tableData.name}`;
    
    // Position randomly within the visualization area
    const visualizationArea = document.getElementById('visualization-area');
    const maxX = visualizationArea.clientWidth - 300;
    const maxY = visualizationArea.clientHeight - 200;
    const posX = Math.floor(Math.random() * maxX);
    const posY = Math.floor(Math.random() * maxY);
    tableWindow.style.left = `${posX}px`;
    tableWindow.style.top = `${posY}px`;
    
    // --- Fixed Header Section ---
    // Create a header container that remains fixed
    const headerContainer = document.createElement('div');
    headerContainer.className = 'table-header';
    
    // Optional: Add table title to the header
    const tableTitle = document.createElement('div');
    tableTitle.className = 'table-title';
    tableTitle.textContent = tableData.name;
    headerContainer.appendChild(tableTitle);
    
    // Create a separate table element for the header
    const headerTable = document.createElement('table');
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    tableData.headers.forEach((header, index) => {
        const th = document.createElement('th');
        if (index === 0) {
            th.className = 'primary-key';
        } else {
            th.className = 'data-column';
            if (tableData.suggestedTypes && tableData.suggestedTypes[header]) {
                th.title = `Suggested type: ${tableData.suggestedTypes[header]}`;
            }
        }
        th.textContent = header;
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    headerTable.appendChild(thead);
    headerContainer.appendChild(headerTable);
    tableWindow.appendChild(headerContainer);
    
    // --- Scrollable Table Body Section ---
    // Create a scrollable container for the table data (body only)
    const scrollableContainer = document.createElement('div');
    scrollableContainer.className = 'table-content';
    
    // Create a separate table element for the body
    const bodyTable = document.createElement('table');
    const tbody = document.createElement('tbody');
    
    // tableData.data.forEach(row => {
    //     const tr = document.createElement('tr');
    //     tableData.headers.forEach(header => {
    //         const td = document.createElement('td');
    //         td.textContent = row[header];
    //         tr.appendChild(td);
    //     });
    //     tbody.appendChild(tr);
    // });
    
    tableData.data.forEach((row, rowIndex) => {
        const tr = document.createElement('tr');
        
        // If there is an issue for this row, add the corresponding class.
        if (tableData.rowIssues && tableData.rowIssues[rowIndex]) {
            tr.classList.add(tableData.rowIssues[rowIndex]);
        }
        
        tableData.headers.forEach(header => {
            const td = document.createElement('td');
            td.textContent = row[header];
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });

    bodyTable.appendChild(tbody);
    scrollableContainer.appendChild(bodyTable);
    tableWindow.appendChild(scrollableContainer);
    
    // Append the complete table window to the tables layer
    tablesLayer.appendChild(tableWindow);
    
    // Synchronize the column widths between header and body
    syncTableColumns(headerTable, bodyTable);
    
    // No need to update endpoints on body scroll because header remains fixed.
    scrollableContainer.addEventListener('scroll', function() {
        // If needed: jsPlumbInstance.recalculateOffsets();
    });
}

// Helper function to sync column widths
function syncTableColumns(headerTable, bodyTable) {
    // Delay execution to ensure the layout is stable
    setTimeout(() => {
        const headerCells = headerTable.querySelectorAll('th');
        const firstBodyRow = bodyTable.querySelector('tr');
        if (!firstBodyRow) return;
        const bodyCells = firstBodyRow.children;
        
        headerCells.forEach((cell, index) => {
            // Get the computed width of the header cell
            const computedWidth = cell.getBoundingClientRect().width;
            cell.style.width = `${computedWidth}px`;
            // Set the width for the corresponding cell in the first row of the body
            if (bodyCells[index]) {
                bodyCells[index].style.width = `${computedWidth}px`;
            }
            // Optionally, set the width on all cells in the body for this column:
            const allBodyCells = bodyTable.querySelectorAll(`tr > *:nth-child(${index + 1})`);
            allBodyCells.forEach(bodyCell => {
                bodyCell.style.width = `${computedWidth}px`;
            });
        });
    }, 0);
}

// Update table visualization with foreign key information
function updateTableVisualization() {
    tables.forEach(table => {
        const tableWindow = document.getElementById(`table-${table.name}`);
        
        if (tableWindow) {
            const headerRow = tableWindow.querySelector('thead tr');
            const headers = headerRow.querySelectorAll('th');
            
            // Update header styling for foreign keys
            table.headers.forEach((header, index) => {
                if (index > 0) { // Skip primary key
                    const foreignKey = table.foreignKeys.find(fk => fk.column === header);
                    
                    if (foreignKey) {
                        headers[index].className = 'foreign-key';
                    }
                }
            });
        }
    });
}

function showIncrementalLog(messages, messageType) {
    // Get the container from the existing validation-messages div or create it
    let logContainer = document.getElementById('incremental-log');
    let logContent;
    
    if (!logContainer) {
        // Create log container if it doesn't exist
        logContainer = document.createElement('div');
        logContainer.id = 'incremental-log';
        logContainer.className = 'incremental-log';
        
        // Create a header for expanding/collapsing the log
        const header = document.createElement('div');
        header.className = 'log-header';
        
        // Add title and count of messages
        const title = document.createElement('span');
        title.textContent = "Validation Log";
        header.appendChild(title);
        
        // Add clear button
        const clearButton = document.createElement('button');
        clearButton.textContent = "Clear";
        clearButton.style.fontSize = '0.8em';
        clearButton.style.padding = '2px 5px';
        clearButton.style.marginLeft = '10px';
        clearButton.onclick = function(e) {
            e.stopPropagation(); // Prevent toggle when clicking clear
            logContent.innerHTML = '';
        };
        header.appendChild(clearButton);
        
        header.addEventListener('click', function() {
            // Toggle the log content visibility
            if (logContent.style.display === 'none') {
                logContent.style.display = 'block';
            } else {
                logContent.style.display = 'none';
            }
        });
        logContainer.appendChild(header);
        
        // Create a container for the log messages
        logContent = document.createElement('ul');
        logContent.className = 'log-content';
        logContainer.appendChild(logContent);
        
        // Append the log container to the body or to a specific container
        document.body.appendChild(logContainer);
    } else {
        // If it exists, get its message container (the <ul>)
        logContent = logContainer.querySelector('.log-content');
        // DO NOT clear previous messages - we want to keep all warnings
    }
    
    // Update count in header
    const title = logContainer.querySelector('.log-header span');
    const messageCount = logContent.children.length + messages.length;
    title.textContent = `Validation Log (${messageCount})`;
    
    // Determine message type if not specified
    if (!messageType) {
        messageType = "info"; // Default type
    }
    
    // Populate the log list with messages
    messages.forEach(msg => {
        const li = document.createElement('li');
        
        // Determine message type based on content if not specified
        let type = messageType;
        if (msg.toLowerCase().includes('error')) {
            type = 'error';
        } else if (msg.toLowerCase().includes('warning')) {
            type = 'warning';
        }
        
        li.className = type;
        li.textContent = msg;
        
        // Add timestamp
        const timestamp = new Date().toLocaleTimeString();
        const timeSpan = document.createElement('span');
        timeSpan.className = 'timestamp';
        timeSpan.textContent = ` [${timestamp}]`;
        timeSpan.style.fontSize = '0.8em';
        timeSpan.style.color = '#888';
        timeSpan.style.marginLeft = '5px';
        li.appendChild(timeSpan);
        
        // Add to the top of the list so newest messages are at the top
        logContent.insertBefore(li, logContent.firstChild);
    });
    
    // Ensure the log is visible
    logContainer.style.display = 'block';
    logContent.style.display = 'block';
}

// Draw relationship arrows between tables
function drawRelationships() {
    // Clear existing connections
    jsPlumbInstance.reset();
    
    // Configure jsPlumb defaults
    jsPlumbInstance.importDefaults({
        ConnectionsDetachable: false,
        ReattachConnections: true,
        MaxConnections: -1
    });
    
    // Draw connections for foreign keys
    tables.forEach(sourceTable => {
        sourceTable.foreignKeys.forEach(foreignKey => {
            const sourceTableEl = document.getElementById(`table-${sourceTable.name}`);
            const targetTableEl = document.getElementById(`table-${foreignKey.referencesTable}`);
            
            if (sourceTableEl && targetTableEl) {
                // Find index of the foreign key column
                const sourceColumnIndex = sourceTable.headers.indexOf(foreignKey.column);
                
                // Find the header element for the foreign key
                const sourceHeaderEl = sourceTableEl.querySelector(`th:nth-child(${sourceColumnIndex + 1})`);
                
                // Find the header element for the referenced primary key
                const targetHeaderEl = targetTableEl.querySelector('th:first-child');
                
                if (sourceHeaderEl && targetHeaderEl) {
                    // Make source and target headers endpoints
                    jsPlumbInstance.makeSource(sourceHeaderEl, {
                        anchor: [0.5, 0.2, 0, -1],
                        cssClass: 'header-endpoint',
                        maxConnections: -1,
                        uniqueEndpoint: false
                    });
                    
                    jsPlumbInstance.makeTarget(targetHeaderEl, {
                        anchor: [0.5, 0.2, 0, -1],
                        cssClass: 'header-endpoint',
                        maxConnections: -1,
                        uniqueEndpoint: false
                    });
                    
                    // Create connection between headers
                    jsPlumbInstance.connect({
                        source: sourceHeaderEl,
                        target: targetHeaderEl,
                        paintStyle: { 
                            stroke: '#3498db', 
                            strokeWidth: 4,
                            outlineStroke: 'transparent',
                            outlineWidth: 4
                        },
                        hoverPaintStyle: { 
                            stroke: '#2980b9', 
                            strokeWidth: 3 
                        },
                        endpoint: 'Dot',
                        endpointStyle: { 
                            radius: 5, 
                            fill: '#3498db' 
                        },
                        connector: ['Bezier', { curviness: 50 }],
                        overlays: [
                            ['Arrow', { width: 20, length: 20, location: 1 }]
                        ]
                    });
                }
            }
        });
    });
}

// Initialize drag functionality for table windows
function initDragFunctionality() {
    interact('.table-window')
        .draggable({
            inertia: true,

            autoScroll: true,
            listeners: {
                move: dragMoveListener,
                end: function (event) {
                    // Update relationship arrows after dragging ends
                    jsPlumbInstance.repaintEverything();
                }
            }
        });
}

// Handle drag movement
function dragMoveListener(event) {
    const target = event.target;
    let currentX = parseFloat(target.style.left) || 0;
    let currentY = parseFloat(target.style.top) || 0;
    // Adjust movement by dividing the delta by the current zoom level
    const dx = event.dx / currentZoom;
    const dy = event.dy / currentZoom;
    const x = currentX + dx;
    const y = currentY + dy;

    target.style.left = `${x}px`;
    target.style.top = `${y}px`;
    
    // Repaint connections so they follow the moved table
    jsPlumbInstance.repaintEverything();
}

// Show message to user (now redirects to incremental log)
function showMessage(message, type) {
    // Redirect all messages to the incremental log
    showIncrementalLog([message], type);
}

// Clear all messages (for compatibility)
function clearMessages() {
    // This function is kept for compatibility
    // Messages are now handled in the incremental log
}

// Initialize zoom controls with expanding canvas functionality
function initZoomControls() {
    const visualizationArea = document.getElementById('visualization-area');
    const tablesLayer = document.getElementById('tables-layer');
    const visualizationContainer = document.getElementById('visualization-container');
    
    const zoomStep = 0.2; // Zoom step for each button click
    const minZoom = 0.5;  // Minimum zoom level
    const maxZoom = 3.0;  // Maximum zoom level
    
    // Apply initial zoom state to the tablesLayer
    applyZoom(currentZoom);
    
    // Set up zoom in button
    document.getElementById('zoom-in').addEventListener('click', function() {
        if (currentZoom < maxZoom) {
            currentZoom += zoomStep;
            applyZoom(currentZoom);
        }
    });
    
    // Set up zoom out button
    document.getElementById('zoom-out').addEventListener('click', function() {
        if (currentZoom > minZoom) {
            currentZoom -= zoomStep;
            applyZoom(currentZoom);
        }
    });
    
    // Adjust zoom on window resize
    window.addEventListener('resize', function() {
        applyZoom(currentZoom);
    });
    
    // Function to apply the zoom level
    function applyZoom(level) {
        // Update the tables layer dimensions based on container size and zoom level
        const containerWidth = visualizationContainer.clientWidth;
        const containerHeight = visualizationContainer.clientHeight;
        tablesLayer.style.width = `${containerWidth * level}px`;
        tablesLayer.style.height = `${containerHeight * level}px`;
        tablesLayer.style.transform = `scale(${level})`;
        tablesLayer.style.transformOrigin = '0 0';
        
        // Inform jsPlumb of the new zoom level
        if (jsPlumbInstance) {
            jsPlumbInstance.setZoom(level);
            // Force recalculation of element offsets
            jsPlumbInstance.recalculateOffsets();
            setTimeout(() => {
                jsPlumbInstance.repaintEverything();
            }, 100);
        }
        
        // Ensure the grid background always fills the container.
        visualizationArea.style.width = '100%';
        visualizationArea.style.height = '100%';
        visualizationArea.style.backgroundSize = `20px 20px`;
    }
}
