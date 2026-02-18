-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create receipts table
CREATE TABLE IF NOT EXISTS receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    retailer TEXT,
    date DATE,
    time TIME,
    total_amount DECIMAL(10, 2),
    image_url TEXT NOT NULL,
    is_blurry BOOLEAN DEFAULT FALSE,
    is_screen BOOLEAN DEFAULT FALSE,
    is_receipt BOOLEAN DEFAULT TRUE,
    is_duplicate BOOLEAN DEFAULT FALSE,
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create receipt_items table
CREATE TABLE IF NOT EXISTS receipt_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_id UUID REFERENCES receipts(id) ON DELETE CASCADE,
    description TEXT,
    quantity INTEGER,
    unit_price DECIMAL(10, 2),
    total_price DECIMAL(10, 2),
    discount DECIMAL(10, 2),
    final_price DECIMAL(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create receipt_payments table
CREATE TABLE IF NOT EXISTS receipt_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_id UUID REFERENCES receipts(id) ON DELETE CASCADE,
    method TEXT,
    amount DECIMAL(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_payments ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for now for simplicity, refine later)
CREATE POLICY "Enable read access for all users" ON receipts FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON receipts FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON receipts FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON receipt_items FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON receipt_items FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON receipt_payments FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON receipt_payments FOR INSERT WITH CHECK (true);

-- Create Storage Bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts');
