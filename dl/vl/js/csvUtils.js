/**
 * CSV Parsing and Validation Utilities
 */

class CSVUtils {
    constructor() {
        this.expectedHeaders = ['book_ID', 'title', 'author', 'genre', 'publication_date', 'available', 'last_checkout_date'];
    }

    /**
     * Parse CSV file content
     * @param {string} content - The CSV content as string
     * @returns {Object} Parsed data object with validation results
     */
    parseCSV(content) {
        // Split by newlines and remove any empty lines
        let lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
        
        if (lines.length < 2) {
            return {
                isValid: false,
                message: 'CSV file is empty or has no data rows',
                data: null
            };
        }

        // Parse headers
        let headers = this.parseCSVLine(lines[0]);
        
        // Validate headers
        if (!this.validateHeaders(headers)) {
            return {
                isValid: false,
                message: `Invalid CSV headers. Expected: ${this.expectedHeaders.join(', ')}`,
                data: null
            };
        }

        // Track book IDs to ensure uniqueness
        const bookIDs = new Set();

        // Parse and validate data rows
        let books = [];
        let validationError = null;

        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') continue;
            
            let rowData = this.parseCSVLine(lines[i]);
            
            // Validate row has correct number of columns
            if (rowData.length !== headers.length) {
                validationError = `Row ${i+1} has ${rowData.length} columns, expected ${headers.length}`;
                break;
            }

            // Create book object - standardize header casing
            let book = {};
            for (let j = 0; j < headers.length; j++) {
                // Map to standardized names for consistent use across application
                if (headers[j].toLowerCase() === 'book_id') book['Book ID'] = rowData[j];
                else if (headers[j].toLowerCase() === 'title') book['Title'] = rowData[j];
                else if (headers[j].toLowerCase() === 'author') book['Author'] = rowData[j];
                else if (headers[j].toLowerCase() === 'genre') book['Genre'] = rowData[j];
                else if (headers[j].toLowerCase() === 'publication_date') book['Publication Year'] = rowData[j];
                else if (headers[j].toLowerCase() === 'available') book['Available'] = rowData[j];
                else if (headers[j].toLowerCase() === 'last_checkout_date') book['Last Checkout Date'] = rowData[j];
            }

            // Check for missing or blank fields
            const missingResult = this.checkMissingFields(book, i+1);
            if (!missingResult.isValid) {
                validationError = missingResult.message;
                break;
            }

            // Check for duplicate book ID
            if (bookIDs.has(book['Book ID'])) {
                validationError = `Duplicate Book ID found in row ${i + 1}: ${book['Book ID']}`;
                break;
            }
            bookIDs.add(book['Book ID']);

            // Validate data types
            let typeValidation = this.validateDataTypes(book, i+1);
            if (!typeValidation.isValid) {
                validationError = typeValidation.message;
                break;
            }

            // Format title for image filename
            book.ImageName = this.formatImageName(book.Title);
            
            books.push(book);
        }

        if (validationError) {
            return {
                isValid: false,
                message: validationError,
                data: null
            };
        }

        // Group books by genre and sort by title
        let booksByGenre = this.groupAndSortBooks(books);

        return {
            isValid: true,
            message: 'CSV validated successfully',
            data: {
                books: books,
                booksByGenre: booksByGenre
            }
        };
    }

    /**
     * Parse a CSV line respecting quoted values
     * @param {string} line - The CSV line to parse
     * @returns {Array} Array of values from the line
     */
    parseCSVLine(line) {
        let result = [];
        let inQuotes = false;
        let currentValue = '';
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = i < line.length - 1 ? line[i + 1] : null;
            
            if (char === '"' && !inQuotes) {
                inQuotes = true;
                continue;
            }
            
            if (char === '"' && inQuotes) {
                if (nextChar === '"') {
                    // Handle escaped quote
                    currentValue += '"';
                    i++; // Skip the next quote
                } else {
                    inQuotes = false;
                }
                continue;
            }
            
            if (char === ',' && !inQuotes) {
                result.push(currentValue.trim());
                currentValue = '';
                continue;
            }
            
            currentValue += char;
        }
        
        // Add the last value
        result.push(currentValue.trim());
        return result;
    }

    /**
     * Validate that headers match expected format
     * @param {Array} headers - The headers from the CSV file
     * @returns {boolean} True if headers match expected format
     */
    validateHeaders(headers) {
        if (headers.length !== this.expectedHeaders.length) {
            return false;
        }
        
        // Create a normalized set of headers for case-insensitive matching
        const normalizedHeaders = headers.map(h => h.toLowerCase());
        const expectedNormalized = this.expectedHeaders.map(h => h.toLowerCase());
        
        // Check that all expected headers exist (regardless of case)
        for (let expected of expectedNormalized) {
            if (!normalizedHeaders.includes(expected)) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Parse a date string in various formats and return the year
     * @param {string} dateStr - The date string to parse
     * @returns {number|string|null} The extracted year or null if invalid
     */
    extractYearFromDate(dateStr) {
        // Check for special historical date formats (e.g., 500BCE, 300BC, 400AD)
        const historicalMatch = dateStr.match(/^(\d+)\s*([Bb][Cc][Ee]?|[Aa][Dd])$/);
        if (historicalMatch) {
            // Return as string to preserve the historical context
            return dateStr;
        }
        
        // Standardize separators first (convert all slashes to dashes)
        dateStr = dateStr.replace(/\//g, '-');
        
        // Handle different formats
        const parts = dateStr.split('-');
        
        if (parts.length !== 3) {
            // Maybe it's just a year?
            if (parts.length === 1 && !isNaN(parseInt(parts[0]))) {
                return parseInt(parts[0]);
            }
            
            // Not a valid date format with 3 parts
            return null;
        }
        
        // Check if first part is a 4-digit year (YYYY-MM-DD)
        if (parts[0].length === 4 && !isNaN(parseInt(parts[0]))) {
            return parseInt(parts[0]);
        }
        
        // Check if last part is a 4-digit year (DD-MM-YYYY or MM-DD-YYYY)
        if (parts[2].length === 4 && !isNaN(parseInt(parts[2]))) {
            return parseInt(parts[2]);
        }
        
        // If we can't determine format, try to find a 4-digit number
        for (let part of parts) {
            const num = parseInt(part);
            if (!isNaN(num) && part.length === 4) {
                return num;
            }
        }
        
        return null;
    }
    
    /**
     * Check if the string is a valid date in any of the supported formats
     * @param {string} dateStr - The date string to validate
     * @returns {boolean} True if valid date format
     */
    isValidDateFormat(dateStr) {
        // Standardize separators first (convert all slashes to dashes)
        dateStr = dateStr.replace(/\//g, '-');
        
        // Check various formats
        const patterns = [
            /^\d{4}-\d{1,2}-\d{1,2}$/,  // YYYY-MM-DD
            /^\d{1,2}-\d{1,2}-\d{4}$/,  // DD-MM-YYYY or MM-DD-YYYY
        ];
        
        for (let pattern of patterns) {
            if (pattern.test(dateStr)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Validate data types for each field
     * @param {Object} book - The book object to validate
     * @param {number} rowNum - The row number for error reporting
     * @returns {Object} Validation result
     */
    validateDataTypes(book, rowNum) {
        // Validate book ID (now just checking it's not empty)
        if (!book['Book ID'] || book['Book ID'].trim() === '') {
            return {
                isValid: false,
                message: `Empty Book ID in row ${rowNum}`
            };
        }
        
        // Validate Publication Year
        let pubYear;
        if (typeof book['Publication Year'] === 'string') {
            if (book['Publication Year'].includes('-') || book['Publication Year'].includes('/')) {
                // It's a date format, extract year
                pubYear = this.extractYearFromDate(book['Publication Year']);
            } else if (book['Publication Year'].match(/^(\d+)\s*([Bb][Cc][Ee]?|[Aa][Dd])$/)) {
                // It's a historical date like 500BCE or 300AD
                pubYear = book['Publication Year'];
            } else {
                // Try parsing as a regular number
                pubYear = parseInt(book['Publication Year']);
            }
        }
        
        // Check if we have a valid publication year/date
        if (pubYear === null && isNaN(pubYear) && typeof pubYear !== 'string') {
            return {
                isValid: false,
                message: `Invalid Publication Year/Date in row ${rowNum}: ${book['Publication Year']}`
            };
        }
        book['Publication Year'] = pubYear;
        
        // Validate Available is True or False
        if (book['Available'].toLowerCase() !== 'true' && book['Available'].toLowerCase() !== 'false') {
            return {
                isValid: false,
                message: `Invalid Available value in row ${rowNum}: ${book['Available']}`
            };
        }
        book['Available'] = book['Available'].toLowerCase() === 'true';
        
        // Validate Last Checkout Date format
        if (!this.isValidDateFormat(book['Last Checkout Date'])) {
            return {
                isValid: false,
                message: `Invalid Last Checkout Date format in row ${rowNum}: ${book['Last Checkout Date']}`
            };
        }
        
        return { isValid: true };
    }

    /**
     * Format book title for image filename
     * @param {string} title - The book title
     * @returns {string} Formatted image name
     */
    formatImageName(title) {
        return title.toLowerCase()
            .replace(/[^\w\s]/g, '') // Remove special characters
            .replace(/\s+/g, '_');    // Replace spaces with underscores
    }

    /**
     * Group books by genre and sort alphabetically by title
     * @param {Array} books - Array of book objects
     * @returns {Object} Books grouped by genre and sorted by title
     */
    groupAndSortBooks(books) {
        let genres = {};
        
        // Group books by genre
        for (let book of books) {
            let genre = book.Genre;
            if (!genres[genre]) {
                genres[genre] = [];
            }
            genres[genre].push(book);
        }
        
        // Sort books by title within each genre
        for (let genre in genres) {
            genres[genre].sort((a, b) => a.Title.localeCompare(b.Title));
        }
        
        return genres;
    }

    /**
     * Transform header to standardized format
     * @param {string} header - Header to transform
     * @returns {string} Transformed header
     */
    transformHeader(header) {
        switch (header.toLowerCase()) {
            case 'book_id':
                return 'Book ID';
            case 'title':
                return 'Title';
            case 'author':
                return 'Author';
            case 'genre':
                return 'Genre';
            case 'publication_date':
            case 'publication year':
                return 'Publication Year';
            case 'available':
                return 'Available';
            case 'last_checkout_date':
                return 'Last Checkout Date';
            default:
                return header;
        }
    }

    /**
     * Check for missing or blank fields
     * @param {Object} book - The book object to check
     * @param {number} rowNum - The row number for error reporting
     * @returns {Object} Validation result
     */
    checkMissingFields(book, rowNum) {
        for (let header of this.expectedHeaders) {
            const key = this.transformHeader(header);
            
            // Check if field is missing or blank/whitespace-only/NULL
            if (!book[key] || 
                typeof book[key] === 'string' && book[key].trim() === '' || 
                book[key] === 'NULL' || 
                book[key] === null) {
                
                return {
                    isValid: false,
                    message: `Missing or blank value for '${header}' in row ${rowNum}`
                };
            }
        }
        
        return { isValid: true };
    }
}

// Export the class
window.CSVUtils = CSVUtils;
