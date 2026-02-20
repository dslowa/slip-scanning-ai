-- Migration to add image_title column to receipts table
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS image_title TEXT;
