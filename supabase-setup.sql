-- SQL commands to create tables in Supabase
-- Run these in your Supabase SQL Editor: https://supabase.com/dashboard/project/qmpzaxochkqsmotvgksb/sql

-- Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
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

-- Create outstation table
CREATE TABLE IF NOT EXISTS outstation (
  id SERIAL PRIMARY KEY,
  employee VARCHAR(255) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  pin VARCHAR(10) NOT NULL
);

-- Create notice table
CREATE TABLE IF NOT EXISTS notice (
  id SERIAL PRIMARY KEY,
  title TEXT,
  content TEXT,
  notice_date TEXT
);

-- Optional: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendance_start_date ON attendance(start_date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);
CREATE INDEX IF NOT EXISTS idx_outstation_dates ON outstation(start_date, end_date);

-- Enable Row Level Security (optional, recommended for production)
-- ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE outstation ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE notice ENABLE ROW LEVEL SECURITY;

-- Create policies (optional, adjust as needed)
-- CREATE POLICY "Enable read access for all users" ON attendance FOR SELECT USING (true);
-- CREATE POLICY "Enable insert access for all users" ON attendance FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Enable update access for all users" ON attendance FOR UPDATE USING (true);
-- CREATE POLICY "Enable delete access for all users" ON attendance FOR DELETE USING (true);

COMMIT;
