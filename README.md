# JPKTimur Office Attendance & Outstation Tracker

A web-based application to track employee attendance, outstation trips, and announcements for JPKTimur office.

## Features

✅ **Attendance Tracking**
- Record employee check-in times
- Automatic calculation of check-out times based on work hours
- Malaysia timezone support (Asia/Kuala_Lumpur)
- Different work hours for weekdays (9 hours) and Thursdays (7.5 hours)

✅ **Outstation Management**
- Track employees on outstation assignments
- Date range tracking
- PIN-protected deletion

✅ **Notice Board**
- Post office announcements
- Date-based notice management

✅ **Reports**
- Generate Excel attendance reports
- Generate PDF attendance reports
- Monthly summaries with employee statistics

✅ **Real-time Updates**
- Live updates using Socket.IO
- Instant notification of attendance changes

## Technology Stack

- **Backend**: Node.js with Express
- **Database**: Supabase (PostgreSQL via REST API)
- **Real-time**: Socket.IO
- **Timezone**: moment-timezone
- **Reports**: xlsx (Excel), pdfkit (PDF)

## Setup

### Prerequisites
- Node.js 18 or higher
- A Supabase account (free tier works)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd Attendance-Outstation-Tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Supabase**
   - Create a project at [supabase.com](https://supabase.com)
   - Get your Project URL and anon key from Settings → API
   - Update `start.sh` with your credentials:
     ```bash
     export SUPABASE_KEY="your_anon_key_here"
     ```

4. **Create Database Tables**
   
   Run these SQL commands in your Supabase SQL Editor:

   ```sql
   CREATE TABLE attendance (
     id SERIAL PRIMARY KEY,
     employee TEXT,
     status TEXT,
     destination TEXT,
     start_date DATE,
     end_date DATE,
     check_in_time TEXT,
     back_time TEXT,
     pin TEXT
   );

   CREATE TABLE outstation (
     id SERIAL PRIMARY KEY,
     employee VARCHAR(255) NOT NULL,
     destination VARCHAR(255) NOT NULL,
     start_date DATE NOT NULL,
     end_date DATE NOT NULL,
     pin VARCHAR(10) NOT NULL
   );

   CREATE TABLE notice (
     id SERIAL PRIMARY KEY,
     title TEXT,
     content TEXT,
     notice_date TEXT
   );
   ```

5. **Start the server**
   ```bash
   ./start.sh
   ```
   
   Or manually:
   ```bash
   export NODE_ENV=production
   export PORT=3000
   export SUPABASE_KEY="your_key_here"
   node server.js
   ```

6. **Access the application**
   - Main Page: http://localhost:3000
   - Dashboard: http://localhost:3000/dashboard

## API Endpoints

- `GET /` - Main page
- `GET /dashboard` - Dashboard page
- `POST /submit-attendance` - Submit attendance
- `POST /submit-notice` - Submit notice
- `GET /present` - Get today's present employees
- `GET /outstation` - Get outstation records
- `GET /notice` - Get all notices
- `DELETE /outstation/:id` - Delete outstation record (PIN protected)
- `DELETE /notice/:id` - Delete notice
- `GET /api/download-report` - Download attendance report (Excel/PDF)

## Configuration

### Environment Variables
- `NODE_ENV` - Environment (production/development)
- `PORT` - Server port (default: 3000)
- `SUPABASE_KEY` - Supabase anon key

### Work Hours Configuration
The system automatically calculates check-out times based on check-in:
- Monday-Wednesday: 9 hours
- Thursday: 7.5 hours
- Friday-Sunday: 9 hours
- Check-ins before 7:30 AM are adjusted to 7:30 AM

## Network Requirements

**Important:** This application uses **Supabase's REST API over HTTPS** instead of direct PostgreSQL connections. This means:
- ✅ Works on networks with firewall restrictions
- ✅ No need to open PostgreSQL ports (5432/6543)
- ✅ More reliable connectivity
- ✅ Better for cloud deployments

The old PostgreSQL direct connection version is backed up as `server-pg-old.js`.

## Troubleshooting

### Server won't start
- Check if port 3000 is already in use: `lsof -i :3000`
- Kill existing process: `pkill -f "node server"`

### Database connection issues
- Verify your Supabase project is active (not paused)
- Check your SUPABASE_KEY is correct
- Ensure tables are created in Supabase

### Can't access from browser
- Make sure the server is running: check terminal output
- Try: http://localhost:3000 or http://127.0.0.1:3000

## Development

To stop the server:
```bash
pkill -f "node server"
```

To view logs:
```bash
tail -f logs/server.log  # if logging is enabled
```

## License

See LICENSE file for details.

## Support

For issues or questions, please contact the JPKTimur IT team.

---

**Last Updated:** September 2025  
**Version:** 2.0.0 (Supabase REST API)