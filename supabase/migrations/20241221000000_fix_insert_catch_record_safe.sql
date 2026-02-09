-- Fix insert_catch_record_safe function to include missing parameters
CREATE OR REPLACE FUNCTION insert_catch_record_safe(
    p_haul_id UUID,
    p_species TEXT,
    p_quantity NUMERIC,
    p_qr_code TEXT,
    p_farmer_id UUID,
    p_unit TEXT DEFAULT 'kg',
    p_fish_name TEXT DEFAULT NULL,
    p_fish_specie TEXT DEFAULT NULL,
    p_fish_size TEXT DEFAULT NULL,
    p_case_size TEXT DEFAULT NULL,
    p_net_kg_per_case TEXT DEFAULT NULL,
    p_case_quantity TEXT DEFAULT NULL,
    p_tank TEXT DEFAULT '1',
    p_three_a_code TEXT DEFAULT NULL,
    p_capture_zone TEXT DEFAULT NULL,
    p_catching_location TEXT DEFAULT NULL,
    p_latitude TEXT DEFAULT NULL,
    p_longitude TEXT DEFAULT NULL,
    p_region TEXT DEFAULT NULL,
    p_image_url TEXT DEFAULT NULL,
    p_capture_time TIMESTAMPTZ DEFAULT NULL,
    p_capture_date DATE DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_record_id UUID;
BEGIN
    -- Temporarily disable the problematic trigger
    ALTER TABLE catch_records DISABLE TRIGGER trigger_catch_record_notifications;
    
    -- Insert the record
    INSERT INTO catch_records (
        haul_id,
        species,
        quantity,
        unit,
        qr_code,
        farmer_id,
        fish_name,
        fish_specie,
        fish_size,
        case_size,
        net_kg_per_case,
        case_quantity,
        tank,
        three_a_code,
        capture_zone,
        catching_location,
        latitude,
        longitude,
        region,
        image_url,
        capture_time,
        capture_date
    ) VALUES (
        p_haul_id,
        p_species,
        p_quantity,
        p_unit,
        p_qr_code,
        p_farmer_id,
        p_fish_name,
        p_fish_specie,
        p_fish_size,
        p_case_size,
        p_net_kg_per_case,
        p_case_quantity,
        p_tank,
        p_three_a_code,
        p_capture_zone,
        p_catching_location,
        p_latitude,
        p_longitude,
        p_region,
        p_image_url,
        p_capture_time,
        p_capture_date
    ) RETURNING id INTO new_record_id;
    
    -- Re-enable the trigger
    ALTER TABLE catch_records ENABLE TRIGGER trigger_catch_record_notifications;
    
    RETURN new_record_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION insert_catch_record_safe TO authenticated;
