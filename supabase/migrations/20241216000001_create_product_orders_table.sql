-- Create product_orders table if it doesn't exist
-- This table stores product orders for fishing trips

CREATE TABLE IF NOT EXISTS public.product_orders (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    trip_id uuid NOT NULL,
    tank_number integer NOT NULL,
    product_name text NOT NULL,
    product_id text NOT NULL,
    size numeric NOT NULL,
    stock numeric NOT NULL,
    type text NOT NULL,
    quantity_load numeric,
    available_load numeric,
    price numeric,
    bid_price numeric,
    departure_date timestamp with time zone,
    arrival_date timestamp with time zone,
    departure_port text,
    zone_dept text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT product_orders_pkey PRIMARY KEY (id),
    CONSTRAINT product_orders_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.fishing_trips(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_orders_trip_id ON public.product_orders(trip_id);
CREATE INDEX IF NOT EXISTS idx_product_orders_created_at ON public.product_orders(created_at);

-- Add comments
COMMENT ON TABLE public.product_orders IS 'Stores product orders for fishing trips';
COMMENT ON COLUMN public.product_orders.trip_id IS 'Reference to the fishing trip';
COMMENT ON COLUMN public.product_orders.tank_number IS 'Tank number for the product';
COMMENT ON COLUMN public.product_orders.product_name IS 'Name of the product';
COMMENT ON COLUMN public.product_orders.product_id IS 'Unique identifier for the product';
COMMENT ON COLUMN public.product_orders.size IS 'Size of the product';
COMMENT ON COLUMN public.product_orders.stock IS 'Available stock quantity';
COMMENT ON COLUMN public.product_orders.type IS 'Type of the product';
COMMENT ON COLUMN public.product_orders.quantity_load IS 'Quantity to be loaded';
COMMENT ON COLUMN public.product_orders.available_load IS 'Available load capacity';
COMMENT ON COLUMN public.product_orders.price IS 'Price of the product';
COMMENT ON COLUMN public.product_orders.bid_price IS 'Bid price for the product';
COMMENT ON COLUMN public.product_orders.departure_date IS 'Departure date';
COMMENT ON COLUMN public.product_orders.arrival_date IS 'Arrival date';
COMMENT ON COLUMN public.product_orders.departure_port IS 'Departure port';
COMMENT ON COLUMN public.product_orders.zone_dept IS 'Zone department';

-- Enable RLS
ALTER TABLE public.product_orders ENABLE ROW LEVEL SECURITY; 