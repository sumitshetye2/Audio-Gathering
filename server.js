// server.js

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = 3000;

const GEMINI_API_KEY = 'AIzaSyBkFCbfZK0ZZyZCFTqT2MRjxXhNpbE4sdo';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const filePath = 'storedTexts.json';

let storedTexts = [];
if (fs.existsSync(filePath)) {
    try {
        storedTexts = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (error) {
        console.error("Error reading storedTexts.json:", error);
        storedTexts = [];
    }
}

function saveTextsToFile() {
    try {
        fs.writeFileSync(filePath, JSON.stringify(storedTexts, null, 2), 'utf-8');
    } catch (error) {
        console.error("Error writing to storedTexts.json:", error);
    }
}

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

app.get('/texts', (req, res) => {
    res.json(storedTexts);
});

app.post('/generate-story', async (req, res) => {
    const { textIndex } = req.body;

    if (textIndex === undefined || !Number.isInteger(parseInt(textIndex))) {
        return res.status(400).json({ error: "Invalid text index provided" });
    }

    const index = parseInt(textIndex);
    if (index < 0 || index >= storedTexts.length) {
        return res.status(400).json({ error: `Index out of range. Must be between 0 and ${storedTexts.length - 1}` });
    }

    const selectedText = storedTexts[index];

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const prompt = `You are an LLM that loves spread gossip about bits and pieces of information you hear. However, since they're just bits and pieces you feel it's necessary to add in details of your own and embellish things in order to get people interested about the things you heard. Given the following information, create some gossip that is roughly 2-3 sentences long being as creative as possible: "${selectedText}"`;

        console.log(`Generating story for text: "${selectedText}"`);

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const story = response.text();

        res.json({
            success: true,
            originalText: selectedText,
            generatedStory: story,
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

app.get('/test-gemini', async (req, res) => {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const prompt = "Write a very brief hello world message.";
        console.log("Requesting completion from Gemini API...");
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        console.log("Gemini API test successful!");
        res.json({
            success: true,
            message: "Gemini API is working",
            generated_text: text
        });
    } catch (error) {
        console.error("Error with Gemini API:", error);
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

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const server = app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('Try testing the Gemini API at: http://localhost:3000/test-gemini');
});

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