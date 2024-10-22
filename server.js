const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const db = new sqlite3.Database('./database.db');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '/public')));

// Create tables
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee TEXT NOT NULL,
        status TEXT NOT NULL,
        destination TEXT,
        start_date TEXT,
        end_date TEXT
    )`);
});

// Serve the index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/public/index.html'));
});

// Handle form submission
app.post('/submit-attendance', (req, res) => {
    const { employee, status, destination, start_date, end_date } = req.body;

    db.run(`INSERT INTO attendance (employee, status, destination, start_date, end_date) VALUES (?, ?, ?, ?, ?)`,
        [employee, status, destination || null, start_date || null, end_date || null],
        function (err) {
            if (err) {
                return console.error(err.message);
            }
            res.redirect('/');
        }
    );
});

// Delete outstation record
app.delete('/outstation/:id', (req, res) => {
    const { id } = req.params;

    db.run(`DELETE FROM attendance WHERE id = ?`, [id], function (err) {
        if (err) {
            return console.error(err.message);
        }
        res.status(204).send(); // No content response
    });
});

// Get employees present in the office
app.get('/present', (req, res) => {
    db.all(`SELECT employee FROM attendance WHERE status = 'Present'`, [], (err, rows) => {
        if (err) {
            throw err;
        }
        res.json(rows);
    });
});

// Get employees on outstation
app.get('/outstation', (req, res) => {
    db.all(`SELECT employee, destination, start_date, end_date FROM attendance WHERE status = 'Outstation'`, [], (err, rows) => {
        if (err) {
            throw err;
        }
        res.json(rows);
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
