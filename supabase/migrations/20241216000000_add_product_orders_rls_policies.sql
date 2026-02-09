-- Add RLS policies for product_orders table
-- This migration adds proper RLS policies to allow users to manage their product orders

-- Enable RLS on product_orders table if not already enabled
ALTER TABLE public.product_orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own product orders" ON public.product_orders;
DROP POLICY IF EXISTS "Users can insert their own product orders" ON public.product_orders;
DROP POLICY IF EXISTS "Users can update their own product orders" ON public.product_orders;
DROP POLICY IF EXISTS "Users can delete their own product orders" ON public.product_orders;

-- Create policy for viewing product orders
-- Users can view product orders for trips that belong to vessels they own or have access to
CREATE POLICY "Users can view their own product orders" ON public.product_orders
    FOR SELECT USING (
        trip_id IN (
            SELECT ft.id FROM public.fishing_trips ft
            WHERE ft.vessel_id IN (
                -- Vessels owned by the user
                SELECT v.id FROM public.vessels v WHERE v.user_id = auth.uid()
                UNION
                -- Vessels the user has access to through vessel access control
                SELECT vac.vessel_id FROM public.vessel_access_control vac 
                WHERE vac.user_id = auth.uid() AND vac.is_active = true
            )
        )
    );

-- Create policy for inserting product orders
-- Users can insert product orders for trips that belong to vessels they own or have access to
CREATE POLICY "Users can insert their own product orders" ON public.product_orders
    FOR INSERT WITH CHECK (
        trip_id IN (
            SELECT ft.id FROM public.fishing_trips ft
            WHERE ft.vessel_id IN (
                -- Vessels owned by the user
                SELECT v.id FROM public.vessels v WHERE v.user_id = auth.uid()
                UNION
                -- Vessels the user has access to through vessel access control
                SELECT vac.vessel_id FROM public.vessel_access_control vac 
                WHERE vac.user_id = auth.uid() AND vac.is_active = true
            )
        )
    );

-- Create policy for updating product orders
-- Users can update product orders for trips that belong to vessels they own or have access to
CREATE POLICY "Users can update their own product orders" ON public.product_orders
    FOR UPDATE USING (
        trip_id IN (
            SELECT ft.id FROM public.fishing_trips ft
            WHERE ft.vessel_id IN (
                -- Vessels owned by the user
                SELECT v.id FROM public.vessels v WHERE v.user_id = auth.uid()
                UNION
                -- Vessels the user has access to through vessel access control
                SELECT vac.vessel_id FROM public.vessel_access_control vac 
                WHERE vac.user_id = auth.uid() AND vac.is_active = true
            )
        )
    );

-- Create policy for deleting product orders
-- Users can delete product orders for trips that belong to vessels they own or have access to
CREATE POLICY "Users can delete their own product orders" ON public.product_orders
    FOR DELETE USING (
        trip_id IN (
            SELECT ft.id FROM public.fishing_trips ft
            WHERE ft.vessel_id IN (
                -- Vessels owned by the user
                SELECT v.id FROM public.vessels v WHERE v.user_id = auth.uid()
                UNION
                -- Vessels the user has access to through vessel access control
                SELECT vac.vessel_id FROM public.vessel_access_control vac 
                WHERE vac.user_id = auth.uid() AND vac.is_active = true
            )
        )
    );

-- Add comment explaining the policies
COMMENT ON POLICY "Users can view their own product orders" ON public.product_orders IS 'Allows users to view product orders for vessels they own or have access to';
COMMENT ON POLICY "Users can insert their own product orders" ON public.product_orders IS 'Allows users to insert product orders for vessels they own or have access to';
COMMENT ON POLICY "Users can update their own product orders" ON public.product_orders IS 'Allows users to update product orders for vessels they own or have access to';
COMMENT ON POLICY "Users can delete their own product orders" ON public.product_orders IS 'Allows users to delete product orders for vessels they own or have access to'; 