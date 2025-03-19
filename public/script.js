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
    // CHANGE: Save any partial transcript before stopping
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
            
            // CHANGE: Add a small delay before allowing the stop on the last cycle
            // This ensures the last cycle has time to capture speech
            if (currentCycle >= totalCycles) {
                // Prevent immediate stopping on the last cycle by delaying the cycle completion
                autoRecordingInterval = setTimeout(() => {
                    if (recognition && isAutoRecording) {
                        try {
                            recognition.stop();
                        } catch (e) {
                            console.error("Error stopping speech recognition:", e);
                        }
                    }
                }, recordingDuration * 1000);
            } else {
                // For all other cycles, proceed as normal
                autoRecordingInterval = setTimeout(() => {
                    if (recognition && isAutoRecording) {
                        try {
                            recognition.stop();
                        } catch (e) {
                            console.error("Error stopping speech recognition:", e);
                        }
                    }
                }, recordingDuration * 1000);
            }
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
            // CHANGE: Check if we're on the last cycle
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
        } else {
            console.error("Failed to save text.");
        }
    })
    .catch(error => console.error("Error:", error));
}