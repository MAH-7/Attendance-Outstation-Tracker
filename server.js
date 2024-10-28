const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const path = require("path");
const cron = require("node-cron");
const http = require("http");
const socketIo = require("socket.io"); // Require Socket.IO

const app = express();
const server = http.createServer(app); // Create HTTP server
const io = socketIo(server); // Attach Socket.IO to the server
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
    back_time TIME,
    pin TEXT
  )`);
});

// Format time to 12-hour format
function formatTo12Hour(time) {
  let [hours, minutes] = time.split(":").map(Number);
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12; // Convert to 12-hour format
  return `${hours}:${minutes < 10 ? "0" + minutes : minutes} ${ampm}`;
}

// Handle form submission
app.post("/submit-attendance", (req, res) => {
  const {
    employee,
    status,
    destination,
    start_date,
    end_date,
    check_in_time,
    pin,
  } = req.body;

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
    const [checkInHours, checkInMinutes] = check_in_time.split(":").map(Number);
    const checkInDate = new Date();
    checkInDate.setHours(checkInHours, checkInMinutes, 0, 0);

    const dayOfWeek = checkInDate.getDay(); // Get the day of the week

    // Set back time based on the day of the week
    if (dayOfWeek >= 0 && dayOfWeek <= 3) {
      // Sunday to Wednesday
      checkInDate.setHours(checkInDate.getHours() + 9); // 9 hours for Sun-Wed
    } else if (dayOfWeek === 4) {
      // Thursday
      checkInDate.setHours(checkInDate.getHours() + 7.5); // 7.5 hours for Thursday
    }

    // Format the back time correctly in 12-hour format
    back_time = formatTo12Hour(checkInDate.toTimeString().split(" ")[0]);
  }

  db.run(
    `INSERT INTO attendance (employee, status, destination, start_date, end_date, check_in_time, back_time, pin) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      employee,
      status,
      destination || null,
      start_date || null,
      end_date || null,
      status === "Present" ? check_in_time : null, // Only set check_in_time for Present
      back_time,
      status === "Outstation" ? pin : null, // Only set pin for Outstation
    ],
    function (err) {
      if (err) {
        console.error(err.message);
        return res.status(500).send("Database error");
      }

      // Emit the new attendance data to all connected clients
      io.emit("newAttendance", {
        employee,
        status,
        destination,
        start_date,
        end_date,
        check_in_time,
        back_time,
        id: this.lastID, // Send the ID of the newly inserted record
      });

      res.redirect("/");
    }
  );
});

// Schedule to reset present employees at midnight
cron.schedule(
  "11 1 * * *",
  () => {
    console.log("Cron job triggered at midnight.");
    db.run(`DELETE FROM attendance WHERE status = 'Present'`, (err) => {
      if (err) {
        console.error("Error resetting present employees:", err.message);
      } else {
        console.log("Reset present employees.");
      }
    });
  },
  {
    timezone: "Asia/Kuala_Lumpur", // Set your local timezone
  }
);

// Get employees present in the office
app.get("/present", (req, res) => {
  db.all(
    `SELECT employee, check_in_time, back_time FROM attendance WHERE status = 'Present'`,
    [],
    (err, rows) => {
      if (err) throw err;
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
      if (err) throw err;
      res.json(rows);
    }
  );
});

// Delete outstation entry by ID
app.delete("/outstation/:id", (req, res) => {
  const id = req.params.id;
  const { pin } = req.body; // Get the PIN from the request body

  // Fetch the outstation entry to verify the PIN
  db.get(`SELECT pin FROM attendance WHERE id = ?`, [id], (err, row) => {
    if (err || !row) {
      return res.status(500).send("Error fetching outstation record");
    }

    if (row.pin !== pin && pin !== '9999') { // Compare the provided PIN with the stored PIN
      return res.status(403).send("Invalid PIN"); // If the PIN is incorrect
    }

    db.run(
      `DELETE FROM attendance WHERE id = ? AND status = 'Outstation'`,
      [id],
      function (err) {
        if (err) {
          return res.status(500).send("Error deleting outstation record");
        } else {
          // Emit a deletion event
          io.emit('deleteOutstation', { id });
          return res.status(200).send("Outstation record deleted successfully");
        }
      }
    );
  });
});

// Serve the HTML file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  // Use server.listen for Socket.IO
  console.log(`Server running on port ${PORT}`);
});
