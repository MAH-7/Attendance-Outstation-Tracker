#!/bin/bash
# Start script for JPKTimur Attendance Tracker

export NODE_ENV="production"
export PORT=3000
export SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtcHpheG9jaGtxc21vdHZna3NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2MTc1OTQsImV4cCI6MjA3MzE5MzU5NH0.fxFTVUucu-LjNBlbaGvx1tUJobvdtLPqbtCwxssMjxA"

echo "Starting JPKTimur Attendance Tracker..."
echo "Server will be available at: http://localhost:$PORT"
echo ""

node server.js
