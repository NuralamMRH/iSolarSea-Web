-- Add function to get invitation by code (bypasses RLS)
-- This migration adds a function to safely retrieve invitation data

CREATE OR REPLACE FUNCTION get_invitation_by_code(invitation_code_param text)
RETURNS TABLE (
    id uuid,
    vessel_id uuid,
    email text,
    role vessel_access_role,
    permissions vessel_access_permission[],
    invited_by uuid,
    invitation_code text,
    expires_at timestamp with time zone,
    is_accepted boolean,
    accepted_at timestamp with time zone,
    created_at timestamp with time zone,
    email_sent boolean,
    email_sent_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vai.id,
        vai.vessel_id,
        vai.email,
        vai.role,
        vai.permissions,
        vai.invited_by,
        vai.invitation_code,
        vai.expires_at,
        vai.is_accepted,
        vai.accepted_at,
        vai.created_at,
        vai.email_sent,
        vai.email_sent_at
    FROM public.vessel_access_invitations vai
    WHERE vai.invitation_code = invitation_code_param;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_invitation_by_code(text) TO authenticated; 