
-- Add completed_at column to form_assignments if it doesn't exist
ALTER TABLE form_assignments 
ADD COLUMN IF NOT EXISTS completed_at timestamptz;
