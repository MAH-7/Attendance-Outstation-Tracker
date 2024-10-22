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

// Create attendance table
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

// Format time to 12-hour format
function formatTo12Hour(time) {
  let [hours, minutes] = time.split(":").map(Number);
  if (isNaN(hours) || isNaN(minutes)) {
    console.error(`Invalid time: ${time}`);
    return "Invalid Time"; // Return a placeholder if time is invalid
  }
  
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12; // Convert to 12-hour format
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

  // Validate check_in_time format
  if (status === "Present" && check_in_time) {
    const timePattern = /^\d{2}:\d{2}$/; // HH:mm format
    if (!timePattern.test(check_in_time)) {
      console.error(`Invalid check_in_time format: ${check_in_time}`);
      return res.status(400).send("Invalid check-in time format. Please use HH:mm.");
    }
  }

  // Calculate back time based on check-in time
  let back_time = null;
  if (status === "Present" && check_in_time) {
    const [hours, minutes] = check_in_time.split(":").map(Number);
    
    const checkInDate = new Date();
    checkInDate.setHours(hours, minutes, 0, 0);
    
    const dayOfWeek = checkInDate.getDay(); // Get the day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)

    // Set back time based on the day of the week
    if (dayOfWeek >= 0 && dayOfWeek <= 3) { // Sunday to Wednesday
      checkInDate.setHours(checkInDate.getHours() + 9); // 9 hours for Sun-Wed
    } else if (dayOfWeek === 4) { // Thursday
      checkInDate.setHours(checkInDate.getHours() + 7.5); // 7.5 hours for Thursday
    }
    
    back_time = formatTo12Hour(checkInDate.toTimeString().split(" ")[0]); // Format as 12-hour
  }

  // Format check_in_time for Present
  const formattedCheckInTime = status === "Present" ? formatTo12Hour(check_in_time) : null;

  db.run(
    `INSERT INTO attendance (employee, status, destination, start_date, end_date, check_in_time, back_time) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      employee,
      status,
      destination || null,
      start_date || null,
      end_date || null,
      formattedCheckInTime, // Insert formatted check_in_time
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

// Schedule to reset present employees at midnight
cron.schedule("0 0 * * *", () => {
  db.run(`DELETE FROM attendance WHERE status = 'Present'`, (err) => {
    if (err) {
      console.error("Error resetting present employees:", err.message);
    } else {
      console.log("Reset present employees.");
    }
  });
});

// Get employees present in the office
app.get("/present", (req, res) => {
  db.all(
    `SELECT employee, check_in_time, back_time FROM attendance WHERE status = 'Present'`,
    [],
    (err, rows) => {
      if (err) throw err;
      // Format check_in_time and back_time to 12-hour format before sending the response
      const formattedRows = rows.map(row => ({
        ...row,
        check_in_time: formatTo12Hour(row.check_in_time), // Format check_in_time
        back_time: formatTo12Hour(row.back_time), // Format back_time
      }));
      res.json(formattedRows);
    }
  );
});

// Get employees on outstation
app.get("/outstation", (req, res) => {
  db.all(
    `SELECT * FROM attendance WHERE status = 'Outstation'`,
    [],
    (err, rows) => {
      if (err) throw err;
      res.json(rows);
    }
  );
});

// Delete outstation entry by ID
app.delete("/outstation/:id", (req, res) => {
  const id = req.params.id;
  db.run(
    `DELETE FROM attendance WHERE id = ? AND status = 'Outstation'`,
    [id],
    function (err) {
      if (err) {
        res.status(500).send("Error deleting outstation record");
      } else {
        res.status(200).send("Outstation record deleted successfully");
      }
    }
  );
});

// Serve the HTML file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
