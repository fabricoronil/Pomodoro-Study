
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

const DB_FILE_PATH = path.join('/tmp', 'db.json');
const INITIAL_DB_PATH = path.join(__dirname, 'db.json');

// Initialize the database file
if (!fs.existsSync(DB_FILE_PATH)) {
    const initialData = JSON.parse(fs.readFileSync(INITIAL_DB_PATH));
    if (!initialData.timers) {
        initialData.timers = {};
    }
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(initialData, null, 2));
}

app.use(cors());
app.use(bodyParser.json());

const readDB = () => {
    return JSON.parse(fs.readFileSync(DB_FILE_PATH));
};

const writeDB = (data) => {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2));
};

// =================================================================================
// AUTH ROUTES
// =================================================================================

app.post('/register', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }
    const db = readDB();
    if (db.users.find(user => user.email === email)) {
        return res.status(400).json({ message: 'User already exists' });
    }
    const newUser = { email, password };
    db.users.push(newUser);
    if (!db.pomodoros[email]) db.pomodoros[email] = [];
    if (!db.timers) db.timers = {};
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
// POMODORO HISTORY ROUTES
// =================================================================================

app.get('/pomodoros/:email', (req, res) => {
    const { email } = req.params;
    const db = readDB();
    if (!db.pomodoros[email]) {
        return res.status(200).json([]);
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

// =================================================================================
// TIMER STATE ROUTES
// =================================================================================

app.post('/timer/start', (req, res) => {
    const { email, duration, isWorkTime, workDuration, breakDuration, currentSubject, sessionCount } = req.body;
    if (!email || !duration) {
        return res.status(400).json({ message: 'Email and duration are required' });
    }
    const db = readDB();
    if (!db.timers) {
        db.timers = {};
    }
    db.timers[email] = {
        endTime: Date.now() + duration * 1000,
        isWorkTime,
        workDuration,
        breakDuration,
        currentSubject,
        sessionCount
    };
    writeDB(db);
    res.status(200).json({ message: 'Timer started on server' });
});

app.get('/timer/:email', (req, res) => {
    const { email } = req.params;
    const db = readDB();
    const timerState = db.timers ? db.timers[email] : null;
    if (timerState) {
        res.status(200).json(timerState);
    } else {
        res.status(200).json(null); // Send null if no timer is active
    }
});

app.post('/timer/stop', (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }
    const db = readDB();
    if (db.timers && db.timers[email]) {
        delete db.timers[email];
        writeDB(db);
    }
    res.status(200).json({ message: 'Timer stopped on server' });
});


// Export the app for Vercel
module.exports = app;
