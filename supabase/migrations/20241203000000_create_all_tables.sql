-- Create all tables for the iTruckSea application
-- This migration creates all the necessary tables with proper relationships

-- Create vessels table
CREATE TABLE IF NOT EXISTS public.vessels (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid,
    user_id uuid,
    name character varying NOT NULL,
    registration_number character varying NOT NULL,
    type text NOT NULL,
    captain_name character varying,
    captain_user_id uuid,
    capacity numeric,
    length numeric,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    crew_count smallint,
    fishing_method text,
    fishing_gear jsonb,
    engine_power text,
    owner_name text,
    width text,
    fishery_permit text,
    expiration_date date,
    fileUrl text,
    materials text,
    draught text,
    gross_tonnage text,
    number_engines text,
    type_of_machine text,
    port_registry text,
    owner_id text,
    type_of_vessel text,
    residential_address text,
    image_url text,
    latitude text,
    longitude text,
    CONSTRAINT vessels_pkey PRIMARY KEY (id),
    CONSTRAINT vessels_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
    CONSTRAINT vessels_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
    CONSTRAINT vessels_captain_user_id_fkey FOREIGN KEY (captain_user_id) REFERENCES auth.users(id)
);

-- Create fishing_trips table
CREATE TABLE IF NOT EXISTS public.fishing_trips (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    vessel_id uuid NOT NULL,
    vessel text,
    trip_code text NOT NULL,
    departure_date timestamp with time zone,
    return_date timestamp with time zone,
    departure_port_id uuid,
    departure_port_name text,
    return_port character varying,
    status text NOT NULL,
    form_code text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    departure_province text DEFAULT ''::text,
    place_of_departure text DEFAULT ''::text,
    to_region text DEFAULT ''::text,
    trip_period text DEFAULT ''::text,
    number_of_crew text DEFAULT ''::text,
    vessel_type text DEFAULT ''::text,
    vessel_registration_number text DEFAULT ''::text,
    docking_id text,
    address text DEFAULT ''::text,
    dock_province text DEFAULT ''::text,
    place_of_dock text DEFAULT ''::text,
    docking_date date,
    total_trip_period text DEFAULT ''::text,
    dock_code text,
    fishing_logbook text DEFAULT ''::text,
    trading_logbook text DEFAULT ''::text,
    transshipment_logbook text DEFAULT ''::text,
    CONSTRAINT fishing_trips_pkey PRIMARY KEY (id),
    CONSTRAINT fishing_trips_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
    CONSTRAINT fishing_trips_departure_port_id_fkey FOREIGN KEY (departure_port_id) REFERENCES public.seaports(id),
    CONSTRAINT fishing_trips_vessel_id_fkey FOREIGN KEY (vessel_id) REFERENCES public.vessels(id)
);

-- Create fishing_hauls table
CREATE TABLE IF NOT EXISTS public.fishing_hauls (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    trip_id uuid NOT NULL,
    haul_number integer NOT NULL,
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    latitude numeric,
    longitude numeric,
    depth numeric,
    notes text,
    qr_code text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    farmer_id uuid,
    CONSTRAINT fishing_hauls_pkey PRIMARY KEY (id),
    CONSTRAINT fishing_hauls_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.fishing_trips(id)
);

-- Create catch_records table
CREATE TABLE IF NOT EXISTS public.catch_records (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    haul_id uuid NOT NULL,
    species character varying NOT NULL,
    quantity numeric NOT NULL,
    unit character varying NOT NULL DEFAULT 'kg'::character varying,
    quality character varying,
    processing_method character varying,
    catching_location character varying,
    qr_code text NOT NULL UNIQUE,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    fish_name text,
    fish_specie text,
    fish_size text,
    diameter text,
    fish_product_id uuid DEFAULT gen_random_uuid() UNIQUE,
    farmer_id uuid,
    capture_date date,
    capture_time timestamp with time zone,
    capture_zone text,
    case_size text,
    net_kg_per_case text,
    tank text,
    three_a_code text,
    updated_at timestamp with time zone,
    image_url text,
    latitude text,
    longitude text,
    region text,
    case_quantity text,
    CONSTRAINT catch_records_pkey PRIMARY KEY (id),
    CONSTRAINT catch_records_farmer_id_fkey FOREIGN KEY (farmer_id) REFERENCES auth.users(id),
    CONSTRAINT catch_records_haul_id_fkey FOREIGN KEY (haul_id) REFERENCES public.fishing_hauls(id)
);

-- Create crew_members table
CREATE TABLE IF NOT EXISTS public.crew_members (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    vessel_id uuid NOT NULL,
    name character varying NOT NULL,
    position character varying NOT NULL,
    phone character varying,
    id_card character varying,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    id_card_front text,
    id_card_back text,
    role text,
    CONSTRAINT crew_members_pkey PRIMARY KEY (id),
    CONSTRAINT crew_members_vessel_id_fkey FOREIGN KEY (vessel_id) REFERENCES public.vessels(id)
);

-- Create fishing_methods table
CREATE TABLE IF NOT EXISTS public.fishing_methods (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    vessel_id uuid NOT NULL,
    method_name character varying NOT NULL,
    gear_type character varying NOT NULL,
    description text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT fishing_methods_pkey PRIMARY KEY (id),
    CONSTRAINT fishing_methods_vessel_id_fkey FOREIGN KEY (vessel_id) REFERENCES public.vessels(id)
);

-- Create vessel_transactions table
CREATE TABLE IF NOT EXISTS public.vessel_transactions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    seller_vessel_id uuid NOT NULL,
    buyer_vessel_id uuid NOT NULL,
    catch_record_id uuid,
    quantity numeric NOT NULL,
    unit character varying NOT NULL DEFAULT 'VND'::character varying,
    price numeric,
    currency character varying DEFAULT 'VND'::character varying,
    status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying::text, 'completed'::character varying::text, 'cancelled'::character varying::text])),
    qr_code text NOT NULL,
    transaction_date timestamp with time zone NOT NULL DEFAULT now(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    trip_id uuid,
    type text,
    CONSTRAINT vessel_transactions_pkey PRIMARY KEY (id),
    CONSTRAINT vessel_transactions_catch_record_id_fkey FOREIGN KEY (catch_record_id) REFERENCES public.catch_records(id),
    CONSTRAINT vessel_transactions_seller_vessel_id_fkey FOREIGN KEY (seller_vessel_id) REFERENCES public.vessels(id),
    CONSTRAINT vessel_transactions_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.fishing_trips(id),
    CONSTRAINT vessel_transactions_buyer_vessel_id_fkey FOREIGN KEY (buyer_vessel_id) REFERENCES public.vessels(id)
);

-- Create processing_records table
CREATE TABLE IF NOT EXISTS public.processing_records (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    catch_record_id uuid,
    vessel_transaction_id uuid,
    processing_date timestamp with time zone NOT NULL DEFAULT now(),
    product_type character varying NOT NULL,
    input_quantity numeric NOT NULL,
    output_quantity numeric NOT NULL,
    processing_method character varying NOT NULL,
    packaging_type character varying,
    storage_temperature numeric,
    qr_code uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT processing_records_pkey PRIMARY KEY (id),
    CONSTRAINT processing_records_vessel_transaction_id_fkey FOREIGN KEY (vessel_transaction_id) REFERENCES public.vessel_transactions(id),
    CONSTRAINT processing_records_catch_record_id_fkey FOREIGN KEY (catch_record_id) REFERENCES public.catch_records(id),
    CONSTRAINT processing_records_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
);

-- Create vessel_locations table
CREATE TABLE IF NOT EXISTS public.vessel_locations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    vessel_id uuid NOT NULL,
    latitude numeric NOT NULL,
    longitude numeric NOT NULL,
    heading numeric,
    speed numeric,
    timestamp timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT vessel_locations_pkey PRIMARY KEY (id),
    CONSTRAINT vessel_locations_vessel_id_fkey FOREIGN KEY (vessel_id) REFERENCES public.vessels(id)
);

-- Create local_shipment2retailer table
CREATE TABLE IF NOT EXISTS public.local_shipment2retailer (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    retailer_id text,
    retailer_name text,
    retailer_delivery_address text,
    retailer_loading text,
    retailer_case integer,
    retailer_loading_kg numeric,
    local_transport_cost numeric,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT local_shipment2retailer_pkey PRIMARY KEY (id),
    CONSTRAINT local_shipment2retailer_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Create sea_logistics table
CREATE TABLE IF NOT EXISTS public.sea_logistics (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    sea_port integer NOT NULL,
    offshore_fishing integer NOT NULL,
    sea_shipment_id text NOT NULL,
    sea_loading_date date,
    sea_loading_kg numeric,
    sea_distance_km numeric,
    sea_shipping_cost_per_kg numeric,
    estimate_arrival_date date,
    landing_date date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT sea_logistics_pkey PRIMARY KEY (id),
    CONSTRAINT sea_logistics_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Create truck_logistics table
CREATE TABLE IF NOT EXISTS public.truck_logistics (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    truck_shipment_id text NOT NULL,
    date_pickup date,
    address_pickup text,
    truck_id text,
    truck_type text,
    driver_name text,
    driver_phone text,
    loading_case integer,
    product_id text,
    loading_weight_kg numeric,
    truck_distance_km numeric,
    truck_shipping_cost_per_kg numeric,
    shipping_warehouse_id text,
    wh_address text,
    receiving_kiosk_name text,
    kiosk_id text,
    kiosk_address text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT truck_logistics_pkey PRIMARY KEY (id),
    CONSTRAINT truck_logistics_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Create settings table
CREATE TABLE IF NOT EXISTS public.settings (
    id integer NOT NULL DEFAULT nextval('settings_id_seq'::regclass),
    otp_enabled boolean NOT NULL DEFAULT true,
    CONSTRAINT settings_pkey PRIMARY KEY (id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vessels_user_id ON public.vessels(user_id);
CREATE INDEX IF NOT EXISTS idx_vessels_company_id ON public.vessels(company_id);
CREATE INDEX IF NOT EXISTS idx_fishing_trips_vessel_id ON public.fishing_trips(vessel_id);
CREATE INDEX IF NOT EXISTS idx_fishing_hauls_trip_id ON public.fishing_hauls(trip_id);
CREATE INDEX IF NOT EXISTS idx_catch_records_haul_id ON public.catch_records(haul_id);
CREATE INDEX IF NOT EXISTS idx_crew_members_vessel_id ON public.crew_members(vessel_id);
CREATE INDEX IF NOT EXISTS idx_vessel_locations_vessel_id ON public.vessel_locations(vessel_id);
CREATE INDEX IF NOT EXISTS idx_vessel_transactions_seller_vessel_id ON public.vessel_transactions(seller_vessel_id);
CREATE INDEX IF NOT EXISTS idx_vessel_transactions_buyer_vessel_id ON public.vessel_transactions(buyer_vessel_id);

-- Enable Row Level Security on all tables
ALTER TABLE public.vessels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fishing_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fishing_hauls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catch_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fishing_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vessel_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vessel_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.local_shipment2retailer ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sea_logistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.truck_logistics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for vessels
CREATE POLICY "Users can view their own vessels" ON public.vessels
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own vessels" ON public.vessels
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own vessels" ON public.vessels
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own vessels" ON public.vessels
    FOR DELETE USING (user_id = auth.uid());

-- Create RLS policies for fishing_trips
CREATE POLICY "Users can view their vessel trips" ON public.fishing_trips
    FOR SELECT USING (
        vessel_id IN (
            SELECT id FROM public.vessels WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert trips for their vessels" ON public.fishing_trips
    FOR INSERT WITH CHECK (
        vessel_id IN (
            SELECT id FROM public.vessels WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their vessel trips" ON public.fishing_trips
    FOR UPDATE USING (
        vessel_id IN (
            SELECT id FROM public.vessels WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their vessel trips" ON public.fishing_trips
    FOR DELETE USING (
        vessel_id IN (
            SELECT id FROM public.vessels WHERE user_id = auth.uid()
        )
    );

-- Create RLS policies for catch_records
CREATE POLICY "Users can view their vessel catch records" ON public.catch_records
    FOR SELECT USING (
        haul_id IN (
            SELECT fh.id FROM public.fishing_hauls fh
            JOIN public.fishing_trips ft ON fh.trip_id = ft.id
            JOIN public.vessels v ON ft.vessel_id = v.id
            WHERE v.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert catch records for their vessels" ON public.catch_records
    FOR INSERT WITH CHECK (
        haul_id IN (
            SELECT fh.id FROM public.fishing_hauls fh
            JOIN public.fishing_trips ft ON fh.trip_id = ft.id
            JOIN public.vessels v ON ft.vessel_id = v.id
            WHERE v.user_id = auth.uid()
        )
    );

-- Create RLS policies for crew_members
CREATE POLICY "Users can view their vessel crew" ON public.crew_members
    FOR SELECT USING (
        vessel_id IN (
            SELECT id FROM public.vessels WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert crew for their vessels" ON public.crew_members
    FOR INSERT WITH CHECK (
        vessel_id IN (
            SELECT id FROM public.vessels WHERE user_id = auth.uid()
        )
    );

-- Create RLS policies for vessel_locations
CREATE POLICY "Users can view their vessel locations" ON public.vessel_locations
    FOR SELECT USING (
        vessel_id IN (
            SELECT id FROM public.vessels WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert locations for their vessels" ON public.vessel_locations
    FOR INSERT WITH CHECK (
        vessel_id IN (
            SELECT id FROM public.vessels WHERE user_id = auth.uid()
        )
    ); 

 