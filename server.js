const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const cron = require('node-cron'); // Import the node-cron library

const app = express();
const db = new sqlite3.Database(':memory:');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Create a table for attendance
db.serialize(() => {
    db.run(`CREATE TABLE attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee TEXT,
        status TEXT,
        destination TEXT,
        start_date DATE,
        end_date DATE
    )`);
});

// Handle form submission
app.post('/submit-attendance', (req, res) => {
    const { employee, status, destination, start_date, end_date } = req.body;

    console.log("Received Data:", {
        employee,
        status,
        destination,
        start_date,
        end_date
    });

    db.run(`INSERT INTO attendance (employee, status, destination, start_date, end_date) VALUES (?, ?, ?, ?, ?)`,
        [employee, status, destination || null, start_date || null, end_date || null],
        function (err) {
            if (err) {
                console.error(err.message);
                return res.status(500).send("Database error");
            }
            res.redirect('/');
        }
    );
});

// Schedule a task to reset present employees at midnight every day
cron.schedule('0 0 * * *', () => {
    console.log('Resetting present employees...');
    db.run(`DELETE FROM attendance WHERE status = 'Present'`, (err) => {
        if (err) {
            console.error('Error resetting present employees:', err.message);
        } else {
            console.log('Successfully reset present employees.');
        }
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
    db.all(`SELECT * FROM attendance WHERE status = 'Outstation'`, [], (err, rows) => {
        if (err) {
            throw err;
        }
        res.json(rows);
    });
});

// Delete outstation record
app.delete('/outstation/:id', (req, res) => {
    const { id } = req.params;

    console.log("Delete Request for ID:", id);

    db.run(`DELETE FROM attendance WHERE id = ?`, [id], function (err) {
        if (err) {
            console.error(err.message);
            return res.status(500).send("Database error");
        }
        res.status(204).send();
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
