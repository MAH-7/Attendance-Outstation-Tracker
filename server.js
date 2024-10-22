const express = require("express");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();
const cron = require("node-cron");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public")); // Serve static files from 'public' directory

// Set up SQLite database
const db = new sqlite3.Database(":memory:");
db.serialize(() => {
  db.run("CREATE TABLE attendance (id INTEGER PRIMARY KEY, employee TEXT, status TEXT, check_in_time TEXT, back_time TEXT)");
  db.run("CREATE TABLE outstation (id INTEGER PRIMARY KEY, employee TEXT, destination TEXT, start_date TEXT, end_date TEXT)");
});

// Cron job to reset attendance records every day at midnight
cron.schedule("0 0 * * *", () => {
  db.run("DELETE FROM attendance", (err) => {
    if (err) {
      console.error("Error resetting attendance records:", err);
    } else {
      console.log("Attendance records reset successfully.");
    }
  });
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

  let back_time = null;

  if (status === "Present" && check_in_time) {
    const [hours, minutes] = check_in_time.split(":").map(Number);
    const checkInDate = new Date();
    checkInDate.setHours(hours);
    checkInDate.setMinutes(minutes);
    // Simulate back time 8 hours later
    checkInDate.setHours(checkInDate.getHours() + 8);
    back_time = formatTo12Hour(checkInDate.toTimeString().slice(0, 5));
  }

  if (status === "Present") {
    db.run(
      "INSERT INTO attendance (employee, status, check_in_time, back_time) VALUES (?, ?, ?, ?)",
      [employee, status, check_in_time, back_time],
      function (err) {
        if (err) {
          console.error("Error inserting attendance:", err);
          return res.status(500).send("Error inserting attendance");
        }
        res.redirect("/");
      }
    );
  } else if (status === "Outstation") {
    db.run(
      "INSERT INTO outstation (employee, destination, start_date, end_date) VALUES (?, ?, ?, ?)",
      [employee, destination, start_date, end_date],
      function (err) {
        if (err) {
          console.error("Error inserting outstation:", err);
          return res.status(500).send("Error inserting outstation");
        }
        res.redirect("/");
      }
    );
  } else {
    res.status(400).send("Invalid status");
  }
});

// Fetch present employees
app.get("/present", (req, res) => {
  db.all("SELECT employee, check_in_time, back_time FROM attendance WHERE status = 'Present'", [], (err, rows) => {
    if (err) {
      console.error("Error fetching present employees:", err);
      return res.status(500).send("Error fetching present employees");
    }
    res.json(rows);
  });
});

// Fetch outstation employees
app.get("/outstation", (req, res) => {
  db.all("SELECT * FROM outstation", [], (err, rows) => {
    if (err) {
      console.error("Error fetching outstation employees:", err);
      return res.status(500).send("Error fetching outstation employees");
    }
    res.json(rows);
  });
});

// Delete outstation entry
app.delete("/outstation/:id", (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM outstation WHERE id = ?", id, (err) => {
    if (err) {
      console.error("Error deleting outstation entry:", err);
      return res.status(500).send("Error deleting outstation entry");
    }
    res.sendStatus(200);
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
