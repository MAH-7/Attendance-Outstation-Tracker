const express = require("express");
const { Pool } = require("pg");
const bodyParser = require("body-parser");
const path = require("path");
const cron = require("node-cron");
const http = require("http");
const socketIo = require("socket.io");
const moment = require("moment-timezone"); // Require moment-timezone

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// PostgreSQL connection pool - using Supabase
const pool = new Pool({
  connectionString:
    process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Initialize database tables
async function initializeDatabase() {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS attendance (
      id SERIAL PRIMARY KEY,
      employee TEXT,
      status TEXT,
      destination TEXT,
      start_date DATE,
      end_date DATE,
      check_in_time TEXT,
      back_time TEXT,
      pin TEXT
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS outstation (
      id SERIAL PRIMARY KEY,
      employee VARCHAR(255) NOT NULL,
      destination VARCHAR(255) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      pin VARCHAR(10) NOT NULL
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS notice (
      id SERIAL PRIMARY KEY,
      title TEXT,
      content TEXT,
      notice_date TEXT
    )`);

    console.log("Database tables initialized successfully");
  } catch (err) {
    console.error("Error initializing database:", err);
  }
}

// Format time to 12-hour format
function formatTo12Hour(time) {
  let [hours, minutes] = time.split(":").map(Number);
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes < 10 ? "0" + minutes : minutes} ${ampm}`;
}

// Submit attendance
app.post("/submit-attendance", async (req, res) => {
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

  try {
    let result;

    if (status === "Present") {
      const today = moment().tz("Asia/Kuala_Lumpur").format("YYYY-MM-DD");
      let back_time = null;
      let formatted_check_in_time = check_in_time;

      if (check_in_time) {
        const checkInDate = moment.tz(
          check_in_time,
          "HH:mm",
          "Asia/Kuala_Lumpur"
        );
        const officeStartTime = moment.tz(
          "07:30",
          "HH:mm",
          "Asia/Kuala_Lumpur"
        );

        // Format check-in time to 12-hour format with AM/PM
        formatted_check_in_time = checkInDate.format("h:mm A");

        if (checkInDate.isBefore(officeStartTime)) {
          checkInDate.set({ hour: 7, minute: 30 });
        }

        const dayOfWeek = checkInDate.day();
        if (dayOfWeek >= 0 && dayOfWeek <= 3) {
          checkInDate.add(9, "hours");
        } else if (dayOfWeek === 4) {
          checkInDate.add(7, "hours").add(30, "minutes");
        }

        back_time = checkInDate.format("h:mm A");
      }

      result = await pool.query(
        `INSERT INTO attendance (employee, status, check_in_time, back_time, start_date) 
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [employee, status, formatted_check_in_time, back_time, today]
      );

      io.emit("newAttendance", {
        employee,
        status,
        check_in_time: formatted_check_in_time,
        back_time,
        start_date: today,
        id: result.rows[0].id,
      });
    } else if (status === "Outstation") {
      result = await pool.query(
        `INSERT INTO outstation (employee, destination, start_date, end_date, pin) 
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [employee, destination, start_date, end_date, pin]
      );

      io.emit("newOutstation", {
        employee,
        destination,
        start_date,
        end_date,
        id: result.rows[0].id,
      });
    }

    res.redirect("/");
  } catch (err) {
    console.error("Database error:", err.message);
    return res.status(500).send("Database error");
  }
});

// Submit notice
app.post("/submit-notice", async (req, res) => {
  let { title, content, notice_date } = req.body;

  console.log("Received Data:", { title, content, notice_date });

  notice_date = moment(notice_date).format("DD MMMM");

  try {
    const result = await pool.query(
      `INSERT INTO notice (title, content, notice_date) VALUES ($1, $2, $3) RETURNING id`,
      [title, content, notice_date]
    );

    io.emit("newNotice", {
      title,
      content,
      notice_date,
      id: result.rows[0].id,
    });

    res.redirect("/");
  } catch (err) {
    console.error("Database error:", err.message);
    return res.status(500).send("Database error");
  }
});

// Get employees present today
app.get("/present", async (req, res) => {
  try {
    const today = moment().tz("Asia/Kuala_Lumpur").format("YYYY-MM-DD");
    const result = await pool.query(
      `SELECT employee, check_in_time, back_time FROM attendance WHERE status = 'Present' AND start_date = $1`,
      [today]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Database error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

// Get outstation employees
app.get("/outstation", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM outstation ORDER BY id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Database error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

// Get notices
app.get("/notice", async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM notice`);
    res.json(result.rows);
  } catch (err) {
    console.error("Database error:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

// Delete outstation
app.delete("/outstation/:id", async (req, res) => {
  const id = req.params.id;
  const { pin } = req.body;

  try {
    const result = await pool.query(
      `SELECT pin FROM outstation WHERE id = $1`,
      [id]
    );

    if (!result.rows.length)
      return res.status(500).send("Error fetching outstation record");

    const row = result.rows[0];
    if (row.pin !== pin && pin !== "9999")
      return res.status(403).send("Invalid PIN");

    await pool.query(`DELETE FROM outstation WHERE id = $1`, [id]);

    io.emit("deleteOutstation", { id });
    return res.status(200).send("Outstation record deleted successfully");
  } catch (err) {
    console.error("Database error:", err.message);
    return res.status(500).send("Error deleting outstation record");
  }
});

// Delete notice
app.delete("/notice/:id", async (req, res) => {
  const id = req.params.id;
  try {
    await pool.query(`DELETE FROM notice WHERE id = $1`, [id]);
    io.emit("deleteNotice", { id });
    return res.status(200).send("Notice deleted successfully");
  } catch (err) {
    console.error("Database error:", err.message);
    return res.status(500).send("Error deleting notice");
  }
});

// Serve HTML
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "public/index.html"))
);
app.get("/dashboard", (req, res) =>
  res.sendFile(path.join(__dirname, "public/dashboard.html"))
);

// Start server
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await initializeDatabase();
    console.log("Database initialized successfully");

    server.listen(PORT, "0.0.0.0", () =>
      console.log(`Server running on port ${PORT}`)
    );
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
