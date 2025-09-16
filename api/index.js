console.log('API Function Started');

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

console.log('Initializing DB path variables...');
const DB_FILE_PATH = path.join('/tmp', 'db.json');
const INITIAL_DB_PATH = path.join(__dirname, 'db.json');
console.log(`Temp DB Path: ${DB_FILE_PATH}`);
console.log(`Initial DB Path: ${INITIAL_DB_PATH}`);

// Initialize the database file
try {
    console.log('Checking for temp DB file...');
    if (!fs.existsSync(DB_FILE_PATH)) {
        console.log('Temp DB file not found. Creating it...');
        const initialData = fs.readFileSync(INITIAL_DB_PATH);
        fs.writeFileSync(DB_FILE_PATH, initialData);
        console.log('Temp DB file created successfully.');
    }
} catch (error) {
    console.error('!!! CRITICAL ERROR INITIALIZING DB !!!', error);
    // We will let the function continue, but subsequent reads/writes will likely fail.
}

app.use(cors());
app.use(express.json());

const readDB = () => {
    const data = fs.readFileSync(DB_FILE_PATH);
    return JSON.parse(data);
};

const writeDB = (data) => {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2));
};

// =================================================================================
// AUTH ROUTES
// =================================================================================

app.post('/register', (req, res) => {
    try {
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
    } catch (error) {
        console.error('Error in /register endpoint:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/login', (req, res) => {
    try {
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
    } catch (error) {
        console.error('Error in /login endpoint:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// ... (rest of the routes with similar try-catch blocks)

// =================================================================================
// POMODORO HISTORY ROUTES
// =================================================================================

app.get('/pomodoros/:email', (req, res) => {
    try {
        const { email } = req.params;
        const db = readDB();
        if (!db.pomodoros[email]) {
            return res.status(200).json([]);
        }
        res.status(200).json(db.pomodoros[email]);
    } catch (error) {
        console.error('Error in /pomodoros/:email endpoint:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/pomodoros', (req, res) => {
    try {
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
    } catch (error) {
        console.error('Error in /pomodoros endpoint:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// =================================================================================
// TIMER STATE ROUTES
// =================================================================================

app.post('/timer/start', (req, res) => {
    try {
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
    } catch (error) {
        console.error('Error in /timer/start endpoint:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/timer/:email', (req, res) => {
    try {
        const { email } = req.params;
        const db = readDB();
        const timerState = db.timers ? db.timers[email] : null;
        if (timerState) {
            res.status(200).json(timerState);
        } else {
            res.status(200).json(null);
        }
    } catch (error) {
        console.error('Error in /timer/:email endpoint:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/timer/stop', (req, res) => {
    try {
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
    } catch (error) {
        console.error('Error in /timer/stop endpoint:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


// Export the app for Vercel
module.exports = app;