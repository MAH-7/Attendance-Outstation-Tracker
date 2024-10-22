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

// Function to format time to 12-hour format
function formatTo12Hour(time) {
  let [hours, minutes] = time.split(":").map(Number);
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12; // Convert to 12-hour format
  hours = hours ? hours : 12; // the hour '0' should be '12'
  return `${hours}:${minutes < 10 ? "0" + minutes : minutes} ${ampm}`;
}

// Handle form submission
app.post("/submit-attendance", (req, res) => {
    const { employee, status, destination, start_date, end_date, check_in_time } = req.body;

    // Calculate back time based on check-in time only if Present
    let back_time = null;
    if (status === "Present" && check_in_time) {
        const [hours, minutes] = check_in_time.split(":").map(Number);
        const checkInDate = new Date();
        checkInDate.setHours(hours, minutes, 0, 0);
        checkInDate.setHours(checkInDate.getHours() + 9); // Set back time
        back_time = formatTo12Hour(checkInDate.toTimeString().split(" ")[0]); // Format as 12-hour
    }

    db.run(
        `INSERT INTO attendance (employee, status, destination, start_date, end_date, check_in_time, back_time) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            employee,
            status,
            destination || null,
            start_date || null,
            end_date || null,
            status === "Present" ? check_in_time : null, // Only set check_in_time for Present
            back_time,
        ],
        function (err) {
            if (err) {
                console.error(err.message);
                return res.status(500).send("Database error");
            }
            res.redirect("/");
        }
    );
});


// Schedule a task to reset present employees at midnight every day
cron.schedule("0 0 * * *", () => {
  console.log("Resetting present employees...");
  db.run(`DELETE FROM attendance WHERE status = 'Present'`, (err) => {
    if (err) {
      console.error("Error resetting present employees:", err.message);
    } else {
      console.log("Successfully reset present employees.");
    }
  });
});

// Get employees present in the office
app.get("/present", (req, res) => {
  db.all(
    `SELECT employee, check_in_time, back_time FROM attendance WHERE status = 'Present'`,
    [],
    (err, rows) => {
      if (err) {
        throw err;
      }
      res.json(rows);
    }
  );
});

// Get employees on outstation
app.get("/outstation", (req, res) => {
  db.all(
    `SELECT * FROM attendance WHERE status = 'Outstation'`,
    [],
    (err, rows) => {
      if (err) {
        throw err;
      }
      res.json(rows);
    }
  );
});

// Delete outstation record
app.delete("/outstation/:id", (req, res) => {
  const { id } = req.params;

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
