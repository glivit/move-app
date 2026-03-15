-- Track which clients have read a broadcast
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS read_by UUID[] DEFAULT '{}';
