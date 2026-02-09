// File: /src/integrations/supabase/dbManager.ts
import { createClient } from "@supabase/supabase-js";

// Use environment variables in production
const SUPABASE_URL = "https://vwwrshsnzcclfbbfzkbe.supabase.co";
// IMPORTANT: For table creation/alteration, you need a service role key (admin key)
// This should be kept secure and only used in a secure backend environment
const SUPABASE_SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3d3JzaHNuemNjbGZiYmZ6a2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxMTI3ODIsImV4cCI6MjA2MjY4ODc4Mn0.ImYPihA8FYEIHoOSO-GrIjtKH9tgBDMBTNWPTJBaM_0"; // Replace with your service key

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export async function setupDatabase() {
  console.log("Setting up database...");

  // Create companies table if it doesn't exist
  // await createCompaniesTable();

  // Create or update vessels table
  // await createOrUpdateVesselsTable();

  console.log("Database setup complete!");
}

async function createCompaniesTable() {
  try {
    // Check if companies table exists
    const { error: checkError } = await adminSupabase
      .from("companies")
      .select("id")
      .limit(1);

    if (!checkError) {
      console.log("Companies table already exists");
      return;
    }

    // Create companies table
    const { error } = await adminSupabase.rpc("execute_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS companies (
          id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID REFERENCES auth.users NOT NULL,
          name VARCHAR NOT NULL,
          registration_number VARCHAR NOT NULL,
          address TEXT,
          contact_phone VARCHAR,
          contact_email VARCHAR,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
          CONSTRAINT companies_user_id_key UNIQUE (user_id)
        );
        
        -- Enable Row Level Security
        ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
        
        -- Create policy for companies
        CREATE POLICY "Users can view their own companies"
          ON companies
          FOR SELECT
          USING (auth.uid() = user_id);
          
        CREATE POLICY "Users can insert their own companies"
          ON companies
          FOR INSERT
          WITH CHECK (auth.uid() = user_id);
          
        CREATE POLICY "Users can update their own companies"
          ON companies
          FOR UPDATE
          USING (auth.uid() = user_id);
      `,
    });

    if (error) {
      console.error("Error creating companies table:", error);
    } else {
      console.log("Companies table created successfully");
    }
  } catch (error) {
    console.error("Error in createCompaniesTable:", error);
  }
}

async function createOrUpdateVesselsTable() {
  try {
    // Check if vessels table exists
    const { error: checkError } = await adminSupabase
      .from("vessels")
      .select("id")
      .limit(1);

    if (checkError) {
      // Table doesn't exist, create it
      await createVesselsTable();
    } else {
      // Table exists, update it
      // await updateVesselsTable();
    }
  } catch (error) {
    console.error("Error in createOrUpdateVesselsTable:", error);
  }
}

async function createVesselsTable() {
  try {
    const { error } = await adminSupabase.rpc("execute_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS vessels (
          id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
          company_id UUID REFERENCES companies,
          user_id UUID REFERENCES auth.users,
          name VARCHAR NOT NULL,
          registration_number VARCHAR NOT NULL,
          type VARCHAR NOT NULL CHECK (type IN ('mining', 'logistics')),
          captain_name VARCHAR,
          owner_name TEXT,
          capacity NUMERIC,
          length NUMERIC,
          width NUMERIC,
          engine_power TEXT,
          crew_count INTEGER,
          fishing_method TEXT,
          vessel_code TEXT,
          hull_material TEXT,
          construction_year INTEGER,
          home_port TEXT,
          radio_call_sign TEXT,
          satellite_device TEXT,
          tracking_device TEXT,
          fishing_license TEXT,
          license_expiry DATE,
          fishing_gear JSONB,
          crew_info JSONB,
          height NUMERIC,
          draft NUMERIC,
          gross_tonnage NUMERIC,
          net_tonnage NUMERIC,
          captain_user_id UUID REFERENCES auth.users,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
        );
        
        -- Enable Row Level Security
        ALTER TABLE vessels ENABLE ROW LEVEL SECURITY;
        
        -- Create policy for vessels
        CREATE POLICY "Users can view their own vessels"
          ON vessels
          FOR SELECT
          USING (auth.uid() = user_id);
          
        CREATE POLICY "Users can insert their own vessels"
          ON vessels
          FOR INSERT
          WITH CHECK (auth.uid() = user_id);
          
        CREATE POLICY "Users can update their own vessels"
          ON vessels
          FOR UPDATE
          USING (auth.uid() = user_id);
          
        CREATE POLICY "Users can delete their own vessels"
          ON vessels
          FOR DELETE
          USING (auth.uid() = user_id);
      `,
    });

    if (error) {
      console.error("Error creating vessels table:", error);
    } else {
      console.log("Vessels table created successfully");
    }
  } catch (error) {
    console.error("Error in createVesselsTable:", error);
  }
}

async function updateVesselsTable() {
  try {
    // Get current columns
    const { data: columns, error: columnsError } = await adminSupabase.rpc(
      "execute_sql",
      {
        sql: `SELECT column_name FROM information_schema.columns WHERE table_name = 'vessels';`,
      }
    );

    // if (columnsError) {
    //   console.error("Error getting vessel columns:", columnsError);
    //   return;
    // }

    const existingColumns = columns.map((row: any) => row.column_name);
    const columnsToAdd = [
      { name: "width", type: "NUMERIC" },
      { name: "engine_power", type: "TEXT" },
      { name: "crew_count", type: "INTEGER" },
      { name: "fishing_method", type: "TEXT" },
      { name: "vessel_code", type: "TEXT" },
      { name: "hull_material", type: "TEXT" },
      { name: "construction_year", type: "INTEGER" },
      { name: "home_port", type: "TEXT" },
      { name: "radio_call_sign", type: "TEXT" },
      { name: "satellite_device", type: "TEXT" },
      { name: "tracking_device", type: "TEXT" },
      { name: "fishing_license", type: "TEXT" },
      { name: "license_expiry", type: "DATE" },
      { name: "fishing_gear", type: "JSONB" },
      { name: "crew_info", type: "JSONB" },
      { name: "height", type: "NUMERIC" },
      { name: "draft", type: "NUMERIC" },
      { name: "gross_tonnage", type: "NUMERIC" },
      { name: "net_tonnage", type: "NUMERIC" },
      { name: "owner_name", type: "TEXT" },
      { name: "updated_at", type: "TIMESTAMP WITH TIME ZONE DEFAULT NOW()" },
    ];

    // Add missing columns
    for (const column of columnsToAdd) {
      if (!existingColumns.includes(column.name)) {
        const { error } = await adminSupabase.rpc("execute_sql", {
          sql: `ALTER TABLE vessels ADD COLUMN ${column.name} ${column.type};`,
        });

        if (error) {
          console.error(`Error adding column ${column.name}:`, error);
        } else {
          console.log(`Added column ${column.name} to vessels table`);
        }
      }
    }

    console.log("Vessels table updated successfully");
  } catch (error) {
    console.error("Error in updateVesselsTable:", error);
  }
}

// Function to create the execute_sql function in Supabase if it doesn't exist
export async function createExecuteSqlFunction() {
  try {
    const { error } = await adminSupabase.rpc("execute_sql", {
      sql: `SELECT 1;`,
    });

    if (
      error &&
      error.message.includes("function execute_sql() does not exist")
    ) {
      // Create the function
      const createFunctionResult = await adminSupabase.rpc(
        "create_execute_sql_function",
        {}
      );

      if (createFunctionResult.error) {
        console.error(
          "Error creating execute_sql function:",
          createFunctionResult.error
        );

        // If the create_execute_sql_function doesn't exist, we need to create it manually
        // This requires direct SQL access to Supabase
        console.error(
          "You need to create the execute_sql function manually in Supabase SQL editor:"
        );
        console.error(`
          CREATE OR REPLACE FUNCTION execute_sql(sql text)
          RETURNS JSONB
          LANGUAGE plpgsql
          SECURITY DEFINER
          AS $$
          DECLARE
            result JSONB;
          BEGIN
            EXECUTE sql;
            result := '{"success": true}'::JSONB;
            RETURN result;
          EXCEPTION WHEN OTHERS THEN
            result := jsonb_build_object('error', SQLERRM, 'detail', SQLSTATE);
            RETURN result;
          END;
          $$;
        `);
      } else {
        console.log("execute_sql function created successfully");
      }
    } else if (!error) {
      console.log("execute_sql function already exists");
    }
  } catch (error) {
    console.error("Error checking/creating execute_sql function:", error);
  }
}
