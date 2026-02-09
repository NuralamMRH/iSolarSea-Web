-- Add simple function to get user details
-- This function bypasses RLS issues by using SECURITY DEFINER

CREATE OR REPLACE FUNCTION get_simple_user_details(user_id_param uuid)
RETURNS TABLE (
    id uuid,
    email text,
    name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        COALESCE(u.raw_user_meta_data->>'name', u.email) as name
    FROM auth.users u
    WHERE u.id = user_id_param;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_simple_user_details(uuid) TO authenticated; 