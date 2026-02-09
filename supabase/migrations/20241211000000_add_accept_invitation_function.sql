-- Add function to accept vessel invitation securely
-- This function bypasses RLS issues by using SECURITY DEFINER

CREATE OR REPLACE FUNCTION accept_vessel_invitation(
    invitation_id_param uuid,
    user_id_param uuid
)
RETURNS TABLE (
    success boolean,
    message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    invitation_record public.vessel_access_invitations%ROWTYPE;
    existing_access public.vessel_access_control%ROWTYPE;
BEGIN
    -- Get invitation details
    SELECT * INTO invitation_record
    FROM public.vessel_access_invitations
    WHERE id = invitation_id_param;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Invitation not found'::text;
        RETURN;
    END IF;
    
    -- Check if invitation is already accepted
    IF invitation_record.is_accepted THEN
        RETURN QUERY SELECT true, 'Invitation already accepted'::text;
        RETURN;
    END IF;
    
    -- Check if invitation has expired
    IF invitation_record.expires_at < now() THEN
        RETURN QUERY SELECT false, 'Invitation has expired'::text;
        RETURN;
    END IF;
    
    -- Check if user already has access to this vessel
    SELECT * INTO existing_access
    FROM public.vessel_access_control
    WHERE vessel_id = invitation_record.vessel_id 
    AND user_id = user_id_param;
    
    IF FOUND THEN
        -- Update existing access
        UPDATE public.vessel_access_control
        SET 
            role = invitation_record.role,
            permissions = invitation_record.permissions,
            granted_by = invitation_record.invited_by,
            is_active = true,
            updated_at = now()
        WHERE vessel_id = invitation_record.vessel_id 
        AND user_id = user_id_param;
    ELSE
        -- Create new access
        INSERT INTO public.vessel_access_control (
            vessel_id,
            user_id,
            granted_by,
            role,
            permissions,
            is_active
        ) VALUES (
            invitation_record.vessel_id,
            user_id_param,
            invitation_record.invited_by,
            invitation_record.role,
            invitation_record.permissions,
            true
        );
    END IF;
    
    -- Mark invitation as accepted
    UPDATE public.vessel_access_invitations
    SET 
        is_accepted = true,
        accepted_at = now()
    WHERE id = invitation_id_param;
    
    RETURN QUERY SELECT true, 'Invitation accepted successfully'::text;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT false, 'Error accepting invitation: ' || SQLERRM::text;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION accept_vessel_invitation(uuid, uuid) TO authenticated; 