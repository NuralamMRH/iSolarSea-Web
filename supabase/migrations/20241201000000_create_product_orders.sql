-- Create product_orders table
CREATE TABLE IF NOT EXISTS product_orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    trip_id UUID REFERENCES fishing_trips(id) ON DELETE CASCADE,
    tank_number INTEGER NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_id VARCHAR(255) NOT NULL,
    size NUMERIC NOT NULL,
    stock NUMERIC NOT NULL,
    type VARCHAR(100) NOT NULL,
    quantity_load NUMERIC,
    available_load NUMERIC,
    price NUMERIC,
    bid_price NUMERIC,
    departure_date TIMESTAMPTZ,
    arrival_date TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    auth_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    catch_record_ids UUID[]
);

-- Enable Row Level Security
ALTER TABLE product_orders ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own orders"
    ON product_orders
    FOR SELECT
    USING (auth.uid() = auth_id);

CREATE POLICY "Users can insert their own orders"
    ON product_orders
    FOR INSERT
    WITH CHECK (auth.uid() = auth_id);

CREATE POLICY "Users can update their own orders"
    ON product_orders
    FOR UPDATE
    USING (auth.uid() = auth_id);

CREATE POLICY "Users can delete their own orders"
    ON product_orders
    FOR DELETE
    USING (auth.uid() = auth_id);

-- Create updated_at trigger
CREATE TRIGGER set_product_orders_updated_at
    BEFORE UPDATE ON product_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 