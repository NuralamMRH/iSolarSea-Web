-- Add items JSONB array column for aggregated cart items
ALTER TABLE IF EXISTS public.vessel_transactions
ADD COLUMN IF NOT EXISTS items JSONB;

-- Optional: set default to NULL (implicit)
-- ALTER TABLE public.vessel_transactions ALTER COLUMN items DROP DEFAULT;

-- Note: ensure RLS policies permit inserting/updating this column as needed.