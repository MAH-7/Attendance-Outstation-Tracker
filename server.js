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

  console.log("Received Data:", {
    employee,
    status,
    destination,
    start_date,
    end_date,
    check_in_time,
  });

  // Calculate back time based on check-in time
  let back_time = null;
  if (status === "Present" && check_in_time) {
    const [hours, minutes] = check_in_time.split(":").map(Number);
    const checkInDate = new Date();
    checkInDate.setHours(hours, minutes, 0, 0);

    // Set back time to 9 hours after check-in (8 hours work + 1 hour lunch)
    checkInDate.setHours(checkInDate.getHours() + 9);
    back_time = formatTo12Hour(checkInDate.toTimeString().split(" ")[0]); // Format as 12-hour
  }

  db.run(
    `INSERT INTO attendance (employee, status, destination, start_date, end_date, check_in_time, back_time) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      employee,
      status,
      status === "Outstation" ? destination : null, // Only set destination for Outstation
      status === "Outstation" ? start_date : null,   // Only set start_date for Outstation
      status === "Outstation" ? end_date : null,     // Only set end_date for Outstation
      status === "Present" ? check_in_time : null,   // Only set check_in_time for Present
      back_time,
    ],
    function (err) {
      if (err) {
        console.error("Error inserting attendance:", err);
        return res.status(500).send("Error inserting attendance");
      }
      res.redirect("/");
    }
  );
});

// Helper function to format time to 12-hour format
function formatTo12Hour(time) {
  if (!time) return ""; // Handle null or undefined time
  let [hours, minutes] = time.split(":").map(Number);
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12; // Convert to 12-hour format
  hours = hours ? hours : 12; // the hour '0' should be '12'
  return `${hours}:${minutes < 10 ? "0" + minutes : minutes} ${ampm}`;
}

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
