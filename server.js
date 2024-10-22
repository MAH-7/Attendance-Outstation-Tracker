const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const path = require("path");
const cron = require("node-cron"); // Import the node-cron library

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
  const { employee, status, destination, start_date, end_date, check_in_time } =
    req.body;

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
      destination || null,
      start_date || null,
      end_date || null,
      // Only set check_in_time if status is Present
      status === "Present" ? check_in_time : null,
      back_time,
    ],
    (err) => {
      if (err) {
        console.error("Error inserting data:", err.message);
        res.status(500).send("Error inserting data");
      } else {
        res.redirect("/");
      }
    }
  );
});

// Endpoint to fetch present employees
app.get("/present", (req, res) => {
  db.all(
    `SELECT employee, check_in_time, back_time FROM attendance WHERE status = 'Present'`,
    [],
    (err, rows) => {
      if (err) {
        console.error("Error fetching present employees:", err.message);
        res.status(500).send("Error fetching present employees");
      } else {
        res.json(rows);
      }
    }
  );
});

// Endpoint to fetch outstation employees
app.get("/outstation", (req, res) => {
  db.all(
    `SELECT id, employee, destination, start_date, end_date FROM attendance WHERE status = 'Outstation'`,
    [],
    (err, rows) => {
      if (err) {
        console.error("Error fetching outstation employees:", err.message);
        res.status(500).send("Error fetching outstation employees");
      } else {
        res.json(rows);
      }
    }
  );
});

// Endpoint to delete outstation records
app.delete("/outstation/:id", (req, res) => {
  const id = req.params.id;
  db.run(`DELETE FROM attendance WHERE id = ?`, [id], function (err) {
    if (err) {
      console.error("Error deleting outstation:", err.message);
      res.status(500).send("Error deleting outstation");
    } else {
      res.status(200).send("Outstation deleted successfully");
    }
  });
});

// Reset attendance records at the end of each day
cron.schedule("59 23 * * *", () => {
  db.run(`DELETE FROM attendance`, (err) => {
    if (err) {
      console.error("Error resetting attendance records:", err.message);
    } else {
      console.log("Attendance records reset successfully.");
    }
  });
});

// Serve the index.html file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
