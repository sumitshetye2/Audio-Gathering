let recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.continuous = false;
recognition.interimResults = false;
recognition.lang = 'en-US';

recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    document.getElementById('text-output').innerText = transcript;

    saveText(transcript);
};

recognition.onend = () => {
    console.log("Recognition ended.");
};

//random time between 5 and 10 seconds
function getRandomInterval() {
    return Math.floor(Math.random() * (10000 - 5000 + 1))  + 5000;
}

function startRecognition() {
    console.log("Starting speech recognition...");
    document.getElementById('text-output').innerText = "Listening...";
    recognition.start();

    setTimeout(() =>{
        recognition.stop();
        setTimeout(startRecognition, getRandomInterval());
    }, getRandomInterval());
}

startRecognition();


function startRecording() {
    document.getElementById('text-output').innerText = "Listening...";
    recognition.start();
}

function saveText(text) {
    if (!text || text === "Listening...") {
        alert("No text to save.");
        return;
    }
    fetch('/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
    })
    .then(response => response.json())
    .then(data => alert("Text saved successfully!"))
    .catch(error => console.error("Error saving text:", error));
}
