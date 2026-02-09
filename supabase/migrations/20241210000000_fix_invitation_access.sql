-- Fix invitation access by allowing public read access to invitations
-- This migration temporarily allows anyone to read invitation data by code

-- Drop existing policies on vessel_access_invitations
DROP POLICY IF EXISTS "Allow all operations on vessel_access_invitations" ON public.vessel_access_invitations;

-- Create a policy that allows reading invitations by code (for invitation acceptance)
CREATE POLICY "Allow reading invitations by code" ON public.vessel_access_invitations
    FOR SELECT USING (true);

-- Create a policy that allows vessel owners to manage invitations
CREATE POLICY "Vessel owners can manage invitations" ON public.vessel_access_invitations
    FOR ALL USING (
        vessel_id IN (
            SELECT id FROM public.vessels WHERE user_id = auth.uid()
        )
    );

-- Create a policy that allows authenticated users to update their own invitations
CREATE POLICY "Users can update their own invitations" ON public.vessel_access_invitations
    FOR UPDATE USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
    ); 