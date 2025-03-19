const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = 3000;

// Initialize Gemini API with an API key
const GEMINI_API_KEY = 'AIzaSyBkFCbfZK0ZZyZCFTqT2MRjxXhNpbE4sdo'
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const filePath = 'storedTexts.json';

// Load stored texts when the server starts
let storedTexts = [];
if (fs.existsSync(filePath)) {
    try {
        storedTexts = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (error) {
        console.error("Error reading storedTexts.json:", error);
        storedTexts = []; // Reset if there's a read error
    }
}

// Function to save texts to file
function saveTextsToFile() {
    try {
        fs.writeFileSync(filePath, JSON.stringify(storedTexts, null, 2), 'utf-8');
    } catch (error) {
        console.error("Error writing to storedTexts.json:", error);
    }
}

// Route to save new text
app.post('/save', (req, res) => {
    const { text } = req.body;
    if (text) {
        storedTexts.push(text);
        saveTextsToFile();
        res.json({ success: true });
    } else {
        res.status(400).json({ error: "No text provided" });
    }
});

// Route to retrieve all stored texts
app.get('/texts', (req, res) => {
    res.json(storedTexts);
});

// Generate a story from a specific stored text
app.post('/generate-story', async (req, res) => {
    const { textIndex } = req.body;
    
    // Validate input
    if (textIndex === undefined || !Number.isInteger(parseInt(textIndex))) {
        return res.status(400).json({ error: "Invalid text index provided" });
    }
    
    const index = parseInt(textIndex);
    if (index < 0 || index >= storedTexts.length) {
        return res.status(400).json({ error: `Index out of range. Must be between 0 and ${storedTexts.length - 1}` });
    }
    
    const selectedText = storedTexts[index];
    
    try {
        // Use the Gemini model to generate a story
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        
        // Create a prompt for story generation
        const prompt = `You are an LLM that loves spread gossip about bits and pieces of information you hear. However, since they're just bits and pieces you feel it's necessary to add in details of your own and embellish things in order to get people interested about the things you heard. Given the following information, create some gossip that is roughly 2-3 sentences long being as creative as possible: "${selectedText}"`;
        
        console.log(`Generating story for text: "${selectedText}"`);
        
        // Generate the story
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const story = response.text();
        
        // Return both the original text and generated story
        res.json({
            success: true,
            originalText: selectedText,
            generatedStory: story
        });
    } catch (error) {
        console.error("Error generating story:", error);
        res.status(500).json({
            success: false,
            error: "Failed to generate story",
            details: error.message
        });
    }
});


// Simple test endpoint for Gemini API
app.get('/test-gemini', async (req, res) => {
    try {
        // Use the Gemini Flash model
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        // Simple prompt to test functionality
        const prompt = "Write a very brief hello world message.";

        // Log that we're making the request
        console.log("Requesting completion from Gemini API...");

        // Generate content
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Log success
        console.log("Gemini API test successful!");

        // Return the generated content
        res.json({
            success: true,
            message: "Gemini API is working",
            generated_text: text
        });
    } catch (error) {
        // Log and return error details
        console.error("Error with Gemini API:", error);

        // Detailed error info for debugging
        const errorDetails = {
            message: error.message,
            status: error.status || "unknown",
            details: error.errorDetails || "none"
        };

        res.status(500).json({
            success: false,
            message: "Failed to connect to Gemini API",
            error: errorDetails
        });
    }
});

// Serve index.html on root access
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server and store the instance
const server = app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('Try testing the Gemini API at: http://localhost:3000/test-gemini');
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});