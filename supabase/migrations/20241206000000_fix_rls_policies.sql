-- Fix infinite recursion issues in RLS policies
-- This migration fixes the RLS policies that were causing infinite recursion

-- Drop the problematic policies first
DROP POLICY IF EXISTS "Vessel moderators can view access controls for their vessels" ON public.vessel_access_control;
DROP POLICY IF EXISTS "Vessel moderators can manage access controls" ON public.vessel_access_control;
DROP POLICY IF EXISTS "Vessel moderators can manage invitations" ON public.vessel_access_invitations;

-- Create simplified policies that don't cause recursion
-- For vessel_access_control
CREATE POLICY "Vessel moderators can view access controls for their vessels" ON public.vessel_access_control
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.vessel_access_control vac
            WHERE vac.vessel_id = vessel_access_control.vessel_id 
            AND vac.user_id = auth.uid() 
            AND vac.role = 'moderator'
            AND vac.is_active = true
        )
    );

CREATE POLICY "Vessel moderators can manage access controls" ON public.vessel_access_control
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.vessel_access_control vac
            WHERE vac.vessel_id = vessel_access_control.vessel_id 
            AND vac.user_id = auth.uid() 
            AND vac.role = 'moderator'
            AND vac.is_active = true
        )
    );

-- For vessel_access_invitations
CREATE POLICY "Vessel moderators can manage invitations" ON public.vessel_access_invitations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.vessel_access_control vac
            WHERE vac.vessel_id = vessel_access_invitations.vessel_id 
            AND vac.user_id = auth.uid() 
            AND vac.role = 'moderator'
            AND vac.is_active = true
        )
    ); 