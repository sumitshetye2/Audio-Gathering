const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

let storedTexts = [];

app.post('/save', (req, res) => {
    const { text } = req.body;
    storedTexts.push(text);
    fs.writeFileSync('storedTexts.json', JSON.stringify(storedTexts, null, 2));
    res.json({ success: true });
});

app.get('/texts', (req, res) => {
    res.json(storedTexts);
});

// Serve index.html when accessing the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));

process.on('SIGINT', () => {
    console.log("Server shutting down...");
    Server.close(() => {
        console.log("Server has been stopped");
        process.exit(0);
    });
    fs.writeFileSync('storedTexts.json', JSON.stringify(storedTexts, null, 2));
    process.exit();
});


