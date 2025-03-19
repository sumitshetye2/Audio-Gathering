let recognition = null;

// Initialize recognition with proper error handling
function initRecognition() {
    try {
        // Create a new instance each time to avoid potential issues with reusing instances
        return new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    } catch (e) {
        console.error("Speech recognition not supported in this browser:", e);
        return null;
    }
}

// Configuration variables
const recordingDuration = 10; // seconds per recording session
const pauseDuration = 5; // seconds to pause between recordings
const totalCycles = 5; // number of recording cycles
let currentCycle = 0;
let currentTranscript = "";
let isAutoRecording = false;
let isManualRecording = false;
let autoRecordingInterval = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('text-output').innerText = "Ready for recording. Choose a recording mode.";
});

// Manual recording toggle function
function toggleManualRecording() {
    if (isAutoRecording) {
        alert("Please stop auto-recording first.");
        return;
    }
    
    if (!isManualRecording) {
        // Start manual recording
        isManualRecording = true;
        currentTranscript = "";
        document.getElementById('manual-recording').textContent = "Stop Recording";
        document.getElementById('manual-recording').classList.add('active');
        document.getElementById('auto-recording').disabled = true;
        document.getElementById('text-output').innerText = "Manual recording started... Speak now.";
        
        // Initialize a fresh recognition instance
        recognition = initRecognition();
        if (!recognition) {
            alert("Speech recognition is not supported in your browser.");
            stopManualRecording();
            return;
        }
        
        // Set up event handlers for this instance
        setupRecognitionHandlers();
        
        // Start recognition
        try {
            recognition.continuous = true;
            recognition.interimResults = false;
            recognition.lang = 'en-US';
            recognition.start();
        } catch (e) {
            console.error("Error starting speech recognition:", e);
            alert("Error starting speech recognition. Please try again.");
            stopManualRecording();
        }
    } else {
        // Stop manual recording
        stopManualRecording();
    }
}

function stopManualRecording() {
    if (isManualRecording) {
        isManualRecording = false;
        document.getElementById('manual-recording').textContent = "Start Recording";
        document.getElementById('manual-recording').classList.remove('active');
        document.getElementById('auto-recording').disabled = false;
        
        // Stop recognition if active
        if (recognition) {
            try {
                recognition.stop();
            } catch (e) {
                console.error("Error stopping speech recognition:", e);
            }
        }
    }
}

// Auto-recording functions
function toggleAutoRecording() {
    if (isManualRecording) {
        alert("Please stop manual recording first.");
        return;
    }
    
    if (!isAutoRecording) {
        // Start auto-recording
        isAutoRecording = true;
        currentCycle = 0;
        document.getElementById('auto-recording').textContent = "Stop Auto-Recording";
        document.getElementById('auto-recording').classList.add('active');
        document.getElementById('manual-recording').disabled = true;
        document.getElementById('text-output').innerText = "Auto-recording will begin shortly...";
        
        // Start the first recording cycle after a short delay
        setTimeout(startAutomaticRecordingCycle, 1000);
    } else {
        // Stop auto-recording
        stopAutoRecording();
    }
}

function stopAutoRecording() {
    // Save any partial transcript before stopping
    if (isAutoRecording && currentTranscript && currentTranscript.trim() !== "") {
        saveText(currentTranscript.trim());
        document.getElementById('text-output').innerText = `Auto-recording stopped. Last recording saved: "${currentTranscript.trim()}"`;
    } else {
        document.getElementById('text-output').innerText = "Auto-recording stopped.";
    }
    
    isAutoRecording = false;
    currentCycle = 0;
    document.getElementById('auto-recording').textContent = "Start Auto-Recording";
    document.getElementById('auto-recording').classList.remove('active');
    document.getElementById('manual-recording').disabled = false;
    
    // Stop any active recognition
    if (recognition) {
        try {
            recognition.stop();
        } catch (e) {
            // Ignore errors when stopping (might not be active)
        }
    }
    
    // Clear any pending timeouts
    clearTimeout(autoRecordingInterval);
}

function startAutomaticRecordingCycle() {
    if (!isAutoRecording) return;
    
    if (currentCycle < totalCycles) {
        currentCycle++;
        currentTranscript = "";
        document.getElementById('text-output').innerText = `Auto-recording cycle ${currentCycle}/${totalCycles}... Listening...`;
        
        // Initialize a fresh recognition instance
        recognition = initRecognition();
        if (!recognition) {
            alert("Speech recognition is not supported in your browser.");
            stopAutoRecording();
            return;
        }
        
        // Set up event handlers for this instance
        setupRecognitionHandlers();
        
        // Start recognition
        try {
            recognition.continuous = true;
            recognition.interimResults = false;
            recognition.lang = 'en-US';
            recognition.start();
            
            // Set timeout to stop after specified duration
            autoRecordingInterval = setTimeout(() => {
                if (recognition && isAutoRecording) {
                    try {
                        recognition.stop();
                    } catch (e) {
                        console.error("Error stopping speech recognition:", e);
                    }
                }
            }, recordingDuration * 1000);
        } catch (e) {
            console.error("Error starting speech recognition:", e);
            alert("Error in auto-recording. Please try again.");
            stopAutoRecording();
            return;
        }
    } else {
        stopAutoRecording();
        document.getElementById('text-output').innerText = "Auto-recording complete. All cycles finished.";
    }
}

// Populate the dropdown with stored texts
function populateTextSelector() {
    fetch('/texts')
        .then(response => response.json())
        .then(data => {
            const selector = document.getElementById('text-selector');
            
            // Clear existing options (except the first placeholder)
            while (selector.options.length > 1) {
                selector.remove(1);
            }
            
            // Add options for each stored text
            data.forEach((text, index) => {
                const option = document.createElement('option');
                option.value = index;
                
                // Truncate text if it's too long for the dropdown
                const truncatedText = text.length > 60 
                    ? text.substring(0, 60) + '...' 
                    : text;
                    
                option.textContent = truncatedText;
                selector.appendChild(option);
            });
            
            // Enable or disable the generate button based on selection
            checkGenerateButtonState();
        })
        .catch(error => {
            console.error("Error fetching texts for dropdown:", error);
            alert("Couldn't load your stored texts. Please try again later.");
        });
}

// Enable/disable generate button based on dropdown selection
function checkGenerateButtonState() {
    const selector = document.getElementById('text-selector');
    const generateBtn = document.getElementById('generate-story-btn');
    
    generateBtn.disabled = !selector.value;
}

// Generate a story from the selected text
function generateStory() {
    const selector = document.getElementById('text-selector');
    const selectedIndex = selector.value;
    
    if (!selectedIndex) {
        alert("Please select a text first.");
        return;
    }
    
    // Show the story container and loading indicator
    document.getElementById('story-container').classList.remove('hidden');
    document.getElementById('story-loading').classList.remove('hidden');
    document.getElementById('story-content').innerHTML = '';
    
    // Make API request to generate story
    fetch('/generate-story', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ textIndex: selectedIndex })
    })
    .then(response => response.json())
    .then(data => {
        // Hide loading indicator
        document.getElementById('story-loading').classList.add('hidden');
        
        if (data.success) {
            // Display the original text and generated story
            document.getElementById('original-text').textContent = data.originalText;
            
            // Format the story text with paragraphs
            const formattedStory = data.generatedStory
                .split('\n')
                .filter(para => para.trim() !== '')
                .map(para => `<p>${para}</p>`)
                .join('');
                
            document.getElementById('story-content').innerHTML = formattedStory;
        } else {
            // Show error message
            document.getElementById('story-content').innerHTML = 
                `<p class="error">Error: ${data.error || 'Failed to generate story'}</p>`;
        }
    })
    .catch(error => {
        console.error("Error generating story:", error);
        document.getElementById('story-loading').classList.add('hidden');
        document.getElementById('story-content').innerHTML = 
            '<p class="error">An error occurred while generating the story. Please try again.</p>';
    });
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('text-output').innerText = "Ready for recording. Choose a recording mode.";
    
    // Populate the text selector dropdown
    populateTextSelector();
    
    // Add change listener to the selector
    document.getElementById('text-selector').addEventListener('change', checkGenerateButtonState);
});



// Set up event handlers for recognition instance
function setupRecognitionHandlers() {
    if (!recognition) return;
    
    recognition.onresult = function(event) {
        // Loop through all results from this session
        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
                currentTranscript += event.results[i][0].transcript + " ";
            }
        }
        
        if (isManualRecording) {
            document.getElementById('text-output').innerText = `Recording: "${currentTranscript.trim()}"`;
        } else if (isAutoRecording) {
            document.getElementById('text-output').innerText = `Cycle ${currentCycle}/${totalCycles}: "${currentTranscript.trim()}"`;
        }
    };

    recognition.onend = function() {
        // Save the accumulated transcript if there's content
        if (currentTranscript && currentTranscript.trim() !== "") {
            saveText(currentTranscript.trim());
        }
        
        if (isManualRecording) {
            // For manual mode, we stay stopped after recognition ends
            stopManualRecording();
            document.getElementById('text-output').innerText = `Recording saved: "${currentTranscript.trim()}"`;
        } 
        else if (isAutoRecording) {
            // Check if we're on the last cycle
            if (currentCycle >= totalCycles) {
                // If this is the last cycle, finish auto-recording
                document.getElementById('text-output').innerText = `Auto-recording complete. All cycles finished.`;
                stopAutoRecording();
            } else {
                // For intermediate cycles, continue as normal
                document.getElementById('text-output').innerText = `Cycle ${currentCycle}/${totalCycles} completed. Pausing for ${pauseDuration} seconds...`;
                autoRecordingInterval = setTimeout(startAutomaticRecordingCycle, pauseDuration * 1000);
            }
        }
    };
    
    recognition.onerror = function(event) {
        console.error("Speech recognition error:", event.error);
        if (event.error === 'not-allowed') {
            alert("Microphone access was denied. Please allow microphone access to use the recorder.");
        }
    };
}

function fetchStoredTexts() {
    fetch('/texts')
        .then(response => response.json())
        .then(data => {
            alert("Stored Texts:\n" + data.join("\n\n"));
        })
        .catch(error => console.error("Error fetching stored texts:", error));
}

function saveText(text) {
    fetch('/save', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log("Text saved successfully!");
            // Refresh the dropdown to include the new text
            populateTextSelector();
        } else {
            console.error("Failed to save text.");
        }
    })
    .catch(error => console.error("Error:", error));
}