/**
 * Main Application Script
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize components
    const csvUtils = new CSVUtils();
    const visualizer = new LibraryVisualizer('libraryContainer');
    
    // DOM elements
    const uploadBtn = document.getElementById('uploadBtn');
    const csvFileInput = document.getElementById('csvFile');
    const validationMessage = document.getElementById('validationMessage');
    
    // Handle file upload
    uploadBtn.addEventListener('click', function() {
        if (csvFileInput.files.length === 0) {
            showValidationMessage('Please select a CSV file first', false);
            return;
        }
        
        const file = csvFileInput.files[0];
        
        if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
            showValidationMessage('Please upload a valid CSV file', false);
            return;
        }
        
        // Read the file
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const contents = e.target.result;
            
            // Parse and validate the CSV
            const result = csvUtils.parseCSV(contents);
            
            if (result.isValid) {
                showValidationMessage(result.message, true);
                
                // Load data into visualizer
                visualizer.loadData(result.data);
            } else {
                showValidationMessage(result.message, false);
            }
        };
        
        reader.onerror = function() {
            showValidationMessage('Error reading the file', false);
        };
        
        reader.readAsText(file);
    });
    
    // Display validation message
    function showValidationMessage(message, isSuccess) {
        validationMessage.textContent = message;
        validationMessage.className = 'validation-message ' + (isSuccess ? 'success' : 'error');
    }
    
    // Load example data if available
    function loadExampleData() {
        fetch('./library_books.csv')
            .then(response => {
                if (response.ok) {
                    return response.text();
                }
                throw new Error('Could not load example data');
            })
            .then(contents => {
                // Parse and validate the CSV
                const result = csvUtils.parseCSV(contents);
                
                if (result.isValid) {
                    showValidationMessage('Example data loaded successfully', true);
                    
                    // Load data into visualizer
                    visualizer.loadData(result.data);
                }
            })
            .catch(error => {
                // Silently fail if example data can't be loaded
                console.log('No example data available:', error);
            });
    }
    
    // Try to load example data on page load
    loadExampleData();
});
