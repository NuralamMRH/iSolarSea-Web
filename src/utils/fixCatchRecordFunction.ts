import { supabaseAdmin } from "@/lib/supabase-admin";

export async function fixCatchRecordFunction() {
  if (!supabaseAdmin) {
    throw new Error(
      "Admin client not available. Make sure VITE_SUPABASE_SERVICE_ROLE_KEY is set."
    );
  }

  const migrationSQL = `
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
  `;

  try {
    console.log(
      "🔄 Running migration to fix insert_catch_record_safe function..."
    );

    // Try using execute_sql function first
    const { error: execError } = await supabaseAdmin.rpc("execute_sql", {
      sql: migrationSQL,
    });

    if (execError) {
      console.log("execute_sql failed, trying direct SQL execution...");
      // Fallback: try direct SQL execution
      const { error: directError } = await supabaseAdmin.rpc("exec_sql", {
        sql: migrationSQL,
      });

      if (directError) {
        throw new Error(
          `Both execute_sql and exec_sql failed: ${execError.message} | ${directError.message}`
        );
      }
    }

    console.log("✅ Migration completed successfully!");
    console.log(
      "✅ insert_catch_record_safe function now supports p_capture_time and p_capture_date parameters"
    );

    return true;
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

// Function to check if the function exists and has the right parameters
export async function checkCatchRecordFunction() {
  if (!supabaseAdmin) {
    throw new Error("Admin client not available");
  }

  try {
    // Try to call the function with the new parameters
    const { error } = await supabaseAdmin.rpc("insert_catch_record_safe", {
      p_haul_id: "00000000-0000-0000-0000-000000000000", // dummy UUID
      p_species: "test",
      p_quantity: 1,
      p_qr_code: "test",
      p_farmer_id: "00000000-0000-0000-0000-000000000000", // dummy UUID
      p_capture_time: new Date().toISOString(),
      p_capture_date: new Date().toISOString().split("T")[0],
    });

    if (
      error &&
      error.message.includes("function") &&
      error.message.includes("not found")
    ) {
      return { exists: false, hasNewParams: false };
    } else if (
      error &&
      error.message.includes("invalid input syntax for type uuid")
    ) {
      // Function exists and accepts the new parameters, but we passed invalid UUIDs
      return { exists: true, hasNewParams: true };
    } else {
      return { exists: true, hasNewParams: false };
    }
  } catch (error) {
    console.error("Error checking function:", error);
    return { exists: false, hasNewParams: false };
  }
}
