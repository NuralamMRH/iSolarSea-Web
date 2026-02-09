-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create catch_records table
CREATE TABLE IF NOT EXISTS catch_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    haul_id UUID NOT NULL,
    fish_product_id UUID NOT NULL,
    local_name VARCHAR(255),
    alpha_code CHAR(3),
    capture_location POINT,
    capture_zone VARCHAR(255),
    capture_time TIME,
    capture_date DATE,
    farmer_id UUID REFERENCES auth.users(id),
    species VARCHAR(255),
    quantity NUMERIC,
    unit VARCHAR(50),
    quality VARCHAR(100),
    processing_method VARCHAR(100),
    catching_location VARCHAR(255),
    qr_code UUID,
    fish_name TEXT,
    fish_specie TEXT,
    fish_size TEXT,
    diameter TEXT,
    three_a_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE catch_records ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own records"
    ON catch_records
    FOR SELECT
    USING (auth.uid() = farmer_id);

CREATE POLICY "Users can insert their own records"
    ON catch_records
    FOR INSERT
    WITH CHECK (auth.uid() = farmer_id);

CREATE POLICY "Users can update their own records"
    ON catch_records
    FOR UPDATE
    USING (auth.uid() = farmer_id);

CREATE POLICY "Users can delete their own records"
    ON catch_records
    FOR DELETE
    USING (auth.uid() = farmer_id);

-- Create updated_at trigger
CREATE TRIGGER set_catch_records_updated_at
    BEFORE UPDATE ON catch_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();