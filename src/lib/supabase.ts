import { Database } from "@/integrations/supabase/types";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

// Create client with anon key for regular operations
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});

// Create admin client with service role key for database operations
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
    })
  : null;

// Verify database connection and list tables
async function verifyDatabaseConnection() {
  try {
    // Simple connection test using system schema
    const { data, error } = await supabase.from("users").select("id").limit(1);

    if (error && error.code === "42P01") {
      console.log("Database connected but tables not created yet");
      console.error("Database error:", error);
    } else if (error) {
      console.log("Database connection failed");
      console.error("Database error:", error);
    } else {
      console.log("Database connected and users table exists");
    }

    // Test each required table
    const requiredTables = ["users", "ocr_documents"];
    for (const table of requiredTables) {
      const { error: tableError } = await supabase
        .from(table as keyof Database["public"]["Tables"])
        .select("id")
        .limit(1);

      console.log(
        `Table ${table} status:`,
        tableError ? "Not created" : "Exists"
      );
      if (tableError) {
        console.error(`Error accessing ${table}:`, tableError);
      }
    }
  } catch (error) {
    console.error("Database verification failed:", error);
  }
}

// Function to create users table if it doesn't exist
async function createUsersTable() {
  try {
    if (!supabaseAdmin) {
      throw new Error("Service role key is required for table creation");
    }

    // Check if users table exists
    const { error: checkError } = await supabase
      .from("users")
      .select("id")
      .limit(1);

    if (checkError && checkError.code === "42P01") {
      // Create table using SQL query with admin privileges
      const { error: createError } = await supabaseAdmin.rpc(
        "create_users_table",
        {
          sql: `
            -- Enable UUID extension
            CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

            -- Create user_role type
            DO $$ BEGIN
              CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'manager', 'VVIP', 'VIP', 'VP', 'Crew', 'crew_manager', 'Captain', 'Owner');
            EXCEPTION
              WHEN duplicate_object THEN null;
            END $$;

            -- Create users table
            CREATE TABLE IF NOT EXISTS public.users (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              auth_id UUID UNIQUE NOT NULL,
              email VARCHAR(255) UNIQUE NOT NULL,
              name VARCHAR(255),
              role user_role DEFAULT 'VP',
              is_approved BOOLEAN DEFAULT false,
              is_verified BOOLEAN DEFAULT false,
              created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );

            -- Enable RLS
            ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

            -- Create policies
            CREATE POLICY "Users are viewable by everyone"
              ON public.users FOR SELECT
              USING (true);

            CREATE POLICY "Users can insert their own profile"
              ON public.users FOR INSERT
              WITH CHECK (auth.uid() = auth_id);

            CREATE POLICY "Users can update own profile"
              ON public.users FOR UPDATE
              USING (auth.uid() = auth_id);

            -- Create updated_at trigger
            CREATE OR REPLACE FUNCTION public.update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
              NEW.updated_at = CURRENT_TIMESTAMP;
              RETURN NEW;
            END;
            $$ language 'plpgsql';

            DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
            CREATE TRIGGER update_users_updated_at
              BEFORE UPDATE ON public.users
              FOR EACH ROW
              EXECUTE FUNCTION public.update_updated_at_column();
          `,
        }
      );

      if (createError) {
        console.error("Error creating users table:", createError);
        throw createError;
      }

      console.log("Users table created successfully");
    } else {
      console.log("Users table already exists");
    }
  } catch (error) {
    console.error("Failed to setup users table:", error);
    throw error;
  }
}

// Run verification and table creation on client initialization
verifyDatabaseConnection();
// createUsersTable();

export async function signUp(
  email: string,
  phone: string,
  password: string,
  userData: Database["public"]["Tables"]["users"]["Insert"],
  verificationType: "phone" | "email"
) {
  try {
    // First, check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("email")
      .eq("email", email)
      .single();

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Always sign up with both email and phone
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      phone: phone,
      password,
      email,
      options: {
        data: {
          ...userData,
        },
      },
    });

    if (signUpError) {
      console.error("Signup error:", signUpError);
      throw signUpError;
    }

    if (!authData?.user) {
      throw new Error("Failed to create user");
    }

    // Create user profile
    const { error: profileError } = await supabase.from("users").insert([
      {
        auth_id: authData.user.id,
        email: email,
        phone: phone,
        ...userData,
      },
    ]);

    if (profileError) {
      console.error("Profile creation error:", profileError);
      throw profileError;
    }

    // If verificationType is 'email', send OTP to email
    if (verificationType === "email") {
      const { error: emailOtpError } = await sendEmailOtp(email);
      if (emailOtpError) throw emailOtpError;
      return { user: authData.user, verification: "email" };
    }
    // If verificationType is 'phone', OTP is sent automatically by Supabase
    return { user: authData.user, verification: "phone" };
  } catch (error) {
    console.error("Registration error:", error);
    throw error;
  }
}

export async function sendEmailOtp(email: string) {
  // This will send a 6-digit OTP to the user's email
  return await supabase.auth.signInWithOtp({ email });
}

export async function signIn(
  identifier: string,
  password: string,
  isPhone = false
) {
  try {
    let authData, authError;
    if (isPhone) {
      ({ data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          phone: identifier,
          password,
        }));
    } else {
      ({ data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: identifier,
          password,
        }));
    }

    if (authError) throw authError;

    // Then fetch the user data
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("auth_id", authData.user.id)
      .single();

    if (userError) throw userError;
    if (!userData.is_approved) throw new Error("Account is pending approval");

    return { session: authData.session, user: userData };
  } catch (error) {
    console.error("Sign in error:", error);
    throw error;
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: userData, error } = await supabase
    .from("users")
    .select("*")
    .eq("auth_id", user.id)
    .single();

  if (error) throw error;

  return userData;
}

export async function updateUserProfile(
  userId: string,
  updates: Database["public"]["Tables"]["users"]["Update"]
) {
  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", userId);

  if (error) throw error;

  return data;
}

export async function getAllUsers() {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data;
}

export async function approveUser(userId: string) {
  const { data, error } = await supabase
    .from("users")
    .update({ is_approved: true })
    .eq("id", userId);

  if (error) throw error;

  return data;
}

export async function updateUserRole(userId: string, role: string) {
  const { data, error } = await supabase
    .from("users")
    .update({ role: role as Database["public"]["Enums"]["user_role"] })
    .eq("id", userId);

  if (error) throw error;

  return data;
}

export async function verifyOtp(phone: string, otp: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token: otp,
    type: "sms",
  });
  return { data, error };
}

// Fetch all seaports
export async function getAllSeaports() {
  const { data, error } = await supabase
    .from("seaports")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

// Search seaports by criteria (partial match for name, address, province, etc.)
export async function searchSeaports(
  criteria: Partial<{
    name: string;
    address: string;
    classification: number;
    province: string;
    district: string;
    ward: string;
    status: string;
  }>
) {
  let query = supabase.from("seaports").select("*");
  if (criteria.name) query = query.ilike("name", `%${criteria.name}%`);
  if (criteria.address) query = query.ilike("address", `%${criteria.address}%`);
  if (criteria.classification)
    query = query.eq("classification", criteria.classification);
  if (criteria.province)
    query = query.ilike("province", `%${criteria.province}%`);
  if (criteria.district)
    query = query.ilike("district", `%${criteria.district}%`);
  if (criteria.ward) query = query.ilike("ward", `%${criteria.ward}%`);
  if (criteria.status) query = query.eq("status", criteria.status);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// Add a new seaport
export async function addSeaport(
  seaport: Omit<Database["public"]["Tables"]["seaports"]["Insert"], "id">
) {
  const { data, error } = await supabase
    .from("seaports")
    .insert([seaport])
    .select()
    .single();
  if (error) throw error;
  return data;
}
