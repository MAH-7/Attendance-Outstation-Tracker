const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const path = require("path");
const cron = require("node-cron");
const http = require("http");
const socketIo = require("socket.io");
const moment = require("moment-timezone"); // Require moment-timezone

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
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

// Create notice table
db.serialize(() => {
  db.run(`CREATE TABLE notice (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    content TEXT,
    notice_date DATE
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
    const checkInDate = moment.tz(check_in_time, "HH:mm", "Asia/Kuala_Lumpur");

    // Set office start time at 7:30 AM
    const officeStartTime = moment.tz("07:30", "HH:mm", "Asia/Kuala_Lumpur");

    // If check-in time is earlier than 7:30 AM, adjust to 7:30 AM
    if (checkInDate.isBefore(officeStartTime)) {
      checkInDate.set({ hour: 7, minute: 30 });
    }

    const dayOfWeek = checkInDate.day(); // Get the day of the week

    // Calculate back time based on the day of the week
    if (dayOfWeek >= 0 && dayOfWeek <= 3) {
      // Sunday to Wednesday
      checkInDate.add(9, "hours"); // 9 hours for Sun-Wed
    } else if (dayOfWeek === 4) {
      // Thursday
      checkInDate.add(7, "hours").add(30, "minutes"); // 7.5 hours for Thursday
    }

    // Format the back time correctly in 12-hour format
    back_time = checkInDate.format("h:mm A");
  }

  db.run(
    `INSERT INTO attendance (employee, status, destination, start_date, end_date, check_in_time, back_time, pin) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      employee,
      status,
      destination || null,
      start_date || null,
      end_date || null,
      status === "Present" ? check_in_time : null,
      back_time,
      status === "Outstation" ? pin : null,
    ],
    function (err) {
      if (err) {
        console.error(err.message);
        return res.status(500).send("Database error");
      }

      io.emit("newAttendance", {
        employee,
        status,
        destination,
        start_date,
        end_date,
        check_in_time,
        back_time,
        id: this.lastID,
      });

      res.redirect("/");
    }
  );
});

// Handle form submission for notice board
app.post("/submit-notice", (req, res) => {
  let { title, content, notice_date } = req.body;

  console.log("Received Data:", {
    title,
    content,
    notice_date,
  });

  // Format the notice_date to only display day and month
  notice_date = moment(notice_date).format("DD MMMM");

  db.run(
    `INSERT INTO notice (title, content, notice_date) VALUES (?, ?, ?)`,
    [title, content, notice_date],
    function (err) {
      if (err) {
        console.error(err.message);
        return res.status(500).send("Database error");
      }

      io.emit("newNotice", {
        title,
        content,
        notice_date,
        id: this.lastID,
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
    timezone: "Asia/Kuala_Lumpur",
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

// Get notices from the notice board
app.get("/notice", (req, res) => {
  db.all(`SELECT * FROM notice`, [], (err, rows) => {
    if (err) throw err;
    res.json(rows);
  });
});

// Delete outstation entry by ID
app.delete("/outstation/:id", (req, res) => {
  const id = req.params.id;
  const { pin } = req.body;

  db.get(`SELECT pin FROM attendance WHERE id = ?`, [id], (err, row) => {
    if (err || !row) {
      return res.status(500).send("Error fetching outstation record");
    }

    if (row.pin !== pin && pin !== "9999") {
      return res.status(403).send("Invalid PIN");
    }

    db.run(
      `DELETE FROM attendance WHERE id = ? AND status = 'Outstation'`,
      [id],
      function (err) {
        if (err) {
          return res.status(500).send("Error deleting outstation record");
        } else {
          io.emit("deleteOutstation", { id });
          return res.status(200).send("Outstation record deleted successfully");
        }
      }
    );
  });
});

// Delete notice by ID
app.delete("/notice/:id", (req, res) => {
  const id = req.params.id;
  db.run(`DELETE FROM notice WHERE id = ?`, [id], function (err) {
    if (err) {
      return res.status(500).send("Error deleting notice");
    } else {
      io.emit("deleteNotice", { id });
      return res.status(200).send("Notice deleted successfully");
    }
  });
});

// Serve the HTML file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// Serve the dashboard file
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public/dashboard.html"));
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
