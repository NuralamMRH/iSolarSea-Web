-- Fix vessel_transactions access by adding basic RLS policies
-- This allows users to view transactions for vessels they own or have access to

-- Drop any existing policies on vessel_transactions (if any)
DROP POLICY IF EXISTS "Users can view vessel transactions they have access to" ON public.vessel_transactions;
DROP POLICY IF EXISTS "Users can insert vessel transactions for their vessels" ON public.vessel_transactions;
DROP POLICY IF EXISTS "Users can update vessel transactions they have access to" ON public.vessel_transactions;
DROP POLICY IF EXISTS "Users can delete vessel transactions they have access to" ON public.vessel_transactions;

-- Basic SELECT policy that allows users to see transactions for their vessels
CREATE POLICY "Users can view vessel transactions they have access to" ON public.vessel_transactions
    FOR SELECT USING (
        -- User owns the seller vessel
        seller_vessel_id IN (
            SELECT id FROM public.vessels WHERE user_id = auth.uid()
        )
        OR
        -- User owns the buyer vessel
        buyer_vessel_id IN (
            SELECT id FROM public.vessels WHERE user_id = auth.uid()
        )
        OR
        -- User has access to seller vessel through vessel_access_control
        seller_vessel_id IN (
            SELECT vessel_id FROM public.vessel_access_control 
            WHERE user_id = auth.uid() AND is_active = true
        )
        OR
        -- User has access to buyer vessel through vessel_access_control
        buyer_vessel_id IN (
            SELECT vessel_id FROM public.vessel_access_control 
            WHERE user_id = auth.uid() AND is_active = true
        )
        OR
        -- Admin users can see all transactions
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_id = auth.uid() 
            AND role IN ('admin', 'owner', 'moderator')
        )
    );

-- Basic INSERT policy
CREATE POLICY "Users can insert vessel transactions for their vessels" ON public.vessel_transactions
    FOR INSERT WITH CHECK (
        -- User owns the seller vessel
        seller_vessel_id IN (
            SELECT id FROM public.vessels WHERE user_id = auth.uid()
        )
        OR
        -- User owns the buyer vessel
        buyer_vessel_id IN (
            SELECT id FROM public.vessels WHERE user_id = auth.uid()
        )
        OR
        -- Admin users can insert transactions for any vessel
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_id = auth.uid() 
            AND role IN ('admin', 'owner', 'moderator')
        )
    );

-- Basic UPDATE policy
CREATE POLICY "Users can update vessel transactions they have access to" ON public.vessel_transactions
    FOR UPDATE USING (
        -- User owns the seller vessel
        seller_vessel_id IN (
            SELECT id FROM public.vessels WHERE user_id = auth.uid()
        )
        OR
        -- User owns the buyer vessel
        buyer_vessel_id IN (
            SELECT id FROM public.vessels WHERE user_id = auth.uid()
        )
        OR
        -- Admin users can update any transaction
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_id = auth.uid() 
            AND role IN ('admin', 'owner', 'moderator')
        )
    );

-- Basic DELETE policy
CREATE POLICY "Users can delete vessel transactions they have access to" ON public.vessel_transactions
    FOR DELETE USING (
        -- User owns the seller vessel
        seller_vessel_id IN (
            SELECT id FROM public.vessels WHERE user_id = auth.uid()
        )
        OR
        -- User owns the buyer vessel
        buyer_vessel_id IN (
            SELECT id FROM public.vessels WHERE user_id = auth.uid()
        )
        OR
        -- Admin users can delete any transaction
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_id = auth.uid() 
            AND role IN ('admin', 'owner', 'moderator')
        )
    );
