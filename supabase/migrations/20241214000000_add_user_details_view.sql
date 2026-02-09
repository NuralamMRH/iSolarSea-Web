-- Create a view for user details that can be accessed by authenticated users
-- This view provides safe access to user information for vessel access management

CREATE OR REPLACE VIEW public.user_details_view AS
SELECT 
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'name', u.email) as name,
    u.raw_user_meta_data->>'phone' as phone
FROM auth.users u;

-- Grant select permission to authenticated users
GRANT SELECT ON public.user_details_view TO authenticated;

-- Create a function to get user details from the view
CREATE OR REPLACE FUNCTION get_user_details_from_view(user_id_param uuid)
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
        v.id,
        v.email,
        v.name,
        v.phone
    FROM public.user_details_view v
    WHERE v.id = user_id_param;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_details_from_view(uuid) TO authenticated; 