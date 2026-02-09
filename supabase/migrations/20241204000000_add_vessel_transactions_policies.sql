-- Add RLS policies for vessel_transactions table
-- This allows users to access transactions where they are either the seller or buyer vessel owner
-- or have explicit access to those vessels through vessel_access_control

-- Policy for SELECT (read) operations
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
        -- Admin users can see all transactions (role-based access)
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_id = auth.uid() 
            AND role IN ('admin', 'owner', 'moderator')
        )
    );

-- Policy for INSERT operations
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
        -- Admin users can insert transactions for any vessel
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_id = auth.uid() 
            AND role IN ('admin', 'owner', 'moderator')
        )
    );

-- Policy for UPDATE operations
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
        -- Admin users can update any transaction
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_id = auth.uid() 
            AND role IN ('admin', 'owner', 'moderator')
        )
    );

-- Policy for DELETE operations
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
        -- Admin users can delete any transaction
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_id = auth.uid() 
            AND role IN ('admin', 'owner', 'moderator')
        )
    );
