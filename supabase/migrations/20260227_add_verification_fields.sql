-- Add verification and correction fields to receipts table
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS corrected_data JSONB;
