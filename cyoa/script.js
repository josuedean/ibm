// Main script for the "Last Person on Earth" interactive story
// This script loads story data from JSON and handles the story navigation

// Key DOM elements
const storyTitle = document.getElementById('story-title');
const narrativeText = document.getElementById('narrative-text');
const storyImage = document.getElementById('story-image');
const choicesContainer = document.getElementById('choices-container');
const writingPrompts = document.getElementById('writing-prompts');

// Story data will be loaded here
let storyData = null;
let currentNodeId = null;

// Initialize the application
async function initStory() {
    try {
        // Fetch the story data from JSON file
        const response = await fetch('storyData.json');
        if (!response.ok) {
            throw new Error('Failed to load story data');
        }
        
        storyData = await response.json();
        
        // Set the page title
        storyTitle.textContent = storyData.title;
        document.title = storyData.title;
        
        // Get the starting node ID from URL parameter or use default
        const urlParams = new URLSearchParams(window.location.search);
        currentNodeId = urlParams.get('node') || storyData.startNode;
        
        // Render the current node
        renderNode(currentNodeId);
    } catch (error) {
        console.error('Error initializing story:', error);
        narrativeText.innerHTML = `<p class="error">Failed to load the story. Please try again later.</p>`;
    }
}

// Render a specific story node
function renderNode(nodeId) {
    // Ensure story data is loaded
    if (!storyData || !storyData.nodes) {
        console.error('Story data not properly loaded');
        narrativeText.innerHTML = `<p class="error">Story data could not be loaded. Please refresh the page.</p>`;
        return;
    }
    
    // Get the node data
    const node = storyData.nodes[nodeId];
    
    if (!node) {
        console.error(`Node "${nodeId}" not found in story data`);
        narrativeText.innerHTML = `<p class="error">Story branch not found.</p>`;
        
        // Add a restart button when node is not found
        choicesContainer.innerHTML = '';
        const restartButton = document.createElement('button');
        restartButton.className = 'restart-button';
        restartButton.textContent = 'Restart Story';
        restartButton.addEventListener('click', () => renderNode(storyData.startNode));
        choicesContainer.appendChild(restartButton);
        return;
    }
    
    // Update current node ID
    currentNodeId = nodeId;
    
    // Update URL without reloading page
    const url = new URL(window.location);
    url.searchParams.set('node', nodeId);
    window.history.pushState({}, '', url);
    
    // Set the narrative text (with fallback)
    narrativeText.innerHTML = `<p>${node.narrativeText || 'No narrative text available for this scene.'}</p>`;
    
    // Set the image with error handling
    storyImage.onerror = function() {
        // If image fails to load, replace with a text description
        this.style.display = 'flex';
        this.style.alignItems = 'center';
        this.style.justifyContent = 'center';
        this.style.backgroundColor = '#f0f0f0';
        this.style.height = '300px';
        this.style.color = '#333';
        this.style.fontStyle = 'italic';
        this.style.padding = '20px';
        this.style.textAlign = 'center';
        this.innerHTML = `<div>Scene description for "${nodeId}": ${node.narrativeText.substring(0, 100)}...</div>`;
    };
    storyImage.src = node.image || 'images/placeholder.png';
    storyImage.alt = `Scene from ${nodeId}`;
    
    // Clear existing choices
    choicesContainer.innerHTML = '';
    
    // Add new choices if there are any
    if (node.choices && node.choices.length > 0) {
        node.choices.forEach(choice => {
            if (!choice || !choice.targetId) {
                console.error('Invalid choice data in node:', nodeId);
                return; // Skip this choice if it's invalid
            }
            
            const button = document.createElement('button');
            button.className = 'choice-button';
            button.textContent = choice.label || 'Unlabeled choice';
            button.addEventListener('click', () => renderNode(choice.targetId));
            choicesContainer.appendChild(button);
        });
        
        // If we processed choices but none were valid, show a message
        if (choicesContainer.children.length === 0) {
            const message = document.createElement('p');
            message.className = 'error-message';
            message.textContent = 'No valid choices available. Story may be incomplete.';
            choicesContainer.appendChild(message);
            
            // Add a restart button
            const restartButton = document.createElement('button');
            restartButton.className = 'restart-button';
            restartButton.textContent = 'Restart Story';
            restartButton.addEventListener('click', () => renderNode(storyData.startNode));
            choicesContainer.appendChild(restartButton);
        }
    } else {
        // This is an ending node (no more choices)
        const message = document.createElement('p');
        message.className = 'ending-message';
        message.textContent = 'The End';
        choicesContainer.appendChild(message);
        
        // Add a restart button
        const restartButton = document.createElement('button');
        restartButton.className = 'choice-button restart-button';
        restartButton.textContent = 'Restart Story';
        restartButton.addEventListener('click', () => renderNode(storyData.startNode));
        choicesContainer.appendChild(restartButton);
    }
    
    // Clear existing writing prompts
    writingPrompts.innerHTML = '';
    
    // Add writing prompts if any
    if (node.writingPrompts && node.writingPrompts.length > 0) {
        // const heading = document.createElement('h3');
        // heading.textContent = 'Writing Prompts:';
        // writingPrompts.appendChild(heading);

        const list = document.createElement('ul');
        node.writingPrompts.forEach(prompt => {
            if (!prompt) return; // Skip empty prompts
            const item = document.createElement('li');
            item.textContent = prompt;
            list.appendChild(item);
        });
        
        // Only append the list if it has items
        if (list.children.length > 0) {
            writingPrompts.appendChild(list);
        } else {
            // Remove the heading if there are no valid prompts
            writingPrompts.innerHTML = '';
        }
    }
    
    // Scroll to top when changing nodes
    window.scrollTo(0, 0);
}

// Save progress to local storage
function saveProgress() {
    if (currentNodeId) {
        localStorage.setItem('lastStoryNode', currentNodeId);
    }
}

// Load progress from local storage
function loadProgress() {
    return localStorage.getItem('lastStoryNode');
}

// Add event listener to save progress when user leaves the page
window.addEventListener('beforeunload', saveProgress);

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', initStory);

// Add a global error handler for uncaught errors
window.addEventListener('error', function(event) {
    console.error('Application error:', event.error);
    
    // Only show the error message if the narrative text element exists
    if (narrativeText) {
        narrativeText.innerHTML = `<p class="error">An error occurred while loading the story. Please refresh the page.</p>`;
    }
    
    // Prevent default browser error handling
    event.preventDefault();
});
