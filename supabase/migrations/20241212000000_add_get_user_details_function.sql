-- Add function to get user details securely
-- This function bypasses RLS issues by using SECURITY DEFINER

CREATE OR REPLACE FUNCTION get_user_details(user_ids uuid[])
RETURNS TABLE (
    id uuid,
    email text,
    name text,
    phone text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        COALESCE(u.raw_user_meta_data->>'name', u.email) as name,
        u.raw_user_meta_data->>'phone' as phone
    FROM auth.users u
    WHERE u.id = ANY(user_ids);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_details(uuid[]) TO authenticated; 