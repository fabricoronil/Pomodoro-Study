const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

// Vercel provides a writable /tmp directory
const DB_FILE_PATH = path.join('/tmp', 'db.json');
const INITIAL_DB_PATH = path.join(process.cwd(), 'api', 'db.json');

// Initialize the database file in /tmp if it doesn't exist, using the one in /api as a template
if (!fs.existsSync(DB_FILE_PATH)) {
    const initialData = fs.readFileSync(INITIAL_DB_PATH);
    fs.writeFileSync(DB_FILE_PATH, initialData);
}

app.use(cors());
app.use(bodyParser.json());

// Helper function to read from the database file
const readDB = () => {
    const data = fs.readFileSync(DB_FILE_PATH);
    return JSON.parse(data);
};

// Helper function to write to the database file
const writeDB = (data) => {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2));
};

// =================================================================================
// AUTHENTICATION ROUTES
// =================================================================================

app.post('/register', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    const db = readDB();
    const userExists = db.users.find(user => user.email === email);

    if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
    }

    const newUser = { email, password }; // In a real app, you should hash the password
    db.users.push(newUser);
    db.pomodoros[email] = []; // Initialize pomodoro history for the new user
    writeDB(db);

    res.status(201).json({ message: 'User registered successfully' });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    const db = readDB();
    const user = db.users.find(user => user.email === email && user.password === password);

    if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    res.status(200).json({ message: 'Login successful', user });
});

// =================================================================================
// POMODORO ROUTES
// =================================================================================

app.get('/pomodoros/:email', (req, res) => {
    const { email } = req.params;
    const db = readDB();

    if (!db.pomodoros[email]) {
        // If user exists but has no pomodoros, return empty array
        if (db.users.find(user => user.email === email)) {
            return res.status(200).json([]);
        }
        return res.status(404).json({ message: 'No data found for this user' });
    }

    res.status(200).json(db.pomodoros[email]);
});

app.post('/pomodoros', (req, res) => {
    const { email, pomodoro } = req.body;
    if (!email || !pomodoro) {
        return res.status(400).json({ message: 'Email and pomodoro data are required' });
    }

    const db = readDB();
    if (!db.pomodoros[email]) {
        db.pomodoros[email] = [];
    }

    db.pomodoros[email].push(pomodoro);
    writeDB(db);

    res.status(201).json({ message: 'Pomodoro session saved' });
});

// Export the app for Vercel
module.exports = app;