-- Disable email confirmation for email updates
-- This script should be run in the Supabase SQL editor

-- Note: Supabase Auth configuration is managed through the dashboard
-- To disable email confirmation:
-- 1. Go to Supabase Dashboard > Authentication > Settings
-- 2. Disable "Enable email confirmations" 
-- 3. Or set "Confirm email change" to false

-- Alternative: Use this custom function to update email without confirmation
CREATE OR REPLACE FUNCTION update_user_email_without_confirmation(
  user_auth_id UUID,
  new_email TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the auth.users table directly
  UPDATE auth.users 
  SET email = new_email,
      email_confirmed_at = NOW(),
      updated_at = NOW()
  WHERE id = user_auth_id;
  
  -- Update the public.users table
  UPDATE public.users 
  SET email = new_email,
      updated_at = NOW()
  WHERE auth_id = user_auth_id;
  
  RETURN FOUND;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_user_email_without_confirmation(UUID, TEXT) TO authenticated;

-- Also create a function to update password without verification
CREATE OR REPLACE FUNCTION update_user_password_directly(
  user_auth_id UUID,
  new_password_hash TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the auth.users table password
  UPDATE auth.users 
  SET encrypted_password = new_password_hash,
      updated_at = NOW()
  WHERE id = user_auth_id;
  
  RETURN FOUND;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_user_password_directly(UUID, TEXT) TO authenticated;
