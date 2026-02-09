-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create roles enum type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'manager', 'VVIP', 'VIP', 'VP', 'Crew', 'crew_manager', 'Captain', 'Owner');
  END IF;
END
$$;

-- Create users table with role-based access control
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'VP',
    is_approved BOOLEAN DEFAULT true,
    is_email_verified BOOLEAN DEFAULT true,
    is_phone_verified BOOLEAN DEFAULT true,
    phone_number_verified BOOLEAN DEFAULT true,
    phone TEXT,
    grand_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view their own data" ON users
    FOR SELECT
    USING (auth.uid() = auth_id);

CREATE POLICY "Users can update their own data" ON users
    FOR UPDATE
    USING (auth.uid() = auth_id);

-- CREATE POLICY "Super admins can view all data" ON users
--     FOR ALL
--     USING (
--         EXISTS (
--             SELECT 1 FROM users
--             WHERE auth_id = auth.uid()
--             AND role = 'super_admin'
--         )
--     );

CREATE POLICY "Admins can view and update user data" ON users
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM users
        WHERE auth_id = auth.uid()
        AND role IN ('super_admin', 'admin')
    ));

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert super admin user
-- NOTE: You cannot insert into auth.users with a password via SQL. Use the Supabase Dashboard or Auth API to create the user with email 'admin@itrucksea.com' and password '12345678'.
-- After creating the user, you can run the following insert to add them to your custom users table:
INSERT INTO users (auth_id, email, name, role, is_approved, is_email_verified)
SELECT id, email, 'Super Admin', 'super_admin'::user_role, true, true
FROM auth.users
WHERE email = 'admin@itrucksea.com'
ON CONFLICT (email) DO NOTHING;

-- Add this policy to allow email-based lookups during authentication
CREATE POLICY "Allow email lookup for authentication" ON users
    FOR SELECT
    USING (true);