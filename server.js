const express = require("express");
const { Pool } = require("pg");
const bodyParser = require("body-parser");
const path = require("path");
const cron = require("node-cron");
const http = require("http");
const socketIo = require("socket.io");
const moment = require("moment-timezone"); // Require moment-timezone
const XLSX = require("xlsx");
const PDFDocument = require("pdfkit");

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

// Download Report API
app.get("/api/download-report", async (req, res) => {
  const { month, format } = req.query;
  
  if (!month || !format) {
    return res.status(400).send("Month and format parameters are required");
  }

  try {
    // Parse month (e.g., "2025-09")
    const [year, monthNum] = month.split('-');
    const startDate = `${year}-${monthNum}-01`;
    const nextMonth = parseInt(monthNum) === 12 ? 
      `${parseInt(year) + 1}-01-01` : 
      `${year}-${String(parseInt(monthNum) + 1).padStart(2, '0')}-01`;

    // Query attendance data for the selected month
    const result = await pool.query(
      `SELECT employee, check_in_time, back_time, start_date 
       FROM attendance 
       WHERE status = 'Present' 
       AND start_date >= $1 
       AND start_date < $2 
       ORDER BY start_date, employee`,
      [startDate, nextMonth]
    );

    const attendanceData = result.rows;

    if (format === 'excel') {
      await generateExcelReport(res, attendanceData, month);
    } else if (format === 'pdf') {
      await generatePDFReport(res, attendanceData, month);
    } else {
      return res.status(400).send("Invalid format. Use 'excel' or 'pdf'");
    }

  } catch (error) {
    console.error("Error generating report:", error);
    res.status(500).send("Error generating report");
  }
});

// Generate Excel Report
async function generateExcelReport(res, data, month) {
  const workbook = XLSX.utils.book_new();
  
  // Create main attendance sheet
  const worksheetData = [
    ['Date', 'Employee Name', 'Check-in Time', 'Check-out Time']
  ];
  
  data.forEach(record => {
    worksheetData.push([
      moment(record.start_date).format('DD/MM/YYYY'),
      record.employee,
      record.check_in_time || 'N/A',
      record.back_time || 'N/A'
    ]);
  });
  
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // Set column widths
  worksheet['!cols'] = [
    { width: 12 }, // Date
    { width: 20 }, // Employee Name
    { width: 15 }, // Check-in Time
    { width: 15 }  // Check-out Time
  ];
  
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
  
  // Create summary sheet
  const summaryData = generateSummaryData(data);
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  
  // Generate buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  
  // Set response headers
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="attendance-report-${month}.xlsx"`);
  
  // Send file
  res.send(buffer);
}

// Generate PDF Report
async function generatePDFReport(res, data, month) {
  const doc = new PDFDocument();
  
  // Set response headers
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="attendance-report-${month}.pdf"`);
  
  // Pipe the PDF to the response
  doc.pipe(res);
  
  // Add title
  doc.fontSize(20).text('Monthly Attendance Report', 50, 50);
  doc.fontSize(14).text(`Period: ${moment(month + '-01').format('MMMM YYYY')}`, 50, 80);
  doc.fontSize(12).text(`Generated: ${moment().format('DD/MM/YYYY HH:mm')}`, 50, 100);
  
  // Add summary
  const totalRecords = data.length;
  const uniqueEmployees = [...new Set(data.map(d => d.employee))].length;
  
  doc.text(`Total Attendance Records: ${totalRecords}`, 50, 130);
  doc.text(`Unique Employees: ${uniqueEmployees}`, 50, 150);
  
  // Add table header
  let yPosition = 200;
  doc.fontSize(10);
  
  // Table headers
  doc.text('Date', 50, yPosition);
  doc.text('Employee Name', 120, yPosition);
  doc.text('Check-in', 250, yPosition);
  doc.text('Check-out', 320, yPosition);
  
  // Draw header line
  doc.moveTo(50, yPosition + 15).lineTo(400, yPosition + 15).stroke();
  yPosition += 25;
  
  // Add data rows
  data.forEach(record => {
    if (yPosition > 700) { // Start new page if needed
      doc.addPage();
      yPosition = 50;
    }
    
    doc.text(moment(record.start_date).format('DD/MM/YYYY'), 50, yPosition);
    doc.text(record.employee.substring(0, 15) + (record.employee.length > 15 ? '...' : ''), 120, yPosition);
    doc.text(record.check_in_time || 'N/A', 250, yPosition);
    doc.text(record.back_time || 'N/A', 320, yPosition);
    
    yPosition += 20;
  });
  
  // Finalize the PDF
  doc.end();
}

// Generate summary data for Excel
function generateSummaryData(data) {
  const summary = [['Summary', ''], ['', '']];
  
  const totalRecords = data.length;
  const uniqueEmployees = [...new Set(data.map(d => d.employee))];
  
  summary.push(['Total Attendance Records', totalRecords]);
  summary.push(['Unique Employees', uniqueEmployees.length]);
  summary.push(['', '']);
  summary.push(['Employee Summary', '']);
  summary.push(['Employee Name', 'Days Present']);
  
  // Count days per employee
  const employeeCounts = {};
  data.forEach(record => {
    employeeCounts[record.employee] = (employeeCounts[record.employee] || 0) + 1;
  });
  
  Object.entries(employeeCounts).forEach(([employee, count]) => {
    summary.push([employee, count]);
  });
  
  return summary;
}

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
