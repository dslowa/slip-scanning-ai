-- Fix: quantity column was INTEGER, which rejects fractional values (e.g. 0.196 kg for weighed items).
-- Changing to DECIMAL(10, 4) to support items sold by weight.
ALTER TABLE receipt_items
    ALTER COLUMN quantity TYPE DECIMAL(10, 4);
