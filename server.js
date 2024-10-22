const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const path = require("path");
const cron = require("node-cron");

const app = express();
const db = new sqlite3.Database(":memory:");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Create a table for attendance
db.serialize(() => {
    db.run(`CREATE TABLE attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee TEXT,
        status TEXT,
        destination TEXT,
        start_date DATE,
        end_date DATE,
        check_in_time TIME,
        back_time TIME
    )`);
});

// Handle form submission
app.post("/submit-attendance", (req, res) => {
    const { employee, status, destination, start_date, end_date, check_in_time } = req.body;

    let back_time = null;
    if (status === "Present" && check_in_time) {
        const [hours, minutes] = check_in_time.split(":").map(Number);
        const checkInDate = new Date();
        checkInDate.setHours(hours, minutes, 0, 0);
        checkInDate.setHours(checkInDate.getHours() + 9);
        back_time = checkInDate.toTimeString().split(" ")[0]; // 24-hour format
    }

    db.run(`INSERT INTO attendance (employee, status, destination, start_date, end_date, check_in_time, back_time) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [employee, status, destination || null, start_date || null, end_date || null, status === "Present" ? check_in_time : null, back_time],
        function(err) {
            if (err) {
                console.error(err.message);
                return res.status(500).send("Database error");
            }
            res.redirect("/");
        }
    );
});

// Get all attendance data
app.get("/attendance-data", (req, res) => {
    db.all(`SELECT * FROM attendance`, [], (err, rows) => {
        if (err) {
            throw err;
        }
        res.json(rows);
    });
});

// Delete outstation record
app.delete("/outstation/:id", (req, res) => {
    const { id } = req.params;

    db.run(`DELETE FROM attendance WHERE id = ?`, [id], function(err) {
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
