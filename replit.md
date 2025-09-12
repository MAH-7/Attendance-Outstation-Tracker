# Office Tracker - Replit Project Documentation

## Overview
This is an office attendance and outstation tracker application built with Node.js, Express, Socket.IO, and SQLite. The application allows employees to check in/out, register outstation trips, and manage notice board announcements.

## Recent Changes (September 11, 2025)
- **Project Import**: Successfully imported from GitHub and configured for Replit environment
- **Server Configuration**: Updated server to bind to 0.0.0.0:5000 for Replit compatibility
- **Workflow Setup**: Configured "Server" workflow to run `npm start` on port 5000
- **Bug Fix**: Added null-check in app.js to prevent JavaScript errors on pages without notice board
- **Deployment**: Configured for VM deployment using `npm start`

## Project Architecture

### Backend (server.js)
- **Framework**: Express.js with Socket.IO for real-time updates
- **Database**: SQLite (in-memory for development)
- **Port**: 5000 (configured for Replit)
- **Host**: 0.0.0.0 (required for Replit proxy)

### Frontend 
- **Main Page**: `/` - Employee attendance form and current status display
- **Dashboard**: `/dashboard` - Enhanced view with radio players and weather widget
- **Real-time Updates**: Socket.IO for live data updates across all clients

### Key Features
1. **Attendance Tracking**: Employees can check in with automatic clock-out time calculation
2. **Outstation Management**: Track employees on business trips with PIN protection
3. **Notice Board**: Announcements with date-based display
4. **Real-time Updates**: All changes broadcast live to connected clients
5. **Dashboard Extras**: Radio players and weather widget integration

### Dependencies
- express: Web server framework
- sqlite3: Database
- socket.io: Real-time communication
- body-parser: Request parsing
- moment-timezone: Date/time handling for Malaysia timezone
- node-cron: Scheduled tasks for daily resets

### Workflow Configuration
- **Name**: Server
- **Command**: npm start
- **Port**: 5000
- **Output**: webview (for user interface)

### Deployment Configuration
- **Target**: vm (maintains server state)
- **Command**: npm start
- **Reason**: Uses Socket.IO and scheduled tasks requiring persistent server state

## File Structure
```
/
├── server.js          # Main server application
├── package.json       # Dependencies and scripts
├── public/            # Static frontend files
│   ├── index.html     # Main attendance form
│   ├── dashboard.html # Enhanced dashboard view
│   ├── app.js         # Client-side JavaScript
│   ├── utils.js       # Dashboard utilities
│   └── *.css          # Stylesheets
├── src/               # Server-side templates (unused in current setup)
└── database.db        # SQLite database file
```

## Current Status
✅ Server running successfully on port 5000
✅ All dependencies installed
✅ Workflow configured and active
✅ Deployment settings configured
✅ Application accessible via Replit preview

The application is now fully operational in the Replit environment and ready for use.