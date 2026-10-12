-- Add missing last_attempted_at column to failed_jobs for retry worker
ALTER TABLE failed_jobs ADD COLUMN IF NOT EXISTS last_attempted_at TIMESTAMPTZ;
