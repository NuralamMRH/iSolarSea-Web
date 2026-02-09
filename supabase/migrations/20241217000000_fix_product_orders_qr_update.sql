-- Fix product_orders RLS policies to allow QR code transaction updates
-- This allows anyone to update product orders when completing QR transactions

-- Drop existing restrictive update policy
DROP POLICY IF EXISTS "Users can update their own product orders" ON public.product_orders;

-- Create new policy that allows QR code transaction updates
CREATE POLICY "Allow QR code transaction updates" ON public.product_orders
    FOR UPDATE USING (
        -- Allow updates for QR code transaction completion
        -- This is needed when buyers scan QR codes to complete transactions
        true
    )
    WITH CHECK (
        -- Same condition for the new values
        true
    );

-- Add a comment to document this policy
COMMENT ON POLICY "Allow QR code transaction updates" ON public.product_orders IS 
'Allows anyone to update product orders when completing QR code transactions. This is necessary for the QR scanning workflow where buyers need to update available_load and quantity_load.';

-- Also create a policy for public read access to product orders
DROP POLICY IF EXISTS "Users can view their own product orders" ON public.product_orders;

CREATE POLICY "Allow public read access to product orders" ON public.product_orders
    FOR SELECT USING (true);

COMMENT ON POLICY "Allow public read access to product orders" ON public.product_orders IS 
'Allows public read access to product orders for QR code generation and transaction tracking.';
