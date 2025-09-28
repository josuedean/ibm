document.addEventListener('DOMContentLoaded', init);

// Global variables
let scheduleData = [];
let calendar = null;
let selectedUsers = [];
let userColorMap = {};
const timeFormat = 'HH:mm'; // 24-hour format
const targetDateRange = {
    start: new Date('2025-01-01'),
    end: new Date('2025-12-31')
};

// Configuration
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const businessHours = {
    start: '06:00', // 6 AM
    end: '24:00'    // 12 AM (midnight)
};

// Map day names to their indices for sorting
const dayIndices = {};
days.forEach((day, index) => {
    dayIndices[day] = index;
});

// Initialize the app
async function init() {
    // Set up event listeners
    setupEventListeners();
    
    // Show loading spinner
    toggleLoading(true);
    
    try {
        // Fetch data from Google Apps Script endpoint
        await fetchScheduleData();
        
        // Initialize views
        initializeViews();
        
        // Hide loading spinner
        toggleLoading(false);
    } catch (error) {
        console.error('Error initializing app:', error);
        alert('Failed to load schedule data. Please try again later.');
        toggleLoading(false);
    }
}

// Set up event listeners
function setupEventListeners() {
    // View type selector
    document.getElementById('view-type').addEventListener('change', handleViewChange);
    
    // User selection
    document.getElementById('user-select').addEventListener('change', handleUserSelection);
    
    // Button handlers
    document.getElementById('select-all').addEventListener('click', selectAllUsers);
    document.getElementById('clear-selection').addEventListener('click', clearUserSelection);
}

// Fetch schedule data from Google Apps Script
async function fetchScheduleData() {
    try {
        // Google Apps Script web app URL
        const scriptUrl = 'https://script.google.com/macros/s/AKfycbx9U1_mg8ZzWFPpEgb_y2kpHpPvkkjKF9BLIJo4z1Gb_ufVeXVgUTkguskUYmV1lO5dqg/exec';
        
        // Fetch data from Google Apps Script
        const response = await fetch(scriptUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        scheduleData = await response.json();
        
        // Fallback to sample data if needed
        if (!scheduleData || scheduleData.length === 0) {
            console.warn('No data received from API, using sample data');
            scheduleData = getSampleData();
        }
        
        // Populate user selection dropdown
        populateUserSelection();
        
    } catch (error) {
        console.error('Error fetching schedule data:', error);
        throw error;
    }
}

// Initialize all views
function initializeViews() {
    initCalendarView();
    initListView();
    initTimelineView();
    
    // Default to calendar view
    document.getElementById('view-type').value = 'calendar';
    handleViewChange({ target: { value: 'calendar' } });
}

// Handle view type change
function handleViewChange(event) {
    const viewType = event.target.value;
    
    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    
    // Show selected view
    document.getElementById(`${viewType}-view`).classList.add('active');
    
    // Refresh the view
    if (viewType === 'calendar' && calendar) {
        setTimeout(() => calendar.render(), 0); // Ensure calendar renders properly
    } else if (viewType === 'list') {
        refreshListView();
    } else if (viewType === 'timeline') {
        refreshTimelineView();
    }
}

// Initialize the calendar view
function initCalendarView() {
    const calendarEl = document.getElementById('calendar-view');
    
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek',
        headerToolbar: {
            left: '',
            center: 'title',
            right: ''
        },
        allDaySlot: false,
        slotMinTime: businessHours.start,
        slotMaxTime: businessHours.end,
        height: 'auto',
        expandRows: true,
        stickyHeaderDates: true,
        nowIndicator: false,
        dayHeaderFormat: { weekday: 'long' },
        slotLabelFormat: {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false // Use 24-hour format
        },
        events: [] // Will be populated based on selection
    });
    
    // Ensure calendar is rendered properly
    setTimeout(() => calendar.render(), 0);
}

// Initialize the list view
function initListView() {
    // Initial empty state - will be populated when users are selected
    document.querySelector('#availability-table tbody').innerHTML = '';
}

// Initialize the timeline view
function initTimelineView() {
    const timelineView = document.getElementById('timeline-view');
    timelineView.innerHTML = ''; // Clear any existing content
    
    // Create timeline hours (6 AM to 12 AM) - using 24-hour format now
    const timelineHours = document.createElement('div');
    timelineHours.className = 'timeline-hours';
    
    for (let hour = 6; hour <= 24; hour++) {
        const hourEl = document.createElement('div');
        hourEl.className = 'timeline-hour';
        hourEl.textContent = hour === 24 ? '00:00' : `${hour}:00`;
        timelineHours.appendChild(hourEl);
    }
    
    timelineView.appendChild(timelineHours);
    
    // Timeline rows will be created dynamically when users are selected
    const timelineContainer = document.createElement('div');
    timelineContainer.className = 'timeline-container';
    timelineView.appendChild(timelineContainer);
}

// Populate user selection dropdown
function populateUserSelection() {
    const userSelect = document.getElementById('user-select');
    userSelect.innerHTML = '';
    
    // Get unique user names
    const uniqueUsers = [...new Set(scheduleData.map(item => item.name))];
    
    // Sort alphabetically
    uniqueUsers.sort((a, b) => a.localeCompare(b));
    
    // Add options
    uniqueUsers.forEach(userName => {
        const option = document.createElement('option');
        option.value = userName;
        option.textContent = userName;
        userSelect.appendChild(option);
    });
}

// Handle user selection change
function handleUserSelection() {
    const userSelect = document.getElementById('user-select');
    selectedUsers = Array.from(userSelect.selectedOptions).map(option => option.value);
    
    updateAllViews();
    calculateOverlaps();
}

// Select all users
function selectAllUsers() {
    const userSelect = document.getElementById('user-select');
    Array.from(userSelect.options).forEach(option => {
        option.selected = true;
    });
    
    handleUserSelection();
}

// Clear user selection
function clearUserSelection() {
    const userSelect = document.getElementById('user-select');
    Array.from(userSelect.options).forEach(option => {
        option.selected = false;
    });
    
    handleUserSelection();
}

// Update all views based on selected users
function updateAllViews() {
    updateCalendarView();
    refreshListView();
    refreshTimelineView();
}

// Update the calendar view with selected users' schedules
function updateCalendarView() {
    if (!calendar) return;
    
    // Clear existing events
    calendar.removeAllEvents();
    
    if (selectedUsers.length === 0) return;
    
    // Filter data for selected users
    const filteredData = scheduleData.filter(item => selectedUsers.includes(item.name));
    
    // Create calendar events
    const events = createCalendarEvents(filteredData);
    calendar.addEventSource(events);
}

function populateUserSelection() {
    const userSelect = document.getElementById('user-select');
    userSelect.innerHTML = '';
    
    // Get unique user names
    const uniqueUsers = [...new Set(scheduleData.map(item => item.name))];
    
    // Sort alphabetically
    uniqueUsers.sort((a, b) => a.localeCompare(b));
    
    // Build the mapping from user name to a unique index color.
    userColorMap = {};
    uniqueUsers.forEach((userName, index) => {
        userColorMap[userName] = getColorForIndex(index);
    });
    
    // Add options to the dropdown
    uniqueUsers.forEach(userName => {
        const option = document.createElement('option');
        option.value = userName;
        option.textContent = userName;
        userSelect.appendChild(option);
    });
}

// Create calendar events from schedule data
function createCalendarEvents(data) {
    const events = [];
    
    // Map days to dayOfWeek numbers (0=Sunday, 1=Monday, etc.)
    const dayMapping = {
        'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4,
        'Friday': 5, 'Saturday': 6, 'Sunday': 0
    };
    
    // Create individual events for each person, keeping their unique color
    data.forEach(item => {
        // Get day number (0-6)
        const dayNumber = dayMapping[item.day];
        
        // Calculate date of first occurrence within our range
        const firstDate = new Date(targetDateRange.start);
        
        // Adjust to first occurrence of this day of week
        const daysDiff = (dayNumber - firstDate.getDay() + 7) % 7;
        firstDate.setDate(firstDate.getDate() + daysDiff);
        
        // Add weekly recurring events for the entire date range
        let currentDate = new Date(firstDate);
        
        while (currentDate <= targetDateRange.end) {
            const dateStr = formatYYYYMMDD(currentDate);
            const formattedStartTime = formatTime(item.available_start_time);
            const formattedEndTime = formatTime(item.available_end_time);
            
            // Create individual event for this person
            events.push({
                title: item.name,
                start: `${dateStr}T${formattedStartTime}:00`,
                end: `${dateStr}T${formattedEndTime}:00`,
                backgroundColor: userColorMap[item.name], 
                textColor: 'white',  // Set text color to white
                extendedProps: {
                    day: item.day
                }
            });
            
            // Move to next week
            currentDate.setDate(currentDate.getDate() + 7);
        }
    });
    
    return events;
}

// Refresh the list view
function refreshListView() {
    const tableBody = document.querySelector('#availability-table tbody');
    tableBody.innerHTML = '';
    
    if (selectedUsers.length === 0) return;
    
    // Filter data for selected users
    const filteredData = scheduleData.filter(item => selectedUsers.includes(item.name));
    
    // Sort by day then name
    filteredData.sort((a, b) => {
        const dayOrder = dayIndices[a.day] - dayIndices[b.day];
        if (dayOrder !== 0) return dayOrder;
        return a.name.localeCompare(b.name);
    });
    
    // Add rows to table
    filteredData.forEach(item => {
        const row = document.createElement('tr');
        
        const nameCell = document.createElement('td');
        nameCell.textContent = item.name;
        nameCell.style.borderLeft = `4px solid ${userColorMap[item.name]}`;
        
        const dayCell = document.createElement('td');
        dayCell.textContent = item.day;
        
        const startCell = document.createElement('td');
        startCell.textContent = item.available_start_time;
        
        const endCell = document.createElement('td');
        endCell.textContent = item.available_end_time;
        
        row.appendChild(nameCell);
        row.appendChild(dayCell);
        row.appendChild(startCell);
        row.appendChild(endCell);
        
        tableBody.appendChild(row);
    });
}

// Refresh the timeline view
function refreshTimelineView() {
    const timelineContainer = document.querySelector('.timeline-container');
    timelineContainer.innerHTML = '';
    
    if (selectedUsers.length === 0) return;
    
    // Create timeline for each day
    days.forEach(day => {
        // Get availability for this day
        const dayAvailability = scheduleData.filter(
            item => selectedUsers.includes(item.name) && item.day === day
        );
        
        if (dayAvailability.length === 0) return;
        
        // Create day header
        const dayHeader = document.createElement('h3');
        dayHeader.textContent = day;
        timelineContainer.appendChild(dayHeader);
        
        // Create timeline rows for each user
        dayAvailability.forEach(item => {
            const row = document.createElement('div');
            row.className = 'timeline-row';
            
            // User label
            const label = document.createElement('div');
            label.className = 'timeline-label';
            label.textContent = item.name;
            row.appendChild(label);
            
            // Timeline slots container
            const slotsContainer = document.createElement('div');
            slotsContainer.className = 'timeline-slots';
            
            // Calculate position and width based on time
            const startMinutes = timeToMinutes(item.available_start_time);
            const endMinutes = timeToMinutes(item.available_end_time);
            const businessStartMinutes = timeToMinutes(businessHours.start); // Use the global businessHours config
            const businessEndMinutes = timeToMinutes(businessHours.end);
            const totalMinutes = businessEndMinutes - businessStartMinutes;
            
            // Create slot
            const slot = document.createElement('div');
            slot.className = 'timeline-slot';
            slot.style.left = `${((startMinutes - businessStartMinutes) / totalMinutes) * 100}%`;
            slot.style.width = `${((endMinutes - startMinutes) / totalMinutes) * 100}%`;
            slot.style.backgroundColor = userColorMap[item.name];
            
            // Tooltip
            slot.title = `${item.name}: ${item.available_start_time} - ${item.available_end_time}`;
            
            slotsContainer.appendChild(slot);
            row.appendChild(slotsContainer);
            
            timelineContainer.appendChild(row);
        });
    });
}

// Calculate overlapping time slots
function calculateOverlaps() {
    const overlapContent = document.getElementById('overlap-content');
    overlapContent.innerHTML = '';
    
    if (selectedUsers.length <= 1) {
        overlapContent.innerHTML = '<p>Select at least two students to find overlapping time slots.</p>';
        return;
    }
    
    // Calculate overlaps for each day
    days.forEach(day => {
        // Get availability for this day for selected users
        const dayAvailability = scheduleData.filter(
            item => selectedUsers.includes(item.name) && item.day === day
        );
        
        // Group by user
        const userAvailability = {};
        dayAvailability.forEach(item => {
            if (!userAvailability[item.name]) {
                userAvailability[item.name] = [];
            }
            userAvailability[item.name].push({
                start: timeToMinutes(item.available_start_time),
                end: timeToMinutes(item.available_end_time)
            });
        });
        
        // Only process if we have data for all selected users
        const usersWithAvailability = Object.keys(userAvailability);
        if (usersWithAvailability.length !== selectedUsers.length) return;
        
        // Calculate overlaps
        let overlaps = findOverlaps(userAvailability);
        
        // If there are overlaps, display them
        if (overlaps.length > 0) {
            // Create day section
            const daySection = document.createElement('div');
            daySection.className = 'overlap-day';
            
            const dayHeader = document.createElement('h3');
            dayHeader.textContent = day;
            daySection.appendChild(dayHeader);
            
            // Add each overlap slot
            overlaps.forEach(overlap => {
                const slot = document.createElement('div');
                slot.className = 'overlap-slot';
                
                // Format times back
                const startFormatted = minutesToTime(overlap.start);
                const endFormatted = minutesToTime(overlap.end);
                
                slot.textContent = `${startFormatted} - ${endFormatted}`;
                daySection.appendChild(slot);
            });
            
            overlapContent.appendChild(daySection);
        }
    });
    
    // If no overlaps were found
    if (overlapContent.innerHTML === '') {
        overlapContent.innerHTML = '<p>No overlapping time slots found for the selected students.</p>';
    }
}

// Find overlapping time slots among all selected users
function findOverlaps(userAvailability) {
    // Combine all time slots into a single array with start/end times
    let allTimePoints = [];
    
    for (const user in userAvailability) {
        userAvailability[user].forEach(slot => {
            allTimePoints.push({ time: slot.start, isStart: true });
            allTimePoints.push({ time: slot.end, isStart: false });
        });
    }
    
    // Sort time points
    allTimePoints.sort((a, b) => {
        if (a.time !== b.time) return a.time - b.time;
        // If times are equal, end comes before start
        return a.isStart ? 1 : -1;
    });
    
    // Find overlaps
    let overlaps = [];
    let userCount = 0;
    let overlapStart = null;
    
    for (const point of allTimePoints) {
        if (point.isStart) {
            userCount++;
            
            // If all users are available now, mark the start of overlap
            if (userCount === Object.keys(userAvailability).length) {
                overlapStart = point.time;
            }
        } else {
            // If we had full overlap and now one user is not available
            if (userCount === Object.keys(userAvailability).length && overlapStart !== null) {
                overlaps.push({
                    start: overlapStart,
                    end: point.time
                });
                overlapStart = null;
            }
            
            userCount--;
        }
    }
    
    return overlaps;
}

// Toggle loading spinner
function toggleLoading(show) {
    document.getElementById('loading').style.display = show ? 'flex' : 'none';
}

// Helper function: Convert time string to minutes since midnight
// Assumes all time strings are in 24-hour format
function timeToMinutes(timeString) {
    if (!timeString) return 0;
    let hours, minutes;
    
    // Parse time in 24-hour format
    [hours, minutes] = timeString.split(':').map(Number);
    
    // Instead of converting 24 to 0, check for "24:00" and convert it to 1440 minutes
    if (hours === 24 && minutes === 0) {
        return 1440;
    }
    
    return hours * 60 + (minutes || 0);
}

// Helper function: Convert minutes since midnight to time string
function minutesToTime(minutes) {
    let hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    // Format in 24-hour format
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Helper function: Format time to ensure it's in proper 24-hour format
// Assumes all time strings are already in 24-hour format
function formatTime(timeString) {
    // If the time is empty, return empty string
    if (!timeString) return '';
    
    let hours, minutes;
    
    // Parse time in 24-hour format
    [hours, minutes] = timeString.split(':').map(Number);
    
    // Ensure values are valid
    hours = Math.min(23, Math.max(0, hours || 0));
    minutes = Math.min(59, Math.max(0, minutes || 0));
    
    // Format with leading zeros
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// Helper function: Format date as YYYY-MM-DD
function formatYYYYMMDD(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getColorForIndex(index) {
    // Predefined arrays for 7 vivid colors and 7 lighter counterparts.
    // These colors were chosen artistically for visual appeal and to ensure white text remains readable.
    const vividColors = [
        'hsl(355, 85%, 45%)', // Bold red
        'hsl(25, 85%, 45%)',  // Bold orange
        'hsl(55, 85%, 45%)',  // Bold yellow
        'hsl(125, 85%, 45%)', // Bold green
        'hsl(195, 85%, 45%)', // Bold blue
        'hsl(255, 85%, 45%)', // Bold purple
        'hsl(315, 85%, 45%)'  // Bold magenta
    ];
    const lighterColors = [
        'hsl(355, 65%, 55%)', // Softer red
        'hsl(25, 65%, 55%)',  // Softer orange
        'hsl(55, 65%, 55%)',  // Softer yellow
        'hsl(125, 65%, 55%)', // Softer green
        'hsl(195, 65%, 55%)', // Softer blue
        'hsl(255, 65%, 55%)', // Softer purple
        'hsl(315, 65%, 55%)'  // Softer magenta
    ];
    
    // Ensure the index wraps around for more than 14 users.
    // Total unique colors available = 14 (indices 0 to 13).
    const modIndex = index % 14;
    
    if (modIndex < 7) {
        return vividColors[modIndex];
    } else {
        return lighterColors[modIndex - 7];
    }
}

  
// Helper function: Get color for user (consistent color for each user)
// function getColorForUser(userName) {
//     // Rainbow colors array: red, orange, yellow, green, blue, purple, violet
//     const rainbowColors = [
//         '#FF0000', // red
//         '#FF7F00', // orange
//         '#FFFF00', // yellow
//         '#00FF00', // green
//         '#0000FF', // blue
//         '#4B0082', // indigo/purple
//         '#9400D3'  // violet
//     ];
    
//     // Lighter versions of the same colors
//     const lighterRainbowColors = [
//         '#FF6666', // lighter red
//         '#FFAD66', // lighter orange
//         '#FFFF66', // lighter yellow
//         '#66FF66', // lighter green
//         '#6666FF', // lighter blue
//         '#8F66B2', // lighter purple
//         '#C266E3'  // lighter violet
//     ];
    
//     // Simple hash function for string to numeric value
//     let hash = 0;
//     for (let i = 0; i < userName.length; i++) {
//         hash = ((hash << 5) - hash) + userName.charCodeAt(i);
//         hash |= 0; // Convert to 32bit integer
//     }
    
//     hash = Math.abs(hash);
//     const colorIndex = hash % 7; // 7 colors in our array
    
//     // Use the hash to decide between regular and lighter colors
//     const useLight = (hash % 14) >= 7;
    
//     return useLight ? lighterRainbowColors[colorIndex] : rainbowColors[colorIndex];
// }

// // Sample data for development/demo purposes
// function getSampleData() {
//     return [
//         {
//             "name": "황선주",
//             "day": "Thursday",
//             "available_start_time": "19:00",
//             "available_end_time": "21:00"
//         },
//         {
//             "name": "황선주",
//             "day": "Tuesday",
//             "available_start_time": "16:00",
//             "available_end_time": "21:00"
//         },
//         {
//             "name": "Josh",
//             "day": "Monday",
//             "available_start_time": "10:00",
//             "available_end_time": "13:00"
//         },
//         {
//             "name": "Josh",
//             "day": "Wednesday",
//             "available_start_time": "10:00",
//             "available_end_time": "13:00"
//         },
//         {
//             "name": "Josh",
//             "day": "Tuesday",
//             "available_start_time": "11:00",
//             "available_end_time": "15:00"
//         },
//         {
//             "name": "Josh",
//             "day": "Thursday",
//             "available_start_time": "11:00",
//             "available_end_time": "15:00"
//         }
//     ];
// }
